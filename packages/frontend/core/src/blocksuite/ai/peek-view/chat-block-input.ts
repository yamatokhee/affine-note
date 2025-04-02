import { property } from 'lit/decorators.js';

import { AIChatInput } from '../components/ai-chat-input';
import type { ChatMessage } from '../components/ai-chat-messages';
import { type AIError, AIProvider } from '../provider';
import { readBlobAsURL } from '../utils/image';

export class ChatBlockInput extends AIChatInput {
  @property({ attribute: false })
  accessor getBlockId!: () => string | null | undefined;

  @property({ attribute: false })
  accessor updateChatBlock!: () => Promise<void>;

  @property({ attribute: false })
  accessor createChatBlock!: () => Promise<void>;

  send = async (text: string) => {
    const { images, status } = this.chatContextValue;
    const sessionId = await this.getSessionId();
    if (!sessionId) return;
    let content = '';

    if (status === 'loading' || status === 'transmitting') return;
    if (!text) return;

    try {
      const { doc } = this.host;
      const promptName = this.getPromptName();

      this.updateContext({
        images: [],
        status: 'loading',
        error: null,
      });

      const attachments = await Promise.all(
        images?.map(image => readBlobAsURL(image))
      );

      const userInfo = await AIProvider.userInfo;
      this.updateContext({
        messages: [
          ...this.chatContextValue.messages,
          {
            id: '',
            content: text,
            role: 'user',
            createdAt: new Date().toISOString(),
            attachments,
            userId: userInfo?.id,
            userName: userInfo?.name,
            avatarUrl: userInfo?.avatarUrl ?? undefined,
          },
          {
            id: '',
            content: '',
            role: 'assistant',
            createdAt: new Date().toISOString(),
          },
        ],
      });

      // must update prompt name after local chat message is updated
      // otherwise, the unauthorized error can not be rendered properly
      await this.updatePromptName(promptName);

      const abortController = new AbortController();
      const stream = AIProvider.actions.chat?.({
        input: text,
        sessionId,
        docId: doc.id,
        attachments: images,
        workspaceId: doc.workspace.id,
        host: this.host,
        stream: true,
        signal: abortController.signal,
        where: 'ai-chat-block',
        control: 'chat-send',
      });

      if (stream) {
        this.updateContext({
          abortController,
        });

        for await (const text of stream) {
          const messages = [...this.chatContextValue.messages];
          const last = messages[messages.length - 1] as ChatMessage;
          last.content += text;
          this.updateContext({ messages, status: 'transmitting' });
          content += text;
        }

        this.updateContext({ status: 'success' });
      }
    } catch (error) {
      console.error(error);
      this.updateContext({ status: 'error', error: error as AIError });
    } finally {
      if (content) {
        const chatBlockExists = !!this.getBlockId();
        if (!chatBlockExists) {
          await this.createChatBlock();
        }
        // Update new chat block messages if there are contents returned from AI
        await this.updateChatBlock();
      }

      this.updateContext({ abortController: null });
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'chat-block-input': ChatBlockInput;
  }
}
