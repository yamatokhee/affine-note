import type { FrameBlockModel } from '@blocksuite/affine/blocks';
import type { Store } from '@blocksuite/affine/store';

export function getFrameBlock(doc: Store) {
  const blocks = doc.getBlocksByFlavour('affine:frame');
  return blocks.length !== 0 ? (blocks[0].model as FrameBlockModel) : null;
}
