import { ParagraphLayoutPainter } from '@blocksuite/affine-block-paragraph/turbo-painter';
import { ViewportLayoutPainter } from '@blocksuite/affine-gfx-turbo-renderer/painter';

new ViewportLayoutPainter({
  'affine:paragraph': new ParagraphLayoutPainter(),
});
