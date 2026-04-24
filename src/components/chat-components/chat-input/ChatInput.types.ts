import type { SelectedTextContext, WebTabContext } from "@/types/message";
import type { App, TFile } from "obsidian";
import type React from "react";

/** Main chat composer props; InlineMessageEditor reuses the same contract in edit mode. */
export interface ChatInputProps {
  inputMessage: string;
  setInputMessage: (message: string) => void;
  handleSendMessage: (metadata?: {
    toolCalls?: string[];
    urls?: string[];
    contextNotes?: TFile[];
    contextFolders?: string[];
    webTabs?: WebTabContext[];
  }) => void;
  isGenerating: boolean;
  onStopGenerating: () => void;
  app: App;
  contextNotes: TFile[];
  setContextNotes: React.Dispatch<React.SetStateAction<TFile[]>>;
  includeActiveNote: boolean;
  setIncludeActiveNote: (include: boolean) => void;
  includeActiveWebTab: boolean;
  setIncludeActiveWebTab: (include: boolean) => void;
  activeWebTab: WebTabContext | null;
  selectedImages: File[];
  onAddImage: (files: File[]) => void;
  setSelectedImages: React.Dispatch<React.SetStateAction<File[]>>;
  disableModelSwitch?: boolean;
  selectedTextContexts?: SelectedTextContext[];
  onRemoveSelectedText?: (id: string) => void;
  showProgressCard: () => void;
  showIndexingCard?: () => void;
  latestTokenCount?: number | null;

  editMode?: boolean;
  onEditSave?: (
    text: string,
    context: {
      notes: TFile[];
      urls: string[];
      folders: string[];
    }
  ) => void;
  onEditCancel?: () => void;
  initialContext?: {
    notes?: TFile[];
    urls?: string[];
    folders?: string[];
    /** Carried for edit-mode round-trip; not read by the composer itself. */
    tags?: string[];
  };
}
