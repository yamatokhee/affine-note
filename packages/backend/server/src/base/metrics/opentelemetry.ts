import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';
import { Instrumentation } from '@opentelemetry/instrumentation';
import { GraphQLInstrumentation } from '@opentelemetry/instrumentation-graphql';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { IORedisInstrumentation } from '@opentelemetry/instrumentation-ioredis';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { SocketIoInstrumentation } from '@opentelemetry/instrumentation-socket.io';
import { Resource } from '@opentelemetry/resources';
import { MetricProducer, MetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  BatchSpanProcessor,
  SpanExporter,
  TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace-node';
import {
  ATTR_K8S_NAMESPACE_NAME,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions/incubating';
import prismaInstrument from '@prisma/instrumentation';

import { Config } from '../config';
import { OnEvent } from '../event/def';
import { registerCustomMetrics } from './metrics';
import { PrismaMetricProducer } from './prisma';

const { PrismaInstrumentation } = prismaInstrument;

export abstract class BaseOpentelemetryFactory {
  abstract getMetricReader(): MetricReader;
  abstract getSpanExporter(): SpanExporter;

  getInstractions(): Instrumentation[] {
    return [
      new NestInstrumentation(),
      new IORedisInstrumentation(),
      new SocketIoInstrumentation({ traceReserved: true }),
      new GraphQLInstrumentation({ mergeItems: true }),
      new HttpInstrumentation(),
      new PrismaInstrumentation(),
    ];
  }

  getMetricsProducers(): MetricProducer[] {
    return [new PrismaMetricProducer()];
  }

  getResource() {
    return new Resource({
      [ATTR_K8S_NAMESPACE_NAME]: env.NAMESPACE,
      [ATTR_SERVICE_NAME]: env.FLAVOR,
      [ATTR_SERVICE_VERSION]: env.version,
    });
  }

  create() {
    const traceExporter = this.getSpanExporter();
    return new NodeSDK({
      resource: this.getResource(),
      sampler: new TraceIdRatioBasedSampler(0.1),
      traceExporter,
      metricReader: this.getMetricReader(),
      spanProcessor: new BatchSpanProcessor(traceExporter),
      textMapPropagator: new CompositePropagator({
        propagators: [
          new W3CBaggagePropagator(),
          new W3CTraceContextPropagator(),
        ],
      }),
      instrumentations: this.getInstractions(),
      serviceName: 'affine-cloud',
    });
  }
}

@Injectable()
export class OpentelemetryFactory
  extends BaseOpentelemetryFactory
  implements OnModuleDestroy
{
  private readonly logger = new Logger(OpentelemetryFactory.name);
  #sdk: NodeSDK | null = null;

  constructor(private readonly config: Config) {
    super();
  }

  @OnEvent('config.init')
  async init(event: Events['config.init']) {
    if (event.config.metrics.enabled) {
      await this.setup();
      registerCustomMetrics();
    }
  }

  @OnEvent('config.changed')
  async onConfigChanged(event: Events['config.changed']) {
    if ('metrics' in event.updates) {
      await this.setup();
    }
  }

  async onModuleDestroy() {
    await this.#sdk?.shutdown();
  }

  override getMetricReader(): MetricReader {
    return new PrometheusExporter({
      metricProducers: this.getMetricsProducers(),
    });
  }

  override getSpanExporter(): SpanExporter {
    return new ZipkinExporter();
  }

  private async setup() {
    if (this.config.metrics.enabled) {
      if (!this.#sdk) {
        this.#sdk = this.create();
      }
      this.#sdk.start();
      this.logger.log('OpenTelemetry SDK started');
    } else {
      await this.#sdk?.shutdown();
      this.#sdk = null;
      this.logger.log('OpenTelemetry SDK stopped');
    }
  }
}
