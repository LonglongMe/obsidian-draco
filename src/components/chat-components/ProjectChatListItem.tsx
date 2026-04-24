import { ChatHistoryItem } from "@/components/chat-components/ChatHistoryPopover";
import { ChatRowStatusDot } from "@/components/chat-components/ChatRowStatusDot";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getChatRowStatusDot } from "@/utils/chatListIndicators";
import { FolderInput, MessageSquareText, MoreHorizontal, Pin, Trash2 } from "lucide-react";
import React, { useCallback } from "react";

interface ProjectChatListItemProps {
  chat: ChatHistoryItem;
  runningChatIds: string[];
  activeChatId: string | null;
  onOpenChat: (id: string) => Promise<void>;
  onRenameChat?: (id: string, title: string) => Promise<void>;
  onDeleteChat?: (id: string) => Promise<void>;
  onTogglePin?: (id: string, pinned: boolean) => Promise<void>;
  onChangeProject?: (id: string) => void;
}

/**
 * Project page chat row: title, one-line preview, status dot, and actions menu.
 * Uses div+role="button" so Obsidian/theme button CSS does not clip multi-line content.
 */
export const ProjectChatListItem: React.FC<ProjectChatListItemProps> = ({
  chat,
  runningChatIds,
  activeChatId,
  onOpenChat,
  onRenameChat,
  onDeleteChat,
  onTogglePin,
  onChangeProject,
}) => {
  const statusDot = getChatRowStatusDot(chat, runningChatIds, activeChatId);
  const open = useCallback(() => void onOpenChat(chat.id), [chat.id, onOpenChat]);
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    },
    [open]
  );

  const handleRename = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const { InputModal } = require("@/components/modals/InputModal");
      new InputModal(
        app,
        "Rename Chat",
        chat.title,
        (nextTitle: string) => {
          if (!nextTitle || nextTitle === chat.title) return;
          void onRenameChat?.(chat.id, nextTitle);
        },
        "Enter chat title"
      ).open();
    },
    [chat.id, chat.title, onRenameChat]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const { ConfirmModal } = require("@/components/modals/ConfirmModal");
      new ConfirmModal(
        app,
        () => void onDeleteChat?.(chat.id),
        `Delete "${chat.title}"? This action cannot be undone.`,
        "Delete Chat",
        "Delete",
        "Cancel"
      ).open();
    },
    [chat.id, chat.title, onDeleteChat]
  );

  const handleTogglePin = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      void onTogglePin?.(chat.id, !chat.isPinned);
    },
    [chat.id, chat.isPinned, onTogglePin]
  );

  const handleChangeProject = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChangeProject?.(chat.id);
    },
    [chat.id, onChangeProject]
  );

  const hasActions = onRenameChat || onDeleteChat || onTogglePin || onChangeProject;

  return (
    <div
      role="button"
      tabIndex={0}
      className="tw-box-border tw-flex tw-w-full tw-cursor-pointer tw-items-start tw-gap-3 tw-rounded-lg tw-border tw-border-border tw-p-4 tw-text-left tw-leading-normal hover:tw-bg-modifier-hover tw-group"
      onClick={open}
      onKeyDown={onKeyDown}
    >
      <MessageSquareText className="tw-mt-0.5 tw-size-4 tw-shrink-0 tw-text-muted" aria-hidden />
      <div className="tw-block tw-w-full tw-min-w-0 tw-flex-1">
        <div className="tw-flex tw-min-h-6 tw-min-w-0 tw-items-center tw-gap-2">
          <ChatRowStatusDot status={statusDot} />
          <div className="tw-min-w-0 tw-truncate tw-text-sm tw-font-medium tw-leading-6">{chat.title}</div>
          {chat.isPinned && <Pin className="tw-size-3 tw-shrink-0 tw-text-muted" />}
        </div>
        {chat.preview ? (
          <div className="tw-mt-1 tw-block tw-min-h-5 tw-truncate tw-text-xs tw-leading-5 tw-text-muted">
            {chat.preview}
          </div>
        ) : (
          <div className="tw-mt-1 tw-block tw-min-h-5 tw-text-xs tw-leading-5 tw-text-muted">
            No preview available.
          </div>
        )}
      </div>
      {hasActions && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="tw-size-6 tw-shrink-0 tw-p-0 tw-opacity-0 group-hover:tw-opacity-100"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <MoreHorizontal className="tw-size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onTogglePin && (
              <DropdownMenuItem onClick={handleTogglePin}>
                <Pin className="tw-mr-2 tw-size-4" />
                {chat.isPinned ? "Unpin" : "Pin"}
              </DropdownMenuItem>
            )}
            {onRenameChat && (
              <DropdownMenuItem onClick={handleRename}>
                <MessageSquareText className="tw-mr-2 tw-size-4" />
                Rename
              </DropdownMenuItem>
            )}
            {onChangeProject && (
              <DropdownMenuItem onClick={handleChangeProject}>
                <FolderInput className="tw-mr-2 tw-size-4" />
                Change Project
              </DropdownMenuItem>
            )}
            {onDeleteChat && (
              <DropdownMenuItem className="tw-text-error" onClick={handleDelete}>
                <Trash2 className="tw-mr-2 tw-size-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};
