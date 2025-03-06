import { updateBlockType } from '@blocksuite/affine-block-note';
import {
  formatBlockCommand,
  type TextConversionConfig,
  type TextFormatConfig,
} from '@blocksuite/affine-components/rich-text';
import { isInsideBlockByFlavour } from '@blocksuite/affine-shared/utils';
import { BlockSelection } from '@blocksuite/block-std';
import { assertType } from '@blocksuite/global/utils';
import type { BlockModel } from '@blocksuite/store';

import type {
  SlashMenuActionItem,
  SlashMenuContext,
  SlashMenuGroupDivider,
  SlashMenuItem,
  SlashMenuItemGenerator,
  SlashMenuStaticItem,
  SlashSubMenu,
} from './config.js';
import { slashMenuToolTips } from './tooltips/index.js';

export function isGroupDivider(
  item: SlashMenuStaticItem
): item is SlashMenuGroupDivider {
  return 'groupName' in item;
}

export function notGroupDivider(
  item: SlashMenuStaticItem
): item is Exclude<SlashMenuStaticItem, SlashMenuGroupDivider> {
  return !isGroupDivider(item);
}

export function isActionItem(
  item: SlashMenuStaticItem
): item is SlashMenuActionItem {
  return 'action' in item;
}

export function isSubMenuItem(item: SlashMenuStaticItem): item is SlashSubMenu {
  return 'subMenu' in item;
}

export function isMenuItemGenerator(
  item: SlashMenuItem
): item is SlashMenuItemGenerator {
  return typeof item === 'function';
}

export function slashItemClassName(item: SlashMenuStaticItem) {
  const name = isGroupDivider(item) ? item.groupName : item.name;

  return name.split(' ').join('-').toLocaleLowerCase();
}

export function filterEnabledSlashMenuItems(
  items: SlashMenuItem[],
  context: SlashMenuContext
): SlashMenuStaticItem[] {
  const result = items
    .map(item => (isMenuItemGenerator(item) ? item(context) : item))
    .flat()
    .filter(item => (item.showWhen ? item.showWhen(context) : true))
    .map(item => {
      if (isSubMenuItem(item)) {
        return {
          ...item,
          subMenu: filterEnabledSlashMenuItems(item.subMenu, context),
        };
      } else {
        return { ...item };
      }
    });
  return result;
}

export function getFirstNotDividerItem(
  items: SlashMenuStaticItem[]
): SlashMenuActionItem | SlashSubMenu | null {
  const firstItem = items.find(item => !isGroupDivider(item));
  assertType<SlashMenuActionItem | SlashSubMenu | undefined>(firstItem);
  return firstItem ?? null;
}

export function insideEdgelessText(model: BlockModel) {
  return isInsideBlockByFlavour(model.doc, model, 'affine:edgeless-text');
}

export function tryRemoveEmptyLine(model: BlockModel) {
  if (model.text?.length === 0) {
    model.doc.deleteBlock(model);
  }
}

export function createConversionItem(
  config: TextConversionConfig
): SlashMenuActionItem {
  const { name, description, icon, flavour, type } = config;
  return {
    name,
    description,
    icon,
    tooltip: slashMenuToolTips[name],
    showWhen: ({ model }) => model.doc.schema.flavourSchemaMap.has(flavour),
    action: ({ std }) => {
      std.command.exec(updateBlockType, {
        flavour,
        props: { type },
      });
    },
  };
}

export function createTextFormatItem(
  config: TextFormatConfig
): SlashMenuActionItem {
  const { name, icon, id, action } = config;
  return {
    name,
    icon,
    tooltip: slashMenuToolTips[name],
    action: ({ std, model }) => {
      const { host } = std;

      if (model.text?.length !== 0) {
        std.command.exec(formatBlockCommand, {
          blockSelections: [
            std.selection.create(BlockSelection, {
              blockId: model.id,
            }),
          ],
          styles: { [id]: true },
        });
      } else {
        // like format bar when the line is empty
        action(host);
      }
    },
  };
}

export function formatDate(date: Date) {
  // yyyy-mm-dd
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const strTime = `${year}-${month}-${day}`;
  return strTime;
}

export function formatTime(date: Date) {
  // mm-dd hh:mm
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const strTime = `${month}-${day} ${hours}:${minutes}`;
  return strTime;
}
