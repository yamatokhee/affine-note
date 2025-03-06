import { addSiblingAttachmentBlocks } from '@blocksuite/affine-block-attachment';
import type { DataViewBlockComponent } from '@blocksuite/affine-block-data-view';
import { insertDatabaseBlockCommand } from '@blocksuite/affine-block-database';
import {
  FigmaIcon,
  GithubIcon,
  LoomIcon,
  YoutubeIcon,
} from '@blocksuite/affine-block-embed';
import { insertImagesCommand } from '@blocksuite/affine-block-image';
import { insertLatexBlockCommand } from '@blocksuite/affine-block-latex';
import { focusBlockEnd } from '@blocksuite/affine-block-note';
import { getSurfaceBlock } from '@blocksuite/affine-block-surface';
import { insertSurfaceRefBlockCommand } from '@blocksuite/affine-block-surface-ref';
import { insertTableBlockCommand } from '@blocksuite/affine-block-table';
import { toggleEmbedCardCreateModal } from '@blocksuite/affine-components/embed-card-modal';
import {
  ArrowDownBigIcon,
  ArrowUpBigIcon,
  CopyIcon,
  DatabaseKanbanViewIcon20,
  DatabaseTableViewIcon20,
  DeleteIcon,
  FileIcon,
  HeadingIcon,
  LinkedDocIcon,
  LinkIcon,
  NewDocIcon,
  NowIcon,
  TodayIcon,
  TomorrowIcon,
  YesterdayIcon,
} from '@blocksuite/affine-components/icons';
import {
  getInlineEditorByModel,
  insertContent,
  insertInlineLatex,
  textConversionConfigs,
  textFormatConfigs,
} from '@blocksuite/affine-components/rich-text';
import { toast } from '@blocksuite/affine-components/toast';
import type {
  FrameBlockModel,
  ParagraphBlockModel,
} from '@blocksuite/affine-model';
import {
  getSelectedModelsCommand,
  getTextSelectionCommand,
} from '@blocksuite/affine-shared/commands';
import { REFERENCE_NODE } from '@blocksuite/affine-shared/consts';
import {
  FeatureFlagService,
  FileSizeLimitService,
  TelemetryProvider,
} from '@blocksuite/affine-shared/services';
import {
  createDefaultDoc,
  openFileOrFiles,
} from '@blocksuite/affine-shared/utils';
import type { BlockStdScope } from '@blocksuite/block-std';
import { viewPresets } from '@blocksuite/data-view/view-presets';
import {
  DualLinkIcon,
  ExportToPdfIcon,
  FontIcon,
  FrameIcon,
  GroupingIcon,
  ImageIcon,
  TableIcon,
  TeXIcon,
} from '@blocksuite/icons/lit';
import type { DeltaInsert } from '@blocksuite/inline';
import type { BlockModel } from '@blocksuite/store';
import { Slice, Text } from '@blocksuite/store';
import type { TemplateResult } from 'lit';

import { type SlashMenuTooltip, slashMenuToolTips } from './tooltips';
import {
  createConversionItem,
  createTextFormatItem,
  formatDate,
  formatTime,
  insideEdgelessText,
  tryRemoveEmptyLine,
} from './utils';

export type SlashMenuConfig = {
  triggerKeys: string[];
  ignoreBlockTypes: string[];
  ignoreSelector: string;
  items: SlashMenuItem[];
  maxHeight: number;
  tooltipTimeout: number;
};

export type SlashMenuStaticConfig = Omit<SlashMenuConfig, 'items'> & {
  items: SlashMenuStaticItem[];
};

export type SlashMenuItem = SlashMenuStaticItem | SlashMenuItemGenerator;

export type SlashMenuStaticItem =
  | SlashMenuGroupDivider
  | SlashMenuActionItem
  | SlashSubMenu;

export type SlashMenuGroupDivider = {
  groupName: string;
  showWhen?: (ctx: SlashMenuContext) => boolean;
};

export type SlashMenuActionItem = {
  name: string;
  description?: string;
  icon?: TemplateResult;
  tooltip?: SlashMenuTooltip;
  alias?: string[];
  showWhen?: (ctx: SlashMenuContext) => boolean;
  action: (ctx: SlashMenuContext) => void | Promise<void>;

  customTemplate?: TemplateResult<1>;
};

export type SlashSubMenu = {
  name: string;
  description?: string;
  icon?: TemplateResult;
  alias?: string[];
  showWhen?: (ctx: SlashMenuContext) => boolean;
  subMenu: SlashMenuStaticItem[];
};

export type SlashMenuItemGenerator = (
  ctx: SlashMenuContext
) => (SlashMenuGroupDivider | SlashMenuActionItem | SlashSubMenu)[];

export type SlashMenuContext = {
  std: BlockStdScope;
  model: BlockModel;
};

export const defaultSlashMenuConfig: SlashMenuConfig = {
  triggerKeys: ['/'],
  ignoreBlockTypes: ['affine:code'],
  ignoreSelector: 'affine-callout',
  maxHeight: 344,
  tooltipTimeout: 800,
  items: [
    // ---------------------------------------------------------
    { groupName: 'Basic' },
    ...textConversionConfigs
      .filter(i => i.type && ['h1', 'h2', 'h3', 'text'].includes(i.type))
      .map(createConversionItem),
    {
      name: 'Other Headings',
      icon: HeadingIcon,
      subMenu: [
        { groupName: 'Headings' },
        ...textConversionConfigs
          .filter(i => i.type && ['h4', 'h5', 'h6'].includes(i.type))
          .map<SlashMenuActionItem>(createConversionItem),
      ],
    },
    ...textConversionConfigs
      .filter(i => i.flavour === 'affine:code')
      .map<SlashMenuActionItem>(createConversionItem),

    ...textConversionConfigs
      .filter(i => i.type && ['divider', 'quote'].includes(i.type))
      .map<SlashMenuActionItem>(config => ({
        ...createConversionItem(config),
        showWhen: ({ model }) =>
          model.doc.schema.flavourSchemaMap.has(config.flavour) &&
          !insideEdgelessText(model),
      })),

    {
      name: 'Callout',
      description: 'Let your words stand out.',
      icon: FontIcon(),
      alias: ['callout'],
      showWhen: ({ model }) => {
        return model.doc.get(FeatureFlagService).getFlag('enable_callout');
      },
      action: ({ model, std }) => {
        const { doc } = model;
        const parent = doc.getParent(model);
        if (!parent) return;

        const index = parent.children.indexOf(model);
        if (index === -1) return;
        const calloutId = doc.addBlock('affine:callout', {}, parent, index + 1);
        if (!calloutId) return;
        const paragraphId = doc.addBlock('affine:paragraph', {}, calloutId);
        if (!paragraphId) return;
        std.host.updateComplete
          .then(() => {
            const paragraph = std.view.getBlock(paragraphId);
            if (!paragraph) return;
            std.command.exec(focusBlockEnd, {
              focusBlock: paragraph,
            });
          })
          .catch(console.error);
      },
    },

    {
      name: 'Inline equation',
      description: 'Create a equation block.',
      icon: TeXIcon(),
      alias: ['inlineMath, inlineEquation', 'inlineLatex'],
      action: ({ std }) => {
        std.command
          .chain()
          .pipe(getTextSelectionCommand)
          .pipe(insertInlineLatex)
          .run();
      },
    },

    // ---------------------------------------------------------
    { groupName: 'List' },
    ...textConversionConfigs
      .filter(i => i.flavour === 'affine:list')
      .map(createConversionItem),

    // ---------------------------------------------------------
    { groupName: 'Style' },
    ...textFormatConfigs
      .filter(i => !['Code', 'Link'].includes(i.name))
      .map<SlashMenuActionItem>(createTextFormatItem),

    // ---------------------------------------------------------
    {
      groupName: 'Page',
      showWhen: ({ model }) =>
        model.doc.schema.flavourSchemaMap.has('affine:embed-linked-doc'),
    },
    {
      name: 'New Doc',
      description: 'Start a new document.',
      icon: NewDocIcon,
      tooltip: slashMenuToolTips['New Doc'],
      showWhen: ({ model }) =>
        model.doc.schema.flavourSchemaMap.has('affine:embed-linked-doc'),
      action: ({ std, model }) => {
        const newDoc = createDefaultDoc(std.host.doc.workspace);
        insertContent(std.host, model, REFERENCE_NODE, {
          reference: {
            type: 'LinkedPage',
            pageId: newDoc.id,
          },
        });
      },
    },
    {
      name: 'Linked Doc',
      description: 'Link to another document.',
      icon: LinkedDocIcon,
      tooltip: slashMenuToolTips['Linked Doc'],
      alias: ['dual link'],
      showWhen: ({ std, model }) => {
        const root = model.doc.root;
        if (!root) return false;
        const linkedDocWidget = std.view.getWidget(
          'affine-linked-doc-widget',
          root.id
        );
        if (!linkedDocWidget) return false;

        return model.doc.schema.flavourSchemaMap.has('affine:embed-linked-doc');
      },
      action: ({ model, std }) => {
        const root = model.doc.root;
        if (!root) return;
        const linkedDocWidget = std.view.getWidget(
          'affine-linked-doc-widget',
          root.id
        );
        if (!linkedDocWidget) return;
        // TODO(@L-Sun): make linked-doc-widget as extension
        // @ts-expect-error same as above
        const triggerKey = linkedDocWidget.config.triggerKeys[0];

        insertContent(std.host, model, triggerKey);

        const inlineEditor = getInlineEditorByModel(std.host, model);
        // Wait for range to be updated
        inlineEditor?.slots.inlineRangeSync.once(() => {
          // TODO(@L-Sun): make linked-doc-widget as extension
          // @ts-expect-error same as above
          linkedDocWidget.show({ addTriggerKey: true });
        });
      },
    },

    // ---------------------------------------------------------
    { groupName: 'Content & Media' },
    {
      name: 'Table',
      description: 'Create a simple table.',
      icon: TableIcon(),
      tooltip: slashMenuToolTips['Table View'],
      showWhen: ({ model }) => !insideEdgelessText(model),
      action: ({ std }) => {
        std.command
          .chain()
          .pipe(getSelectedModelsCommand)
          .pipe(insertTableBlockCommand, {
            place: 'after',
            removeEmptyLine: true,
          })
          .pipe(({ insertedTableBlockId }) => {
            if (insertedTableBlockId) {
              const telemetry = std.getOptional(TelemetryProvider);
              telemetry?.track('BlockCreated', {
                blockType: 'affine:table',
              });
            }
          })
          .run();
      },
    },
    {
      name: 'Image',
      description: 'Insert an image.',
      icon: ImageIcon(),
      tooltip: slashMenuToolTips['Image'],
      showWhen: ({ model }) =>
        model.doc.schema.flavourSchemaMap.has('affine:image'),
      action: async ({ std }) => {
        const [success, ctx] = std.command
          .chain()
          .pipe(getSelectedModelsCommand)
          .pipe(insertImagesCommand, { removeEmptyLine: true })
          .run();

        if (success) await ctx.insertedImageIds;
      },
    },
    {
      name: 'Link',
      description: 'Add a bookmark for reference.',
      icon: LinkIcon,
      tooltip: slashMenuToolTips['Link'],
      showWhen: ({ model }) =>
        model.doc.schema.flavourSchemaMap.has('affine:bookmark'),
      action: async ({ std, model }) => {
        const { host } = std;
        const parentModel = host.doc.getParent(model);
        if (!parentModel) {
          return;
        }
        const index = parentModel.children.indexOf(model) + 1;
        await toggleEmbedCardCreateModal(
          host,
          'Links',
          'The added link will be displayed as a card view.',
          { mode: 'page', parentModel, index }
        );
        tryRemoveEmptyLine(model);
      },
    },
    {
      name: 'Attachment',
      description: 'Attach a file to document.',
      icon: FileIcon,
      tooltip: slashMenuToolTips['Attachment'],
      alias: ['file'],
      showWhen: ({ model }) =>
        model.doc.schema.flavourSchemaMap.has('affine:attachment'),
      action: async ({ std, model }) => {
        const file = await openFileOrFiles();
        if (!file) return;

        const maxFileSize = std.store.get(FileSizeLimitService).maxFileSize;

        await addSiblingAttachmentBlocks(std.host, [file], maxFileSize, model);
        tryRemoveEmptyLine(model);
      },
    },
    {
      name: 'PDF',
      description: 'Upload a PDF to document.',
      icon: ExportToPdfIcon({ width: '20', height: '20' }),
      tooltip: slashMenuToolTips['PDF'],
      showWhen: ({ model }) =>
        model.doc.schema.flavourSchemaMap.has('affine:attachment'),
      action: async ({ std, model }) => {
        const file = await openFileOrFiles();
        if (!file) return;

        const maxFileSize = std.store.get(FileSizeLimitService).maxFileSize;

        await addSiblingAttachmentBlocks(
          std.host,
          [file],
          maxFileSize,
          model,
          'after',
          true
        );
        tryRemoveEmptyLine(model);
      },
    },
    {
      name: 'YouTube',
      description: 'Embed a YouTube video.',
      icon: YoutubeIcon,
      tooltip: slashMenuToolTips['YouTube'],
      showWhen: ({ model }) =>
        model.doc.schema.flavourSchemaMap.has('affine:embed-youtube'),
      action: async ({ std, model }) => {
        const { host } = std;
        const parentModel = host.doc.getParent(model);
        if (!parentModel) {
          return;
        }
        const index = parentModel.children.indexOf(model) + 1;
        await toggleEmbedCardCreateModal(
          host,
          'YouTube',
          'The added YouTube video link will be displayed as an embed view.',
          { mode: 'page', parentModel, index }
        );
        tryRemoveEmptyLine(model);
      },
    },
    {
      name: 'GitHub',
      description: 'Link to a GitHub repository.',
      icon: GithubIcon,
      tooltip: slashMenuToolTips['Github'],
      showWhen: ({ model }) =>
        model.doc.schema.flavourSchemaMap.has('affine:embed-github'),
      action: async ({ std, model }) => {
        const { host } = std;
        const parentModel = host.doc.getParent(model);
        if (!parentModel) {
          return;
        }
        const index = parentModel.children.indexOf(model) + 1;
        await toggleEmbedCardCreateModal(
          host,
          'GitHub',
          'The added GitHub issue or pull request link will be displayed as a card view.',
          { mode: 'page', parentModel, index }
        );
        tryRemoveEmptyLine(model);
      },
    },
    // TODO: X Twitter

    {
      name: 'Figma',
      description: 'Embed a Figma document.',
      icon: FigmaIcon,
      tooltip: slashMenuToolTips['Figma'],
      showWhen: ({ model }) =>
        model.doc.schema.flavourSchemaMap.has('affine:embed-figma'),
      action: async ({ std, model }) => {
        const { host } = std;
        const parentModel = host.doc.getParent(model);
        if (!parentModel) {
          return;
        }
        const index = parentModel.children.indexOf(model) + 1;
        await toggleEmbedCardCreateModal(
          host,
          'Figma',
          'The added Figma link will be displayed as an embed view.',
          { mode: 'page', parentModel, index }
        );
        tryRemoveEmptyLine(model);
      },
    },

    {
      name: 'Loom',
      icon: LoomIcon,
      showWhen: ({ model }) =>
        model.doc.schema.flavourSchemaMap.has('affine:embed-loom'),
      action: async ({ std, model }) => {
        const { host } = std;
        const parentModel = host.doc.getParent(model);
        if (!parentModel) {
          return;
        }
        const index = parentModel.children.indexOf(model) + 1;
        await toggleEmbedCardCreateModal(
          host,
          'Loom',
          'The added Loom video link will be displayed as an embed view.',
          { mode: 'page', parentModel, index }
        );
        tryRemoveEmptyLine(model);
      },
    },

    {
      name: 'Equation',
      description: 'Create a equation block.',
      icon: TeXIcon(),
      alias: ['mathBlock, equationBlock', 'latexBlock'],
      action: ({ std }) => {
        std.command
          .chain()
          .pipe(getSelectedModelsCommand)
          .pipe(insertLatexBlockCommand, {
            place: 'after',
            removeEmptyLine: true,
          })
          .run();
      },
    },

    // TODO(@L-Sun): Linear

    // ---------------------------------------------------------
    ({ model, std }) => {
      const { host } = std;

      const surfaceModel = getSurfaceBlock(host.doc);
      if (!surfaceModel) return [];

      const parent = host.doc.getParent(model);
      if (!parent) return [];

      const frameModels = host.doc
        .getBlocksByFlavour('affine:frame')
        .map(block => block.model as FrameBlockModel);

      const frameItems = frameModels.map<SlashMenuActionItem>(frameModel => ({
        name: 'Frame: ' + frameModel.title,
        icon: FrameIcon(),
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
      const groupItems = groupElements.map(group => ({
        name: 'Group: ' + group.title.toString(),
        icon: GroupingIcon(),
        action: () => {
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

      const items = [...frameItems, ...groupItems];
      if (items.length !== 0) {
        return [
          {
            groupName: 'Document Group & Frame',
          },
          ...items,
        ];
      } else {
        return [];
      }
    },

    // ---------------------------------------------------------
    { groupName: 'Date' },
    () => {
      const now = new Date();
      const tomorrow = new Date();
      const yesterday = new Date();

      yesterday.setDate(yesterday.getDate() - 1);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return [
        {
          name: 'Today',
          icon: TodayIcon,
          tooltip: slashMenuToolTips['Today'],
          description: formatDate(now),
          action: ({ std, model }) => {
            insertContent(std.host, model, formatDate(now));
          },
        },
        {
          name: 'Tomorrow',
          icon: TomorrowIcon,
          tooltip: slashMenuToolTips['Tomorrow'],
          description: formatDate(tomorrow),
          action: ({ std, model }) => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            insertContent(std.host, model, formatDate(tomorrow));
          },
        },
        {
          name: 'Yesterday',
          icon: YesterdayIcon,
          tooltip: slashMenuToolTips['Yesterday'],
          description: formatDate(yesterday),
          action: ({ std, model }) => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            insertContent(std.host, model, formatDate(yesterday));
          },
        },
        {
          name: 'Now',
          icon: NowIcon,
          tooltip: slashMenuToolTips['Now'],
          description: formatTime(now),
          action: ({ std, model }) => {
            insertContent(std.host, model, formatTime(now));
          },
        },
      ];
    },

    // ---------------------------------------------------------
    { groupName: 'Database' },
    {
      name: 'Table View',
      description: 'Display items in a table format.',
      alias: ['database'],
      icon: DatabaseTableViewIcon20,
      tooltip: slashMenuToolTips['Table View'],
      showWhen: ({ model }) =>
        model.doc.schema.flavourSchemaMap.has('affine:database') &&
        !insideEdgelessText(model),
      action: ({ std }) => {
        std.command
          .chain()
          .pipe(getSelectedModelsCommand)
          .pipe(insertDatabaseBlockCommand, {
            viewType: viewPresets.tableViewMeta.type,
            place: 'after',
            removeEmptyLine: true,
          })
          .pipe(({ insertedDatabaseBlockId }) => {
            if (insertedDatabaseBlockId) {
              const telemetry = std.getOptional(TelemetryProvider);
              telemetry?.track('BlockCreated', {
                blockType: 'affine:database',
              });
            }
          })
          .run();
      },
    },
    {
      name: 'Todo',
      alias: ['todo view'],
      icon: DatabaseTableViewIcon20,
      tooltip: slashMenuToolTips['Todo'],
      showWhen: ({ model }) =>
        model.doc.schema.flavourSchemaMap.has('affine:database') &&
        !insideEdgelessText(model) &&
        !!model.doc.get(FeatureFlagService).getFlag('enable_block_query'),

      action: ({ model, std }) => {
        const { host } = std;
        const parent = host.doc.getParent(model);
        if (!parent) return;
        const index = parent.children.indexOf(model);
        const id = host.doc.addBlock(
          'affine:data-view',
          {},
          host.doc.getParent(model),
          index + 1
        );
        const dataViewModel = host.doc.getBlock(id)!;

        Promise.resolve()
          .then(() => {
            const dataView = std.view.getBlock(
              dataViewModel.id
            ) as DataViewBlockComponent | null;
            dataView?.dataSource.viewManager.viewAdd('table');
          })
          .catch(console.error);
        tryRemoveEmptyLine(model);
      },
    },
    {
      name: 'Kanban View',
      description: 'Visualize data in a dashboard.',
      alias: ['database'],
      icon: DatabaseKanbanViewIcon20,
      tooltip: slashMenuToolTips['Kanban View'],
      showWhen: ({ model }) =>
        model.doc.schema.flavourSchemaMap.has('affine:database') &&
        !insideEdgelessText(model),
      action: ({ std }) => {
        std.command
          .chain()
          .pipe(getSelectedModelsCommand)
          .pipe(insertDatabaseBlockCommand, {
            viewType: viewPresets.kanbanViewMeta.type,
            place: 'after',
            removeEmptyLine: true,
          })
          .pipe(({ insertedDatabaseBlockId }) => {
            if (insertedDatabaseBlockId) {
              const telemetry = std.getOptional(TelemetryProvider);
              telemetry?.track('BlockCreated', {
                blockType: 'affine:database',
              });
            }
          })
          .run();
      },
    },

    // ---------------------------------------------------------
    { groupName: 'Actions' },
    {
      name: 'Move Up',
      description: 'Shift this line up.',
      icon: ArrowUpBigIcon,
      tooltip: slashMenuToolTips['Move Up'],
      action: ({ std, model }) => {
        const { host } = std;
        const previousSiblingModel = host.doc.getPrev(model);
        if (!previousSiblingModel) return;

        const parentModel = host.doc.getParent(previousSiblingModel);
        if (!parentModel) return;

        host.doc.moveBlocks([model], parentModel, previousSiblingModel, true);
      },
    },
    {
      name: 'Move Down',
      description: 'Shift this line down.',
      icon: ArrowDownBigIcon,
      tooltip: slashMenuToolTips['Move Down'],
      action: ({ std, model }) => {
        const { host } = std;
        const nextSiblingModel = host.doc.getNext(model);
        if (!nextSiblingModel) return;

        const parentModel = host.doc.getParent(nextSiblingModel);
        if (!parentModel) return;

        host.doc.moveBlocks([model], parentModel, nextSiblingModel, false);
      },
    },
    {
      name: 'Copy',
      description: 'Copy this line to clipboard.',
      icon: CopyIcon,
      tooltip: slashMenuToolTips['Copy'],
      action: ({ std, model }) => {
        const slice = Slice.fromModels(std.store, [model]);

        std.clipboard
          .copy(slice)
          .then(() => {
            toast(std.host, 'Copied to clipboard');
          })
          .catch(e => {
            console.error(e);
          });
      },
    },
    {
      name: 'Duplicate',
      description: 'Create a duplicate of this line.',
      icon: DualLinkIcon(),
      tooltip: slashMenuToolTips['Copy'],
      action: ({ std, model }) => {
        if (!model.text || !(model.text instanceof Text)) {
          console.error("Can't duplicate a block without text");
          return;
        }
        const { host } = std;
        const parent = host.doc.getParent(model);
        if (!parent) {
          console.error(
            'Failed to duplicate block! Parent not found: ' +
              model.id +
              '|' +
              model.flavour
          );
          return;
        }
        const index = parent.children.indexOf(model);

        // TODO add clone model util
        host.doc.addBlock(
          model.flavour as never,
          {
            type: (model as ParagraphBlockModel).type,
            text: new Text(model.text.toDelta() as DeltaInsert[]),
            // @ts-expect-error FIXME: ts error
            checked: model.checked,
          },
          host.doc.getParent(model),
          index
        );
      },
    },
    {
      name: 'Delete',
      description: 'Remove this line permanently.',
      alias: ['remove'],
      icon: DeleteIcon,
      tooltip: slashMenuToolTips['Delete'],
      action: ({ std, model }) => {
        std.host.doc.deleteBlock(model);
      },
    },
  ],
};
