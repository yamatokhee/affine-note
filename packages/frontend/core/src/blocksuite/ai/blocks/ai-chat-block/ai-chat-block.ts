import { Peekable } from '@blocksuite/affine/components/peek';
import { BlockComponent } from '@blocksuite/affine/std';
import { computed } from '@preact/signals-core';
import { html } from 'lit';

import { ChatMessagesSchema } from '../../components/ai-chat-messages';
import { ChatWithAIIcon } from './components/icon';
import { type AIChatBlockModel } from './model';
import { AIChatBlockStyles } from './styles';

@Peekable({
  enableOn: ({ doc }: AIChatBlockComponent) => {
    // Disable on mobile and readonly mode
    return !BUILD_CONFIG.isMobileEdition && !doc.readonly;
  },
})
export class AIChatBlockComponent extends BlockComponent<AIChatBlockModel> {
  static override styles = AIChatBlockStyles;

  // Deserialize messages from JSON string and verify the type using zod
  private readonly _deserializeChatMessages = computed(() => {
    const messages = this.model.props.messages$.value;
    try {
      const result = ChatMessagesSchema.safeParse(JSON.parse(messages));
      if (result.success) {
        return result.data;
      } else {
        return [];
      }
    } catch {
      return [];
    }
  });

  override renderBlock() {
    const messages = this._deserializeChatMessages.value.slice(-2);
    const textRendererOptions = {
      customHeading: true,
    };

    return html`<div class="affine-ai-chat-block-container">
      <div class="ai-chat-messages-container">
        <ai-chat-messages
          .host=${this.host}
          .messages=${messages}
          .textRendererOptions=${textRendererOptions}
          .withMask=${true}
        ></ai-chat-messages>
      </div>
      <div class="ai-chat-block-button">
        ${ChatWithAIIcon} <span>AI chat block</span>
      </div>
    </div> `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-ai-chat': AIChatBlockComponent;
  }
}
