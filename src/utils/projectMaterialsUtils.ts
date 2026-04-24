import type { ProjectConfig } from "@/aiParams";

export type ProjectMaterialItem = {
  type: "inclusion" | "exclusion" | "web" | "youtube";
  value: string;
};

/**
 * Multiline settings field → trimmed unique lines.
 */
export function toUniqueLines(value?: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of (value || "").split("\n")) {
    const normalized = line.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

export function countNonEmptyLines(value?: string): number {
  return (value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean).length;
}

export function buildMaterialsFromProject(project: ProjectConfig | null): ProjectMaterialItem[] {
  if (!project) return [];
  const inclusions = toUniqueLines(project.contextSource?.inclusions).map((value) => ({
    type: "inclusion" as const,
    value,
  }));
  const exclusions = toUniqueLines(project.contextSource?.exclusions).map((value) => ({
    type: "exclusion" as const,
    value,
  }));
  const webUrls = toUniqueLines(project.contextSource?.webUrls).map((value) => ({
    type: "web" as const,
    value,
  }));
  const youtubeUrls = toUniqueLines(project.contextSource?.youtubeUrls).map((value) => ({
    type: "youtube" as const,
    value,
  }));
  return [...inclusions, ...exclusions, ...webUrls, ...youtubeUrls];
}
