import type { IBound } from '@blocksuite/global/gfx';
import type {
  GfxLocalElementModel,
  GfxPrimitiveElementModel,
} from '@blocksuite/std/gfx';

import { ElementRendererExtension } from '../../extensions/element-renderer.js';
import type { RoughCanvas } from '../../index.js';
import type { CanvasRenderer } from '../canvas-renderer.js';
import { brush } from './brush/index.js';
import { connector } from './connector/index.js';
import { group } from './group/index.js';
import { highlighter } from './highlighter/index.js';
import { mindmap } from './mindmap.js';
import { shape } from './shape/index.js';
import { text } from './text/index.js';
export { normalizeShapeBound } from './shape/utils.js';

export type ElementRenderer<
  T extends
    | GfxPrimitiveElementModel
    | GfxLocalElementModel = GfxPrimitiveElementModel,
> = (
  model: T,
  ctx: CanvasRenderingContext2D,
  matrix: DOMMatrix,
  renderer: CanvasRenderer,
  rc: RoughCanvas,
  viewportBound: IBound
) => void;

export const BrushElementRendererExtension = ElementRendererExtension(
  'brush',
  brush
);

export const HighlighterElementRendererExtension = ElementRendererExtension(
  'highlighter',
  highlighter
);

export const ConnectorElementRendererExtension = ElementRendererExtension(
  'connector',
  connector
);

export const GroupElementRendererExtension = ElementRendererExtension(
  'group',
  group
);

export const ShapeElementRendererExtension = ElementRendererExtension(
  'shape',
  shape
);

export const TextElementRendererExtension = ElementRendererExtension(
  'text',
  text
);

export const MindmapElementRendererExtension = ElementRendererExtension(
  'mindmap',
  mindmap
);

export const elementRendererExtensions = [
  BrushElementRendererExtension,
  HighlighterElementRendererExtension,
  ConnectorElementRendererExtension,
  GroupElementRendererExtension,
  ShapeElementRendererExtension,
  TextElementRendererExtension,
  MindmapElementRendererExtension,
];
