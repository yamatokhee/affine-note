import type { TranscriptionBlockModel } from '@blocksuite/affine/model';
import { BlockComponent, BlockViewExtension } from '@blocksuite/affine/std';
import type { ExtensionType } from '@blocksuite/affine/store';
import { css, type PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { literal } from 'lit/static-html.js';

export class LitTranscriptionBlock extends BlockComponent<TranscriptionBlockModel> {
  static override styles = [
    css`
      transcription-block {
        outline: none;
      }
    `,
  ];

  get lastCalloutBlock() {
    for (const child of this.model.children.toReversed()) {
      if (child.flavour === 'affine:callout') {
        return child;
      }
    }
    return null;
  }

  override render() {
    return this.std.host.renderChildren(this.model, model => {
      // if model is the last transcription block, we should render it
      return model === this.lastCalloutBlock;
    });
  }

  @property({ type: String, attribute: 'data-block-id' })
  override accessor blockId!: string;

  constructor() {
    super();
    // questionable:
    this.widgets = {};

    // to allow text selection across paragraphs in the callout block
    this.contentEditable = 'true';
  }

  override firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    this.disposables.addFromEvent(this, 'click', this.onClick);
  }

  protected onClick(event: MouseEvent) {
    event.stopPropagation();
  }
}

export const AITranscriptionBlockSpec: ExtensionType[] = [
  BlockViewExtension('affine:transcription', () => {
    return literal`transcription-block`;
  }),
];
