import React, { useMemo } from "react";
import { Folder, MoreHorizontal, Pin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatHistoryItem } from "@/components/chat-components/ChatHistoryPopover";
import { ChatRowStatusDot as ChatStatusDotMarker } from "@/components/chat-components/ChatRowStatusDot";
import { cn } from "@/lib/utils";
import { getChatRowStatusDot, type ChatRowStatusDot } from "@/utils/chatListIndicators";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ConversationSidebarProps {
  isVisible: boolean;
  items: ChatHistoryItem[];
  runningChatIds: string[];
  activeChatId: string | null;
  selectedProjectId: string | null;
  projects: Array<{ id: string; name: string; pinned?: boolean }>;
  onLoadChat: (id: string) => Promise<void>;
  onDeleteChat: (id: string) => Promise<void>;
  onRenameChat: (id: string, title: string) => Promise<void>;
  onTogglePin: (id: string, pinned: boolean) => Promise<void>;
  onAssignProject: (id: string, projectId: string | null) => Promise<void>;
  onRenameProject: (projectId: string, currentName: string) => void;
  onDeleteProject: (projectId: string) => void;
  onToggleProjectPin: (projectId: string) => void;
  onSelectProject: (projectId: string) => void;
  onCreateProject: () => void;
}

interface SidebarListItemProps {
  label: string;
  isActive?: boolean;
  isPinned?: boolean;
  statusDot?: ChatRowStatusDot;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

/**
 * Reusable row item for both project and chat entries in sidebar.
 */
function SidebarListItem({
  label,
  isActive,
  isPinned,
  statusDot = "none",
  leftSlot,
  rightSlot,
  onClick,
  className,
}: SidebarListItemProps) {
  const showIndicators = isPinned || statusDot !== "none";
  return (
    <div
      className={cn(
        "tw-group tw-relative tw-flex tw-cursor-pointer tw-items-center tw-gap-2 tw-rounded-md tw-p-1.5 hover:tw-bg-modifier-hover",
        isActive && "tw-bg-modifier-hover",
        className
      )}
      onClick={onClick}
    >
      {leftSlot}
      <div
        className={cn(
          "tw-min-w-0 tw-flex-1",
          showIndicators ? "tw-pr-7" : "tw-pr-0 group-hover:tw-pr-7"
        )}
      >
        <div className="tw-truncate tw-text-sm">{label}</div>
      </div>
      {rightSlot || showIndicators ? (
        <div className="tw-absolute tw-right-1.5 tw-top-1/2 tw-flex tw-h-5 tw-min-w-5 -tw-translate-y-1/2 tw-items-center tw-justify-end">
          {showIndicators ? (
            <div className="tw-flex tw-items-center tw-gap-1 tw-text-muted tw-opacity-100 tw-transition-opacity group-hover:tw-opacity-0">
              {isPinned ? <Pin className="tw-size-3 tw-shrink-0" /> : null}
              <ChatStatusDotMarker status={statusDot} />
            </div>
          ) : null}
          {rightSlot ? (
            <div className="tw-absolute tw-inset-0 tw-flex tw-items-center tw-justify-end tw-opacity-0 tw-transition-opacity group-hover:tw-opacity-100">
              {rightSlot}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Sidebar conversation list with search, project filter, and pin support.
 */
export function ConversationSidebar({
  isVisible,
  items,
  runningChatIds,
  activeChatId,
  selectedProjectId,
  projects,
  onLoadChat,
  onDeleteChat,
  onRenameChat,
  onTogglePin,
  onAssignProject,
  onRenameProject,
  onDeleteProject,
  onToggleProjectPin,
  onSelectProject,
  onCreateProject,
}: ConversationSidebarProps) {
  const ungroupedChats = useMemo(() => items.filter((item) => !item.projectId), [items]);
  const sortedProjects = useMemo(
    () =>
      [...projects].sort((a, b) => {
        if ((a.pinned ? 1 : 0) !== (b.pinned ? 1 : 0)) {
          return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
        }
        return a.name.localeCompare(b.name);
      }),
    [projects]
  );

  if (!isVisible) {
    return null;
  }

  return (
    <aside className="tw-flex tw-h-full tw-w-[188px] tw-shrink-0 tw-flex-col">
      <ScrollArea className="tw-flex-1">
        <div className="tw-space-y-6 tw-p-2">
          <div className="tw-group tw-flex tw-items-center tw-justify-between tw-px-1">
            <div className="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wide tw-text-muted">
              Project
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="tw-size-5 tw-shrink-0 tw-p-0 tw-opacity-0 tw-transition-opacity group-hover:tw-opacity-100"
              title="Add project"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                onCreateProject();
              }}
            >
              <Plus className="tw-size-3" />
            </Button>
          </div>
          <div className="tw-space-y-1">
            {sortedProjects.map((project) => (
              <div key={project.id}>
                <SidebarListItem
                  label={project.name}
                  isActive={selectedProjectId === project.id}
                  isPinned={!!project.pinned}
                  leftSlot={<Folder className="tw-size-3.5 tw-shrink-0 tw-text-muted" />}
                  onClick={() => {
                    onSelectProject(project.id);
                  }}
                  rightSlot={
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="tw-size-5 tw-shrink-0 tw-p-0"
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => e.stopPropagation()}
                          title="Project actions"
                        >
                          <MoreHorizontal className="tw-size-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => onToggleProjectPin(project.id)}>
                          {project.pinned ? "Unpin" : "Pin"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onRenameProject(project.id, project.name)}>
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem className="tw-text-error" onClick={() => onDeleteProject(project.id)}>
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  }
                />
              </div>
            ))}
          </div>
          <div>
            <div className="tw-mb-3 tw-px-1 tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wide tw-text-muted">
              Chat
            </div>
            <div className="tw-space-y-1">
              {ungroupedChats.map((item) => (
                <ConversationRow
                  key={item.id}
                  item={item}
                  isActive={activeChatId === item.id}
                  statusDot={getChatRowStatusDot(item, runningChatIds, activeChatId)}
                  projects={projects}
                  onLoadChat={onLoadChat}
                  onDeleteChat={onDeleteChat}
                  onRenameChat={onRenameChat}
                  onTogglePin={onTogglePin}
                  onAssignProject={onAssignProject}
                />
              ))}
            </div>
          </div>
          {projects.length === 0 && ungroupedChats.length === 0 ? (
            <div className="tw-py-10 tw-text-center tw-text-xs tw-text-muted">No conversations found</div>
          ) : null}
        </div>
      </ScrollArea>
    </aside>
  );
}

interface ConversationRowProps {
  item: ChatHistoryItem;
  isActive: boolean;
  statusDot: ChatRowStatusDot;
  projects: Array<{ id: string; name: string }>;
  onLoadChat: (id: string) => Promise<void>;
  onDeleteChat: (id: string) => Promise<void>;
  onRenameChat: (id: string, title: string) => Promise<void>;
  onTogglePin: (id: string, pinned: boolean) => Promise<void>;
  onAssignProject: (id: string, projectId: string | null) => Promise<void>;
}

/**
 * Single row in the conversation sidebar list.
 */
function ConversationRow({
  item,
  isActive,
  statusDot,
  projects,
  onLoadChat,
  onDeleteChat,
  onRenameChat,
  onTogglePin,
  onAssignProject,
}: ConversationRowProps) {
  return (
    <SidebarListItem
      label={item.title}
      isActive={isActive}
      isPinned={!!item.isPinned}
      statusDot={statusDot}
      onClick={() => void onLoadChat(item.id)}
      rightSlot={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="tw-size-5 tw-p-0"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => e.stopPropagation()}
              title="Actions"
            >
              <MoreHorizontal className="tw-size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => void onTogglePin(item.id, !item.isPinned)}>
              {item.isPinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                const nextTitle = window.prompt("Rename chat", item.title)?.trim();
                if (!nextTitle || nextTitle === item.title) return;
                void onRenameChat(item.id, nextTitle);
              }}
            >
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem className="tw-text-error" onClick={() => void onDeleteChat(item.id)}>
              Delete
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Add to project</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => void onAssignProject(item.id, null)}>
                  No project
                </DropdownMenuItem>
                {projects.map((project) => (
                  <DropdownMenuItem key={project.id} onClick={() => void onAssignProject(item.id, project.id)}>
                    {project.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    />
  );
}
