import { getWorkerUrl } from '@affine/env/worker';
import { ListLayoutHandlerExtension } from '@blocksuite/affine/blocks/list';
import { ParagraphLayoutHandlerExtension } from '@blocksuite/affine/blocks/paragraph';
import {
  TurboRendererConfigFactory,
  ViewportTurboRendererExtension,
} from '@blocksuite/affine/gfx/turbo-renderer';

function createPainterWorker() {
  const worker = new Worker(getWorkerUrl('turbo-painter-entry.worker.js'));
  return worker;
}

export function patchTurboRendererExtension() {
  return [
    ParagraphLayoutHandlerExtension,
    ListLayoutHandlerExtension,
    TurboRendererConfigFactory({
      options: {
        zoomThreshold: 1,
        debounceTime: 1000,
      },
      painterWorkerEntry: createPainterWorker,
    }),
    ViewportTurboRendererExtension,
  ];
}
