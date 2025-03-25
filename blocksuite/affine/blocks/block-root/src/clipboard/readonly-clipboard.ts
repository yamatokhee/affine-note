import { defaultImageProxyMiddleware } from '@blocksuite/affine-block-image';
import {
  AttachmentAdapter,
  ClipboardAdapter,
  copyMiddleware,
  HtmlAdapter,
  ImageAdapter,
  MixTextAdapter,
  NotionTextAdapter,
  titleMiddleware,
} from '@blocksuite/affine-shared/adapters';
import {
  copySelectedModelsCommand,
  draftSelectedModelsCommand,
  getSelectedModelsCommand,
} from '@blocksuite/affine-shared/commands';
import {
  type BlockComponent,
  ClipboardAdapterConfigExtension,
  type UIEventHandler,
} from '@blocksuite/block-std';
import { DisposableGroup } from '@blocksuite/global/disposable';
import type { ExtensionType } from '@blocksuite/store';

const SnapshotClipboardConfig = ClipboardAdapterConfigExtension({
  mimeType: ClipboardAdapter.MIME,
  adapter: ClipboardAdapter,
  priority: 100,
});

const NotionClipboardConfig = ClipboardAdapterConfigExtension({
  mimeType: 'text/_notion-text-production',
  adapter: NotionTextAdapter,
  priority: 95,
});

const HtmlClipboardConfig = ClipboardAdapterConfigExtension({
  mimeType: 'text/html',
  adapter: HtmlAdapter,
  priority: 90,
});

const imageClipboardConfigs = [
  'image/apng',
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/webp',
].map(mimeType => {
  return ClipboardAdapterConfigExtension({
    mimeType,
    adapter: ImageAdapter,
    priority: 80,
  });
});

const PlainTextClipboardConfig = ClipboardAdapterConfigExtension({
  mimeType: 'text/plain',
  adapter: MixTextAdapter,
  priority: 70,
});

const AttachmentClipboardConfig = ClipboardAdapterConfigExtension({
  mimeType: '*/*',
  adapter: AttachmentAdapter,
  priority: 60,
});

export const clipboardConfigs: ExtensionType[] = [
  SnapshotClipboardConfig,
  NotionClipboardConfig,
  HtmlClipboardConfig,
  ...imageClipboardConfigs,
  PlainTextClipboardConfig,
  AttachmentClipboardConfig,
];

/**
 * ReadOnlyClipboard is a class that provides a read-only clipboard for the root block.
 * It is supported to copy models in the root block.
 */
export class ReadOnlyClipboard {
  protected readonly _copySelected = (onCopy?: () => void) => {
    return this._std.command
      .chain()
      .with({ onCopy })
      .pipe(getSelectedModelsCommand)
      .pipe(draftSelectedModelsCommand)
      .pipe(copySelectedModelsCommand);
  };

  protected _disposables = new DisposableGroup();

  protected _initAdapters = () => {
    const copy = copyMiddleware(this._std);
    this._std.clipboard.use(copy);
    this._std.clipboard.use(
      titleMiddleware(this._std.store.workspace.meta.docMetas)
    );
    this._std.clipboard.use(defaultImageProxyMiddleware);

    this._disposables.add({
      dispose: () => {
        this._std.clipboard.unuse(copy);
        this._std.clipboard.unuse(
          titleMiddleware(this._std.store.workspace.meta.docMetas)
        );
        this._std.clipboard.unuse(defaultImageProxyMiddleware);
      },
    });
  };

  host: BlockComponent;

  onPageCopy: UIEventHandler = ctx => {
    const e = ctx.get('clipboardState').raw;
    e.preventDefault();

    this._copySelected().run();
  };

  protected get _std() {
    return this.host.std;
  }

  constructor(host: BlockComponent) {
    this.host = host;
  }

  hostConnected() {
    if (this._disposables.disposed) {
      this._disposables = new DisposableGroup();
    }
    if (navigator.clipboard) {
      this.host.handleEvent('copy', this.onPageCopy);
      this._initAdapters();
    }
  }

  hostDisconnected() {
    this._disposables.dispose();
  }
}
