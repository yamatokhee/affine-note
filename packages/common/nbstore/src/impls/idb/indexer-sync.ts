import { share } from '../../connection';
import type { DocClock } from '../../storage/doc';
import { IndexerSyncStorageBase } from '../../storage/indexer-sync';
import { IDBConnection, type IDBConnectionOptions } from './db';

export class IndexedDBIndexerSyncStorage extends IndexerSyncStorageBase {
  static readonly identifier = 'IndexedDBIndexerSyncStorage';

  readonly connection = share(new IDBConnection(this.options));

  constructor(private readonly options: IDBConnectionOptions) {
    super();
  }

  async getDocIndexedClock(docId: string): Promise<DocClock | null> {
    const tx = this.connection.inner.db.transaction('indexerSync', 'readonly');
    const store = tx.store;
    const result = await store.get(docId);
    return result
      ? { docId: result.docId, timestamp: result.indexedClock }
      : null;
  }

  async setDocIndexedClock(docClock: DocClock): Promise<void> {
    const tx = this.connection.inner.db.transaction('indexerSync', 'readwrite');
    const store = tx.store;
    await store.put({
      docId: docClock.docId,
      indexedClock: docClock.timestamp,
    });
  }

  async clearDocIndexedClock(docId: string): Promise<void> {
    const tx = this.connection.inner.db.transaction('indexerSync', 'readwrite');
    const store = tx.store;
    await store.delete(docId);
  }
}
