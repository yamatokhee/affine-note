import { DummyConnection } from '../../connection';
import type { DocClock } from '../doc';
import { IndexerSyncStorageBase } from '../indexer-sync';

export class DummyIndexerSyncStorage extends IndexerSyncStorageBase {
  override connection = new DummyConnection();
  override getDocIndexedClock(_docId: string): Promise<DocClock | null> {
    return Promise.resolve(null);
  }
  override setDocIndexedClock(_docClock: DocClock): Promise<void> {
    return Promise.resolve();
  }
  override clearDocIndexedClock(_docId: string): Promise<void> {
    return Promise.resolve();
  }
}
