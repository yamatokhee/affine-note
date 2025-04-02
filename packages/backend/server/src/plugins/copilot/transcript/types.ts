import { z } from 'zod';

import { OneMB } from '../../../base';

export const TranscriptionResponseSchema = z
  .object({
    a: z.string().describe("speaker's name, for example A, B, C"),
    s: z.number().describe('start time(second) of the transcription'),
    e: z.number().describe('end time(second) of the transcription'),
    t: z.string().describe('transcription text'),
  })
  .array();

const TranscriptionItemSchema = z.object({
  speaker: z.string(),
  start: z.string(),
  end: z.string(),
  transcription: z.string(),
});

export const TranscriptionSchema = z.array(TranscriptionItemSchema);

export const TranscriptPayloadSchema = z.object({
  url: z.string().nullable().optional(),
  mimeType: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  transcription: TranscriptionSchema.nullable().optional(),
});

export type TranscriptionItem = z.infer<typeof TranscriptionItemSchema>;
export type Transcription = z.infer<typeof TranscriptionSchema>;
export type TranscriptionPayload = z.infer<typeof TranscriptPayloadSchema>;

declare global {
  interface Events {
    'workspace.file.transcript.finished': {
      jobId: string;
    };
    'workspace.file.transcript.failed': {
      jobId: string;
    };
  }
  interface Jobs {
    'copilot.transcript.submit': {
      jobId: string;
      url: string;
      mimeType: string;
    };
    'copilot.transcript.summary.submit': {
      jobId: string;
    };
    'copilot.transcript.title.submit': {
      jobId: string;
    };
  }
}

export const MAX_TRANSCRIPTION_SIZE = 50 * OneMB;
