/**
 * Local context state: Lexical pill sync, context badges, active note tracking.
 * Extracted from ChatInput to keep the surface component small.
 */
import { ChainType } from "@/chainFactory";
import {
  mergeWebTabContexts,
  normalizeUrlString,
  normalizeWebTabContext,
} from "@/utils/urlNormalization";
import { isAllowedFileForNoteContext } from "@/utils";
import type { WebTabContext } from "@/types/message";
import { $getSelection, $isRangeSelection } from "lexical";
import { $removePillsByPath } from "@/components/chat-components/pills/NotePillNode";
import { $removeActiveNotePills } from "@/components/chat-components/pills/ActiveNotePillNode";
import { $removePillsByURL } from "@/components/chat-components/pills/URLPillNode";
import { $removePillsByFolder } from "@/components/chat-components/pills/FolderPillNode";
import { $createToolPillNode } from "@/components/chat-components/pills/ToolPillNode";
import { $removeActiveWebTabPills } from "@/components/chat-components/pills/ActiveWebTabPillNode";
import { $findWebTabPills, $removeWebTabPillsByUrl } from "@/components/chat-components/pills/WebTabPillNode";
import { isPlusChain } from "@/utils";
import { App, TFile } from "obsidian";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { ChatInputProps } from "./ChatInput.types";

export interface UseChatInputContextBridgeParams {
  app: App;
  initialContext?: ChatInputProps["initialContext"];
  contextNotes: TFile[];
  setContextNotes: Dispatch<SetStateAction<TFile[]>>;
  includeActiveNote: boolean;
  setIncludeActiveNote: (include: boolean) => void;
  includeActiveWebTab: boolean;
  setIncludeActiveWebTab: (include: boolean) => void;
  activeWebTab: WebTabContext | null;
  onRemoveSelectedText?: (id: string) => void;
  lexicalEditorRef: MutableRefObject<unknown>;
  currentChain: ChainType;
}

export interface UseChatInputContextBridgeResult {
  contextUrls: string[];
  setContextUrls: Dispatch<SetStateAction<string[]>>;
  contextFolders: string[];
  setContextFolders: Dispatch<SetStateAction<string[]>>;
  contextWebTabs: WebTabContext[];
  setContextWebTabs: Dispatch<SetStateAction<WebTabContext[]>>;
  mergedContextWebTabs: WebTabContext[];
  currentActiveNote: TFile | null;
  notesFromPills: { path: string; basename: string }[];
  setNotesFromPills: Dispatch<SetStateAction<{ path: string; basename: string }[]>>;
  urlsFromPills: string[];
  setUrlsFromPills: Dispatch<SetStateAction<string[]>>;
  foldersFromPills: string[];
  setFoldersFromPills: Dispatch<SetStateAction<string[]>>;
  toolsFromPills: string[];
  setToolsFromPills: Dispatch<SetStateAction<string[]>>;
  webTabsFromPills: WebTabContext[];
  setWebTabsFromPills: Dispatch<SetStateAction<WebTabContext[]>>;
  getWebTabsFromEditorSnapshot: () => WebTabContext[];
  handleNotePillsRemoved: (removedNotes: { path: string; basename: string }[]) => void;
  handleURLPillsRemoved: (removedUrls: string[]) => void;
  handleFolderPillsRemoved: (removedFolders: string[]) => void;
  handleContextNoteRemoved: (notePath: string) => void;
  handleAddToContext: (category: string, data: unknown) => void;
  handleRemoveFromContext: (category: string, data: unknown) => void;
  handleActiveNoteAdded: () => void;
  handleActiveNoteRemoved: () => void;
  handleActiveWebTabAdded: () => void;
  handleActiveWebTabRemoved: () => void;
}

export function useChatInputContextBridge(
  params: UseChatInputContextBridgeParams
): UseChatInputContextBridgeResult {
  const {
    app,
    initialContext,
    setContextNotes,
    includeActiveNote,
    setIncludeActiveNote,
    setIncludeActiveWebTab,
    activeWebTab,
    onRemoveSelectedText,
    lexicalEditorRef,
    currentChain,
  } = params;

  const [contextUrls, setContextUrls] = useState<string[]>(initialContext?.urls || []);
  const [contextFolders, setContextFolders] = useState<string[]>(initialContext?.folders || []);
  const [contextWebTabs, setContextWebTabs] = useState<WebTabContext[]>([]);

  const [currentActiveNote, setCurrentActiveNote] = useState<TFile | null>(() => {
    const activeFile = app.workspace.getActiveFile();
    return isAllowedFileForNoteContext(activeFile) ? activeFile : null;
  });

  const [notesFromPills, setNotesFromPills] = useState<{ path: string; basename: string }[]>([]);
  const [urlsFromPills, setUrlsFromPills] = useState<string[]>([]);
  const [foldersFromPills, setFoldersFromPills] = useState<string[]>([]);
  const [toolsFromPills, setToolsFromPills] = useState<string[]>([]);
  const [webTabsFromPills, setWebTabsFromPills] = useState<WebTabContext[]>([]);

  const mergedContextWebTabs = useMemo(
    () => mergeWebTabContexts([...contextWebTabs, ...webTabsFromPills]),
    [contextWebTabs, webTabsFromPills]
  );

  const getWebTabsFromEditorSnapshot = useCallback((): WebTabContext[] => {
    const editor = lexicalEditorRef.current as
      | { read?: <T>(arg: () => T) => T }
      | null
      | undefined;
    if (!editor?.read) {
      return webTabsFromPills;
    }
    return editor.read(() => {
      const pills = $findWebTabPills();
      return pills.map((pill) => ({
        url: pill.getURL(),
        title: pill.getTitle(),
        faviconUrl: pill.getFaviconUrl(),
      }));
    });
  }, [lexicalEditorRef, webTabsFromPills]);

  const handleNotePillsRemoved = (removedNotes: { path: string; basename: string }[]) => {
    const removedPaths = new Set(removedNotes.map((note) => note.path));
    setContextNotes((prev) => prev.filter((contextNote) => !removedPaths.has(contextNote.path)));
  };

  const handleURLPillsRemoved = (removedUrls: string[]) => {
    const removedUrlSet = new Set(removedUrls);
    setContextUrls((prev) => prev.filter((url) => !removedUrlSet.has(url)));
  };

  const handleContextNoteRemoved = (notePath: string) => {
    const ed = lexicalEditorRef.current as { update?: (fn: () => void) => void } | null;
    if (ed?.update) {
      ed.update(() => {
        $removePillsByPath(notePath);
      });
    }
    setNotesFromPills((prev) => prev.filter((note) => note.path !== notePath));
  };

  const handleURLContextRemoved = (url: string) => {
    const ed = lexicalEditorRef.current as { update?: (fn: () => void) => void } | null;
    if (ed?.update) {
      ed.update(() => {
        $removePillsByURL(url);
      });
    }
    setUrlsFromPills((prev) => prev.filter((pillUrl) => pillUrl !== url));
  };

  const handleFolderContextRemoved = (folderPath: string) => {
    const ed = lexicalEditorRef.current as { update?: (fn: () => void) => void } | null;
    if (ed?.update) {
      ed.update(() => {
        $removePillsByFolder(folderPath);
      });
    }
    setFoldersFromPills((prev) => prev.filter((pillFolder) => pillFolder !== folderPath));
  };

  const handleAddToContext = (category: string, data: unknown) => {
    const ed = lexicalEditorRef.current as { update?: (fn: () => void) => void } | null;
    switch (category) {
      case "activeNote":
        setIncludeActiveNote(true);
        break;
      case "notes":
        if (data instanceof TFile) {
          const activeNote = app.workspace.getActiveFile();
          if (activeNote && data.path === activeNote.path) {
            setIncludeActiveNote(true);
            setContextNotes((prev) => prev.filter((n) => n.path !== data.path));
          } else {
            setContextNotes((prev) => {
              const existingNote = prev.find((n) => n.path === data.path);
              if (existingNote) {
                return prev;
              }
              return [...prev, data];
            });
          }
        }
        break;
      case "tools":
        if (typeof data === "string" && ed?.update) {
          ed.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              const toolPill = $createToolPillNode(data);
              selection.insertNodes([toolPill]);
            }
          });
        }
        break;
      case "folders":
        if (data && typeof data === "object" && "path" in data && (data as { path?: string }).path) {
          const folderPath = (data as { path: string }).path;
          setContextFolders((prev) => {
            const exists = prev.find((f) => f === folderPath);
            if (!exists) {
              return [...prev, folderPath];
            }
            return prev;
          });
        }
        break;
      case "webTabs":
        if (data && typeof data === "object" && "url" in data && typeof (data as WebTabContext).url === "string") {
          const normalized = normalizeWebTabContext(data as WebTabContext);
          if (!normalized) break;
          const activeUrl = normalizeUrlString(activeWebTab?.url);
          if (activeUrl && normalized.url === activeUrl) {
            setIncludeActiveWebTab(true);
            setContextWebTabs((prev) => prev.filter((t) => normalizeUrlString(t.url) !== activeUrl));
            break;
          }
          setContextWebTabs((prev) => mergeWebTabContexts([...prev, normalized]));
        }
        break;
      case "activeWebTab":
        setIncludeActiveWebTab(true);
        {
          const activeUrl = normalizeUrlString(activeWebTab?.url);
          if (activeUrl) {
            setContextWebTabs((prev) => prev.filter((t) => normalizeUrlString(t.url) !== activeUrl));
          }
        }
        break;
    }
  };

  const handleRemoveFromContext = (category: string, data: unknown) => {
    const ed = lexicalEditorRef.current as { update?: (fn: () => void) => void } | null;
    switch (category) {
      case "activeNote":
        setIncludeActiveNote(false);
        if (ed?.update) {
          ed.update(() => {
            $removeActiveNotePills();
          });
        }
        break;
      case "notes":
        if (typeof data === "string") {
          if (currentActiveNote?.path === data && includeActiveNote) {
            setIncludeActiveNote(false);
          } else {
            setContextNotes((prev) => prev.filter((note) => note.path !== data));
          }
          handleContextNoteRemoved(data);
        }
        break;
      case "urls":
        if (typeof data === "string") {
          setContextUrls((prev) => prev.filter((u) => u !== data));
          handleURLContextRemoved(data);
        }
        break;
      case "folders":
        if (typeof data === "string") {
          setContextFolders((prev) => prev.filter((f) => f !== data));
          handleFolderContextRemoved(data);
        }
        break;
      case "selectedText":
        if (typeof data === "string") {
          onRemoveSelectedText?.(data);
        }
        break;
      case "activeWebTab":
        setIncludeActiveWebTab(false);
        if (ed?.update) {
          ed.update(() => {
            $removeActiveWebTabPills();
          });
        }
        break;
      case "webTabs":
        if (typeof data === "string") {
          const url = normalizeUrlString(data);
          if (!url) break;
          setContextWebTabs((prev) => prev.filter((t) => normalizeUrlString(t.url) !== url));
          setWebTabsFromPills((prev) => prev.filter((t) => normalizeUrlString(t.url) !== url));
          if (ed?.update) {
            ed.update(() => {
              $removeWebTabPillsByUrl(url);
            });
          }
        }
        break;
    }
  };

  const handleFolderPillsRemoved = (removedFolders: string[]) => {
    const removedFolderPaths = new Set(removedFolders);
    setContextFolders((prev) => prev.filter((folder) => !removedFolderPaths.has(folder)));
  };

  // Pill-to-context: notes
  useEffect(() => {
    setContextNotes((prev) => {
      const contextPaths = new Set(prev.map((note) => note.path));
      const newNotesFromPills = notesFromPills.filter((pillNote) => !contextPaths.has(pillNote.path));
      const newFiles: TFile[] = [];
      newNotesFromPills.forEach((pillNote) => {
        const file = app.vault.getAbstractFileByPath(pillNote.path);
        if (file instanceof TFile) {
          newFiles.push(file);
        }
      });
      return [...prev, ...newFiles];
    });
  }, [notesFromPills, app.vault, setContextNotes]);

  // URL pills → context (Plus only)
  useEffect(() => {
    if (isPlusChain(currentChain)) {
      setContextUrls((prev) => {
        const contextUrlSet = new Set(prev);
        const newUrlsFromPills = urlsFromPills.filter((pillUrl) => !contextUrlSet.has(pillUrl));
        if (newUrlsFromPills.length > 0) {
          return Array.from(new Set([...prev, ...newUrlsFromPills]));
        }
        return prev;
      });
    } else {
      setContextUrls([]);
    }
  }, [urlsFromPills, currentChain]);

  // Folder pills
  useEffect(() => {
    setContextFolders((prev) => {
      const contextFolderPaths = new Set(prev);
      const newFoldersFromPills = foldersFromPills.filter(
        (pillFolder) => !contextFolderPaths.has(pillFolder)
      );
      return [...prev, ...newFoldersFromPills];
    });
  }, [foldersFromPills]);

  // Active note tracking
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const handleActiveLeafChange = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const activeNote = app.workspace.getActiveFile();
        setCurrentActiveNote(isAllowedFileForNoteContext(activeNote) ? activeNote : null);
      }, 100);
    };
    const eventRef = app.workspace.on("active-leaf-change", handleActiveLeafChange);
    return () => {
      clearTimeout(timeoutId);
      // cspell:disable-next-line
      app.workspace.offref(eventRef);
    };
  }, [app.workspace]);

  const handleActiveNoteAdded = useCallback(() => {
    setIncludeActiveNote(true);
  }, [setIncludeActiveNote]);

  const handleActiveNoteRemoved = useCallback(() => {
    setIncludeActiveNote(false);
  }, [setIncludeActiveNote]);

  const handleActiveWebTabAdded = useCallback(() => {
    setIncludeActiveWebTab(true);
  }, [setIncludeActiveWebTab]);

  const handleActiveWebTabRemoved = useCallback(() => {
    setIncludeActiveWebTab(false);
  }, [setIncludeActiveWebTab]);

  return {
    contextUrls,
    setContextUrls,
    contextFolders,
    setContextFolders,
    contextWebTabs,
    setContextWebTabs,
    mergedContextWebTabs,
    currentActiveNote,
    notesFromPills,
    setNotesFromPills,
    urlsFromPills,
    setUrlsFromPills,
    foldersFromPills,
    setFoldersFromPills,
    toolsFromPills,
    setToolsFromPills,
    webTabsFromPills,
    setWebTabsFromPills,
    getWebTabsFromEditorSnapshot,
    handleNotePillsRemoved,
    handleURLPillsRemoved,
    handleFolderPillsRemoved,
    handleContextNoteRemoved,
    handleAddToContext,
    handleRemoveFromContext,
    handleActiveNoteAdded,
    handleActiveNoteRemoved,
    handleActiveWebTabAdded,
    handleActiveWebTabRemoved,
  };
}
