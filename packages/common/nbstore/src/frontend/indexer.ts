import type { IndexerStorage } from '../storage';
import type { IndexerSync } from '../sync/indexer';

export class IndexerFrontend {
  constructor(
    public readonly storage: IndexerStorage,
    public readonly sync: IndexerSync
  ) {}

  get state$() {
    return this.sync.state$;
  }

  docState$(docId: string) {
    return this.sync.docState$(docId);
  }

  search = this.storage.search.bind(this.storage);
  aggregate = this.storage.aggregate.bind(this.storage);
  // eslint-disable-next-line rxjs/finnish
  search$ = this.storage.search$.bind(this.storage);
  // eslint-disable-next-line rxjs/finnish
  aggregate$ = this.storage.aggregate$.bind(this.storage);

  addPriority(docId: string, priority: number) {
    return this.sync.addPriority(docId, priority);
  }

  waitForCompleted(signal?: AbortSignal) {
    return this.sync.waitForCompleted(signal);
  }

  waitForDocCompleted(docId: string, signal?: AbortSignal) {
    return this.sync.waitForDocCompleted(docId, signal);
  }

  waitForDocCompletedWithPriority(
    docId: string,
    priority: number,
    signal?: AbortSignal
  ) {
    const undo = this.addPriority(docId, priority);
    return this.sync.waitForDocCompleted(docId, signal).finally(() => undo());
  }
}
