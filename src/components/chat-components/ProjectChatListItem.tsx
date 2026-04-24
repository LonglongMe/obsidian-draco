import { ChatHistoryItem } from "@/components/chat-components/ChatHistoryPopover";
import { ChatRowStatusDot } from "@/components/chat-components/ChatRowStatusDot";
import { getChatRowStatusDot } from "@/utils/chatListIndicators";
import { MessageSquareText } from "lucide-react";
import React, { useCallback } from "react";

interface ProjectChatListItemProps {
  chat: ChatHistoryItem;
  runningChatIds: string[];
  activeChatId: string | null;
  onOpenChat: (id: string) => Promise<void>;
}

/**
 * Project page chat row: title, one-line preview, and status dot (generating / unread).
 * Uses div+role="button" so Obsidian/theme button CSS does not clip multi-line content.
 */
export const ProjectChatListItem: React.FC<ProjectChatListItemProps> = ({
  chat,
  runningChatIds,
  activeChatId,
  onOpenChat,
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

  return (
    <div
      role="button"
      tabIndex={0}
      className="tw-box-border tw-flex tw-w-full tw-cursor-pointer tw-items-start tw-gap-3 tw-rounded-lg tw-border tw-border-border tw-p-4 tw-text-left tw-leading-normal hover:tw-bg-modifier-hover"
      onClick={open}
      onKeyDown={onKeyDown}
    >
      <MessageSquareText className="tw-mt-0.5 tw-size-4 tw-shrink-0 tw-text-muted" aria-hidden />
      <div className="tw-block tw-w-full tw-min-w-0">
        <div className="tw-flex tw-min-h-6 tw-min-w-0 tw-items-center tw-gap-2">
          <ChatRowStatusDot status={statusDot} />
          <div className="tw-min-w-0 tw-truncate tw-text-sm tw-font-medium tw-leading-6">{chat.title}</div>
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
    </div>
  );
};
