import type { StorageConstructor } from '..';
import { IndexedDBBlobStorage } from './blob';
import { IndexedDBDocStorage } from './doc';
import { IndexedDBDocSyncStorage } from './doc-sync';

export * from './blob';
export * from './doc';
export * from './doc-sync';

export const idbStorages = [
  IndexedDBDocStorage,
  IndexedDBBlobStorage,
  IndexedDBDocSyncStorage,
] satisfies StorageConstructor[];
