/**
 * Per–view-key streaming session map + scoped add/stream/abort helpers used by Chat.tsx.
 */
import { AI_SENDER } from "@/constants";
import { createEmptyChatStreamSession, type ChatStreamSession } from "@/chat/streamSessionTypes";
import type { ChatMessage } from "@/types/message";
import { useCallback, useMemo, useRef, useState } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";

export interface ChatSafeSetters {
  setCurrentAiMessage: (value: string) => void;
  setLoadingMessage: (value: string) => void;
  setLoading: (value: boolean) => void;
}

export interface UseChatStreamSessionRegistryParams {
  currentViewKeyRef: MutableRefObject<string>;
  rawAddMessage: (message: ChatMessage) => void;
  setLatestTokenCount: Dispatch<SetStateAction<number | null>>;
  safeSet: ChatSafeSetters;
}

export interface UseChatStreamSessionRegistryResult {
  streamSessionsRef: MutableRefObject<Map<string, ChatStreamSession>>;
  streamSessionsVersion: number;
  bumpStreamSessionsVersion: () => void;
  getStreamSession: (viewKey: string) => ChatStreamSession;
  createScopedAddMessage: (viewKey: string) => (message: ChatMessage) => void;
  createScopedStreamUpdater: (viewKey: string) => (value: string) => void;
  createScopedAbortSetter: (viewKey: string) => (controller: AbortController | null) => void;
  scheduleStreamUiFlush: (viewKey: string) => void;
  runningChatIds: string[];
}

export function useChatStreamSessionRegistry(
  params: UseChatStreamSessionRegistryParams
): UseChatStreamSessionRegistryResult {
  const { currentViewKeyRef, rawAddMessage, setLatestTokenCount, safeSet } = params;

  const streamSessionsRef = useRef<Map<string, ChatStreamSession>>(new Map());
  const [streamSessionsVersion, setStreamSessionsVersion] = useState(0);

  const bumpStreamSessionsVersion = useCallback(() => {
    setStreamSessionsVersion((version) => version + 1);
  }, []);

  const getStreamSession = useCallback((viewKey: string) => {
    const existing = streamSessionsRef.current.get(viewKey);
    if (existing) return existing;
    const created = createEmptyChatStreamSession();
    streamSessionsRef.current.set(viewKey, created);
    return created;
  }, []);

  const scheduleStreamUiFlush = useCallback(
    (viewKey: string) => {
      const session = getStreamSession(viewKey);
      if (session.streamUiRaf != null) {
        return;
      }
      session.streamUiRaf = window.requestAnimationFrame(() => {
        session.streamUiRaf = null;
        if (!session.acceptChunks) return;
        if (currentViewKeyRef.current !== viewKey) return;
        safeSet.setCurrentAiMessage(session.streamingText);
      });
    },
    [getStreamSession, safeSet, currentViewKeyRef]
  );

  const createScopedStreamUpdater = useCallback(
    (viewKey: string) => (value: string) => {
      const session = getStreamSession(viewKey);
      if (!session.acceptChunks) return;
      session.streamingText = value;
      if (currentViewKeyRef.current === viewKey) {
        scheduleStreamUiFlush(viewKey);
      }
    },
    [getStreamSession, scheduleStreamUiFlush, currentViewKeyRef]
  );

  const createScopedAbortSetter = useCallback(
    (viewKey: string) => (controller: AbortController | null) => {
      const session = getStreamSession(viewKey);
      session.abortController = controller;
    },
    [getStreamSession]
  );

  const createScopedAddMessage = useCallback(
    (viewKey: string) => (message: ChatMessage) => {
      const session = getStreamSession(viewKey);
      const shouldAttachId =
        session.streamingMessageId &&
        message.sender === AI_SENDER &&
        !message.isErrorMessage &&
        !message.id;
      const messageToAdd = shouldAttachId
        ? { ...message, id: session.streamingMessageId as string }
        : message;

      if (
        currentViewKeyRef.current !== viewKey &&
        messageToAdd.sender === AI_SENDER &&
        !messageToAdd.isErrorMessage
      ) {
        session.pendingMessages.push(messageToAdd);
        return;
      }

      rawAddMessage(messageToAdd);
      if (
        messageToAdd.sender === AI_SENDER &&
        messageToAdd.responseMetadata?.tokenUsage?.totalTokens
      ) {
        setLatestTokenCount(messageToAdd.responseMetadata.tokenUsage.totalTokens);
      }
    },
    [getStreamSession, rawAddMessage, setLatestTokenCount, currentViewKeyRef]
  );

  const runningChatIds = useMemo(() => {
    const ids = new Set<string>();
    for (const [viewKey, session] of streamSessionsRef.current.entries()) {
      if (!session.isLoading) continue;
      const chatId = viewKey.split("::")[0];
      if (chatId && chatId !== "__draft__") {
        ids.add(chatId);
      }
    }
    return Array.from(ids);
    // Ref map is stable; `streamSessionsVersion` forces recompute when loading state flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional sync with bumpStreamSessionsVersion()
  }, [streamSessionsVersion]);

  return {
    streamSessionsRef,
    streamSessionsVersion,
    bumpStreamSessionsVersion,
    getStreamSession,
    createScopedAddMessage,
    createScopedStreamUpdater,
    createScopedAbortSetter,
    scheduleStreamUiFlush,
    runningChatIds,
  };
}
