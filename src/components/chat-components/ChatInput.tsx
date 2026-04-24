import {
  getCurrentProject,
  ProjectConfig,
  subscribeToProjectChange,
  useChainType,
  useModelKey,
} from "@/aiParams";
import { ChainType } from "@/chainFactory";
import { X } from "lucide-react";
import { isPlusChain } from "@/utils";
import { mergeWebTabContexts } from "@/utils/urlNormalization";
import { $getRoot } from "lexical";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ContextControl } from "./ContextControl";
import LexicalEditor from "./LexicalEditor";
import type { ChatInputProps } from "./chat-input/ChatInput.types";
import { ChatInputToolbar } from "./chat-input/ChatInputToolbar";
import { useChatInputContextBridge } from "./chat-input/useChatInputContextBridge";
import { useChatInputToolToggles } from "./chat-input/useChatInputToolToggles";

const ChatInput: React.FC<ChatInputProps> = ({
  inputMessage,
  setInputMessage,
  handleSendMessage,
  isGenerating,
  onStopGenerating,
  app,
  contextNotes,
  setContextNotes,
  includeActiveNote,
  setIncludeActiveNote,
  includeActiveWebTab,
  setIncludeActiveWebTab,
  activeWebTab,
  selectedImages,
  onAddImage,
  setSelectedImages,
  disableModelSwitch,
  selectedTextContexts,
  onRemoveSelectedText,
  showProgressCard,
  showIndexingCard,
  latestTokenCount = null,
  editMode = false,
  onEditSave,
  onEditCancel,
  initialContext,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lexicalEditorRef = useRef<any>(null);
  const [currentModelKey, setCurrentModelKey] = useModelKey();
  const [currentChain, setCurrentChain] = useChainType();
  const [selectedProject, setSelectedProject] = useState<ProjectConfig | null>(null);
  const isCopilotPlus = isPlusChain(currentChain);

  const ctx = useChatInputContextBridge({
    app,
    initialContext,
    contextNotes,
    setContextNotes,
    includeActiveNote,
    setIncludeActiveNote,
    includeActiveWebTab,
    setIncludeActiveWebTab,
    activeWebTab,
    onRemoveSelectedText,
    lexicalEditorRef,
    currentChain,
  });

  const tools = useChatInputToolToggles({
    currentChain,
    isCopilotPlus,
    lexicalEditorRef,
    toolsFromPills: ctx.toolsFromPills,
  });

  useEffect(() => {
    if (currentChain === ChainType.PROJECT_CHAIN) {
      setSelectedProject(getCurrentProject());
      const unsubscribe = subscribeToProjectChange((project) => {
        setSelectedProject(project);
      });
      return () => {
        unsubscribe();
      };
    }
    setSelectedProject(null);
  }, [currentChain]);

  /**
   * Read the latest plain text from Lexical at send time. React `inputMessage` can lag
   * one frame behind the editor; without this, inline edit + Send can pass stale text and
   * Chat's handleEdit bails out when newMessage === old message.
   */
  const getTextFromEditorSnapshot = (): string => {
    const editor = lexicalEditorRef.current as
      | { read?: (fn: () => string) => string }
      | null
      | undefined;
    if (!editor?.read) {
      return inputMessage;
    }
    return editor.read(() => $getRoot().getTextContent());
  };

  const getDisplayModelKey = (): string => {
    if (
      selectedProject &&
      currentChain === ChainType.PROJECT_CHAIN &&
      selectedProject.projectModelKey
    ) {
      return selectedProject.projectModelKey;
    }
    return currentModelKey;
  };

  const onSendMessage = () => {
    if (editMode && onEditSave) {
      onEditSave(getTextFromEditorSnapshot(), {
        notes: contextNotes,
        urls: ctx.contextUrls,
        folders: ctx.contextFolders,
      });
      return;
    }

    const webTabsFromEditor = ctx.getWebTabsFromEditorSnapshot();
    const allWebTabs = mergeWebTabContexts([...ctx.contextWebTabs, ...webTabsFromEditor]);

    if (!isCopilotPlus) {
      handleSendMessage({
        webTabs: allWebTabs,
      });
      return;
    }

    const toolCalls: string[] = [];
    if (!tools.autonomousAgentToggle) {
      const messageLower = inputMessage.toLowerCase();
      if (tools.vaultToggle && !messageLower.includes("@vault")) {
        toolCalls.push("@vault");
      }
      if (
        tools.webToggle &&
        !messageLower.includes("@websearch") &&
        !messageLower.includes("@web")
      ) {
        toolCalls.push("@websearch");
      }
      if (tools.composerToggle && !messageLower.includes("@composer")) {
        toolCalls.push("@composer");
      }
    }

    handleSendMessage({
      toolCalls,
      contextNotes,
      urls: ctx.contextUrls,
      contextFolders: ctx.contextFolders,
      webTabs: allWebTabs,
    });
  };

  const onEditorReady = useCallback((editor: any) => {
    lexicalEditorRef.current = editor;
  }, []);

  useEffect(() => {
    if (!editMode || !onEditCancel) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onEditCancel();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editMode, onEditCancel]);

  return (
    <div
      className="tw-w-full tw-rounded-lg tw-border tw-border-solid tw-border-border tw-@container/chat-input"
      ref={containerRef}
    >
      <div className="tw-flex tw-flex-col tw-gap-0.5 tw-px-2 tw-pb-1 tw-pt-2">
        {!editMode && (
          <ContextControl
            contextNotes={contextNotes}
            includeActiveNote={includeActiveNote}
            activeNote={ctx.currentActiveNote}
            includeActiveWebTab={includeActiveWebTab}
            activeWebTab={activeWebTab}
            contextUrls={ctx.contextUrls}
            contextFolders={ctx.contextFolders}
            contextWebTabs={ctx.mergedContextWebTabs}
            selectedTextContexts={selectedTextContexts}
            showProgressCard={showProgressCard}
            showIndexingCard={showIndexingCard}
            lexicalEditorRef={lexicalEditorRef}
            onAddToContext={ctx.handleAddToContext}
            onRemoveFromContext={ctx.handleRemoveFromContext}
          />
        )}

        {selectedImages.length > 0 && (
          <div className="selected-images">
            {selectedImages.map((file, index) => (
              <div key={index} className="image-preview-container">
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="selected-image-preview"
                />
                <button
                  className="remove-image-button"
                  onClick={() => setSelectedImages((prev) => prev.filter((_, i) => i !== index))}
                  title="Remove image"
                >
                  <X className="tw-size-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="tw-relative tw-mt-1">
          <LexicalEditor
            value={inputMessage}
            onChange={(value) => setInputMessage(value)}
            onSubmit={onSendMessage}
            onNotesChange={ctx.setNotesFromPills}
            onNotesRemoved={ctx.handleNotePillsRemoved}
            onActiveNoteAdded={ctx.handleActiveNoteAdded}
            onActiveNoteRemoved={ctx.handleActiveNoteRemoved}
            onURLsChange={isCopilotPlus ? ctx.setUrlsFromPills : undefined}
            onURLsRemoved={isCopilotPlus ? ctx.handleURLPillsRemoved : undefined}
            onToolsChange={isCopilotPlus ? ctx.setToolsFromPills : undefined}
            onToolsRemoved={isCopilotPlus ? tools.handleToolPillsRemoved : undefined}
            onFoldersChange={ctx.setFoldersFromPills}
            onFoldersRemoved={ctx.handleFolderPillsRemoved}
            onWebTabsChange={ctx.setWebTabsFromPills}
            onActiveWebTabAdded={ctx.handleActiveWebTabAdded}
            onActiveWebTabRemoved={ctx.handleActiveWebTabRemoved}
            onEditorReady={onEditorReady}
            onImagePaste={onAddImage}
            onTagSelected={tools.handleTagSelected}
            placeholder={"Your AI assistant for Obsidian • @ to add context • / for custom prompts"}
            isCopilotPlus={isCopilotPlus}
            currentActiveFile={ctx.currentActiveNote}
            currentChain={currentChain}
          />
        </div>

        <ChatInputToolbar
          isGenerating={isGenerating}
          onStopGenerating={onStopGenerating}
          currentChain={currentChain}
          setCurrentChain={setCurrentChain}
          displayModelKey={getDisplayModelKey()}
          onModelChange={(modelKey) => {
            if (currentChain !== ChainType.PROJECT_CHAIN) {
              setCurrentModelKey(modelKey);
            }
          }}
          disableModelSwitch={disableModelSwitch}
          lexicalEditorRef={lexicalEditorRef}
          editMode={editMode}
          onEditCancel={onEditCancel}
          onSend={onSendMessage}
          app={app}
          onAddImage={onAddImage}
          latestTokenCount={latestTokenCount}
          vaultToggle={tools.vaultToggle}
          setVaultToggle={tools.setVaultToggle}
          webToggle={tools.webToggle}
          setWebToggle={tools.setWebToggle}
          composerToggle={tools.composerToggle}
          setComposerToggle={tools.setComposerToggle}
          autonomousAgentToggle={tools.autonomousAgentToggle}
          setAutonomousAgentToggle={tools.setAutonomousAgentToggle}
          onVaultToggleOff={tools.handleVaultToggleOff}
          onWebToggleOff={tools.handleWebToggleOff}
          onComposerToggleOff={tools.handleComposerToggleOff}
        />
      </div>
    </div>
  );
};

ChatInput.displayName = "ChatInput";

export default ChatInput;
export type { ChatInputProps } from "./chat-input/ChatInput.types";
