import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Worker } from 'bullmq';
import { difference, merge } from 'lodash-es';
import { CLS_ID, ClsServiceManager } from 'nestjs-cls';

import { Config } from '../../config';
import { OnEvent } from '../../event';
import { metrics, wrapCallMetric } from '../../metrics';
import { QueueRedis } from '../../redis';
import { genRequestId } from '../../utils';
import { JOB_SIGNAL, namespace, Queue, QUEUES } from './def';
import { JobHandlerScanner } from './scanner';

@Injectable()
export class JobExecutor implements OnModuleDestroy {
  private readonly logger = new Logger('job');
  private readonly workers: Map<Queue, Worker> = new Map();

  constructor(
    private readonly config: Config,
    private readonly redis: QueueRedis,
    private readonly scanner: JobHandlerScanner
  ) {}

  @OnEvent('config.init')
  async onConfigInit() {
    const queues = env.flavors.graphql ? difference(QUEUES, [Queue.DOC]) : [];

    // NOTE(@forehalo): only enable doc queue in doc service
    if (env.flavors.doc) {
      queues.push(Queue.DOC);
    }

    await this.startWorkers(queues);
  }

  @OnEvent('config.changed')
  async onConfigChanged({ updates }: Events['config.changed']) {
    if (updates.job?.queues) {
      Object.entries(updates.job.queues).forEach(([queue, options]) => {
        if (options.concurrency) {
          this.setConcurrency(queue as Queue, options.concurrency);
        }
      });
    }
  }

  async onModuleDestroy() {
    await this.stopWorkers();
  }

  async run(name: JobName, payload: any) {
    const ns = namespace(name);
    const handler = this.scanner.getHandler(name);

    if (!handler) {
      this.logger.warn(`Job handler for [${name}] not found.`);
      return;
    }

    const fn = wrapCallMetric(
      async () => {
        const cls = ClsServiceManager.getClsService();
        await cls.run({ ifNested: 'reuse' }, async () => {
          const requestId = cls.getId();
          if (!requestId) {
            cls.set(CLS_ID, genRequestId('job'));
          }

          const signature = `[${name}] (${handler.name})`;
          try {
            this.logger.debug(`Job started: ${signature}`);
            const result = await handler.fn(payload);

            if (result === JOB_SIGNAL.RETRY) {
              throw new Error(`Manually job retry`);
            }

            this.logger.debug(`Job finished: ${signature}`);
          } catch (e) {
            this.logger.error(`Job failed: ${signature}`, e);
            throw e;
          }
        });
      },
      'queue',
      'job_handler',
      {
        job: name,
        namespace: ns,
        handler: handler.name,
      }
    );
    const activeJobs = metrics.queue.counter('active_jobs');
    activeJobs.add(1, { queue: ns });
    try {
      await fn();
    } finally {
      activeJobs.add(-1, { queue: ns });
    }
  }

  setConcurrency(queue: Queue, concurrency: number) {
    const worker = this.workers.get(queue);
    if (!worker) {
      throw new Error(`Worker for [${queue}] not found.`);
    }

    worker.concurrency = concurrency;
  }

  private async startWorkers(queues: Queue[]) {
    for (const queue of queues) {
      const queueOptions = this.config.job.queues[queue];
      const concurrency = queueOptions.concurrency ?? 1;

      const worker = new Worker(
        queue,
        async job => {
          await this.run(job.name as JobName, job.data);
        },
        merge(
          {},
          this.config.job.queue,
          this.config.job.worker.defaultWorkerOptions,
          queueOptions,
          {
            concurrency,
            connection: this.redis,
          }
        )
      );

      worker.on('error', error => {
        this.logger.error(`Queue Worker [${queue}] error`, error);
      });

      this.logger.log(
        `Queue Worker [${queue}] started; concurrency=${concurrency};`
      );

      this.workers.set(queue, worker);
    }
  }

  private async stopWorkers() {
    await Promise.all(
      Array.from(this.workers.values()).map(async worker => {
        await worker.close(true);
      })
    );
  }
}
