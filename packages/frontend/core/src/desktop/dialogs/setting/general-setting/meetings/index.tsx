import {
  IconButton,
  Menu,
  MenuItem,
  MenuTrigger,
  Switch,
  useConfirmModal,
} from '@affine/component';
import {
  SettingHeader,
  SettingRow,
  SettingWrapper,
} from '@affine/component/setting-components';
import { useAsyncCallback } from '@affine/core/components/hooks/affine-async-hooks';
import { MeetingSettingsService } from '@affine/core/modules/media/services/meeting-settings';
import type { MeetingSettingsSchema } from '@affine/electron/main/shared-state-schema';
import { useI18n } from '@affine/i18n';
import track from '@affine/track';
import {
  ArrowRightSmallIcon,
  DoneIcon,
  InformationFillDuotoneIcon,
} from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import { useCallback, useEffect, useMemo, useState } from 'react';

import * as styles from './styles.css';

const RecordingModes: MeetingSettingsSchema['recordingMode'][] = [
  'prompt',
  'auto-start',
  'none',
];

const RecordingModeMenu = () => {
  const meetingSettingsService = useService(MeetingSettingsService);
  const settings = useLiveData(meetingSettingsService.settings$);
  const t = useI18n();

  const options = useMemo(() => {
    return RecordingModes.map(mode => ({
      label: t[`com.affine.settings.meetings.record.recording-mode.${mode}`](),
      value: mode,
    }));
  }, [t]);

  const currentMode = settings.recordingMode;

  const handleRecordingModeChange = useCallback(
    (mode: MeetingSettingsSchema['recordingMode']) => {
      meetingSettingsService.setRecordingMode(mode);
    },
    [meetingSettingsService]
  );

  return (
    <Menu
      items={options.map(option => {
        return (
          <MenuItem
            key={option.value}
            title={option.label}
            onSelect={() => handleRecordingModeChange(option.value)}
            data-selected={currentMode === option.value}
          >
            {option.label}
          </MenuItem>
        );
      })}
    >
      <MenuTrigger style={{ fontWeight: 600, width: '250px' }} block={true}>
        {options.find(option => option.value === currentMode)?.label}
      </MenuTrigger>
    </Menu>
  );
};

export const MeetingsSettings = () => {
  const t = useI18n();
  const meetingSettingsService = useService(MeetingSettingsService);
  const settings = useLiveData(meetingSettingsService.settings$);
  const [recordingFeatureAvailable, setRecordingFeatureAvailable] =
    useState(false);

  const [screenRecordingPermission, setScreenRecordingPermission] =
    useState(false);

  const confirmModal = useConfirmModal();

  useEffect(() => {
    meetingSettingsService
      .isRecordingFeatureAvailable()
      .then(available => {
        setRecordingFeatureAvailable(available ?? false);
      })
      .catch(() => {
        setRecordingFeatureAvailable(false);
      });
    meetingSettingsService
      .checkScreenRecordingPermission()
      .then(permission => {
        setScreenRecordingPermission(permission ?? false);
      })
      .catch(err => console.log(err));
  }, [meetingSettingsService]);

  const handleEnabledChange = useAsyncCallback(
    async (checked: boolean) => {
      try {
        track.$.settingsPanel.meetings.toggleMeetingFeatureFlag({
          option: checked ? 'on' : 'off',
          type: 'Meeting record',
        });
        await meetingSettingsService.setEnabled(checked);
      } catch {
        confirmModal.openConfirmModal({
          title:
            t['com.affine.settings.meetings.record.permission-modal.title'](),
          description:
            t[
              'com.affine.settings.meetings.record.permission-modal.description'
            ](),
          onConfirm: async () => {
            await meetingSettingsService.showScreenRecordingPermissionSetting();
          },
          cancelText: t['com.affine.recording.dismiss'](),
          confirmButtonOptions: {
            variant: 'primary',
          },
          confirmText:
            t[
              'com.affine.settings.meetings.record.permission-modal.open-setting'
            ](),
        });
      }
    },
    [confirmModal, meetingSettingsService, t]
  );

  const handleAutoTranscriptionChange = useCallback(
    (checked: boolean) => {
      meetingSettingsService.setAutoTranscription(checked);
    },
    [meetingSettingsService]
  );

  const handleOpenScreenRecordingPermissionSetting =
    useAsyncCallback(async () => {
      await meetingSettingsService.showScreenRecordingPermissionSetting();
    }, [meetingSettingsService]);

  const handleOpenSavedRecordings = useAsyncCallback(async () => {
    await meetingSettingsService.openSavedRecordings();
  }, [meetingSettingsService]);

  return (
    <div className={styles.meetingWrapper}>
      <SettingHeader title={t['com.affine.settings.meetings']()} />

      <SettingRow
        name={t['com.affine.settings.meetings.enable.title']()}
        desc={t['com.affine.settings.meetings.enable.description']()}
      >
        <Switch
          checked={settings.enabled}
          onChange={handleEnabledChange}
          data-testid="meetings-enable-switch"
        />
      </SettingRow>

      {recordingFeatureAvailable && (
        <>
          <SettingWrapper
            disabled={!settings.enabled}
            title={t['com.affine.settings.meetings.record.header']()}
          >
            <SettingRow
              name={t['com.affine.settings.meetings.record.recording-mode']()}
              desc={t[
                'com.affine.settings.meetings.record.recording-mode.description'
              ]()}
            >
              <RecordingModeMenu />
            </SettingRow>
            <SettingRow
              name={t['com.affine.settings.meetings.record.open-saved-file']()}
              desc={t[
                'com.affine.settings.meetings.record.open-saved-file.description'
              ]()}
            >
              <IconButton
                icon={<ArrowRightSmallIcon />}
                onClick={handleOpenSavedRecordings}
              />
            </SettingRow>
          </SettingWrapper>
          <SettingWrapper
            disabled={!settings.enabled}
            title={t['com.affine.settings.meetings.transcription.header']()}
          >
            <SettingRow
              name={t[
                'com.affine.settings.meetings.transcription.auto-transcription'
              ]()}
              desc={t[
                'com.affine.settings.meetings.transcription.auto-transcription.description'
              ]()}
            >
              <Switch
                checked={settings.autoTranscription}
                onChange={handleAutoTranscriptionChange}
                data-testid="meetings-auto-transcription-switch"
              />
            </SettingRow>
          </SettingWrapper>
          <SettingWrapper
            title={t['com.affine.settings.meetings.privacy.header']()}
          >
            <SettingRow
              name={t[
                'com.affine.settings.meetings.privacy.screen-system-audio-recording'
              ]()}
              desc={
                <>
                  {t[
                    'com.affine.settings.meetings.privacy.screen-system-audio-recording.description'
                  ]()}
                  {!screenRecordingPermission && (
                    <span
                      onClick={handleOpenScreenRecordingPermissionSetting}
                      className={styles.permissionSetting}
                    >
                      {t[
                        'com.affine.settings.meetings.privacy.screen-system-audio-recording.permission-setting'
                      ]()}
                    </span>
                  )}
                </>
              }
            >
              <IconButton
                icon={
                  screenRecordingPermission ? (
                    <DoneIcon />
                  ) : (
                    <InformationFillDuotoneIcon
                      className={styles.noPermissionIcon}
                    />
                  )
                }
                onClick={handleOpenScreenRecordingPermissionSetting}
              />
            </SettingRow>
          </SettingWrapper>
        </>
      )}
    </div>
  );
};
