import { getAIResponse } from "@/langchainStream";
import type ChainManager from "@/LLMProviders/chainManager";
import type { ChatStreamSession } from "@/chat/streamSessionTypes";
import type { ChatMessage } from "@/types/message";
import type { ChatUIState } from "@/state/ChatUIState";
import type { MutableRefObject } from "react";
import type CopilotPlugin from "@/main";

/**
 * Resets the mutable streaming fields on a per-view-key session after an LLM turn
 * (send, edit+regenerate, or similar).
 */
export function endStreamSessionCore(
  streamSession: ChatStreamSession,
  options?: { cancelStreamUiRaf?: boolean }
): void {
  if (options?.cancelStreamUiRaf !== false && streamSession.streamUiRaf != null) {
    window.cancelAnimationFrame(streamSession.streamUiRaf);
    streamSession.streamUiRaf = null;
  }
  streamSession.acceptChunks = false;
  streamSession.abortController = null;
  streamSession.isLoading = false;
  streamSession.streamingMessageId = null;
}

/**
 * Runs {@link getAIResponse} for the LLM user message with id `messageId` (if present).
 */
export async function runGetAIResponseForUserMessageId(args: {
  messageId: string;
  chatUIState: ChatUIState;
  chainManager: ChainManager;
  scopedAddMessage: (message: ChatMessage) => void;
  scopedStreamUpdater: (value: string) => void;
  scopedAbortSetter: (controller: AbortController | null) => void;
  effectiveStreamViewKey: string;
  currentViewKeyRef: MutableRefObject<string>;
  setLoadingMessage: (value: string) => void;
  debug?: boolean;
}): Promise<void> {
  const {
    messageId,
    chatUIState,
    chainManager,
    scopedAddMessage,
    scopedStreamUpdater,
    scopedAbortSetter,
    effectiveStreamViewKey,
    currentViewKeyRef,
    setLoadingMessage,
    debug,
  } = args;

  const llmMessage = chatUIState.getLLMMessage(messageId);
  if (!llmMessage) {
    return;
  }

  const updateLoadingMessage = (message: string) => {
    if (currentViewKeyRef.current === effectiveStreamViewKey) {
      setLoadingMessage(message);
    }
  };

  await getAIResponse(llmMessage, chainManager, scopedAddMessage, scopedStreamUpdater, scopedAbortSetter, {
    debug,
    updateLoadingMessage,
  });
}

/**
 * Bumps chat note mtime and refreshes sidebar when the key points at a saved file
 * and this view is still active.
 */
export function touchChatHistoryPathIfActive(args: {
  effectiveStreamViewKey: string;
  currentViewKeyRef: MutableRefObject<string>;
  plugin: CopilotPlugin;
  refreshAllChatHistory: () => void | Promise<void>;
}): void {
  const { effectiveStreamViewKey, currentViewKeyRef, plugin, refreshAllChatHistory } = args;
  const pathFromKey = effectiveStreamViewKey.split("::")[0];
  if (pathFromKey.startsWith("__draft__:") || currentViewKeyRef.current !== effectiveStreamViewKey) {
    return;
  }
  void plugin.touchChatHistoryByPathIfExists(pathFromKey).then(() => {
    void refreshAllChatHistory();
  });
}
