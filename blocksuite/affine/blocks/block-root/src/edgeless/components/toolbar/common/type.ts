import type { MenuConfig } from '@blocksuite/affine-components/context-menu';
import type { BlockComponent } from '@blocksuite/block-std';
import type { GfxController } from '@blocksuite/block-std/gfx';

/**
 * Helper function to build a menu configuration for a tool in dense mode
 */
export type DenseMenuBuilder = (
  edgeless: BlockComponent,
  gfx: GfxController
) => MenuConfig;
