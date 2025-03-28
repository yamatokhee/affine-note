import { DebugLogger } from '@affine/debug';
import { AiJobStatus } from '@affine/graphql';
import {
  type AttachmentBlockModel,
  TranscriptionBlockFlavour,
  type TranscriptionBlockModel,
} from '@blocksuite/affine/model';
import type { AffineTextAttributes } from '@blocksuite/affine/shared/types';
import { type DeltaInsert, Text } from '@blocksuite/affine/store';
import { computed } from '@preact/signals-core';
import { Entity, LiveData } from '@toeverything/infra';
import { cssVarV2 } from '@toeverything/theme/v2';

import type { WorkspaceService } from '../../workspace';
import type { AudioMediaManagerService } from '../services/audio-media-manager';
import type { AudioMedia } from './audio-media';
import { AudioTranscriptionJob } from './audio-transcription-job';
import type { TranscriptionResult } from './types';

const logger = new DebugLogger('audio-attachment-block');

// BlockSuiteError: yText must not contain "\r" because it will break the range synchronization
function sanitizeText(text: string) {
  return text.replace(/\r/g, '');
}

export class AudioAttachmentBlock extends Entity<AttachmentBlockModel> {
  private readonly refCount$ = new LiveData<number>(0);
  readonly audioMedia: AudioMedia;
  constructor(
    readonly audioMediaManagerService: AudioMediaManagerService,
    readonly workspaceService: WorkspaceService
  ) {
    super();
    const mediaRef = audioMediaManagerService.ensureMediaEntity(this.props);
    this.audioMedia = mediaRef.media;
    this.disposables.push(() => mediaRef.release());
    this.disposables.push(() => {
      this.transcriptionJob.dispose();
    });
  }

  // rendering means the attachment is visible in the editor
  // it is used to determine if we should show show the audio player on the sidebar
  rendering$ = this.refCount$.map(refCount => refCount > 0);
  expanded$ = new LiveData<boolean>(true);

  readonly transcriptionBlock$ = LiveData.fromSignal(
    computed(() => {
      // find the last transcription block
      for (const key of [...this.props.childMap.value.keys()].reverse()) {
        const block = this.props.doc.getBlock$(key);
        if (block?.flavour === TranscriptionBlockFlavour) {
          return block.model as unknown as TranscriptionBlockModel;
        }
      }
      return null;
    })
  );

  hasTranscription$ = LiveData.computed(get => {
    const transcriptionBlock = get(this.transcriptionBlock$);
    if (!transcriptionBlock) {
      return null;
    }
    const childMap = get(LiveData.fromSignal(transcriptionBlock.childMap));
    return childMap.size > 0;
  });

  transcriptionJob: AudioTranscriptionJob = this.createTranscriptionJob();

  mount() {
    if (
      this.transcriptionJob.isCreator() &&
      this.transcriptionJob.status$.value.status === 'waiting-for-job' &&
      !this.hasTranscription$.value
    ) {
      this.transcribe().catch(error => {
        logger.error('Error transcribing audio:', error);
      });
    }

    this.refCount$.setValue(this.refCount$.value + 1);
  }

  unmount() {
    this.refCount$.setValue(this.refCount$.value - 1);
  }

  private createTranscriptionJob() {
    if (!this.props.props.sourceId) {
      throw new Error('No source id');
    }

    let transcriptionBlockProps = this.transcriptionBlock$.value?.props;

    if (!transcriptionBlockProps) {
      // transcription block is not created yet, we need to create it
      this.props.doc.addBlock(
        'affine:transcription',
        {
          transcription: {},
        },
        this.props.id
      );
      transcriptionBlockProps = this.transcriptionBlock$.value?.props;
    }

    if (!transcriptionBlockProps) {
      throw new Error('No transcription block props');
    }

    const job = this.framework.createEntity(AudioTranscriptionJob, {
      blobId: this.props.props.sourceId,
      blockProps: transcriptionBlockProps,
      getAudioFile: async () => {
        const buffer = await this.audioMedia.getBuffer();
        if (!buffer) {
          throw new Error('No audio buffer available');
        }
        const blob = new Blob([buffer], { type: this.props.props.type });
        const file = new File([blob], this.props.props.name, {
          type: this.props.props.type,
        });
        return file;
      },
    });

    return job;
  }

  readonly transcribe = async () => {
    try {
      // if job is already running, we should not start it again
      if (this.transcriptionJob.status$.value.status !== 'waiting-for-job') {
        return;
      }
      const status = await this.transcriptionJob.start();
      if (status.status === AiJobStatus.claimed) {
        this.fillTranscriptionResult(status.result);
      }
    } catch (error) {
      logger.error('Error transcribing audio:', error);
      throw error;
    }
  };

  private readonly fillTranscriptionResult = (result: TranscriptionResult) => {
    this.props.props.caption = result.title ?? '';

    const calloutId = this.props.doc.addBlock(
      'affine:callout',
      {
        emoji: '💬',
      },
      this.transcriptionBlock$.value?.id
    );

    // todo: refactor
    const speakerToColors = new Map<string, string>();
    for (const segment of result.segments) {
      let color = speakerToColors.get(segment.speaker);
      const colorOptions = [
        cssVarV2.text.highlight.fg.red,
        cssVarV2.text.highlight.fg.green,
        cssVarV2.text.highlight.fg.blue,
        cssVarV2.text.highlight.fg.yellow,
        cssVarV2.text.highlight.fg.purple,
        cssVarV2.text.highlight.fg.orange,
        cssVarV2.text.highlight.fg.teal,
        cssVarV2.text.highlight.fg.grey,
        cssVarV2.text.highlight.fg.magenta,
      ];
      if (!color) {
        color = colorOptions[speakerToColors.size % colorOptions.length];
        speakerToColors.set(segment.speaker, color);
      }
      const deltaInserts: DeltaInsert<AffineTextAttributes>[] = [
        {
          insert: sanitizeText(segment.start + ' ' + segment.speaker),
          attributes: {
            color,
            bold: true,
          },
        },
        {
          insert: ': ' + sanitizeText(segment.transcription),
        },
      ];
      this.props.doc.addBlock(
        'affine:paragraph',
        {
          text: new Text(deltaInserts),
        },
        calloutId
      );
    }
  };
}
