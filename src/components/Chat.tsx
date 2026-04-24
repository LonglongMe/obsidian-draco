import {
  clearSelectedTextContexts,
  getCurrentProject,
  getSelectedTextContexts,
  ProjectConfig,
  removeSelectedTextContext,
  setCurrentProject,
  useChainType,
  updateIndexingProgressState,
  useIndexingProgress,
  useModelKey,
  useSelectedTextContexts,
} from "@/aiParams";
import { resetSessionSystemPromptSettings } from "@/system-prompts";
import { ChainType } from "@/chainFactory";
import { useProjectContextStatus } from "@/hooks/useProjectContextStatus";
import { logInfo, logError } from "@/logger";
import type { WebTabContext } from "@/types/message";

import { reloadCurrentProject } from "@/components/chat-components/ChatControls";
import { ChatModalBackdrop } from "@/components/chat-components/ChatModalBackdrop";
import { ConversationSidebar } from "@/components/chat-components/ConversationSidebar";
import { CreateProjectDialog } from "@/components/chat-components/CreateProjectDialog";
import ChatInput from "@/components/chat-components/ChatInput";
import { NewVersionBanner } from "@/components/chat-components/NewVersionBanner";
import { ProjectOverviewPanel } from "@/components/chat-components/ProjectOverviewPanel";
import { ProjectList } from "@/components/chat-components/ProjectList";
import { ChatThreadColumn } from "@/components/chat-components/ChatThreadColumn";
import { ChatWorkspace } from "@/components/chat-components/ChatWorkspace";
import IndexingProgressCard from "@/components/IndexingProgressCard";
import ProgressCard from "@/components/project/progress-card";
import {
  ABORT_REASON,
  AI_SENDER,
  DEFAULT_CHAT_HISTORY_FOLDER,
  EVENT_NAMES,
  LOADING_MESSAGES,
  RESTRICTION_MESSAGES,
  USER_SENDER,
} from "@/constants";
import { AppContext, EventTargetContext } from "@/context";
import { ChatInputProvider, useChatInput } from "@/context/ChatInputContext";
import { useChatManager } from "@/hooks/useChatManager";
import { useChatFileDrop } from "@/hooks/useChatFileDrop";
import { getAIResponse } from "@/langchainStream";
import ChainManager from "@/LLMProviders/chainManager";
import { clearRecordedPromptPayload } from "@/LLMProviders/chainRunner/utils/promptPayloadRecorder";
import { logFileManager } from "@/logFileManager";
import CopilotPlugin from "@/main";
import { updateSetting, useSettingsValue } from "@/settings/model";
import { ChatUIState } from "@/state/ChatUIState";
import { FileParserManager } from "@/tools/FileParserManager";
import { ChatMessage } from "@/types/message";
import { err2String, isPlusChain } from "@/utils";
import { arrayBufferToBase64 } from "@/utils/base64";
import { Notice, TFile } from "obsidian";
import { ContextManageModal } from "@/components/modals/project/context-manage-modal";
import React, {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { v4 as uuidv4 } from "uuid";
import { ChatHistoryItem } from "@/components/chat-components/ChatHistoryPopover";
import { useActiveWebTabState } from "@/components/chat-components/hooks/useActiveWebTabState";

type ChatMode = "default" | "project";

interface ChatProps {
  chainManager: ChainManager;
  onSaveChat: (saveAsNote: () => Promise<void>) => void;
  updateUserMessageHistory: (newMessage: string) => void;
  fileParserManager: FileParserManager;
  plugin: CopilotPlugin;
  mode?: ChatMode;
  chatUIState: ChatUIState;
}

// Internal component that has access to the ChatInput context
const ChatInternal: React.FC<ChatProps & { chatInput: ReturnType<typeof useChatInput> }> = ({
  chainManager,
  onSaveChat,
  updateUserMessageHistory,
  fileParserManager,
  plugin,
  chatUIState,
  chatInput,
}) => {
  const settings = useSettingsValue();
  const eventTarget = useContext(EventTargetContext);

  const { messages: chatHistory, addMessage: rawAddMessage } = useChatManager(chatUIState);
  const [currentModelKey] = useModelKey();
  const [currentChain] = useChainType();
  const [currentAiMessage, setCurrentAiMessage] = useState("");
  const [currentStreamingMessageId, setCurrentStreamingMessageId] = useState<string | null>(null);
  const [streamSessionsVersion, setStreamSessionsVersion] = useState(0);
  const [inputMessage, setInputMessage] = useState("");
  const [latestTokenCount, setLatestTokenCount] = useState<number | null>(null);
  const activeChatIdRef = useRef<string | null>(null);
  const selectedSidebarProjectIdRef = useRef<string | null>(null);
  const currentViewKeyRef = useRef<string>("__draft__::__no_project_page__");
  const messagesByViewKeyRef = useRef<Map<string, ChatMessage[]>>(new Map());
  const chatConversationIdByPathRef = useRef<Map<string, string>>(new Map());
  const chatPathByConversationIdRef = useRef<Map<string, string>>(new Map());
  const refreshAllChatHistoryRef = useRef<() => Promise<void>>(async () => {});
  const streamSessionsRef = useRef<
    Map<
      string,
      {
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
    >
  >(new Map());
  const getStreamSession = useCallback((viewKey: string) => {
    const existing = streamSessionsRef.current.get(viewKey);
    if (existing) return existing;
    const created = {
      abortController: null as AbortController | null,
      streamingMessageId: null as string | null,
      acceptChunks: false,
      streamingText: "",
      isLoading: false,
      pendingMessages: [] as ChatMessage[],
      conversationId: null as string | null,
      needsSaveAfterFlush: false,
      lastUiEmitAt: 0,
      lastUiEmitText: "",
      streamUiRaf: null as number | null,
    };
    streamSessionsRef.current.set(viewKey, created);
    return created;
  }, []);
  const bumpStreamSessionsVersion = useCallback(() => {
    setStreamSessionsVersion((version) => version + 1);
  }, []);

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

      if (currentViewKeyRef.current !== viewKey && messageToAdd.sender === AI_SENDER && !messageToAdd.isErrorMessage) {
        session.pendingMessages.push(messageToAdd);
        return;
      }

      rawAddMessage(messageToAdd);
      if (messageToAdd.sender === AI_SENDER && messageToAdd.responseMetadata?.tokenUsage?.totalTokens) {
        setLatestTokenCount(messageToAdd.responseMetadata.tokenUsage.totalTokens);
      }
    },
    [getStreamSession, rawAddMessage]
  );

  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES.DEFAULT);
  const [contextNotes, setContextNotes] = useState<TFile[]>([]);
  const [includeActiveNote, setIncludeActiveNote] = useState(false);
  const [includeActiveWebTab, setIncludeActiveWebTab] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [showChatUI, setShowChatUI] = useState(false);
  const [allChatHistoryItems, setAllChatHistoryItems] = useState<ChatHistoryItem[]>([]);
  const [showConversationSidebar, setShowConversationSidebar] = useState(true);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [selectedSidebarProjectId, setSelectedSidebarProjectId] = useState<string | null>(null);
  const [draftSessionId, setDraftSessionId] = useState<string>(() => uuidv4());
  const currentViewKey = useMemo(
    () =>
      `${activeChatId ?? `__draft__:${draftSessionId}`}::${selectedSidebarProjectId ?? "__no_project_page__"}`,
    [activeChatId, selectedSidebarProjectId, draftSessionId]
  );

  const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  // null: keep default behavior; true: show; false: hide
  const [progressCardVisible, setProgressCardVisible] = useState<boolean | null>(null);
  const [indexingCardVisible, setIndexingCardVisible] = useState<boolean | null>(null);
  const [indexingState] = useIndexingProgress();

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(false);

  // Ref for the chat container (used for drag-and-drop)
  const chatContainerRef = useRef<HTMLDivElement>(null);

  /**
   * Persist editor selection highlight when clicking into Chat
   */
  const handleChatPointerDownCapture = useCallback((): void => {
    plugin.chatSelectionHighlightController.persistFromPointerDown();
  }, [plugin]);

  // Safe setter utilities - automatically wrap state setters to prevent updates after unmount
  const safeSet = useMemo<{
    setCurrentAiMessage: (value: string) => void;
    setLoadingMessage: (value: string) => void;
    setLoading: (value: boolean) => void;
  }>(
    () => ({
      setCurrentAiMessage: (value: string) => isMountedRef.current && setCurrentAiMessage(value),
      setLoadingMessage: (value: string) => isMountedRef.current && setLoadingMessage(value),
      setLoading: (value: boolean) => isMountedRef.current && setLoading(value),
    }),
    []
  );

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
    [getStreamSession, safeSet]
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
    [getStreamSession, scheduleStreamUiFlush]
  );

  const createScopedAbortSetter = useCallback(
    (viewKey: string) => (controller: AbortController | null) => {
      const session = getStreamSession(viewKey);
      session.abortController = controller;
    },
    [getStreamSession]
  );

  // Must run in useLayoutEffect: if this runs in useEffect, the first await inside
  // handleSendMessage yields before paint, and an empty per-view cache can replaceMessages([])
  // and wipe the user message that was just added.
  useLayoutEffect(() => {
    activeChatIdRef.current = activeChatId;
    selectedSidebarProjectIdRef.current = selectedSidebarProjectId;
    currentViewKeyRef.current = currentViewKey;

    const session = getStreamSession(currentViewKey);
    const cachedMessages = messagesByViewKeyRef.current.get(currentViewKey) || [];
    chatUIState.replaceMessages(cachedMessages);
    safeSet.setCurrentAiMessage(session.streamingText);
    safeSet.setLoading(session.isLoading);
    setCurrentStreamingMessageId(session.streamingMessageId);
    if (session.pendingMessages.length > 0) {
      const pending = [...session.pendingMessages];
      session.pendingMessages = [];
      pending.forEach((message) => rawAddMessage(message));
      if (session.needsSaveAfterFlush) {
        void (async () => {
          await chatUIState.saveChat(currentModelKey, {
            silent: true,
            conversationId: session.conversationId || undefined,
            messages: chatUIState.getMessages(),
          });
          if (!session.conversationId) {
            session.conversationId = chatUIState.getCurrentConversationId();
          }
          const historyItems = await plugin.getAllChatHistoryItems();
          const conversationByPath = new Map<string, string>();
          const pathByConversation = new Map<string, string>();
          for (const item of historyItems) {
            const conversationId = item.conversationId?.trim();
            if (!conversationId) continue;
            conversationByPath.set(item.id, conversationId);
            pathByConversation.set(conversationId, item.id);
          }
          chatConversationIdByPathRef.current = conversationByPath;
          chatPathByConversationIdRef.current = pathByConversation;
          setAllChatHistoryItems(historyItems);
          session.needsSaveAfterFlush = false;
        })();
      }
    }
  }, [
    activeChatId,
    selectedSidebarProjectId,
    draftSessionId,
    currentViewKey,
    getStreamSession,
    rawAddMessage,
    safeSet,
    chatUIState,
    currentModelKey,
    plugin,
  ]);

  useEffect(() => {
    messagesByViewKeyRef.current.set(currentViewKeyRef.current, [...chatHistory]);
  }, [chatHistory]);

  const [selectedTextContexts] = useSelectedTextContexts();

  // Any selection hides both active note and active web tab
  const hasAnySelection = selectedTextContexts.length > 0;
  const effectiveIncludeActiveNote = includeActiveNote && !hasAnySelection;
  const effectiveIncludeActiveWebTab = includeActiveWebTab && !hasAnySelection;

  const { activeWebTabForMentions: currentActiveWebTab } = useActiveWebTabState();
  const projectContextStatus = useProjectContextStatus();

  // Calculate whether to show ProgressCard based on status and user preference
  const shouldShowProgressCard = () => {
    if (selectedChain !== ChainType.PROJECT_CHAIN) return false;

    // If user has explicitly set visibility, respect that choice
    if (progressCardVisible !== null) {
      return progressCardVisible;
    }

    // Default behavior: show for loading/error, hide for success
    return projectContextStatus === "loading" || projectContextStatus === "error";
  };

  // Reset user preference when status changes to allow default behavior
  useEffect(() => {
    setProgressCardVisible(null);
  }, [projectContextStatus]);

  /**
   * Whether to show the indexing progress card.
   * Hidden in project mode (project card takes priority) and when user explicitly closed it.
   */
  const shouldShowIndexingCard = () => {
    if (selectedChain === ChainType.PROJECT_CHAIN) return false;
    if (indexingCardVisible === false) return false;
    // Show when indexing is active or just completed (before auto-close)
    return indexingState.isActive || indexingState.completionStatus !== "none";
  };

  // Allow the card to show whenever new indexing activity or completion is detected
  useEffect(() => {
    if (indexingState.isActive || indexingState.completionStatus !== "none") {
      setIndexingCardVisible(null);
    }
  }, [indexingState.isActive, indexingState.completionStatus]);

  const handleIndexingCardClose = useCallback(() => {
    setIndexingCardVisible(false);
    // Reset atom completion status so stale card doesn't reappear on remount
    if (!indexingState.isActive) {
      updateIndexingProgressState({ completionStatus: "none" });
    }
  }, [indexingState.isActive]);

  const handleIndexingPause = useCallback(async () => {
    const VectorStoreManager = (await import("@/search/vectorStoreManager")).default;
    VectorStoreManager.getInstance().pauseIndexing();
  }, []);

  const handleIndexingResume = useCallback(async () => {
    const VectorStoreManager = (await import("@/search/vectorStoreManager")).default;
    VectorStoreManager.getInstance().resumeIndexing();
  }, []);

  const handleIndexingStop = useCallback(async () => {
    const VectorStoreManager = (await import("@/search/vectorStoreManager")).default;
    await VectorStoreManager.getInstance().cancelIndexing();
  }, []);

  // Clear token count when chat is cleared or replaced (e.g., loading chat history)
  useEffect(() => {
    if (chatHistory.length === 0) {
      setLatestTokenCount(null);
    }
  }, [chatHistory]);

  const [previousMode, setPreviousMode] = useState<ChainType | null>(null);
  const [selectedChain, setSelectedChain] = useChainType();

  const appContext = useContext(AppContext);
  const app = plugin.app || appContext;

  // Drag-and-drop hook for file handling
  const { isDragActive } = useChatFileDrop({
    app,
    contextNotes,
    setContextNotes,
    selectedImages,
    onAddImage: (files) => setSelectedImages((prev) => [...prev, ...files]),
    containerRef: chatContainerRef,
  });

  const handleSendMessage = async (
    {
      toolCalls,
      urls,
      contextNotes: passedContextNotes,
      contextTags,
      contextFolders,
      webTabs,
    }: {
      toolCalls?: string[];
      urls?: string[];
      contextNotes?: TFile[];
      contextTags?: string[];
      contextFolders?: string[];
      webTabs?: WebTabContext[];
    } = {},
    /** When sending from the project overview composer, pin this project into note frontmatter. */
    projectForFrontmatter?: ProjectConfig | null
  ) => {
    if (!inputMessage && selectedImages.length === 0) return;
    const saveProjectOpt =
      projectForFrontmatter !== undefined ? { projectForFrontmatter } : {};
    const streamViewKey = currentViewKeyRef.current;
    let effectiveStreamViewKey = streamViewKey;
    const streamSession = getStreamSession(streamViewKey);

    // Check for URL restrictions in non-Plus chains and show notice, but continue processing
    const hasUrlsInContext = urls && urls.length > 0;

    if (hasUrlsInContext && !isPlusChain(currentChain)) {
      // Show notice but continue processing the message without URL context
      new Notice(RESTRICTION_MESSAGES.URL_PROCESSING_RESTRICTED);
    }

    try {
      // Create message content array
      const content: any[] = [];

      // Add text content if present
      if (inputMessage) {
        content.push({
          type: "text",
          text: inputMessage,
        });
      }

      // Add images if present
      for (const image of selectedImages) {
        const imageData = await image.arrayBuffer();
        const base64Image = arrayBufferToBase64(imageData);
        content.push({
          type: "image_url",
          image_url: {
            url: `data:${image.type};base64,${base64Image}`,
          },
        });
      }

      // Prepare context notes and deduplicate by path
      const allNotes = [...(passedContextNotes || []), ...contextNotes];
      const notes = allNotes.filter(
        (note, index, array) => array.findIndex((n) => n.path === note.path) === index
      );

      // Handle composer prompt
      let displayText = inputMessage.trim();

      // Add tool calls if present
      if (toolCalls) {
        displayText += " " + toolCalls.join("\n");
      }

      // Create message context - filter out URLs for non-Plus chains
      const context = {
        notes,
        urls: isPlusChain(currentChain) ? urls || [] : [],
        tags: contextTags || [],
        folders: contextFolders || [],
        selectedTextContexts,
        webTabs: webTabs || [],
      };

      // Clear input and images
      setInputMessage("");
      setSelectedImages([]);
      streamSession.streamingMessageId = `msg-${uuidv4()}`;
      streamSession.acceptChunks = true;
      streamSession.isLoading = true;
      streamSession.streamingText = "";
      streamSession.lastUiEmitAt = 0;
      streamSession.lastUiEmitText = "";
      streamSession.conversationId =
        streamSession.conversationId ?? chatUIState.getCurrentConversationId() ?? uuidv4();
      bumpStreamSessionsVersion();
      if (currentViewKeyRef.current === streamViewKey) {
        setCurrentStreamingMessageId(streamSession.streamingMessageId);
        safeSet.setCurrentAiMessage("");
        safeSet.setLoading(true);
        safeSet.setLoadingMessage(LOADING_MESSAGES.DEFAULT);
      }

      // Send message through ChatManager (this handles all the complex context processing)
      const { messageId, displayMessagesSnapshot } = await chatUIState.sendMessage(
        displayText,
        context,
        currentChain,
        effectiveIncludeActiveNote,
        effectiveIncludeActiveWebTab,
        content.length > 0 ? content : undefined,
        safeSet.setLoadingMessage
      );

      // Ensure chat identity is persisted immediately after each user send.
      // This keeps conversation markdown available even if user switches chat before AI completes.
      await chatUIState.saveChat(currentModelKey, {
        silent: true,
        skipTopicGeneration: true,
        conversationId: streamSession.conversationId || undefined,
        messages: displayMessagesSnapshot,
        ...saveProjectOpt,
      });
      await handleLoadAllChatHistory();

      // Bind draft UI sessions to the saved note path so stream state / per-view message caches
      // stay aligned when opening this chat from the sidebar (file path key vs __draft__ key).
      const convIdForPath = streamSession.conversationId;
      const canPromoteDraftToSavedChat =
        streamViewKey.startsWith("__draft__:") && selectedSidebarProjectIdRef.current == null;
      if (convIdForPath && canPromoteDraftToSavedChat) {
        let savedChatPath = chatPathByConversationIdRef.current.get(convIdForPath);
        if (!savedChatPath) {
          savedChatPath = `${DEFAULT_CHAT_HISTORY_FOLDER}/${convIdForPath}.md`;
        }
        const migratedKey = `${savedChatPath}::__no_project_page__`;
        if (migratedKey !== streamViewKey) {
          const oldKey = streamViewKey;
          const sess = streamSessionsRef.current.get(oldKey);
          if (sess) {
            streamSessionsRef.current.set(migratedKey, sess);
            streamSessionsRef.current.delete(oldKey);
          }
          const cachedMsgs = messagesByViewKeyRef.current.get(oldKey);
          if (cachedMsgs !== undefined) {
            messagesByViewKeyRef.current.set(migratedKey, [...cachedMsgs]);
            messagesByViewKeyRef.current.delete(oldKey);
          }
          effectiveStreamViewKey = migratedKey;
          const stillOnThisConversation = currentViewKeyRef.current === oldKey;
          if (stillOnThisConversation) {
            setSelectedSidebarProjectId(null);
            activeChatIdRef.current = savedChatPath;
            selectedSidebarProjectIdRef.current = null;
            currentViewKeyRef.current = migratedKey;
            setActiveChatId(savedChatPath);
          }
          bumpStreamSessionsVersion();
        }
      }

      const scopedAddMessage = createScopedAddMessage(effectiveStreamViewKey);
      const scopedStreamUpdater = createScopedStreamUpdater(effectiveStreamViewKey);
      const scopedAbortSetter = createScopedAbortSetter(effectiveStreamViewKey);
      const scopedLoadingMessageUpdater = (message: string) => {
        if (currentViewKeyRef.current === effectiveStreamViewKey) {
          safeSet.setLoadingMessage(message);
        }
      };

      // Add to user message history
      if (inputMessage) {
        updateUserMessageHistory(inputMessage);
      }

      // User turn is persisted by the silent save above; the post-stream save persists the full thread.

      // Get the LLM message for AI processing
      const llmMessage = chatUIState.getLLMMessage(messageId);
      if (llmMessage) {
        await getAIResponse(
          llmMessage,
          chainManager,
          scopedAddMessage,
          scopedStreamUpdater,
          scopedAbortSetter,
          { debug: settings.debug, updateLoadingMessage: scopedLoadingMessageUpdater }
        );
      }

      // After first AI response, persist again and allow AI title generation + rename.
      if (currentViewKeyRef.current === effectiveStreamViewKey) {
        await chatUIState.saveChat(currentModelKey, {
          silent: true,
          conversationId: streamSession.conversationId || undefined,
          messages: chatUIState.getMessages(),
          ...saveProjectOpt,
        });
        await handleLoadAllChatHistory();
      } else {
        // The repository is shared; if user switched view, persist when this view is resumed.
        streamSession.needsSaveAfterFlush = true;
      }
    } catch (error) {
      logError("Error sending message:", error);
      new Notice("Failed to send message. Please try again.");
    } finally {
      if (streamSession.streamUiRaf != null) {
        window.cancelAnimationFrame(streamSession.streamUiRaf);
        streamSession.streamUiRaf = null;
      }
      streamSession.acceptChunks = false;
      streamSession.abortController = null;
      streamSession.isLoading = false;
      streamSession.streamingMessageId = null;
      bumpStreamSessionsVersion();
      if (currentViewKeyRef.current === effectiveStreamViewKey) {
        safeSet.setCurrentAiMessage(streamSession.streamingText);
        safeSet.setLoading(false);
        safeSet.setLoadingMessage(LOADING_MESSAGES.DEFAULT);
        setCurrentStreamingMessageId(null);
      }
      const pathFromKey = effectiveStreamViewKey.split("::")[0];
      if (!pathFromKey.startsWith("__draft__:") && currentViewKeyRef.current === effectiveStreamViewKey) {
        void plugin.touchChatHistoryByPathIfExists(pathFromKey).then(() => refreshAllChatHistoryRef.current());
      }
    }
  };

  const handleSaveAsNote = useCallback(async () => {
    if (!app) {
      logError("App instance is not available.");
      return;
    }

    try {
      // Use the new ChatManager persistence functionality
      await chatUIState.saveChat(currentModelKey);
      const allHistoryItems = await plugin.getAllChatHistoryItems();
      setAllChatHistoryItems(allHistoryItems);
    } catch (error) {
      logError("Error saving chat as note:", err2String(error));
      new Notice("Failed to save chat as note. Check console for details.");
    }
  }, [app, chatUIState, currentModelKey, plugin]);

  const handleStopGenerating = useCallback(
    (reason?: ABORT_REASON) => {
      const viewKey = currentViewKeyRef.current;
      const session = getStreamSession(viewKey);
      if (session.abortController) {
        session.acceptChunks = false;
        logInfo(`stopping generation..., reason: ${reason}`);
        session.abortController.abort(reason);
        session.abortController = null;
        session.isLoading = false;
        session.streamingMessageId = null;
        bumpStreamSessionsVersion();
        safeSet.setLoading(false);
        safeSet.setLoadingMessage(LOADING_MESSAGES.DEFAULT);
        setCurrentStreamingMessageId(null);
        // Keep the partial AI message visible
        // Don't clear setCurrentAiMessage here
      }
    },
    [getStreamSession, safeSet]
  );

  // Cleanup on unmount - abort any ongoing streaming
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Abort any ongoing streaming when component unmounts
      for (const session of streamSessionsRef.current.values()) {
        session.abortController?.abort(ABORT_REASON.UNMOUNT);
        session.abortController = null;
      }
    };
  }, []); // No dependencies - only run on mount/unmount

  const handleRegenerate = useCallback(
    async (messageIndex: number) => {
      if (messageIndex <= 0) {
        new Notice("Cannot regenerate the first message.");
        return;
      }

      const messageToRegenerate = chatHistory[messageIndex];
      if (!messageToRegenerate) {
        new Notice("Message not found.");
        return;
      }

      // Clear current AI message and set loading state
      const streamViewKey = currentViewKeyRef.current;
      const streamSession = getStreamSession(streamViewKey);
      const scopedAddMessage = createScopedAddMessage(streamViewKey);
      const scopedStreamUpdater = createScopedStreamUpdater(streamViewKey);
      streamSession.streamingMessageId = `msg-${uuidv4()}`;
      streamSession.acceptChunks = true;
      streamSession.isLoading = true;
      streamSession.streamingText = "";
      bumpStreamSessionsVersion();
      safeSet.setCurrentAiMessage("");
      setCurrentStreamingMessageId(streamSession.streamingMessageId);
      safeSet.setLoading(true);
      try {
        const success = await chatUIState.regenerateMessage(
          messageToRegenerate.id!,
          scopedStreamUpdater,
          scopedAddMessage
        );

        if (!success) {
          new Notice("Failed to regenerate message. Please try again.");
        } else if (settings.debug) {
          console.log("Message regenerated successfully");
        }
      } catch (error) {
        logError("Error regenerating message:", error);
        new Notice("Failed to regenerate message. Please try again.");
      } finally {
        streamSession.acceptChunks = false;
        streamSession.abortController = null;
        streamSession.isLoading = false;
        streamSession.streamingMessageId = null;
        bumpStreamSessionsVersion();
        safeSet.setLoading(false);
        setCurrentStreamingMessageId(null);
        const pathFromKey = streamViewKey.split("::")[0];
        if (!pathFromKey.startsWith("__draft__:") && currentViewKeyRef.current === streamViewKey) {
          void plugin.touchChatHistoryByPathIfExists(pathFromKey).then(() => refreshAllChatHistoryRef.current());
        }
      }
    },
    [
      chatHistory,
      chatUIState,
      settings.debug,
      createScopedAddMessage,
      createScopedStreamUpdater,
      getStreamSession,
      bumpStreamSessionsVersion,
      safeSet,
      plugin,
    ]
  );

  const handleEdit = useCallback(
    async (messageIndex: number, newMessage: string) => {
      const messageToEdit = chatHistory[messageIndex];
      if (!messageToEdit || messageToEdit.message === newMessage) {
        return;
      }

      try {
        const success = await chatUIState.editMessage(
          messageToEdit.id!,
          newMessage,
          currentChain,
          effectiveIncludeActiveNote
        );

        if (!success) {
          new Notice("Failed to edit message. Please try again.");
          return;
        }

        // For user messages, immediately truncate any AI responses and regenerate
        if (messageToEdit.sender === USER_SENDER) {
          // Check if there were AI responses after this message
          const hadAIResponses = messageIndex < chatHistory.length - 1;

          // Truncate all messages after this user message (removes old AI responses)
          await chatUIState.truncateAfterMessageId(messageToEdit.id!);

          // If there were AI responses, generate new ones
          if (hadAIResponses) {
            const streamViewKey = currentViewKeyRef.current;
            const streamSession = getStreamSession(streamViewKey);
            const scopedAddMessage = createScopedAddMessage(streamViewKey);
            const scopedStreamUpdater = createScopedStreamUpdater(streamViewKey);
            const scopedAbortSetter = createScopedAbortSetter(streamViewKey);
            const scopedLoadingMessageUpdater = (message: string) => {
              if (currentViewKeyRef.current === streamViewKey) {
                safeSet.setLoadingMessage(message);
              }
            };
            streamSession.streamingMessageId = `msg-${uuidv4()}`;
            streamSession.acceptChunks = true;
            streamSession.isLoading = true;
            streamSession.streamingText = "";
            bumpStreamSessionsVersion();
            if (currentViewKeyRef.current === streamViewKey) {
              setCurrentStreamingMessageId(streamSession.streamingMessageId);
              safeSet.setCurrentAiMessage("");
            }
            safeSet.setLoading(true);
            try {
              const llmMessage = chatUIState.getLLMMessage(messageToEdit.id!);
              if (llmMessage) {
                await getAIResponse(
                  llmMessage,
                  chainManager,
                  scopedAddMessage,
                  scopedStreamUpdater,
                  scopedAbortSetter,
                  { debug: settings.debug, updateLoadingMessage: scopedLoadingMessageUpdater }
                );
              }
            } catch (error) {
              logError("Error regenerating AI response:", error);
              new Notice("Failed to regenerate AI response. Please try again.");
            } finally {
              streamSession.acceptChunks = false;
              streamSession.abortController = null;
              streamSession.isLoading = false;
              streamSession.streamingMessageId = null;
              bumpStreamSessionsVersion();
              safeSet.setLoading(false);
              if (currentViewKeyRef.current === streamViewKey) {
                setCurrentStreamingMessageId(null);
              }
              const pathFromKey = streamViewKey.split("::")[0];
              if (!pathFromKey.startsWith("__draft__:") && currentViewKeyRef.current === streamViewKey) {
                void plugin.touchChatHistoryByPathIfExists(pathFromKey).then(() => refreshAllChatHistoryRef.current());
              }
            }
          }
        }
      } catch (error) {
        logError("Error editing message:", error);
        new Notice("Failed to edit message. Please try again.");
      }
    },
    [
      chatHistory,
      chatUIState,
      currentChain,
      effectiveIncludeActiveNote,
      chainManager,
      settings.debug,
      createScopedAddMessage,
      createScopedAbortSetter,
      plugin,
      createScopedStreamUpdater,
      getStreamSession,
      bumpStreamSessionsVersion,
      safeSet,
    ]
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
  }, [streamSessionsVersion]);

  // Expose handleSaveAsNote to parent
  useEffect(() => {
    if (onSaveChat) {
      onSaveChat(handleSaveAsNote);
    }
  }, [onSaveChat, handleSaveAsNote]);

  const handleAddProject = useCallback(
    (project: ProjectConfig) => {
      const currentProjects = settings.projectList || [];
      const existingIndex = currentProjects.findIndex((p) => p.name === project.name);

      if (existingIndex >= 0) {
        throw new Error(`Project "${project.name}" already exists, please use a different name`);
      }

      const newProjectList = [...currentProjects, project];
      updateSetting("projectList", newProjectList);

      // Check if this project is now the current project
      const currentProject = getCurrentProject();
      if (currentProject?.id === project.id) {
        // Reload the project context for the newly added project
        reloadCurrentProject()
          .then(() => {
            new Notice(`${project.name} added and context loaded`);
          })
          .catch((error: Error) => {
            logError("Error loading project context:", error);
            new Notice(`${project.name} added but context loading failed`);
          });
      } else {
        new Notice(`${project.name} added successfully`);
      }

      return true;
    },
    [settings.projectList]
  );

  const handleEditProject = useCallback(
    (originP: ProjectConfig, updateP: ProjectConfig) => {
      const currentProjects = settings.projectList || [];
      const existingProject = currentProjects.find((p) => p.name === originP.name);

      if (!existingProject) {
        throw new Error(`Project "${originP.name}" does not exist`);
      }

      const newProjectList = currentProjects.map((p) => (p.name === originP.name ? updateP : p));
      updateSetting("projectList", newProjectList);

      // If this is the current project, update the current project atom
      const currentProject = getCurrentProject();
      if (currentProject?.id === originP.id) {
        setCurrentProject(updateP);

        // Reload the project context
        reloadCurrentProject()
          .then(() => {
            new Notice(`${originP.name} updated and context reloaded`);
          })
          .catch((error: Error) => {
            logError("Error reloading project context:", error);
            new Notice(`${originP.name} updated but context reload failed`);
          });
      } else {
        new Notice(`${originP.name} updated successfully`);
      }

      return true;
    },
    [settings.projectList]
  );

  const handleDeleteProjectFromSidebar = useCallback(
    (projectId: string) => {
      const updatedProjects = (settings.projectList || []).filter((project) => project.id !== projectId);
      updateSetting("projectList", updatedProjects);
      if (selectedSidebarProjectId === projectId) {
        setSelectedSidebarProjectId(null);
      }
      if (getCurrentProject()?.id === projectId) {
        setCurrentProject(null);
      }
      new Notice("Project deleted.");
    },
    [selectedSidebarProjectId, settings.projectList]
  );

  const handleToggleProjectPin = useCallback(
    (projectId: string) => {
      const updatedProjects = (settings.projectList || []).map((project) =>
        project.id === projectId
          ? ({ ...project, pinned: !(project as ProjectConfig & { pinned?: boolean }).pinned } as ProjectConfig)
          : project
      );
      updateSetting("projectList", updatedProjects);
    },
    [settings.projectList]
  );

  const handleRemoveSelectedText = useCallback(
    (id: string) => {
      // Get fresh state to avoid stale closure issues (fixes race condition on rapid removals)
      const currentContexts = getSelectedTextContexts();
      const removed = currentContexts.find((ctx) => ctx.id === id);
      removeSelectedTextContext(id);

      // Suppress web selection to prevent it from being auto-captured again
      if (removed?.sourceType === "web") {
        plugin.suppressCurrentWebSelection(removed.url);
      }
      // Note: highlight cleanup is now handled by the useEffect below that watches selectedTextContexts
    },
    [plugin]
  );

  /**
   * State-driven highlight cleanup: automatically clear editor highlight
   * when no note contexts remain. This ensures highlight stays in sync
   * with context state regardless of how contexts are modified.
   */
  useEffect(() => {
    plugin.chatSelectionHighlightController.clearIfNoNoteContexts(selectedTextContexts);
  }, [selectedTextContexts, plugin]);

  useEffect(() => {
    const handleChatVisibility = () => {
      chatInput.focusInput();
    };
    eventTarget?.addEventListener(EVENT_NAMES.CHAT_IS_VISIBLE, handleChatVisibility);

    // Cleanup function
    return () => {
      eventTarget?.removeEventListener(EVENT_NAMES.CHAT_IS_VISIBLE, handleChatVisibility);
    };
  }, [eventTarget, chatInput]);

  const handleDelete = useCallback(
    async (messageIndex: number) => {
      const messageToDelete = chatHistory[messageIndex];
      if (!messageToDelete) {
        new Notice("Message not found.");
        return;
      }

      try {
        const success = await chatUIState.deleteMessage(messageToDelete.id!);
        if (!success) {
          new Notice("Failed to delete message. Please try again.");
        }
      } catch (error) {
        logError("Error deleting message:", error);
        new Notice("Failed to delete message. Please try again.");
      }
    },
    [chatHistory, chatUIState]
  );

  const handleNewChat = useCallback(async () => {
    // Top-left new chat always creates a non-project chat.
    setSelectedSidebarProjectId(null);
    setCurrentProject(null);
    clearRecordedPromptPayload();
    await logFileManager.clear();

    // Analyze chat messages for memory if enabled
    if (settings.enableRecentConversations && selectedChain === ChainType.PROJECT_CHAIN) {
      try {
        // Get the current chat model from the chain manager
        const chatModel = chainManager.chatModelManager.getChatModel();
        plugin.userMemoryManager.addRecentConversation(chatUIState.getMessages(), chatModel);
      } catch (error) {
        logInfo("Failed to analyze chat messages for memory:", error);
      }
    }

    // Start a brand new conversation lineage without interrupting background sessions.
    chatUIState.resetCurrentConversationBinding();

    // Reset all session-level system prompt settings to global defaults
    resetSessionSystemPromptSettings();

    // Additional UI state reset specific to this component
    safeSet.setCurrentAiMessage("");
    setContextNotes([]);
    const nextDraftSessionId = uuidv4();
    const nextViewKey = `__draft__:${nextDraftSessionId}::__no_project_page__`;
    messagesByViewKeyRef.current.set(nextViewKey, []);
    setActiveChatId(null);
    setDraftSessionId(nextDraftSessionId);
    setLatestTokenCount(null); // Clear token count on new chat
    // Capture web selection URL before clearing for suppression
    const webSelectionUrl = selectedTextContexts.find((ctx) => ctx.sourceType === "web")?.url;
    clearSelectedTextContexts();
    // Clear chat selection highlight
    plugin.chatSelectionHighlightController.clearForNewChat();
    // Suppress web selection to prevent it from reappearing in new chat
    plugin.suppressCurrentWebSelection(webSelectionUrl);
    // Respect the autoAddActiveContentToContext setting for all non-project chains
    setIncludeActiveNote(false);
    setIncludeActiveWebTab(false);
  }, [
    chainManager.chatModelManager,
    chatUIState,
    settings.enableRecentConversations,
    selectedChain,
    safeSet,
    plugin,
    selectedTextContexts,
  ]);

  const handleLoadAllChatHistory = useCallback(async () => {
    try {
      const historyItems = await plugin.getAllChatHistoryItems();
      const conversationByPath = new Map<string, string>();
      const pathByConversation = new Map<string, string>();
      for (const item of historyItems) {
        const conversationId = item.conversationId?.trim();
        if (!conversationId) continue;
        conversationByPath.set(item.id, conversationId);
        pathByConversation.set(conversationId, item.id);
      }
      chatConversationIdByPathRef.current = conversationByPath;
      chatPathByConversationIdRef.current = pathByConversation;
      setAllChatHistoryItems(historyItems);
    } catch (error) {
      logError("Error loading all chat history:", error);
    }
  }, [plugin]);

  useEffect(() => {
    refreshAllChatHistoryRef.current = handleLoadAllChatHistory;
  }, [handleLoadAllChatHistory]);

  const handleDeleteChat = useCallback(
    async (id: string) => {
      try {
        await plugin.deleteChatHistory(id);
        if (activeChatId === id) {
          setActiveChatId(null);
        }
        await handleLoadAllChatHistory();
      } catch (error) {
        logError("Error deleting chat:", error);
        new Notice("Failed to delete chat.");
        throw error; // Re-throw to let the popover handle the error state
      }
    },
    [plugin, handleLoadAllChatHistory, activeChatId]
  );

  const handleLoadChat = useCallback(
    async (id: string) => {
      const resolveLatestChatPath = (chatId: string): string => {
        const conversationId = chatConversationIdByPathRef.current.get(chatId);
        if (!conversationId) return chatId;
        return chatPathByConversationIdRef.current.get(conversationId) || chatId;
      };

      const loadById = async (chatId: string) => {
        safeSet.setCurrentAiMessage("");
        await plugin.loadChatById(chatId);
        messagesByViewKeyRef.current.set(`${chatId}::__no_project_page__`, [...chatUIState.getMessages()]);
        setActiveChatId(chatId);
        setSelectedSidebarProjectId(null);
        // Opening a chat from sidebar exits project page state.
        setCurrentProject(null);
        // Reset all session-level system prompt settings to global defaults when loading a chat
        resetSessionSystemPromptSettings();
      };

      try {
        await loadById(id);
        await handleLoadAllChatHistory();
      } catch (error) {
        const latestPath = resolveLatestChatPath(id);
        if (latestPath !== id) {
          try {
            await loadById(latestPath);
            await handleLoadAllChatHistory();
            return;
          } catch (retryError) {
            logError("Error loading chat after path remap:", retryError);
          }
        }
        logError("Error loading chat:", error);
        new Notice("Failed to load chat.");
      }
    },
    [plugin, handleLoadAllChatHistory, safeSet, chatUIState]
  );

  const handleToggleChatPin = useCallback(
    async (id: string, pinned: boolean) => {
      try {
        await plugin.setChatPinned(id, pinned);
        await handleLoadAllChatHistory();
      } catch (error) {
        logError("Error updating chat pin:", error);
        new Notice("Failed to update chat pin.");
      }
    },
    [plugin, handleLoadAllChatHistory]
  );

  const handleAssignChatProject = useCallback(
    async (id: string, projectId: string | null) => {
      try {
        await plugin.setChatProject(id, projectId);
        await handleLoadAllChatHistory();
      } catch (error) {
        logError("Error assigning chat project:", error);
        new Notice("Failed to assign chat to project.");
      }
    },
    [plugin, handleLoadAllChatHistory]
  );

  const handleRenameChat = useCallback(
    async (id: string, title: string) => {
      try {
        await plugin.updateChatTitle(id, title);
        await handleLoadAllChatHistory();
      } catch (error) {
        logError("Error renaming chat:", error);
        new Notice("Failed to rename chat.");
      }
    },
    [plugin, handleLoadAllChatHistory]
  );

  const handleEditProjectFromSidebar = useCallback(
    (projectId: string) => {
      const project = (settings.projectList || []).find((item) => item.id === projectId);
      if (!project) return;
      new ContextManageModal(
        app,
        (updatedProject) => {
          handleEditProject(project, updatedProject);
        },
        project
      ).open();
    },
    [settings.projectList, app, handleEditProject]
  );

  /**
   * Rename a project from sidebar menu.
   */
  const handleRenameProjectFromSidebar = useCallback(
    (projectId: string, currentName: string) => {
      const nextName = window.prompt("Rename project", currentName)?.trim();
      if (!nextName || nextName === currentName) return;

      const hasDuplicate = (settings.projectList || []).some(
        (project) => project.id !== projectId && project.name === nextName
      );
      if (hasDuplicate) {
        new Notice(`Project "${nextName}" already exists`);
        return;
      }

      const updatedProjects = (settings.projectList || []).map((project) =>
        project.id === projectId ? { ...project, name: nextName } : project
      );
      updateSetting("projectList", updatedProjects);

      if (getCurrentProject()?.id === projectId) {
        const updatedCurrent = updatedProjects.find((project) => project.id === projectId) || null;
        setCurrentProject(updatedCurrent);
      }
      new Notice("Project renamed.");
    },
    [settings.projectList]
  );

  const handleSelectProjectFromSidebar = useCallback(
    (projectId: string) => {
      // Enter project page only. Do not switch currentProject yet to avoid
      // accidentally binding current chat history to this project.
      safeSet.setCurrentAiMessage("");
      setSelectedSidebarProjectId(projectId);
      setActiveChatId(null);
      const nextDraftSessionId = uuidv4();
      messagesByViewKeyRef.current.set(`__draft__:${nextDraftSessionId}::__no_project_page__`, []);
      setDraftSessionId(nextDraftSessionId);
      setCurrentProject(null);
    },
    [safeSet]
  );

  /**
   * Create a new project from sidebar quick action.
   */
  const handleCreateProjectFromSidebar = useCallback(() => {
    setIsCreateProjectDialogOpen(true);
  }, []);

  /**
   * Confirm create project from dialog and enter project page.
   */
  const handleConfirmCreateProject = useCallback(() => {
    const name = newProjectName.trim();
    if (!name) {
      new Notice("Project name is required");
      return;
    }
    if ((settings.projectList || []).some((project) => project.name === name)) {
      new Notice(`Project "${name}" already exists`);
      return;
    }

    const newProject: ProjectConfig = {
      id: uuidv4(),
      name,
      description: "",
      systemPrompt: "",
      projectModelKey: currentModelKey,
      modelConfigs: {},
      contextSource: {
        inclusions: "",
        exclusions: "",
        webUrls: "",
        youtubeUrls: "",
      },
      created: Date.now(),
      UsageTimestamps: Date.now(),
    };

    updateSetting("projectList", [...(settings.projectList || []), newProject]);
    setSelectedSidebarProjectId(newProject.id);
    setCurrentProject(newProject);
    setActiveChatId(null);
    setNewProjectName("");
    setIsCreateProjectDialogOpen(false);
  }, [newProjectName, settings.projectList, currentModelKey]);

  /**
   * Update one project config in settings and current project atom.
   */
  const handleUpdateProjectConfig = useCallback(
    (projectId: string, updater: (project: ProjectConfig) => ProjectConfig) => {
      const updatedProjects = (settings.projectList || []).map((project) =>
        project.id === projectId ? updater(project) : project
      );
      updateSetting("projectList", updatedProjects);
      if (getCurrentProject()?.id === projectId) {
        const updatedCurrent = updatedProjects.find((project) => project.id === projectId) || null;
        setCurrentProject(updatedCurrent);
      }
    },
    [settings.projectList]
  );

  // Event listener for abort stream events
  useEffect(() => {
    const handleAbortStream = (event: CustomEvent) => {
      const reason = event.detail?.reason || ABORT_REASON.NEW_CHAT;
      handleStopGenerating(reason);
    };

    eventTarget?.addEventListener(EVENT_NAMES.ABORT_STREAM, handleAbortStream);

    // Cleanup function
    return () => {
      eventTarget?.removeEventListener(EVENT_NAMES.ABORT_STREAM, handleAbortStream);
    };
  }, [eventTarget, handleStopGenerating]);

  // Keep active note/web tab context opt-in only.
  useEffect(() => {
    setIncludeActiveNote(false);
    setIncludeActiveWebTab(false);
  }, [selectedChain]);

  useEffect(() => {
    void handleLoadAllChatHistory();
  }, [handleLoadAllChatHistory]);

  const renderSharedChatInput = useCallback(
    (
      onSend: (args?: {
        toolCalls?: string[];
        urls?: string[];
        contextNotes?: TFile[];
        contextTags?: string[];
        contextFolders?: string[];
        webTabs?: WebTabContext[];
      }) => Promise<void>
    ) => (
      <ChatInput
        inputMessage={inputMessage}
        setInputMessage={setInputMessage}
        handleSendMessage={onSend}
        isGenerating={loading}
        onStopGenerating={() => handleStopGenerating(ABORT_REASON.USER_STOPPED)}
        app={app}
        contextNotes={contextNotes}
        setContextNotes={setContextNotes}
        includeActiveNote={includeActiveNote}
        setIncludeActiveNote={setIncludeActiveNote}
        includeActiveWebTab={includeActiveWebTab}
        setIncludeActiveWebTab={setIncludeActiveWebTab}
        activeWebTab={currentActiveWebTab}
        selectedImages={selectedImages}
        onAddImage={(files: File[]) => setSelectedImages((prev) => [...prev, ...files])}
        setSelectedImages={setSelectedImages}
        disableModelSwitch={selectedChain === ChainType.PROJECT_CHAIN}
        selectedTextContexts={selectedTextContexts}
        onRemoveSelectedText={handleRemoveSelectedText}
        showProgressCard={() => {
          setProgressCardVisible(true);
        }}
        showIndexingCard={() => {
          setIndexingCardVisible(true);
        }}
        latestTokenCount={latestTokenCount}
      />
    ),
    [
      inputMessage,
      setInputMessage,
      loading,
      handleStopGenerating,
      app,
      contextNotes,
      includeActiveNote,
      includeActiveWebTab,
      currentActiveWebTab,
      selectedImages,
      selectedChain,
      selectedTextContexts,
      handleRemoveSelectedText,
    ]
  );

  // Note: pendingMessages loading has been removed as ChatManager now handles
  // message persistence and loading automatically based on project context

  const renderChatComponents = () => (
    <ChatWorkspace
      showConversationSidebar={showConversationSidebar}
      onToggleConversationSidebar={() => setShowConversationSidebar((visible) => !visible)}
      onNewChat={() => void handleNewChat()}
      sidebar={
        <ConversationSidebar
          isVisible={showConversationSidebar}
          items={allChatHistoryItems}
          runningChatIds={runningChatIds}
          activeChatId={activeChatId}
          selectedProjectId={selectedSidebarProjectId}
          projects={(settings.projectList || []).map((project) => ({
            id: project.id,
            name: project.name,
            pinned: (project as ProjectConfig & { pinned?: boolean }).pinned,
          }))}
          onLoadChat={handleLoadChat}
          onDeleteChat={handleDeleteChat}
          onRenameChat={handleRenameChat}
          onTogglePin={handleToggleChatPin}
          onAssignProject={handleAssignChatProject}
          onRenameProject={handleRenameProjectFromSidebar}
          onDeleteProject={handleDeleteProjectFromSidebar}
          onToggleProjectPin={handleToggleProjectPin}
          onSelectProject={handleSelectProjectFromSidebar}
          onCreateProject={handleCreateProjectFromSidebar}
        />
      }
      main={
        <>
          <NewVersionBanner currentVersion={plugin.manifest.version} />
          {selectedSidebarProjectId ? (
            <ProjectOverviewPanel
              project={
                (settings.projectList || []).find((project) => project.id === selectedSidebarProjectId) ||
                null
              }
              chats={allChatHistoryItems.filter((item) => item.projectId === selectedSidebarProjectId)}
              runningChatIds={runningChatIds}
              activeChatId={activeChatId}
              onOpenChat={handleLoadChat}
              onUpdateProject={handleUpdateProjectConfig}
              inputArea={renderSharedChatInput(async (args) => {
                const project = (settings.projectList || []).find(
                  (item) => item.id === selectedSidebarProjectId
                );
                if (!project) return;
                const nextDraftSessionId = uuidv4();
                const nextViewKey = `__draft__:${nextDraftSessionId}::__no_project_page__`;
                messagesByViewKeyRef.current.set(nextViewKey, []);
                flushSync(() => {
                  setCurrentProject(project);
                  setActiveChatId(null);
                  setDraftSessionId(nextDraftSessionId);
                  setSelectedSidebarProjectId(null);
                });
                await handleSendMessage(args, project);
              })}
            />
          ) : (
            <ChatThreadColumn
              chatHistory={chatHistory}
              currentAiMessage={currentAiMessage}
              streamingMessageId={currentStreamingMessageId}
              loading={loading}
              loadingMessage={loadingMessage}
              app={app}
              onRegenerate={handleRegenerate}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onReplaceChat={setInputMessage}
              showHelperComponents={selectedChain !== ChainType.PROJECT_CHAIN}
              statusOverlay={
                shouldShowProgressCard() ? (
                  <ChatModalBackdrop>
                    <ProgressCard
                      plugin={plugin}
                      setHiddenCard={() => {
                        setProgressCardVisible(false);
                      }}
                      onEditContext={() => {
                        const currentProject = getCurrentProject();
                        if (currentProject) {
                          new ContextManageModal(
                            app,
                            (updatedProject) => {
                              handleEditProject(currentProject, updatedProject);
                            },
                            currentProject
                          ).open();
                        }
                      }}
                    />
                  </ChatModalBackdrop>
                ) : shouldShowIndexingCard() ? (
                  <ChatModalBackdrop>
                    <IndexingProgressCard
                      onClose={handleIndexingCardClose}
                      onPause={handleIndexingPause}
                      onResume={handleIndexingResume}
                      onStop={handleIndexingStop}
                    />
                  </ChatModalBackdrop>
                ) : null
              }
              onSaveAsNote={handleSaveAsNote}
              onModeChange={(newMode) => {
                setPreviousMode(selectedChain);
                if (newMode === ChainType.PROJECT_CHAIN) {
                  setShowChatUI(false);
                }
              }}
              latestTokenCount={latestTokenCount}
              chatInput={renderSharedChatInput(handleSendMessage)}
            />
          )}
        </>
      }
      createProjectDialog={
        <CreateProjectDialog
          open={isCreateProjectDialogOpen}
          onOpenChange={setIsCreateProjectDialogOpen}
          projectName={newProjectName}
          onProjectNameChange={setNewProjectName}
          onConfirm={handleConfirmCreateProject}
        />
      }
    />
  );

  return (
    <div
      ref={chatContainerRef}
      onPointerDownCapture={handleChatPointerDownCapture}
      className="tw-flex tw-size-full tw-flex-col tw-overflow-hidden"
    >
      <div className="tw-h-full">
        <div className="tw-relative tw-flex tw-h-full tw-flex-col">
          {isDragActive && (
            <div className="tw-absolute tw-inset-0 tw-z-modal tw-flex tw-items-center tw-justify-center tw-rounded-md tw-border tw-border-dashed tw-bg-primary tw-opacity-80">
              <span>Drop files here...</span>
            </div>
          )}
          {selectedChain === ChainType.PROJECT_CHAIN && (
            <div className={`${selectedChain === ChainType.PROJECT_CHAIN ? "tw-z-modal" : ""}`}>
              <ProjectList
                projects={settings.projectList || []}
                defaultOpen={true}
                app={app}
                plugin={plugin}
                hasMessages={false}
                onProjectAdded={handleAddProject}
                onEditProject={handleEditProject}
                onClose={() => {
                  if (previousMode) {
                    setSelectedChain(previousMode);
                    setPreviousMode(null);
                  } else {
                    // default back to chat
                    setSelectedChain(ChainType.LLM_CHAIN);
                  }
                }}
                showChatUI={(v) => setShowChatUI(v)}
                onProjectClose={() => {
                  setProgressCardVisible(null);
                }}
              />
            </div>
          )}
          {(selectedChain !== ChainType.PROJECT_CHAIN ||
            (selectedChain === ChainType.PROJECT_CHAIN && showChatUI)) &&
            renderChatComponents()}
        </div>
      </div>
    </div>
  );
};

// Main Chat component with context provider
const Chat: React.FC<ChatProps> = (props) => {
  return (
    <ChatInputProvider>
      <ChatWithContext {...props} />
    </ChatInputProvider>
  );
};

// Chat component that uses context
const ChatWithContext: React.FC<ChatProps> = (props) => {
  const chatInput = useChatInput();
  return <ChatInternal {...props} chatInput={chatInput} />;
};

export default Chat;
