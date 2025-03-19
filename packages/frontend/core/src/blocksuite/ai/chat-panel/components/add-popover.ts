import { toast } from '@affine/component';
import { ShadowlessElement } from '@blocksuite/affine/block-std';
import { SignalWatcher, WithDisposable } from '@blocksuite/affine/global/lit';
import { scrollbarStyle } from '@blocksuite/affine/shared/styles';
import { openFileOrFiles, type Signal } from '@blocksuite/affine/shared/utils';
import {
  CollectionsIcon,
  SearchIcon,
  TagsIcon,
  UploadIcon,
} from '@blocksuite/icons/lit';
import type { DocMeta } from '@blocksuite/store';
import { css, html, type TemplateResult } from 'lit';
import { property, query, state } from 'lit/decorators.js';

import type { DocSearchMenuConfig } from '../chat-config';
import type { ChatChip } from '../chat-context';

enum AddPopoverMode {
  Default = 'default',
  Tags = 'tags',
  Collections = 'collections',
}

export type MenuGroup = {
  name: string;
  items: MenuItem[] | Signal<MenuItem[]>;
  maxDisplay?: number;
};

export type MenuItem = {
  key: string;
  name: string | TemplateResult<1>;
  icon: TemplateResult<1>;
  action: MenuAction;
  suffix?: string | TemplateResult<1>;
};

export type MenuAction = () => Promise<void> | void;

export class ChatPanelAddPopover extends SignalWatcher(
  WithDisposable(ShadowlessElement)
) {
  static override styles = css`
    .add-popover {
      width: 280px;
      max-height: 450px;
      overflow-y: auto;
      border: 0.5px solid var(--affine-border-color);
      border-radius: 4px;
      background: var(--affine-background-primary-color);
      box-shadow: var(--affine-shadow-2);
      padding: 8px;
    }
    .add-popover icon-button {
      justify-content: flex-start;
      gap: 8px;
    }
    .add-popover icon-button svg {
      width: 20px;
      height: 20px;
    }
    .add-popover .divider {
      border-top: 0.5px solid var(--affine-border-color);
      margin: 8px 0;
    }
    .search-input-wrapper {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px;
    }
    .search-input-wrapper input {
      border: none;
      line-height: 20px;
      height: 20px;
      font-size: var(--affine-font-sm);
      color: var(--affine-text-primary-color);
      flex-grow: 1;
    }
    .search-input-wrapper input::placeholder {
      color: var(--affine-placeholder-color);
    }
    .search-input-wrapper input:focus {
      outline: none;
    }
    .search-input-wrapper svg {
      width: 20px;
      height: 20px;
      color: var(--affine-v2-icon-primary);
    }
    .no-result {
      padding: 4px;
      font-size: var(--affine-font-sm);
      color: var(--affine-text-secondary-color);
    }

    ${scrollbarStyle('.add-popover')}
  `;

  @state()
  private accessor _query = '';

  @state()
  private accessor _docGroup: MenuGroup = {
    name: 'No Result',
    items: [],
  };

  private readonly tcGroup: MenuGroup = {
    name: 'Tag & Collection',
    items: [
      {
        key: 'tags',
        name: 'Tags',
        icon: TagsIcon(),
        action: () => {
          this._mode = AddPopoverMode.Tags;
        },
      },
      {
        key: 'collections',
        name: 'Collections',
        icon: CollectionsIcon(),
        action: () => {
          this._mode = AddPopoverMode.Collections;
        },
      },
    ],
  };

  private readonly _addFileChip = async () => {
    const file = await openFileOrFiles();
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast('You can only upload files less than 50MB');
      return;
    }
    this.addChip({
      file,
      state: 'processing',
    });
    this.abortController.abort();
  };

  private readonly uploadGroup: MenuGroup = {
    name: 'Upload',
    items: [
      {
        key: 'files',
        name: 'Upload files (pdf, txt, csv)',
        icon: UploadIcon(),
        action: this._addFileChip,
      },
    ],
  };

  @state()
  private accessor _activatedItemIndex = 0;

  @state()
  private accessor _mode: AddPopoverMode = AddPopoverMode.Default;

  @property({ attribute: false })
  accessor docSearchMenuConfig!: DocSearchMenuConfig;

  @property({ attribute: false })
  accessor addChip!: (chip: ChatChip) => void;

  @property({ attribute: false })
  accessor abortController!: AbortController;

  @query('.search-input')
  accessor searchInput!: HTMLInputElement;

  override connectedCallback() {
    super.connectedCallback();
    this._updateDocGroup();
  }

  override firstUpdated() {
    requestAnimationFrame(() => {
      this.searchInput.focus();
    });
  }

  override render() {
    const groups = this._getMenuGroup();
    return html`<div class="add-popover">
      ${this._renderSearchInput()} ${this._renderDivider()}
      ${this._renderMenuGroup(groups)}
    </div>`;
  }

  private _renderSearchInput() {
    return html`<div class="search-input-wrapper">
      ${SearchIcon()}
      <input
        class="search-input"
        type="text"
        placeholder=${this._getPlaceholder()}
        .value=${this._query}
        @input=${this._onInput}
      />
    </div>`;
  }

  private _getPlaceholder() {
    switch (this._mode) {
      case AddPopoverMode.Tags:
        return 'Search Tag';
      case AddPopoverMode.Collections:
        return 'Search Collection';
      default:
        return 'Search docs, tags, collections';
    }
  }

  private _renderDivider() {
    return html`<div class="divider"></div>`;
  }

  private _renderMenuGroup(groups: MenuGroup[]) {
    let startIndex = 0;
    return groups.map((group, idx) => {
      const items = Array.isArray(group.items)
        ? group.items
        : group.items.value;
      const menuGroup = html`<div class="menu-group">
        ${this._renderMenuItems(items, startIndex)}
        ${idx < groups.length - 1 ? this._renderDivider() : ''}
      </div>`;
      startIndex += items.length;
      return menuGroup;
    });
  }

  private _renderMenuItems(items: MenuItem[], startIndex: number) {
    return html`<div>
      ${items.length > 0
        ? items.map(({ key, name, icon, action }, idx) => {
            const curIdx = startIndex + idx;
            return html`<icon-button
              width="280px"
              height="30px"
              data-id=${key}
              .text=${name}
              hover=${this._activatedItemIndex === curIdx}
              @click=${() => action()?.catch(console.error)}
              @mousemove=${() => (this._activatedItemIndex = curIdx)}
            >
              ${icon}
            </icon-button>`;
          })
        : html`<div class="no-result">No Result</div>`}
    </div>`;
  }

  private _getMenuGroup() {
    switch (this._mode) {
      case AddPopoverMode.Tags:
        return [];
      case AddPopoverMode.Collections:
        return [];
      default:
        if (this._query) {
          return [this._docGroup, this.uploadGroup];
        }
        return [this._docGroup, this.tcGroup, this.uploadGroup];
    }
  }

  private _onInput(event: Event) {
    this._query = (event.target as HTMLInputElement).value;
    this._updateDocGroup();
  }

  private _updateDocGroup() {
    this._docGroup = this.docSearchMenuConfig.getDocMenuGroup(
      this._query,
      this._addDocChip,
      this.abortController.signal
    );
  }

  private readonly _addDocChip = (meta: DocMeta) => {
    this.addChip({
      docId: meta.id,
      state: 'processing',
    });
    this.abortController.abort();
  };
}
