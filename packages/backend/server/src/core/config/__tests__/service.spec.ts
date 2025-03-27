import { faker } from '@faker-js/faker';
import test from 'ava';
import Sinon from 'sinon';

import { createModule } from '../../../__tests__/create-module';
import { Mockers } from '../../../__tests__/mocks';
import { Models } from '../../../models';
import { ServerService } from '../service';

const module = await createModule({
  providers: [ServerService],
});
const service = module.get(ServerService);
const user = await module.create(Mockers.User);
const models = module.get(Models);

test.afterEach(async () => {
  Sinon.reset();
});

test.after.always(async () => {
  await module.close();
});

test('should update config', async t => {
  const oldValue = service.config.server.externalUrl;
  const newValue = faker.internet.url();
  await service.updateConfig(user.id, [
    {
      module: 'server',
      key: 'externalUrl',
      value: newValue,
    },
  ]);

  t.not(service.config.server.externalUrl, oldValue);
  t.is(service.config.server.externalUrl, newValue);
});

test('should validate config before update', async t => {
  await t.throwsAsync(
    service.updateConfig(user.id, [
      {
        module: 'server',
        key: 'externalUrl',
        value: 'invalid-url@some-domain.com',
      },
    ]),
    {
      message: `Invalid config for module [server] with key [externalUrl]
Value: "invalid-url@some-domain.com"
Error: Invalid url`,
    }
  );

  t.not(service.config.server.externalUrl, 'invalid-url');

  await t.throwsAsync(
    service.updateConfig(user.id, [
      {
        module: 'auth',
        key: 'unknown-key',
        value: 'invalid-value',
      },
    ]),
    {
      message: `Invalid config for module [auth] with unknown key [unknown-key]`,
    }
  );

  // @ts-expect-error allow
  t.is(service.config.auth['unknown-key'], undefined);
});

test('should emit config.init event', async t => {
  await service.onApplicationBootstrap();
  const event = module.event.last('config.init');
  t.is(event.name, 'config.init');
  t.deepEqual(event.payload, {
    config: service.config,
  });
});

test('should revalidate config', async t => {
  const outdatedValue = service.config.server.externalUrl;
  const newValue = faker.internet.url();

  await models.appConfig.save(user.id, [
    {
      key: 'server.externalUrl',
      value: newValue,
    },
  ]);

  await service.revalidateConfig();

  t.not(service.config.server.externalUrl, outdatedValue);
  t.is(service.config.server.externalUrl, newValue);
});

test('should emit config changed event', async t => {
  const newUrl = faker.internet.url();

  await service.updateConfig(user.id, [
    {
      module: 'server',
      key: 'externalUrl',
      value: newUrl,
    },
    {
      module: 'auth',
      key: 'allowSignup',
      value: false,
    },
  ]);

  const updates = {
    server: {
      externalUrl: newUrl,
    },
    auth: {
      allowSignup: false,
    },
  };

  t.true(
    module.event.emit.calledOnceWith('config.changed', {
      updates,
    })
  );
  t.true(
    module.event.broadcast.calledOnceWith('config.changed.broadcast', {
      updates,
    })
  );
});
