/* oxlint-disable no-var-requires */
import { execSync } from 'node:child_process';
import path from 'node:path';

// Should not load @affine/native for unsupported platforms
import type { ShareableContent } from '@affine/native';
import { app, systemPreferences } from 'electron';
import fs from 'fs-extra';
import { debounce } from 'lodash-es';
import {
  BehaviorSubject,
  distinctUntilChanged,
  groupBy,
  interval,
  mergeMap,
  Subject,
  throttleTime,
} from 'rxjs';
import { filter, map, shareReplay } from 'rxjs/operators';

import { isMacOS, shallowEqual } from '../../shared/utils';
import { beforeAppQuit } from '../cleanup';
import { logger } from '../logger';
import {
  MeetingSettingsKey,
  MeetingSettingsSchema,
} from '../shared-state-schema';
import { globalStateStorage } from '../shared-storage/storage';
import { getMainWindow } from '../windows-manager';
import { popupManager } from '../windows-manager/popup';
import { isAppNameAllowed } from './allow-list';
import { recordingStateMachine } from './state-machine';
import type {
  AppGroupInfo,
  Recording,
  RecordingStatus,
  TappableAppInfo,
} from './types';

const MAX_DURATION_FOR_TRANSCRIPTION = 1.5 * 60 * 60 * 1000; // 1.5 hours

export const MeetingsSettingsState = {
  $: globalStateStorage.watch<MeetingSettingsSchema>(MeetingSettingsKey).pipe(
    map(v => MeetingSettingsSchema.parse(v ?? {})),
    shareReplay(1)
  ),

  get value() {
    return MeetingSettingsSchema.parse(
      globalStateStorage.get(MeetingSettingsKey) ?? {}
    );
  },

  set value(value: MeetingSettingsSchema) {
    globalStateStorage.set(MeetingSettingsKey, value);
  },
};

const subscribers: Subscriber[] = [];

// recordings are saved in the app data directory
// may need a way to clean up old recordings
export const SAVED_RECORDINGS_DIR = path.join(
  app.getPath('sessionData'),
  'recordings'
);

let shareableContent: ShareableContent | null = null;

function cleanup() {
  shareableContent = null;
  subscribers.forEach(subscriber => {
    try {
      subscriber.unsubscribe();
    } catch {
      // ignore unsubscribe error
    }
  });
}

beforeAppQuit(() => {
  cleanup();
});

export const applications$ = new BehaviorSubject<TappableAppInfo[]>([]);
export const appGroups$ = new BehaviorSubject<AppGroupInfo[]>([]);

export const updateApplicationsPing$ = new Subject<number>();

// recording id -> recording
// recordings will be saved in memory before consumed and created as an audio block to user's doc
const recordings = new Map<number, Recording>();

// there should be only one active recording at a time
// We'll now use recordingStateMachine.status$ instead of our own BehaviorSubject
export const recordingStatus$ = recordingStateMachine.status$;

function createAppGroup(processGroupId: number): AppGroupInfo | undefined {
  const groupProcess =
    shareableContent?.applicationWithProcessId(processGroupId);
  if (!groupProcess) {
    return;
  }
  return {
    processGroupId: processGroupId,
    apps: [], // leave it empty for now.
    name: groupProcess.name,
    bundleIdentifier: groupProcess.bundleIdentifier,
    // icon should be lazy loaded
    get icon() {
      try {
        return groupProcess.icon;
      } catch (error) {
        logger.error(`Failed to get icon for ${groupProcess.name}`, error);
        return undefined;
      }
    },
    isRunning: false,
  };
}

// pipe applications$ to appGroups$
function setupAppGroups() {
  subscribers.push(
    applications$.pipe(distinctUntilChanged()).subscribe(apps => {
      const appGroups: AppGroupInfo[] = [];
      apps.forEach(app => {
        let appGroup = appGroups.find(
          group => group.processGroupId === app.processGroupId
        );

        if (!appGroup) {
          appGroup = createAppGroup(app.processGroupId);
          if (appGroup) {
            appGroups.push(appGroup);
          }
        }
        if (appGroup) {
          appGroup.apps.push(app);
        }
      });

      appGroups.forEach(appGroup => {
        appGroup.isRunning = appGroup.apps.some(app => app.isRunning);
      });

      appGroups$.next(appGroups);
    })
  );
}

function setupNewRunningAppGroup() {
  const appGroupRunningChanged$ = appGroups$.pipe(
    mergeMap(groups => groups),
    groupBy(group => group.processGroupId),
    mergeMap(groupStream$ =>
      groupStream$.pipe(
        distinctUntilChanged((prev, curr) => prev.isRunning === curr.isRunning)
      )
    ),
    filter(group => isAppNameAllowed(group.name))
  );

  appGroups$.value.forEach(group => {
    const recordingStatus = recordingStatus$.value;
    if (
      group.isRunning &&
      (!recordingStatus || recordingStatus.status === 'new')
    ) {
      newRecording(group);
    }
  });

  const debounceStartRecording = debounce((appGroup: AppGroupInfo) => {
    // check if the app is running again
    if (appGroup.isRunning) {
      startRecording(appGroup);
    }
  }, 1000);

  subscribers.push(
    appGroupRunningChanged$.subscribe(currentGroup => {
      logger.info(
        'appGroupRunningChanged',
        currentGroup.bundleIdentifier,
        currentGroup.isRunning
      );

      if (MeetingsSettingsState.value.recordingMode === 'none') {
        return;
      }

      const recordingStatus = recordingStatus$.value;

      if (currentGroup.isRunning) {
        // when the app is running and there is no active recording popup
        // we should show a new recording popup
        if (
          !recordingStatus ||
          recordingStatus.status === 'new' ||
          recordingStatus.status === 'create-block-success' ||
          recordingStatus.status === 'create-block-failed'
        ) {
          if (MeetingsSettingsState.value.recordingMode === 'prompt') {
            newRecording(currentGroup);
          } else if (
            MeetingsSettingsState.value.recordingMode === 'auto-start'
          ) {
            // there is a case that the watched app's running state changed rapidly
            // we will schedule the start recording to avoid that
            debounceStartRecording(currentGroup);
          } else {
            // do nothing, skip
          }
        }
      } else {
        // when displaying in "new" state but the app is not running any more
        // we should remove the recording
        if (
          recordingStatus?.status === 'new' &&
          currentGroup.bundleIdentifier ===
            recordingStatus.appGroup?.bundleIdentifier
        ) {
          removeRecording(recordingStatus.id);
        }

        // if the recording is stopped and we are recording it,
        // we should stop the recording
        if (
          recordingStatus?.status === 'recording' &&
          recordingStatus.appGroup?.bundleIdentifier ===
            currentGroup.bundleIdentifier
        ) {
          stopRecording(recordingStatus.id).catch(err => {
            logger.error('failed to stop recording', err);
          });
        }
      }
    })
  );
}

function createRecording(status: RecordingStatus) {
  const bufferedFilePath = path.join(
    SAVED_RECORDINGS_DIR,
    `${status.appGroup?.bundleIdentifier ?? 'unknown'}-${status.id}-${status.startTime}.raw`
  );

  fs.ensureDirSync(SAVED_RECORDINGS_DIR);
  const file = fs.createWriteStream(bufferedFilePath);

  function tapAudioSamples(err: Error | null, samples: Float32Array) {
    const recordingStatus = recordingStatus$.getValue();
    if (
      !recordingStatus ||
      recordingStatus.id !== status.id ||
      recordingStatus.status === 'paused'
    ) {
      return;
    }

    if (err) {
      logger.error('failed to get audio samples', err);
    } else {
      // Writing raw Float32Array samples directly to file
      // For stereo audio, samples are interleaved [L,R,L,R,...]
      file.write(Buffer.from(samples.buffer));
    }
  }

  // MUST require dynamically to avoid loading @affine/native for unsupported platforms
  const ShareableContent = require('@affine/native').ShareableContent;

  const stream = status.app
    ? status.app.rawInstance.tapAudio(tapAudioSamples)
    : ShareableContent.tapGlobalAudio(null, tapAudioSamples);

  const recording: Recording = {
    id: status.id,
    startTime: status.startTime,
    app: status.app,
    appGroup: status.appGroup,
    file,
    stream,
  };

  return recording;
}

export async function getRecording(id: number) {
  const recording = recordings.get(id);
  if (!recording) {
    logger.error(`Recording ${id} not found`);
    return;
  }
  const rawFilePath = String(recording.file.path);
  return {
    id,
    appGroup: recording.appGroup,
    app: recording.app,
    startTime: recording.startTime,
    filepath: rawFilePath,
    sampleRate: recording.stream.sampleRate,
    numberOfChannels: recording.stream.channels,
  };
}

// recording popup status
// new: recording is started, popup is shown
// recording: recording is started, popup is shown
// stopped: recording is stopped, popup showing processing status
// create-block-success: recording is ready, show "open app" button
// create-block-failed: recording is failed, show "failed to save" button
// null: hide popup
function setupRecordingListeners() {
  subscribers.push(
    recordingStatus$
      .pipe(distinctUntilChanged(shallowEqual))
      .subscribe(status => {
        const popup = popupManager.get('recording');

        if (status && !popup.showing) {
          popup.show().catch(err => {
            logger.error('failed to show recording popup', err);
          });
        }

        if (status?.status === 'recording') {
          let recording = recordings.get(status.id);
          // create a recording if not exists
          if (!recording) {
            recording = createRecording(status);
            recordings.set(status.id, recording);
          }
        } else if (status?.status === 'stopped') {
          const recording = recordings.get(status.id);
          if (recording) {
            recording.stream.stop();
          }
        } else if (
          status?.status === 'create-block-success' ||
          status?.status === 'create-block-failed'
        ) {
          // show the popup for 10s
          setTimeout(() => {
            // check again if current status is still ready
            if (
              (recordingStatus$.value?.status === 'create-block-success' ||
                recordingStatus$.value?.status === 'create-block-failed') &&
              recordingStatus$.value.id === status.id
            ) {
              popup.hide().catch(err => {
                logger.error('failed to hide recording popup', err);
              });
            }
          }, 10_000);
        } else if (!status) {
          // status is removed, we should hide the popup
          popupManager
            .get('recording')
            .hide()
            .catch(err => {
              logger.error('failed to hide recording popup', err);
            });
        }
      })
  );
}

function getAllApps(): TappableAppInfo[] {
  if (!shareableContent) {
    return [];
  }
  const apps = shareableContent.applications().map(app => {
    try {
      return {
        rawInstance: app,
        processId: app.processId,
        processGroupId: app.processGroupId,
        bundleIdentifier: app.bundleIdentifier,
        name: app.name,
        isRunning: app.isRunning,
      };
    } catch (error) {
      logger.error('failed to get app info', error);
      return null;
    }
  });

  const filteredApps = apps.filter(
    (v): v is TappableAppInfo =>
      v !== null &&
      !v.bundleIdentifier.startsWith('com.apple') &&
      !v.bundleIdentifier.startsWith('pro.affine') &&
      v.processId !== process.pid
  );
  return filteredApps;
}

type Subscriber = {
  unsubscribe: () => void;
};

function setupMediaListeners() {
  const ShareableContent = require('@affine/native').ShareableContent;
  applications$.next(getAllApps());
  subscribers.push(
    interval(3000).subscribe(() => {
      updateApplicationsPing$.next(Date.now());
    }),
    ShareableContent.onApplicationListChanged(() => {
      updateApplicationsPing$.next(Date.now());
    }),
    updateApplicationsPing$
      .pipe(distinctUntilChanged(), throttleTime(3000))
      .subscribe(() => {
        applications$.next(getAllApps());
      })
  );

  let appStateSubscribers: Subscriber[] = [];

  subscribers.push(
    applications$.subscribe(apps => {
      appStateSubscribers.forEach(subscriber => {
        try {
          subscriber.unsubscribe();
        } catch {
          // ignore unsubscribe error
        }
      });
      const _appStateSubscribers: Subscriber[] = [];

      apps.forEach(app => {
        try {
          const tappableApp = app.rawInstance;
          _appStateSubscribers.push(
            ShareableContent.onAppStateChanged(tappableApp, () => {
              updateApplicationsPing$.next(Date.now());
            })
          );
        } catch (error) {
          logger.error(
            `Failed to convert app ${app.name} to TappableApplication`,
            error
          );
        }
      });

      appStateSubscribers = _appStateSubscribers;
      return () => {
        _appStateSubscribers.forEach(subscriber => {
          try {
            subscriber.unsubscribe();
          } catch {
            // ignore unsubscribe error
          }
        });
      };
    })
  );
}

// will be called when the app is ready or when the user has enabled the recording feature in settings
export function setupRecordingFeature() {
  if (!MeetingsSettingsState.value.enabled || !checkRecordingAvailable()) {
    return;
  }

  try {
    const ShareableContent = require('@affine/native').ShareableContent;
    if (!shareableContent) {
      shareableContent = new ShareableContent();
      setupMediaListeners();
    }
    // reset all states
    recordingStatus$.next(null);
    setupAppGroups();
    setupNewRunningAppGroup();
    setupRecordingListeners();
    return true;
  } catch (error) {
    logger.error('failed to setup recording feature', error);
    return false;
  }
}

export function disableRecordingFeature() {
  recordingStatus$.next(null);
  cleanup();
}

function normalizeAppGroupInfo(
  appGroup?: AppGroupInfo | number
): AppGroupInfo | undefined {
  return typeof appGroup === 'number'
    ? appGroups$.value.find(group => group.processGroupId === appGroup)
    : appGroup;
}

export function newRecording(
  appGroup?: AppGroupInfo | number
): RecordingStatus | null {
  return recordingStateMachine.dispatch({
    type: 'NEW_RECORDING',
    appGroup: normalizeAppGroupInfo(appGroup),
  });
}

export function startRecording(
  appGroup?: AppGroupInfo | number
): RecordingStatus | null {
  const state = recordingStateMachine.dispatch({
    type: 'START_RECORDING',
    appGroup: normalizeAppGroupInfo(appGroup),
  });

  // set a timeout to stop the recording after MAX_DURATION_FOR_TRANSCRIPTION
  setTimeout(() => {
    if (
      state?.status === 'recording' &&
      state.id === recordingStatus$.value?.id
    ) {
      stopRecording(state.id).catch(err => {
        logger.error('failed to stop recording', err);
      });
    }
  }, MAX_DURATION_FOR_TRANSCRIPTION);

  return state;
}

export function pauseRecording(id: number) {
  return recordingStateMachine.dispatch({ type: 'PAUSE_RECORDING', id });
}

export function resumeRecording(id: number) {
  return recordingStateMachine.dispatch({ type: 'RESUME_RECORDING', id });
}

export async function stopRecording(id: number) {
  const recording = recordings.get(id);
  if (!recording) {
    logger.error(`Recording ${id} not found`);
    return;
  }

  if (!recording.file.path) {
    logger.error(`Recording ${id} has no file path`);
    return;
  }

  const { file } = recording;
  file.end();

  // Wait for file to finish writing
  try {
    await new Promise<void>((resolve, reject) => {
      file.on('finish', () => {
        // check if the file is empty
        const stats = fs.statSync(file.path);
        if (stats.size === 0) {
          logger.error(`Recording ${id} is empty`);
          reject(new Error('Recording is empty'));
        }
        resolve();
      });
    });
    const recordingStatus = recordingStateMachine.dispatch({
      type: 'STOP_RECORDING',
      id,
      filepath: String(recording.file.path),
      sampleRate: recording.stream.sampleRate,
      numberOfChannels: recording.stream.channels,
    });

    if (!recordingStatus) {
      logger.error('No recording status to stop');
      return;
    }
    return serializeRecordingStatus(recordingStatus);
  } catch (error: unknown) {
    logger.error('Failed to stop recording', error);
    const recordingStatus = recordingStateMachine.dispatch({
      type: 'CREATE_BLOCK_FAILED',
      id,
      error: error instanceof Error ? error : undefined,
    });
    if (!recordingStatus) {
      logger.error('No recording status to stop');
      return;
    }
    return serializeRecordingStatus(recordingStatus);
  }
}

export async function readyRecording(id: number, buffer: Buffer) {
  const recordingStatus = recordingStatus$.value;
  const recording = recordings.get(id);
  if (!recordingStatus || recordingStatus.id !== id || !recording) {
    logger.error(`Recording ${id} not found`);
    return;
  }

  const filepath = path.join(
    SAVED_RECORDINGS_DIR,
    `${recordingStatus.appGroup?.bundleIdentifier ?? 'unknown'}-${recordingStatus.id}-${recordingStatus.startTime}.opus`
  );

  await fs.writeFile(filepath, buffer);

  // Update the status through the state machine
  recordingStateMachine.dispatch({
    type: 'SAVE_RECORDING',
    id,
    filepath,
  });

  // bring up the window
  getMainWindow()
    .then(mainWindow => {
      if (mainWindow) {
        mainWindow.show();
      }
    })
    .catch(err => {
      logger.error('failed to bring up the window', err);
    });
}

export async function handleBlockCreationSuccess(id: number) {
  recordingStateMachine.dispatch({
    type: 'CREATE_BLOCK_SUCCESS',
    id,
  });
}

export async function handleBlockCreationFailed(id: number, error?: Error) {
  recordingStateMachine.dispatch({
    type: 'CREATE_BLOCK_FAILED',
    id,
    error,
  });
}

export function removeRecording(id: number) {
  recordings.delete(id);
  recordingStateMachine.dispatch({ type: 'REMOVE_RECORDING', id });
}

export interface SerializedRecordingStatus {
  id: number;
  status: RecordingStatus['status'];
  appName?: string;
  // if there is no app group, it means the recording is for system audio
  appGroupId?: number;
  icon?: Buffer;
  startTime: number;
  filepath?: string;
  sampleRate?: number;
  numberOfChannels?: number;
}

export function serializeRecordingStatus(
  status: RecordingStatus
): SerializedRecordingStatus {
  return {
    id: status.id,
    status: status.status,
    appName: status.appGroup?.name,
    appGroupId: status.appGroup?.processGroupId,
    icon: status.appGroup?.icon,
    startTime: status.startTime,
    filepath: status.filepath,
    sampleRate: status.sampleRate,
    numberOfChannels: status.numberOfChannels,
  };
}

export const getMacOSVersion = () => {
  try {
    const stdout = execSync('sw_vers -productVersion').toString();
    const [major, minor, patch] = stdout.trim().split('.').map(Number);
    return { major, minor, patch };
  } catch (error) {
    logger.error('Failed to get MacOS version', error);
    return { major: 0, minor: 0, patch: 0 };
  }
};

// check if the system is MacOS and the version is >= 14.2
export const checkRecordingAvailable = () => {
  if (!isMacOS()) {
    return false;
  }
  const version = getMacOSVersion();
  return (version.major === 14 && version.minor >= 2) || version.major > 14;
};

export const checkScreenRecordingPermission = () => {
  if (!isMacOS()) {
    return false;
  }
  return systemPreferences.getMediaAccessStatus('screen') === 'granted';
};
