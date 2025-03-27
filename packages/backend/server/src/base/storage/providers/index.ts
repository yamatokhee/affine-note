import { Type } from '@nestjs/common';

import { JSONSchema } from '../../config';
import { FsStorageConfig, FsStorageProvider } from './fs';
import { StorageProvider } from './provider';
import { R2StorageConfig, R2StorageProvider } from './r2';
import { S3StorageConfig, S3StorageProvider } from './s3';

export type StorageProviderName = 'fs' | 'aws-s3' | 'cloudflare-r2';
export const StorageProviders: Record<
  StorageProviderName,
  Type<StorageProvider>
> = {
  fs: FsStorageProvider,
  'aws-s3': S3StorageProvider,
  'cloudflare-r2': R2StorageProvider,
};

export type StorageProviderConfig = { bucket: string } & (
  | {
      provider: 'fs';
      config: FsStorageConfig;
    }
  | {
      provider: 'aws-s3';
      config: S3StorageConfig;
    }
  | {
      provider: 'cloudflare-r2';
      config: R2StorageConfig;
    }
);

const S3ConfigSchema: JSONSchema = {
  type: 'object',
  description:
    'The config for the s3 compatible storage provider. directly passed to aws-sdk client.\n@link https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html',
  properties: {
    credentials: {
      type: 'object',
      description: 'The credentials for the s3 compatible storage provider.',
      properties: {
        accessKeyId: {
          type: 'string',
        },
        secretAccessKey: {
          type: 'string',
        },
      },
    },
  },
};

export const StorageJSONSchema: JSONSchema = {
  oneOf: [
    {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          enum: ['fs'],
        },
        bucket: {
          type: 'string',
        },
        config: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
            },
          },
        },
      },
    },
    {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          enum: ['aws-s3'],
        },
        bucket: {
          type: 'string',
        },
        config: S3ConfigSchema,
      },
    },
    {
      type: 'object',
      properties: {
        provider: {
          type: 'string',
          enum: ['cloudflare-r2'],
        },
        bucket: {
          type: 'string',
        },
        config: {
          ...S3ConfigSchema,
          properties: {
            ...S3ConfigSchema.properties,
            accountId: {
              type: 'string' as const,
              description:
                'The account id for the cloudflare r2 storage provider.',
            },
          },
        },
      },
    },
  ],
};

export type * from './provider';
export { autoMetadata, toBuffer } from './utils';
