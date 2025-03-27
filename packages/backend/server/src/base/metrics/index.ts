import './config';

import { Global, Module } from '@nestjs/common';

import { OpentelemetryFactory } from './opentelemetry';

@Global()
@Module({
  providers: [OpentelemetryFactory],
})
export class MetricsModule {}

export * from './metrics';
export * from './utils';
export { OpentelemetryFactory };
