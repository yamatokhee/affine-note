import { BlockViewExtension, FlavourExtension } from '@blocksuite/std';
import type { ExtensionType } from '@blocksuite/store';
import { literal } from 'lit/static-html.js';

import {
  EdgelessSurfaceBlockAdapterExtensions,
  SurfaceBlockAdapterExtensions,
} from './adapters/extension';
import {
  EdgelessCRUDExtension,
  EdgelessLegacySlotExtension,
} from './extensions';
import { ExportManagerExtension } from './extensions/export-manager/export-manager';
import { elementRendererExtensions } from './renderer/elements';

const CommonSurfaceBlockSpec: ExtensionType[] = [
  FlavourExtension('affine:surface'),
  EdgelessCRUDExtension,
  EdgelessLegacySlotExtension,
  ExportManagerExtension,
  ...elementRendererExtensions,
];

export const PageSurfaceBlockSpec: ExtensionType[] = [
  ...CommonSurfaceBlockSpec,
  ...SurfaceBlockAdapterExtensions,
  BlockViewExtension('affine:surface', literal`affine-surface-void`),
];

export const EdgelessSurfaceBlockSpec: ExtensionType[] = [
  ...CommonSurfaceBlockSpec,
  ...EdgelessSurfaceBlockAdapterExtensions,
  BlockViewExtension('affine:surface', literal`affine-surface`),
];
