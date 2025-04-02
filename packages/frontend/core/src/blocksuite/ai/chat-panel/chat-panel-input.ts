import { AIChatInput } from '../components/ai-chat-input';
import type { ChatMessage } from '../components/ai-chat-messages';
import { type AIError, AIProvider } from '../provider';
import { readBlobAsURL } from '../utils/image';

export class ChatPanelInput extends AIChatInput {
  send = async (text: string) => {
    const { status, markdown, images } = this.chatContextValue;
    if (status === 'loading' || status === 'transmitting') return;
    if (!text) return;

    try {
      const { doc } = this.host;
      const promptName = this.getPromptName();

      this.updateContext({
        images: [],
        status: 'loading',
        error: null,
        quote: '',
        markdown: '',
      });

      const attachments = await Promise.all(
        images?.map(image => readBlobAsURL(image))
      );

      const userInput = (markdown ? `${markdown}\n` : '') + text;
      this.updateContext({
        messages: [
          ...this.chatContextValue.messages,
          {
            id: '',
            role: 'user',
            content: userInput,
            createdAt: new Date().toISOString(),
            attachments,
          },
          {
            id: '',
            role: 'assistant',
            content: '',
            createdAt: new Date().toISOString(),
          },
        ],
      });

      // must update prompt name after local chat message is updated
      // otherwise, the unauthorized error can not be rendered properly
      await this.updatePromptName(promptName);

      const abortController = new AbortController();
      const sessionId = await this.getSessionId();
      if (!sessionId) return;

      const contexts = await this.getMatchedContexts(userInput);
      const stream = AIProvider.actions.chat?.({
        sessionId,
        input: userInput,
        contexts,
        docId: doc.id,
        attachments: images,
        workspaceId: doc.workspace.id,
        host: this.host,
        stream: true,
        signal: abortController.signal,
        where: 'chat-panel',
        control: 'chat-send',
        isRootSession: true,
      });

      if (stream) {
        this.updateContext({ abortController });

        for await (const text of stream) {
          const messages = [...this.chatContextValue.messages];
          const last = messages[messages.length - 1] as ChatMessage;
          last.content += text;
          this.updateContext({ messages, status: 'transmitting' });
        }

        this.updateContext({ status: 'success' });

        const { messages } = this.chatContextValue;
        const last = messages[messages.length - 1] as ChatMessage;
        if (!last.id) {
          const historyIds = await AIProvider.histories?.ids(
            doc.workspace.id,
            doc.id,
            { sessionId }
          );
          if (!historyIds || !historyIds[0]) return;
          last.id = historyIds[0].messages.at(-1)?.id ?? '';
        }
      }
    } catch (error) {
      this.updateContext({ status: 'error', error: error as AIError });
    } finally {
      this.updateContext({ abortController: null });
    }
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'chat-panel-input': ChatPanelInput;
  }
}
