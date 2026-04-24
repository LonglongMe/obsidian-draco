import { ChatControls } from "@/components/chat-components/ChatControls";
import ChatMessages from "@/components/chat-components/ChatMessages";
import type { ChainType } from "@/chainFactory";
import type { ChatMessage } from "@/types/message";
import { App } from "obsidian";
import React from "react";

export interface ChatThreadColumnProps {
  chatHistory: ChatMessage[];
  currentAiMessage: string;
  streamingMessageId: string | null;
  loading: boolean;
  loadingMessage: string;
  app: App;
  onRegenerate: (messageIndex: number) => Promise<void>;
  onEdit: (messageIndex: number, newMessage: string) => Promise<void>;
  onDelete: (messageIndex: number) => Promise<void>;
  onReplaceChat: (text: string) => void;
  showHelperComponents: boolean;
  /** Progress / indexing layer over messages; omit when null */
  statusOverlay: React.ReactNode;
  onSaveAsNote: () => Promise<void>;
  onModeChange: (newMode: ChainType) => void;
  latestTokenCount: number | null;
  chatInput: React.ReactNode;
}

/**
 * Standard chat layout: message list (with optional overlay), footer controls, composer.
 */
export function ChatThreadColumn({
  chatHistory,
  currentAiMessage,
  streamingMessageId,
  loading,
  loadingMessage,
  app,
  onRegenerate,
  onEdit,
  onDelete,
  onReplaceChat,
  showHelperComponents,
  statusOverlay,
  onSaveAsNote,
  onModeChange,
  latestTokenCount,
  chatInput,
}: ChatThreadColumnProps) {
  return (
    <div className="tw-flex tw-min-h-0 tw-flex-1 tw-flex-col tw-overflow-hidden">
      <div className="tw-relative tw-flex tw-min-h-0 tw-flex-1 tw-flex-col tw-overflow-hidden">
        <ChatMessages
          chatHistory={chatHistory}
          currentAiMessage={currentAiMessage}
          streamingMessageId={streamingMessageId}
          loading={loading}
          loadingMessage={loadingMessage}
          app={app}
          onRegenerate={onRegenerate}
          onEdit={onEdit}
          onDelete={onDelete}
          onReplaceChat={onReplaceChat}
          showHelperComponents={showHelperComponents}
        />
        {statusOverlay}
      </div>
      <ChatControls
        onSaveAsNote={onSaveAsNote}
        onModeChange={onModeChange}
        latestTokenCount={latestTokenCount}
      />
      {chatInput}
    </div>
  );
}
