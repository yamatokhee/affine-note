import type { AIError } from '../provider';

export type ChatMessage = {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  attachments?: string[];
  createdAt: string;
};

export type ChatAction = {
  action: string;
  messages: ChatMessage[];
  sessionId: string;
  createdAt: string;
};

export type ChatItem = ChatMessage | ChatAction;

export function isChatAction(item: ChatItem): item is ChatAction {
  return 'action' in item;
}

export function isChatMessage(item: ChatItem): item is ChatMessage {
  return 'role' in item;
}

export type ChatStatus =
  | 'loading'
  | 'success'
  | 'error'
  | 'idle'
  | 'transmitting';

export type ChatContextValue = {
  // history messages of the chat
  items: ChatItem[];
  status: ChatStatus;
  error: AIError | null;
  // plain-text of the selected content
  quote: string;
  // markdown of the selected content
  markdown: string;
  // images of the selected content or user uploaded
  images: File[];
  abortController: AbortController | null;
};

export type ChatBlockMessage = ChatMessage & {
  userId?: string;
  userName?: string;
  avatarUrl?: string;
};
