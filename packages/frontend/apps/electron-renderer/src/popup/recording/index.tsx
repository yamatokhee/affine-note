import { Button } from '@affine/component';
import { useAsyncCallback } from '@affine/core/components/hooks/affine-async-hooks';
import { appIconMap } from '@affine/core/utils';
import { encodeRawBufferToOpus } from '@affine/core/utils/webm-encoding';
import { apis, events } from '@affine/electron-api';
import { useI18n } from '@affine/i18n';
import { useEffect, useMemo, useState } from 'react';

import * as styles from './styles.css';

type Status = {
  id: number;
  status:
    | 'new'
    | 'recording'
    | 'paused'
    | 'stopped'
    | 'ready'
    | 'create-block-success'
    | 'create-block-failed';
  appName?: string;
  appGroupId?: number;
  icon?: Buffer;
  filepath?: string;
};

export const useRecordingStatus = () => {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    // Get initial status
    apis?.recording
      .getCurrentRecording()
      .then(status => setStatus(status satisfies Status | null))
      .catch(console.error);

    // Subscribe to status changes
    const unsubscribe = events?.recording.onRecordingStatusChanged(status =>
      setStatus(status satisfies Status | null)
    );

    return () => {
      unsubscribe?.();
    };
  }, []);

  return status;
};

const appIcon = appIconMap[BUILD_CONFIG.appBuildType];

export function Recording() {
  const status = useRecordingStatus();

  const t = useI18n();
  const textElement = useMemo(() => {
    if (!status) {
      return null;
    }
    if (status.status === 'new') {
      return t['com.affine.recording.new']();
    } else if (status.status === 'create-block-success') {
      return t['com.affine.recording.success.prompt']();
    } else if (status.status === 'create-block-failed') {
      return t['com.affine.recording.failed.prompt']();
    } else if (
      status.status === 'recording' ||
      status.status === 'ready' ||
      status.status === 'stopped'
    ) {
      if (status.appName) {
        return t['com.affine.recording.recording']({
          appName: status.appName,
        });
      } else {
        return t['com.affine.recording.recording.unnamed']();
      }
    }
    return null;
  }, [status, t]);

  const handleDismiss = useAsyncCallback(async () => {
    await apis?.popup?.dismissCurrentRecording();
  }, []);

  const handleStopRecording = useAsyncCallback(async () => {
    if (!status) {
      return;
    }
    await apis?.recording?.stopRecording(status.id);
  }, [status]);

  const handleProcessStoppedRecording = useAsyncCallback(async () => {
    let id: number | undefined;
    try {
      const result = await apis?.recording?.getCurrentRecording();
      if (!result) {
        return;
      }

      id = result.id;

      const { filepath, sampleRate, numberOfChannels } = result;
      if (!filepath || !sampleRate || !numberOfChannels) {
        return;
      }
      const [buffer] = await Promise.all([
        encodeRawBufferToOpus({
          filepath,
          sampleRate,
          numberOfChannels,
        }),
        new Promise<void>(resolve => {
          setTimeout(() => {
            resolve();
          }, 500); // wait at least 500ms for better user experience
        }),
      ]);
      await apis?.recording.readyRecording(result.id, buffer);
    } catch (error) {
      console.error('Failed to stop recording', error);
      await apis?.popup?.dismissCurrentRecording();
      if (id) {
        await apis?.recording.removeRecording(id);
      }
    }
  }, []);

  useEffect(() => {
    // allow processing stopped event in tray menu as well:
    return events?.recording.onRecordingStatusChanged(status => {
      if (status?.status === 'stopped') {
        handleProcessStoppedRecording();
      }
    });
  }, [handleProcessStoppedRecording]);

  const handleStartRecording = useAsyncCallback(async () => {
    if (!status) {
      return;
    }
    await apis?.recording?.startRecording(status.appGroupId);
  }, [status]);

  const handleOpenFile = useAsyncCallback(async () => {
    if (!status) {
      return;
    }
    await apis?.recording?.showSavedRecordings(status.filepath);
  }, [status]);

  const controlsElement = useMemo(() => {
    if (!status) {
      return null;
    }
    if (status.status === 'new') {
      return (
        <>
          <Button variant="plain" onClick={handleDismiss}>
            {t['com.affine.recording.dismiss']()}
          </Button>
          <Button
            onClick={handleStartRecording}
            variant="primary"
            prefix={<div className={styles.recordingIcon} />}
          >
            {t['com.affine.recording.start']()}
          </Button>
        </>
      );
    } else if (status.status === 'recording') {
      return (
        <Button variant="error" onClick={handleStopRecording}>
          {t['com.affine.recording.stop']()}
        </Button>
      );
    } else if (status.status === 'stopped' || status.status === 'ready') {
      return (
        <Button
          variant="error"
          onClick={handleDismiss}
          loading={true}
          disabled
        />
      );
    } else if (status.status === 'create-block-success') {
      return (
        <Button variant="primary" onClick={handleDismiss}>
          {t['com.affine.recording.success.button']()}
        </Button>
      );
    } else if (status.status === 'create-block-failed') {
      return (
        <>
          <Button variant="plain" onClick={handleDismiss}>
            {t['com.affine.recording.dismiss']()}
          </Button>
          <Button variant="error" onClick={handleOpenFile}>
            {t['com.affine.recording.failed.button']()}
          </Button>
        </>
      );
    }
    return null;
  }, [
    handleDismiss,
    handleOpenFile,
    handleStartRecording,
    handleStopRecording,
    status,
    t,
  ]);

  if (!status) {
    return null;
  }

  return (
    <div className={styles.root}>
      <img className={styles.affineIcon} src={appIcon} alt="AFFiNE" />
      <div className={styles.text}>{textElement}</div>
      <div className={styles.controls}>{controlsElement}</div>
    </div>
  );
}
