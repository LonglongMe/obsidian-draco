import type { ChatMessage } from "@/types/message";

/**
 * Per view-key streaming state (draft vs saved path, with or without project page).
 * Lives in a ref map so background tabs can keep streaming without clobbering the active UI.
 */
export interface ChatStreamSession {
  abortController: AbortController | null;
  streamingMessageId: string | null;
  acceptChunks: boolean;
  streamingText: string;
  isLoading: boolean;
  pendingMessages: ChatMessage[];
  conversationId: string | null;
  needsSaveAfterFlush: boolean;
  lastUiEmitAt: number;
  lastUiEmitText: string;
  streamUiRaf: number | null;
}

export function createEmptyChatStreamSession(): ChatStreamSession {
  return {
    abortController: null,
    streamingMessageId: null,
    acceptChunks: false,
    streamingText: "",
    isLoading: false,
    pendingMessages: [],
    conversationId: null,
    needsSaveAfterFlush: false,
    lastUiEmitAt: 0,
    lastUiEmitText: "",
    streamUiRaf: null,
  };
}
