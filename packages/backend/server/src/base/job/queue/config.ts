import { QueueOptions, WorkerOptions } from 'bullmq';

import { defineModuleConfig, JSONSchema } from '../../config';
import { Queue } from './def';

declare global {
  interface AppConfigSchema {
    job: {
      queue: ConfigItem<Omit<QueueOptions, 'connection' | 'telemetry'>>;
      worker: ConfigItem<{
        defaultWorkerOptions: Omit<WorkerOptions, 'connection' | 'telemetry'>;
      }>;
      queues: {
        [key in Queue]: ConfigItem<{
          concurrency: number;
        }>;
      };
    };
  }
}

const schema: JSONSchema = {
  type: 'object',
  properties: {
    concurrency: { type: 'number' },
  },
};

defineModuleConfig('job', {
  queue: {
    desc: 'The config for job queues',
    default: {
      prefix: env.testing ? 'affine_job_test' : 'affine_job',
      defaultJobOptions: {
        attempts: 5,
        // should remove job after it's completed, because we will add a new job with the same job id
        removeOnComplete: true,
        removeOnFail: {
          age: 24 * 3600 /* 1 day */,
          count: 500,
        },
      },
    },
    link: 'https://api.docs.bullmq.io/interfaces/v5.QueueOptions.html',
  },

  worker: {
    desc: 'The config for job workers',
    default: {
      defaultWorkerOptions: {},
    },
    link: 'https://api.docs.bullmq.io/interfaces/v5.WorkerOptions.html',
  },

  'queues.copilot': {
    desc: 'The config for copilot job queue',
    default: {
      concurrency: 1,
    },
    schema,
  },

  'queues.doc': {
    desc: 'The config for doc job queue',
    default: {
      concurrency: 1,
    },
    schema,
  },

  'queues.notification': {
    desc: 'The config for notification job queue',
    default: {
      concurrency: 10,
    },
    schema,
  },

  'queues.nightly': {
    desc: 'The config for nightly job queue',
    default: {
      concurrency: 1,
    },
    schema,
  },
});
