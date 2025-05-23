import { AiJobStatus, AiJobType } from '@prisma/client';
import type { JsonValue } from '@prisma/client/runtime/library';
import { z } from 'zod';

export interface CopilotJob {
  id?: string;
  workspaceId: string;
  blobId: string;
  createdBy?: string;
  type: AiJobType;
  status?: AiJobStatus;
  payload?: JsonValue;
}

export interface CopilotContext {
  id?: string;
  sessionId: string;
  config: JsonValue;
  createdAt: Date;
  updatedAt: Date;
}

export enum ContextEmbedStatus {
  processing = 'processing',
  finished = 'finished',
  failed = 'failed',
}

export enum ContextCategories {
  Tag = 'tag',
  Collection = 'collection',
}

const ContextEmbedStatusSchema = z.enum([
  ContextEmbedStatus.processing,
  ContextEmbedStatus.finished,
  ContextEmbedStatus.failed,
]);

const ContextDocSchema = z.object({
  id: z.string(),
  createdAt: z.number(),
});

export const ContextFileSchema = z.object({
  id: z.string(),
  chunkSize: z.number(),
  name: z.string(),
  status: ContextEmbedStatusSchema,
  error: z.string().nullable(),
  blobId: z.string(),
  createdAt: z.number(),
});

export const ContextCategorySchema = z.object({
  id: z.string(),
  type: z.enum([ContextCategories.Tag, ContextCategories.Collection]),
  docs: ContextDocSchema.merge(
    z.object({ status: ContextEmbedStatusSchema })
  ).array(),
  createdAt: z.number(),
});

export const ContextConfigSchema = z.object({
  workspaceId: z.string(),
  files: ContextFileSchema.array(),
  docs: ContextDocSchema.merge(
    z.object({ status: ContextEmbedStatusSchema.optional() })
  ).array(),
  categories: ContextCategorySchema.array(),
});

export const MinimalContextConfigSchema = ContextConfigSchema.pick({
  workspaceId: true,
});

export type ContextCategory = z.infer<typeof ContextCategorySchema>;
export type ContextConfig = z.infer<typeof ContextConfigSchema>;
export type ContextDoc = z.infer<typeof ContextConfigSchema>['docs'][number];
export type ContextFile = z.infer<typeof ContextConfigSchema>['files'][number];
export type ContextListItem = ContextDoc | ContextFile;
export type ContextList = ContextListItem[];

// embeddings

export type Embedding = {
  /**
   * The index of the embedding in the list of embeddings.
   */
  index: number;
  content: string;
  embedding: Array<number>;
};

export type ChunkSimilarity = {
  chunk: number;
  content: string;
  distance: number | null;
};

export type FileChunkSimilarity = ChunkSimilarity & {
  fileId: string;
};

export type DocChunkSimilarity = ChunkSimilarity & {
  docId: string;
};
