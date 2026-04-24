import { formatDateTime } from "@/utils";
import { TFile } from "obsidian";

/** Sidebar / history list title length from the first user turn (Unicode code points). */
export const CHAT_UI_TITLE_CHAR_COUNT = 10;

/**
 * Build list UI title from saved chat body (after frontmatter is stripped):
 * first **user** block → plain one line → first `maxChars` code points.
 * Returns null if there is no user message yet.
 */
export function formatChatUiTitleFromBodyWithoutFrontmatter(
  bodyWithoutFrontmatter: string,
  maxChars = CHAT_UI_TITLE_CHAR_COUNT
): string | null {
  const firstUserMatch = bodyWithoutFrontmatter.match(
    /\*\*user\*\*:\s*([\s\S]*?)(?=\n\*\*(?:user|ai)\*\*:|$)/i
  );
  const raw = firstUserMatch?.[1]?.trim() ?? "";
  if (!raw) return null;
  const oneLine = raw
    .replace(/\[Timestamp:[^\]]*\]/gi, "")
    .replace(/\!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!oneLine) return null;
  const chars = [...oneLine];
  if (chars.length <= maxChars) return oneLine;
  return chars.slice(0, maxChars).join("");
}

/**
 * Extract chat title from a file.
 * First checks frontmatter.topic, then falls back to filename-based identifier.
 */
export function extractChatTitle(file: TFile): string {
  // Read the file's front matter
  const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;

  // First check if there's a custom topic in frontmatter
  if (frontmatter?.topic && typeof frontmatter.topic === "string" && frontmatter.topic.trim()) {
    return frontmatter.topic.trim();
  }

  // Fallback to stable filename identifier (conversationId-based).
  return file.basename.trim();
}

/**
 * Extract chat creation date from a file.
 * Uses frontmatter.epoch if available, falls back to file creation time.
 */
export function extractChatDate(file: TFile): Date {
  const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;

  if (frontmatter && frontmatter.epoch) {
    // Use the epoch from front matter if available
    return new Date(frontmatter.epoch);
  } else {
    // Fallback to file creation time if epoch is not in front matter
    return new Date(file.stat.ctime);
  }
}

/**
 * Extract chat last accessed time (epoch ms) from a file.
 * Uses frontmatter.lastAccessedAt if available, returns null otherwise.
 */
export function extractChatLastAccessedAtMs(file: TFile): number | null {
  const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
  const rawValue = frontmatter?.lastAccessedAt;

  if (typeof rawValue === "number" && Number.isFinite(rawValue) && rawValue > 0) {
    return rawValue;
  }

  if (typeof rawValue === "string") {
    const numeric = Number(rawValue);
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }

    const parsedDate = Date.parse(rawValue);
    if (Number.isFinite(parsedDate)) {
      return parsedDate;
    }
  }

  return null;
}

/**
 * Extract chat last accessed date from a file.
 * Uses extractChatLastAccessedAtMs and returns a Date when available, null otherwise.
 */
export function extractChatLastAccessedAt(file: TFile): Date | null {
  const lastAccessedAtMs = extractChatLastAccessedAtMs(file);
  return lastAccessedAtMs ? new Date(lastAccessedAtMs) : null;
}

/**
 * Extract project ID from chat frontmatter.
 */
export function extractChatProjectId(file: TFile): string | null {
  const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
  if (typeof frontmatter?.projectId === "string" && frontmatter.projectId.trim()) {
    return frontmatter.projectId.trim();
  }
  return null;
}

/**
 * Extract project name from chat frontmatter.
 */
export function extractChatProjectName(file: TFile): string | null {
  const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
  if (typeof frontmatter?.projectName === "string" && frontmatter.projectName.trim()) {
    return frontmatter.projectName.trim();
  }
  return null;
}

/**
 * Extract pinned flag from chat frontmatter.
 */
export function extractChatPinned(file: TFile): boolean {
  const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
  const raw = frontmatter?.pinned;
  return raw === true || raw === "true";
}

/**
 * Extract stable conversation ID from chat frontmatter.
 */
export function extractChatConversationId(file: TFile): string | null {
  const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
  if (typeof frontmatter?.conversationId === "string" && frontmatter.conversationId.trim()) {
    return frontmatter.conversationId.trim();
  }
  return null;
}

/**
 * Get formatted display text for a chat file (title + formatted date).
 * Used in chat history modals and similar UI components.
 */
export function getChatDisplayText(file: TFile): string {
  const title = extractChatTitle(file);
  const date = extractChatDate(file);
  const formattedDateTime = formatDateTime(date);
  return `${title} - ${formattedDateTime.display}`;
}
