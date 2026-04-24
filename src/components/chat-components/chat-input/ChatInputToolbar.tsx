import { ChainType } from "@/chainFactory";
import { AddImageModal } from "@/components/modals/AddImageModal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModelSelector } from "@/components/ui/ModelSelector";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TokenCounter } from "@/components/chat-components/TokenCounter";
import { ChatToolControls } from "@/components/chat-components/ChatToolControls";
import { ArrowUp, ChevronDown, Database, Image, Loader2, MessageSquare } from "lucide-react";
import { App } from "obsidian";
import React from "react";

export interface ChatInputToolbarProps {
  isGenerating: boolean;
  onStopGenerating: () => void;
  currentChain: ChainType;
  setCurrentChain: (chain: ChainType) => void;
  displayModelKey: string;
  onModelChange: (modelKey: string) => void;
  disableModelSwitch?: boolean;
  lexicalEditorRef: React.MutableRefObject<{ focus?: () => void } | null>;
  editMode?: boolean;
  onEditCancel?: () => void;
  onSend: () => void;
  app: App;
  onAddImage: (files: File[]) => void;
  latestTokenCount: number | null;
  vaultToggle: boolean;
  setVaultToggle: React.Dispatch<React.SetStateAction<boolean>>;
  webToggle: boolean;
  setWebToggle: React.Dispatch<React.SetStateAction<boolean>>;
  composerToggle: boolean;
  setComposerToggle: React.Dispatch<React.SetStateAction<boolean>>;
  autonomousAgentToggle: boolean;
  setAutonomousAgentToggle: React.Dispatch<React.SetStateAction<boolean>>;
  onVaultToggleOff: () => void;
  onWebToggleOff: () => void;
  onComposerToggleOff: () => void;
}

export const ChatInputToolbar: React.FC<ChatInputToolbarProps> = ({
  isGenerating,
  onStopGenerating,
  currentChain,
  setCurrentChain,
  displayModelKey,
  onModelChange,
  disableModelSwitch,
  lexicalEditorRef,
  editMode,
  onEditCancel,
  onSend,
  app,
  onAddImage,
  latestTokenCount,
  vaultToggle,
  setVaultToggle,
  webToggle,
  setWebToggle,
  composerToggle,
  setComposerToggle,
  autonomousAgentToggle,
  setAutonomousAgentToggle,
  onVaultToggleOff,
  onWebToggleOff,
  onComposerToggleOff,
}) => {
  return (
    <div className="tw-flex tw-h-7 tw-justify-between tw-gap-1">
      {isGenerating ? (
        <div className="tw-flex tw-items-center tw-gap-1 tw-text-sm tw-text-muted">
          <Loader2 className="tw-size-3 tw-animate-spin" />
          <span>Generating...</span>
        </div>
      ) : (
        <div className="tw-min-w-0 tw-flex-1">
          <div className="tw-flex tw-items-center tw-gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost2"
                  size="fit"
                  className="tw-h-6 tw-rounded-full tw-px-2 tw-text-xs tw-text-muted tw-bg-muted/30 hover:tw-bg-muted/40"
                >
                  {currentChain === ChainType.VAULT_QA_CHAIN ? (
                    <Database className="tw-size-3.5" />
                  ) : (
                    <MessageSquare className="tw-size-3.5" />
                  )}
                  {currentChain === ChainType.VAULT_QA_CHAIN ? "Vault" : "Chat"}
                  <ChevronDown className="tw-size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onSelect={() => setCurrentChain(ChainType.LLM_CHAIN)}>
                  <MessageSquare className="tw-mr-2 tw-size-3.5" />
                  Chat
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setCurrentChain(ChainType.VAULT_QA_CHAIN)}>
                  <Database className="tw-mr-2 tw-size-3.5" />
                  Vault
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ModelSelector
              variant="ghost2"
              size="fit"
              disabled={disableModelSwitch}
              value={displayModelKey}
              onChange={(modelKey) => {
                onModelChange(modelKey);
                setTimeout(() => {
                  lexicalEditorRef.current?.focus?.();
                }, 0);
              }}
              className="tw-max-w-full tw-truncate"
            />
          </div>
        </div>
      )}

      <div className="tw-flex tw-items-center tw-gap-1">
        {isGenerating ? (
          <Button
            variant="default"
            size="icon"
            // eslint-disable-next-line tailwindcss/no-custom-classname -- stop control matches main chat input
            className="tw-border-primary tw-size-6 tw-rounded-full tw-border tw-bg-primary hover:tw-bg-primary/90"
            onClick={() => onStopGenerating()}
            title="Stop"
            aria-label="Stop"
          >
            {/* eslint-disable-next-line tailwindcss/no-custom-classname -- stop square fill */}
            <div className="tw-bg-white tw-size-2 tw-rounded-sm" />
          </Button>
        ) : (
          <>
            <ChatToolControls
              vaultToggle={vaultToggle}
              setVaultToggle={setVaultToggle}
              webToggle={webToggle}
              setWebToggle={setWebToggle}
              composerToggle={composerToggle}
              setComposerToggle={setComposerToggle}
              autonomousAgentToggle={autonomousAgentToggle}
              setAutonomousAgentToggle={setAutonomousAgentToggle}
              currentChain={currentChain}
              onVaultToggleOff={onVaultToggleOff}
              onWebToggleOff={onWebToggleOff}
              onComposerToggleOff={onComposerToggleOff}
            />
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost2"
                    size="fit"
                    className="tw-text-muted hover:tw-text-accent"
                    onClick={() => {
                      new AddImageModal(app, onAddImage).open();
                    }}
                  >
                    <Image className="tw-size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="tw-px-1 tw-py-0.5">Add image(s)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TokenCounter tokenCount={latestTokenCount} />
            {editMode && onEditCancel && (
              <Button variant="ghost2" size="fit" className="tw-text-muted" onClick={onEditCancel}>
                <span>cancel</span>
              </Button>
            )}
            <Button
              variant="default"
              size="icon"
              className="tw-size-6 tw-rounded-full"
              onClick={() => onSend()}
            >
              <ArrowUp className="tw-size-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

ChatInputToolbar.displayName = "ChatInputToolbar";
