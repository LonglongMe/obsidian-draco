import type { ProjectConfig } from "@/aiParams";
import { AtMentionTypeahead } from "@/components/chat-components/AtMentionTypeahead";
import { ProjectChatListItem } from "@/components/chat-components/ProjectChatListItem";
import type { ChatHistoryItem } from "@/components/chat-components/ChatHistoryPopover";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  buildMaterialsFromProject,
  countNonEmptyLines,
  toUniqueLines,
} from "@/utils/projectMaterialsUtils";
import { TFile } from "obsidian";
import React, { useCallback, useMemo, useState } from "react";

export interface ProjectOverviewPanelProps {
  project: ProjectConfig | null;
  chats: ChatHistoryItem[];
  runningChatIds: string[];
  activeChatId: string | null;
  onOpenChat: (id: string) => Promise<void>;
  onUpdateProject: (projectId: string, updater: (project: ProjectConfig) => ProjectConfig) => void;
  onRenameChat?: (id: string, title: string) => Promise<void>;
  onDeleteChat?: (id: string) => Promise<void>;
  onTogglePin?: (id: string, pinned: boolean) => Promise<void>;
  onChangeChatProject?: (chatId: string, projectId: string | null) => Promise<void>;
  projects?: Array<{ id: string; name: string }>;
  inputArea: React.ReactNode;
}

/**
 * Project page: summary cards, chat list for this project, composer.
 */
export function ProjectOverviewPanel({
  project,
  chats,
  runningChatIds,
  activeChatId,
  onOpenChat,
  onUpdateProject,
  onRenameChat,
  onDeleteChat,
  onTogglePin,
  onChangeChatProject,
  projects,
  inputArea,
}: ProjectOverviewPanelProps) {
  const [isPromptDialogOpen, setIsPromptDialogOpen] = useState(false);
  const [isMaterialsDialogOpen, setIsMaterialsDialogOpen] = useState(false);
  const [isMaterialPickerOpen, setIsMaterialPickerOpen] = useState(false);
  const [isChangeProjectDialogOpen, setIsChangeProjectDialogOpen] = useState(false);
  const [selectedChatForProjectChange, setSelectedChatForProjectChange] = useState<string | null>(null);
  const [promptDraft, setPromptDraft] = useState("");

  const materials = useMemo(() => buildMaterialsFromProject(project), [project]);

  if (!project) {
    return <div className="tw-p-4 tw-text-sm tw-text-muted">Project not found.</div>;
  }

  const handleSavePrompt = () => {
    onUpdateProject(project.id, (prev) => ({ ...prev, systemPrompt: promptDraft.trim() }));
    setIsPromptDialogOpen(false);
  };

  const handleRemoveMaterial = (type: string, value: string) => {
    onUpdateProject(project.id, (prev) => {
      const next = { ...prev.contextSource };
      if (type === "inclusion") {
        next.inclusions = toUniqueLines(prev.contextSource?.inclusions)
          .filter((line) => line !== value)
          .join("\n");
      } else if (type === "exclusion") {
        next.exclusions = toUniqueLines(prev.contextSource?.exclusions)
          .filter((line) => line !== value)
          .join("\n");
      } else if (type === "web") {
        next.webUrls = toUniqueLines(prev.contextSource?.webUrls)
          .filter((line) => line !== value)
          .join("\n");
      } else if (type === "youtube") {
        next.youtubeUrls = toUniqueLines(prev.contextSource?.youtubeUrls)
          .filter((line) => line !== value)
          .join("\n");
      }
      return { ...prev, contextSource: next };
    });
  };

  const handleAddMaterial = (category: string, data: unknown) => {
    onUpdateProject(project.id, (prev) => {
      const next = { ...prev.contextSource };
      if (category === "notes" && data instanceof TFile) {
        next.inclusions = [...toUniqueLines(next.inclusions), data.path].join("\n");
      } else if (category === "folders" && (data as { path?: string })?.path) {
        next.inclusions = [...toUniqueLines(next.inclusions), (data as { path: string }).path].join("\n");
      } else if (category === "webTabs" && (data as { url?: string })?.url) {
        next.webUrls = [...toUniqueLines(next.webUrls), (data as { url: string }).url].join("\n");
      }
      return { ...prev, contextSource: next };
    });
    setIsMaterialPickerOpen(false);
  };

  const handleOpenChangeProjectDialog = useCallback((chatId: string) => {
    setSelectedChatForProjectChange(chatId);
    setIsChangeProjectDialogOpen(true);
  }, []);

  const handleChangeProject = useCallback((newProjectId: string | null) => {
    if (selectedChatForProjectChange) {
      void onChangeChatProject?.(selectedChatForProjectChange, newProjectId);
    }
    setIsChangeProjectDialogOpen(false);
    setSelectedChatForProjectChange(null);
  }, [selectedChatForProjectChange, onChangeChatProject]);

  const materialsCount =
    countNonEmptyLines(project.contextSource?.inclusions) +
    countNonEmptyLines(project.contextSource?.exclusions) +
    countNonEmptyLines(project.contextSource?.webUrls) +
    countNonEmptyLines(project.contextSource?.youtubeUrls);

  return (
    <div className="tw-flex tw-h-full tw-flex-col tw-overflow-hidden tw-p-4">
      <div className="tw-flex-1 tw-overflow-auto">
        <div className="tw-space-y-4">
          <div className="tw-rounded-md tw-border tw-p-4">
            <div className="tw-mb-3">
              <h3 className="tw-text-3xl tw-font-semibold">{project.name}</h3>
            </div>
            <div className="tw-grid tw-gap-3 lg:tw-grid-cols-2">
              <button
                type="button"
                className="tw-flex tw-min-h-[108px] tw-flex-col tw-items-start tw-gap-2 tw-rounded-lg tw-border tw-bg-muted/20 tw-p-4 tw-text-left hover:tw-bg-muted/30"
                onClick={() => {
                  setPromptDraft(project.systemPrompt || "");
                  setIsPromptDialogOpen(true);
                }}
              >
                <div className="tw-w-full tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wide tw-text-muted">
                  Default Prompt
                </div>
                <div className="tw-w-full tw-whitespace-pre-wrap tw-break-words tw-text-sm tw-leading-6 tw-text-muted">
                  {project.systemPrompt || "No default prompt configured."}
                </div>
              </button>
              <button
                type="button"
                className="tw-flex tw-min-h-[108px] tw-flex-col tw-items-start tw-gap-1 tw-rounded-lg tw-border tw-bg-muted/20 tw-p-4 tw-text-left hover:tw-bg-muted/30"
                onClick={() => setIsMaterialsDialogOpen(true)}
              >
                <div className="tw-w-full tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wide tw-text-muted">
                  Materials
                </div>
                <div className="tw-w-full tw-text-xs tw-text-muted">{materialsCount} items</div>
                <div className="tw-w-full tw-whitespace-pre-wrap tw-break-words tw-text-sm tw-leading-6 tw-text-muted">
                  {project.contextSource?.inclusions ||
                  project.contextSource?.webUrls ||
                  project.contextSource?.youtubeUrls
                    ? project.contextSource?.inclusions ||
                      project.contextSource?.webUrls ||
                      project.contextSource?.youtubeUrls
                    : "No materials configured."}
                </div>
              </button>
            </div>
          </div>
          <div className="tw-rounded-md tw-border tw-p-4">
            <div className="tw-mb-3 tw-text-xs tw-font-semibold tw-uppercase tw-text-muted">Chats</div>
            <div className="tw-space-y-3">
              {chats.map((chat) => (
                <ProjectChatListItem
                  key={chat.id}
                  chat={chat}
                  runningChatIds={runningChatIds}
                  activeChatId={activeChatId}
                  onOpenChat={onOpenChat}
                  onRenameChat={onRenameChat}
                  onDeleteChat={onDeleteChat}
                  onTogglePin={onTogglePin}
                  onChangeProject={onChangeChatProject ? handleOpenChangeProjectDialog : undefined}
                />
              ))}
              {chats.length === 0 ? (
                <div className="tw-p-4 tw-text-center tw-text-xs tw-text-muted">
                  No chats in this project yet.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="tw-mt-3">{inputArea}</div>

      <Dialog open={isPromptDialogOpen} onOpenChange={setIsPromptDialogOpen}>
        <DialogContent className="tw-max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Default Prompt</DialogTitle>
            <DialogDescription>Use Markdown text for this project&apos;s default prompt.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={promptDraft}
            onChange={(e) => setPromptDraft(e.target.value)}
            placeholder="Write project default prompt in markdown..."
            className="tw-min-h-[220px]"
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsPromptDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePrompt}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isMaterialsDialogOpen} onOpenChange={setIsMaterialsDialogOpen}>
        <DialogContent className="tw-max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Materials</DialogTitle>
            <DialogDescription>
              Manage project materials. Add entry uses the same selector as chat input `@`.
            </DialogDescription>
          </DialogHeader>
          <div className="tw-max-h-[320px] tw-space-y-2 tw-overflow-auto tw-rounded-md tw-border tw-p-3">
            {materials.length === 0 ? (
              <div className="tw-text-sm tw-text-muted">No materials yet.</div>
            ) : (
              materials.map((item) => (
                <div key={`${item.type}:${item.value}`} className="tw-flex tw-items-center tw-gap-2">
                  <div className="tw-min-w-0 tw-flex-1 tw-truncate tw-text-sm">{item.value}</div>
                  <div className="tw-text-xs tw-uppercase tw-text-muted">{item.type}</div>
                  <Button
                    size="sm"
                    variant="ghost2"
                    onClick={() => handleRemoveMaterial(item.type, item.value)}
                  >
                    Remove
                  </Button>
                </div>
              ))
            )}
          </div>
          <div className="tw-flex tw-justify-between">
            <Popover open={isMaterialPickerOpen} onOpenChange={setIsMaterialPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="secondary">Add Material</Button>
              </PopoverTrigger>
              <PopoverContent className="tw-w-[420px] tw-p-0" align="start" side="top" sideOffset={6}>
                <AtMentionTypeahead
                  isOpen={isMaterialPickerOpen}
                  onClose={() => setIsMaterialPickerOpen(false)}
                  onSelect={handleAddMaterial}
                />
              </PopoverContent>
            </Popover>
            <Button onClick={() => setIsMaterialsDialogOpen(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Project Dialog */}
      <Dialog open={isChangeProjectDialogOpen} onOpenChange={setIsChangeProjectDialogOpen}>
        <DialogContent className="tw-max-w-md">
          <DialogHeader>
            <DialogTitle>Move to Project</DialogTitle>
            <DialogDescription>Select a project to move this chat to.</DialogDescription>
          </DialogHeader>
          <div className="tw-max-h-[200px] tw-space-y-1 tw-overflow-auto">
            <Button
              variant="ghost"
              className="tw-w-full tw-justify-start"
              onClick={() => handleChangeProject(null)}
            >
              No Project
            </Button>
            {projects?.filter(p => p.id !== project?.id).map((p) => (
              <Button
                key={p.id}
                variant="ghost"
                className="tw-w-full tw-justify-start"
                onClick={() => handleChangeProject(p.id)}
              >
                {p.name}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsChangeProjectDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
