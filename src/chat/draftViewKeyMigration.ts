/**
 * When a draft send persists, the conversation id maps to a file path.
 * This computes the new view key so per-tab stream state and message caches
 * can move from `__draft__:...` to the saved path key.
 */
export function computeDraftToSavedViewKeyMigration(options: {
  streamViewKey: string;
  conversationId: string | null | undefined;
  selectedSidebarProjectId: string | null;
  chatPathByConversationId: Map<string, string>;
  chatHistoryFolder: string;
}):
  | {
      oldKey: string;
      newKey: string;
      savedChatPath: string;
    }
  | null {
  const { streamViewKey, conversationId, selectedSidebarProjectId, chatPathByConversationId, chatHistoryFolder } =
    options;

  const canPromoteDraftToSavedChat =
    streamViewKey.startsWith("__draft__:") && selectedSidebarProjectId == null;
  if (!conversationId || !canPromoteDraftToSavedChat) {
    return null;
  }

  let savedChatPath = chatPathByConversationId.get(conversationId);
  if (!savedChatPath) {
    savedChatPath = `${chatHistoryFolder}/${conversationId}.md`;
  }
  const migratedKey = `${savedChatPath}::__no_project_page__`;
  if (migratedKey === streamViewKey) {
    return null;
  }
  return { oldKey: streamViewKey, newKey: migratedKey, savedChatPath };
}
