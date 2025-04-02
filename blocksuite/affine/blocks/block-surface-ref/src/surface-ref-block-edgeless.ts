import { isFrameBlock } from '@blocksuite/affine-block-frame';
import {
  GroupElementModel,
  type SurfaceRefBlockModel,
} from '@blocksuite/affine-model';
import { unsafeCSSVarV2 } from '@blocksuite/affine-shared/theme';
import {
  DeleteIcon,
  EdgelessIcon,
  FrameIcon,
  GroupIcon,
  MindmapIcon,
} from '@blocksuite/icons/lit';
import { BlockComponent } from '@blocksuite/std';
import {
  GfxControllerIdentifier,
  type GfxModel,
  isPrimitiveModel,
} from '@blocksuite/std/gfx';
import { css, html, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';

import { SurfaceRefNotFoundBackground } from './icons';

const TYPE_ICON_MAP: {
  [key: string]: {
    name: string;
    icon: typeof DeleteIcon;
  };
} = {
  'affine:frame': {
    name: 'Frame',
    icon: FrameIcon,
  },
  group: {
    name: 'Group',
    icon: GroupIcon,
  },
  mindmap: {
    name: 'Mind map',
    icon: MindmapIcon,
  },
  edgeless: {
    name: 'Edgeless content',
    icon: EdgelessIcon,
  },
};

export class EdgelessSurfaceRefBlockComponent extends BlockComponent<SurfaceRefBlockModel> {
  static override styles = css`
    affine-edgeless-surface-ref {
      position: relative;
      overflow: hidden;
    }

    .affine-edgeless-surface-ref-container {
      border-radius: 8px;
      border: 1px solid
        ${unsafeCSSVarV2('layer/insideBorder/border', '#e6e6e6')};
      padding: 12px;
    }

    .affine-edgeless-surface-ref-container.not-found {
      background: ${unsafeCSSVarV2('layer/background/secondary', '#F5F5F5')};
    }

    .affine-edgeless-surface-ref-container .not-found-background {
      position: absolute;
      right: 12px;
      bottom: -5px;
    }

    .edgeless-surface-ref-content {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .edgeless-surface-ref-content > .surface-ref-heading {
      display: flex;
      align-items: center;
      gap: 8px;
      align-self: stretch;

      font-size: 14px;
      font-weight: 500;
      line-height: 22px;

      text-overflow: ellipsis;
      overflow: hidden;

      color: ${unsafeCSSVarV2('text/primary', '#141414')};
    }

    .edgeless-surface-ref-content > .surface-ref-heading svg {
      color: ${unsafeCSSVarV2('text/primary', '#141414')};
    }

    .edgeless-surface-ref-content > .surface-ref-body {
      font-size: 12px;
      font-weight: 400;
      line-height: 20px;
      color: ${unsafeCSSVarV2('text/disable', '#7a7a7a')};
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();

    const elementModel = this.gfx.getElementById(
      this.model.props.reference
    ) as GfxModel;

    this._referenceModel = elementModel;
  }

  get gfx() {
    return this.std.get(GfxControllerIdentifier);
  }

  @state()
  accessor _referenceModel: GfxModel | null = null;

  private _renderRefContent(referenceModel: GfxModel | null) {
    const modelNotFound = !referenceModel;
    const flavourOrType = modelNotFound
      ? (this.model.props.refFlavour ?? 'edgeless')
      : isPrimitiveModel(referenceModel)
        ? referenceModel.type
        : referenceModel.flavour;
    const matchedType =
      TYPE_ICON_MAP[flavourOrType] ?? TYPE_ICON_MAP['edgeless'];

    const title = modelNotFound
      ? matchedType.name
      : isFrameBlock(referenceModel)
        ? referenceModel.props.title.toString()
        : referenceModel instanceof GroupElementModel
          ? referenceModel.title.toString()
          : matchedType.name;

    return html`
      <div class="edgeless-surface-ref-content">
        <div class="surface-ref-heading">
          ${modelNotFound
            ? DeleteIcon({ width: '16px', height: '16px' })
            : matchedType.icon({ width: '16px', height: '16px' })}
          <span class="surface-ref-title">
            ${modelNotFound
              ? `This ${matchedType.name} not available`
              : `${title}`}
          </span>
        </div>
        <div class="surface-ref-body">
          <span class="surface-ref-text">
            ${modelNotFound
              ? `The ${matchedType.name.toLowerCase()} is deleted or not in this doc.`
              : `The ${matchedType.name.toLowerCase()} is inserted but cannot display in edgeless mode. Switch to page mode to view the block.`}
          </span>
        </div>
      </div>
      ${modelNotFound
        ? html`<div class="not-found-background">
            ${SurfaceRefNotFoundBackground}
          </div>`
        : nothing}
    `;
  }

  override renderBlock() {
    return html` <div
      class=${classMap({
        'affine-edgeless-surface-ref-container': true,
        'not-found': !this._referenceModel,
      })}
    >
      ${this._renderRefContent(this._referenceModel)}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-edgeless-surface-ref': EdgelessSurfaceRefBlockComponent;
  }
}
