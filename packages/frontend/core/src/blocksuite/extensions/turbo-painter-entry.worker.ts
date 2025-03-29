import { ListLayoutPainterExtension } from '@blocksuite/affine/blocks/list';
import { ParagraphLayoutPainterExtension } from '@blocksuite/affine/blocks/paragraph';
import { ViewportLayoutPainter } from '@blocksuite/affine/gfx/turbo-renderer';

new ViewportLayoutPainter([
  ParagraphLayoutPainterExtension,
  ListLayoutPainterExtension,
]);
