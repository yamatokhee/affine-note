import assert from 'node:assert';

import { Logger } from '@nestjs/common';

import { S3StorageConfig, S3StorageProvider } from './s3';

export interface R2StorageConfig extends S3StorageConfig {
  accountId: string;
}

export class R2StorageProvider extends S3StorageProvider {
  constructor(config: R2StorageConfig, bucket: string) {
    assert(config.accountId, 'accountId is required for R2 storage provider');
    super(
      {
        ...config,
        forcePathStyle: true,
        endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
        // see https://github.com/aws/aws-sdk-js-v3/issues/6810
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
      },
      bucket
    );
    this.logger = new Logger(`${R2StorageProvider.name}:${bucket}`);
  }
}
