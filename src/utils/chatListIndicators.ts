import type { ChatHistoryItem } from "@/components/chat-components/ChatHistoryPopover";

/** Slack so mtime vs lastAccessed flapping does not flicker the unread dot. */
const UNREAD_MTIME_SLACK_MS = 750;

export type ChatRowStatusDot = "none" | "running" | "unread";

/**
 * Sidebar / project list: yellow while generating, green when file has new content since last read.
 * No dot when the row is the active chat (user is viewing it) or when caught up.
 */
export function getChatRowStatusDot(
  item: ChatHistoryItem,
  runningChatIds: string[],
  activeChatId: string | null
): ChatRowStatusDot {
  if (runningChatIds.includes(item.id)) return "running";
  if (activeChatId === item.id) return "none";
  if (item.updatedAt.getTime() > item.lastAccessedAt.getTime() + UNREAD_MTIME_SLACK_MS) {
    return "unread";
  }
  return "none";
}
