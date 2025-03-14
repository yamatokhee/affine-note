import { createIdentifier } from '@blocksuite/global/di';
import type { ExtensionType } from '@blocksuite/store';

import type { BlockLayoutPainter } from '../types';

export const BlockPainterProvider = createIdentifier<BlockLayoutPainter>(
  'block-painter-provider'
);

export const BlockLayoutPainterExtension = (
  type: string,
  painter: new () => BlockLayoutPainter
): ExtensionType => {
  return {
    setup: di => {
      di.addImpl(BlockPainterProvider(type), painter);
    },
  };
};
