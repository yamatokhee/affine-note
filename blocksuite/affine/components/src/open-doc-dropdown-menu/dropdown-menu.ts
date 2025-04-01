import {
  type OpenDocMode,
  type ToolbarAction,
  ToolbarContext,
} from '@blocksuite/affine-shared/services';
import { unsafeCSSVarV2 } from '@blocksuite/affine-shared/theme';
import { SignalWatcher, WithDisposable } from '@blocksuite/global/lit';
import { PropTypes, requiredProperties } from '@blocksuite/std';
import type { ReadonlySignal } from '@preact/signals-core';
import { css, html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit-html/directives/if-defined.js';
import { repeat } from 'lit-html/directives/repeat.js';

import { EditorChevronDown } from '../toolbar';

@requiredProperties({
  actions: PropTypes.array,
  context: PropTypes.instanceOf(ToolbarContext),
  openDocMode$: PropTypes.object,
  updateOpenDocMode: PropTypes.instanceOf(Function),
})
export class OpenDocDropdownMenu extends SignalWatcher(
  WithDisposable(LitElement)
) {
  static override styles = css`
    div[data-orientation] {
      width: 264px;
      gap: 4px;
      min-width: unset;
      overflow: unset;
    }

    editor-menu-action {
      .label {
        display: flex;
        flex: 1;
        justify-content: space-between;
      }

      .shortcut {
        color: ${unsafeCSSVarV2('text/secondary')};
      }
    }
  `;

  @property({ attribute: false })
  accessor actions!: (ToolbarAction & {
    mode: OpenDocMode;
    shortcut?: string;
  })[];

  @property({ attribute: false })
  accessor context!: ToolbarContext;

  @property({ attribute: false })
  accessor openDocMode$!: ReadonlySignal<OpenDocMode>;

  @property({ attribute: false })
  accessor updateOpenDocMode!: (mode: OpenDocMode) => void;

  override render() {
    const {
      actions,
      context,
      openDocMode$: { value: openDocMode },
      updateOpenDocMode,
    } = this;
    const currentAction =
      actions.find(a => a.mode === openDocMode) ?? actions[0];

    return html`
      <editor-menu-button
        aria-label="Open doc menu"
        .contentPadding="${'8px'}"
        .button=${html`
          <editor-icon-button
            data-open-doc-mode="${currentAction.label}"
            aria-label="Open doc"
            .tooltip="${'Open doc'}"
            .justify="${'space-between'}"
            .labelHeight="${'20px'}"
            .iconContainerWidth="${'84px'}"
          >
            ${currentAction.icon}
            <span class="label">Open</span> ${EditorChevronDown}
          </editor-icon-button>
        `}
      >
        <div data-orientation="vertical">
          ${repeat(
            actions,
            action => action.id,
            ({ label, icon, run, disabled, mode, shortcut }) => html`
              <editor-menu-action
                aria-label=${ifDefined(label)}
                ?disabled=${ifDefined(disabled)}
                @click=${() => {
                  run?.(context);
                  updateOpenDocMode(mode);
                }}
              >
                ${icon}
                <div class="label">
                  ${label}
                  <span class="shortcut">${shortcut}</span>
                </div>
              </editor-menu-action>
            `
          )}
        </div>
      </editor-menu-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-open-doc-dropdown-menu': OpenDocDropdownMenu;
  }
}
