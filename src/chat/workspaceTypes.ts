/**
 * UI-level workspace: default chat thread vs. a project-scoped area.
 * Persists the same model (conversation + optional project frontmatter) — only scope differs.
 */
export type ChatWorkspaceKind = "default" | "project";

export interface ChatWorkspaceRef {
  kind: ChatWorkspaceKind;
  /** When kind === "project", the current project list id. */
  projectId: string | null;
}

export function workspaceFromSidebarProjectId(
  selectedSidebarProjectId: string | null
): ChatWorkspaceRef {
  if (selectedSidebarProjectId) {
    return { kind: "project", projectId: selectedSidebarProjectId };
  }
  return { kind: "default", projectId: null };
}
