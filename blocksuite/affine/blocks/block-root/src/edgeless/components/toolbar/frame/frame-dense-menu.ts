import { EdgelessFrameManagerIdentifier } from '@blocksuite/affine-block-frame';
import { menu } from '@blocksuite/affine-components/context-menu';
import { FrameIcon } from '@blocksuite/icons/lit';

import type { DenseMenuBuilder } from '../common/type.js';
import { FrameConfig } from './config.js';

export const buildFrameDenseMenu: DenseMenuBuilder = (edgeless, gfx) =>
  menu.subMenu({
    name: 'Frame',
    prefix: FrameIcon({ width: '20px', height: '20px' }),
    select: () => gfx.tool.setTool({ type: 'frame' }),
    isSelected: gfx.tool.currentToolName$.peek() === 'frame',
    options: {
      items: [
        menu.action({
          name: 'Custom',
          select: () => gfx.tool.setTool({ type: 'frame' }),
        }),
        ...FrameConfig.map(config =>
          menu.action({
            name: `Slide ${config.name}`,
            select: () => {
              const frame = edgeless.std.get(EdgelessFrameManagerIdentifier);
              gfx.tool.setTool('default');
              frame.createFrameOnViewportCenter(config.wh);
            },
          })
        ),
      ],
    },
  });
