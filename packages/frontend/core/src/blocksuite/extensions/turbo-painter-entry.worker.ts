import { ParagraphLayoutPainter } from '@blocksuite/affine/blocks/paragraph';
import { ViewportLayoutPainter } from '@blocksuite/affine/gfx/turbo-renderer';

new ViewportLayoutPainter({
  'affine:paragraph': new ParagraphLayoutPainter(),
});
