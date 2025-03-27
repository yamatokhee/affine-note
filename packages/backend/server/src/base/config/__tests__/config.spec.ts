import test from 'ava';

import { createModule } from '../../../__tests__/create-module';
import { ConfigFactory, ConfigModule } from '..';
import { Config } from '../config';

const module = await createModule();
test.after.always(async () => {
  await module.close();
});

test('should create config', t => {
  const config = module.get(Config);

  t.is(typeof config.auth.passwordRequirements.max, 'number');
  t.is(typeof config.job.queue, 'object');
});

test('should override config', async t => {
  await using module = await createModule({
    imports: [
      ConfigModule.override({
        auth: {
          passwordRequirements: {
            max: 100,
            min: 6,
          },
        },
        job: {
          queues: {
            notification: {
              concurrency: 1000,
            },
          },
        },
      }),
    ],
  });

  const config = module.get(Config);
  const configFactory = module.get(ConfigFactory);

  t.deepEqual(config.auth.passwordRequirements, {
    max: 100,
    min: 6,
  });

  configFactory.override({
    auth: {
      passwordRequirements: {
        max: 10,
      },
    },
  });

  t.deepEqual(config.auth.passwordRequirements, {
    max: 10,
    min: 6,
  });
});

test('should validate config', t => {
  const config = module.get(ConfigFactory);

  t.notThrows(() =>
    config.validate([
      {
        module: 'auth',
        key: 'passwordRequirements',
        value: { max: 10, min: 6 },
      },
    ])
  );

  t.throws(
    () =>
      config.validate([
        {
          module: 'auth',
          key: 'passwordRequirements',
          value: { max: 10, min: 10 },
        },
      ]),
    {
      message: `Invalid config for module [auth] with key [passwordRequirements]
Value: {"max":10,"min":10}
Error: Minimum length of password must be less than maximum length`,
    }
  );
});
