import type { StorageConstructor } from '..';
import { SqliteBlobStorage } from './blob';
import { SqliteDocStorage } from './doc';
import { SqliteDocSyncStorage } from './doc-sync';

export * from './blob';
export { bindNativeDBApis, type NativeDBApis } from './db';
export * from './doc';
export * from './doc-sync';

export const sqliteStorages = [
  SqliteDocStorage,
  SqliteBlobStorage,
  SqliteDocSyncStorage,
] satisfies StorageConstructor[];
