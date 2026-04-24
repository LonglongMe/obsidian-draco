/**
 * @vault / @websearch / @composer / autonomous tool toggles and Lexical tool-pill sync.
 */
import { ChainType } from "@/chainFactory";
import { useSettingsValue } from "@/settings/model";
import { $removePillsByToolName } from "@/components/chat-components/pills/ToolPillNode";
import { Notice } from "obsidian";
import { useCallback, useEffect, useState } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";

export interface UseChatInputToolTogglesParams {
  currentChain: ChainType;
  isCopilotPlus: boolean;
  lexicalEditorRef: MutableRefObject<unknown>;
  toolsFromPills: string[];
}

export interface UseChatInputToolTogglesResult {
  vaultToggle: boolean;
  setVaultToggle: Dispatch<SetStateAction<boolean>>;
  webToggle: boolean;
  setWebToggle: Dispatch<SetStateAction<boolean>>;
  composerToggle: boolean;
  setComposerToggle: Dispatch<SetStateAction<boolean>>;
  autonomousAgentToggle: boolean;
  setAutonomousAgentToggle: Dispatch<SetStateAction<boolean>>;
  handleToolPillsRemoved: (removedTools: string[]) => void;
  handleVaultToggleOff: () => void;
  handleWebToggleOff: () => void;
  handleComposerToggleOff: () => void;
  handleTagSelected: () => void;
}

export function useChatInputToolToggles(
  params: UseChatInputToolTogglesParams
): UseChatInputToolTogglesResult {
  const { currentChain, isCopilotPlus, lexicalEditorRef, toolsFromPills } = params;
  const settings = useSettingsValue();

  const [vaultToggle, setVaultToggle] = useState(false);
  const [webToggle, setWebToggle] = useState(false);
  const [composerToggle, setComposerToggle] = useState(false);
  const [autonomousAgentToggle, setAutonomousAgentToggle] = useState(
    settings.enableAutonomousAgent
  );

  useEffect(() => {
    if (currentChain === ChainType.PROJECT_CHAIN) {
      setAutonomousAgentToggle(false);
    } else {
      setAutonomousAgentToggle(settings.enableAutonomousAgent);
    }
  }, [settings.enableAutonomousAgent, currentChain]);

  // Sync tool button states with tool pills
  useEffect(() => {
    if (!isCopilotPlus || autonomousAgentToggle) return;
    const hasVault = toolsFromPills.includes("@vault");
    const hasWeb = toolsFromPills.includes("@websearch") || toolsFromPills.includes("@web");
    const hasComposer = toolsFromPills.includes("@composer");
    setVaultToggle(hasVault);
    setWebToggle(hasWeb);
    setComposerToggle(hasComposer);
  }, [toolsFromPills, isCopilotPlus, autonomousAgentToggle]);

  const handleToolPillsRemoved = (removedTools: string[]) => {
    if (!isCopilotPlus || autonomousAgentToggle) return;
    removedTools.forEach((tool) => {
      switch (tool) {
        case "@vault":
          setVaultToggle(false);
          break;
        case "@websearch":
        case "@web":
          setWebToggle(false);
          break;
        case "@composer":
          setComposerToggle(false);
          break;
      }
    });
  };

  const handleVaultToggleOff = useCallback(() => {
    const editor = lexicalEditorRef.current as { update: (fn: () => void) => void } | null;
    if (editor && isCopilotPlus) {
      editor.update(() => {
        $removePillsByToolName("@vault");
      });
    }
  }, [isCopilotPlus, lexicalEditorRef]);

  const handleWebToggleOff = useCallback(() => {
    const editor = lexicalEditorRef.current as { update: (fn: () => void) => void } | null;
    if (editor && isCopilotPlus) {
      editor.update(() => {
        $removePillsByToolName("@websearch");
        $removePillsByToolName("@web");
      });
    }
  }, [isCopilotPlus, lexicalEditorRef]);

  const handleComposerToggleOff = useCallback(() => {
    const editor = lexicalEditorRef.current as { update: (fn: () => void) => void } | null;
    if (editor && isCopilotPlus) {
      editor.update(() => {
        $removePillsByToolName("@composer");
      });
    }
  }, [isCopilotPlus, lexicalEditorRef]);

  const handleTagSelected = useCallback(() => {
    if (isCopilotPlus && !autonomousAgentToggle && !vaultToggle) {
      setVaultToggle(true);
      new Notice("Vault search enabled for tag query");
    }
  }, [isCopilotPlus, autonomousAgentToggle, vaultToggle]);

  return {
    vaultToggle,
    setVaultToggle,
    webToggle,
    setWebToggle,
    composerToggle,
    setComposerToggle,
    autonomousAgentToggle,
    setAutonomousAgentToggle,
    handleToolPillsRemoved,
    handleVaultToggleOff,
    handleWebToggleOff,
    handleComposerToggleOff,
    handleTagSelected,
  };
}
