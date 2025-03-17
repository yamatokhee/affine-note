import { EdgelessFrameManagerIdentifier } from '@blocksuite/affine-block-frame';
import { getSurfaceBlock } from '@blocksuite/affine-block-surface';
import { type FrameBlockModel, NoteBlockModel } from '@blocksuite/affine-model';
import { getSelectedModelsCommand } from '@blocksuite/affine-shared/commands';
import { matchModels } from '@blocksuite/affine-shared/utils';
import {
  type SlashMenuActionItem,
  type SlashMenuConfig,
  SlashMenuConfigExtension,
  type SlashMenuItem,
} from '@blocksuite/affine-widget-slash-menu';
import { GfxControllerIdentifier } from '@blocksuite/block-std/gfx';
import { Bound } from '@blocksuite/global/gfx';
import { FrameIcon, GroupingIcon } from '@blocksuite/icons/lit';

import { insertSurfaceRefBlockCommand } from '../commands';
import { EdgelessTooltip } from './tooltips';

const surfaceRefSlashMenuConfig: SlashMenuConfig = {
  items: ({ std }) => {
    let index = 0;

    const insertBlankFrameItem: SlashMenuItem = {
      name: 'Frame',
      description: 'Insert a blank frame',
      icon: FrameIcon(),
      tooltip: {
        figure: EdgelessTooltip,
        caption: 'Edgeless',
      },
      group: `5_Edgeless Element@${index++}`,
      action: ({ std, model }) => {
        const { root } = std.store;
        if (!root) return;

        const pageBlock = root.children.find(
          (model): model is NoteBlockModel =>
            matchModels(model, [NoteBlockModel]) && model.isPageBlock()
        );
        if (!pageBlock) return;

        const top = pageBlock.x;
        const right = pageBlock.x + pageBlock.w;
        const padding = 20;

        let frameBound = Bound.fromXYWH([right + padding, top, 1600, 900]);
        const gfx = std.get(GfxControllerIdentifier);

        // Find a space to insert the frame
        let elementInFrameBound = gfx.grid.search(frameBound);
        while (elementInFrameBound.length > 0) {
          const rightElement = elementInFrameBound.reduce((a, b) => {
            return a.x + a.w > b.x + b.w ? a : b;
          });
          frameBound.x = rightElement.x + rightElement.w + padding;
          elementInFrameBound = gfx.grid.search(frameBound);
        }

        const frameMgr = std.get(EdgelessFrameManagerIdentifier);
        const frame = frameMgr.createFrameOnBound(frameBound);

        std.command.exec(insertSurfaceRefBlockCommand, {
          reference: frame.id,
          place: 'after',
          removeEmptyLine: true,
          selectedModels: [model],
        });
      },
    };

    const surfaceModel = getSurfaceBlock(std.store);
    if (!surfaceModel) return [];

    const frameModels = std.store
      .getBlocksByFlavour('affine:frame')
      .map(block => block.model as FrameBlockModel);

    const frameItems = frameModels.map<SlashMenuActionItem>(frameModel => ({
      name: 'Frame: ' + frameModel.props.title,
      icon: FrameIcon(),
      group: `5_Edgeless Element@${index++}`,
      tooltip: {
        figure: EdgelessTooltip,
        caption: 'Edgeless',
      },
      action: ({ std }) => {
        std.command
          .chain()
          .pipe(getSelectedModelsCommand)
          .pipe(insertSurfaceRefBlockCommand, {
            reference: frameModel.id,
            place: 'after',
            removeEmptyLine: true,
          })
          .run();
      },
    }));

    const groupElements = surfaceModel.getElementsByType('group');
    const groupItems = groupElements.map<SlashMenuActionItem>(group => ({
      name: 'Group: ' + group.title.toString(),
      icon: GroupingIcon(),
      group: `5_Edgeless Element@${index++}`,
      tooltip: {
        figure: EdgelessTooltip,
        caption: 'Edgeless',
      },
      action: ({ std }) => {
        std.command
          .chain()
          .pipe(getSelectedModelsCommand)
          .pipe(insertSurfaceRefBlockCommand, {
            reference: group.id,
            place: 'after',
            removeEmptyLine: true,
          })
          .run();
      },
    }));

    return [insertBlankFrameItem, ...frameItems, ...groupItems];
  },
};

export const SurfaceRefSlashMenuConfigExtension = SlashMenuConfigExtension(
  'affine:surface-ref',
  surfaceRefSlashMenuConfig
);
