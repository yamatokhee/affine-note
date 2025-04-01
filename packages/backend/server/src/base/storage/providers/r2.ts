import assert from 'node:assert';
import { Readable } from 'node:stream';

import { Logger } from '@nestjs/common';

import { GetObjectMetadata } from './provider';
import { S3StorageConfig, S3StorageProvider } from './s3';

export interface R2StorageConfig extends S3StorageConfig {
  accountId: string;
  // r2 public domain with verification
  // see https://developers.cloudflare.com/waf/custom-rules/use-cases/configure-token-authentication/ to configure it
  // example rule: is_timed_hmac_valid_v0("your_secret", http.request.uri, 10800, http.request.timestamp.sec, 6)
  signDomain?: string;
  signKey?: string;
}

export class R2StorageProvider extends S3StorageProvider {
  private readonly encoder = new TextEncoder();
  private readonly key: Uint8Array;

  constructor(
    private readonly config: R2StorageConfig,
    bucket: string
  ) {
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
    this.key = this.encoder.encode(config.signKey);
  }

  private async signUrl(url: URL): Promise<string> {
    const timestamp = Math.floor(Date.now() / 1000);
    const key = await crypto.subtle.importKey(
      'raw',
      this.key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );
    const mac = await crypto.subtle.sign(
      'HMAC',
      key,
      this.encoder.encode(`${url.pathname}${timestamp}`)
    );

    const base64Mac = Buffer.from(mac).toString('base64');
    url.searchParams.set('sign', `${timestamp}-${base64Mac}`);
    return url.toString();
  }

  override async get(
    key: string,
    signedUrl?: boolean
  ): Promise<{
    body?: Readable;
    metadata?: GetObjectMetadata;
    redirectUrl?: string;
  }> {
    const { signDomain } = this.config;
    if (signedUrl && signDomain) {
      const metadata = await this.head(key);
      const url = await this.signUrl(new URL(`/${key}`, signDomain));
      if (metadata) {
        return {
          redirectUrl: url.toString(),
          metadata,
        };
      }

      // object not found
      return {};
    }

    // fallback to s3 presigned url if signDomain is not configured
    return super.get(key, signDomain ? false : signedUrl);
  }
}
