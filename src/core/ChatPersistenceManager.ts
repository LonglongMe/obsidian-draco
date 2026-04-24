import { getCurrentProject, ProjectConfig } from "@/aiParams";
import { AI_SENDER, USER_SENDER } from "@/constants";
import ChainManager from "@/LLMProviders/chainManager";
import { parseReasoningBlock } from "@/LLMProviders/chainRunner/utils/AgentReasoningState";
import { logError, logInfo, logWarn } from "@/logger";
import { getSettings } from "@/settings/model";
import { ChatMessage } from "@/types/message";
import {
  ensureFolderExists,
  extractTextFromChunk,
} from "@/utils";
import {
  isInVaultCache,
  listMarkdownFiles,
  patchFrontmatter,
  readFrontmatterViaAdapter,
} from "@/utils/vaultAdapterUtils";
import { App, Notice, TFile } from "obsidian";
import { MessageRepository } from "./MessageRepository";
import { v4 as uuidv4 } from "uuid";

interface SaveChatOptions {
  silent?: boolean;
  skipTopicGeneration?: boolean;
  conversationId?: string;
  /** When set, persist this snapshot instead of reading the live message repository (avoids cross-conversation races). */
  messages?: ChatMessage[];
  /**
   * When set (including `null`), overrides getCurrentProject() for projectId/projectName in new note frontmatter.
   * Omit to use the global current project atom.
   */
  projectForFrontmatter?: ProjectConfig | null;
}

/**
 * Escape a string for safe YAML double-quoted string value
 * Escapes backslashes and double quotes to prevent YAML parsing errors
 */
function escapeYamlString(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * ChatPersistenceManager - Handles saving and loading chat messages
 *
 * This class is responsible for:
 * - Saving chat history to markdown files in the vault
 * - Loading chat history from markdown files
 * - Managing project-aware file naming
 * - Formatting chat content for storage
 */
export class ChatPersistenceManager {
  private currentConversationId: string | null = null;

  constructor(
    private app: App,
    private messageRepo: MessageRepository,
    private chainManager?: ChainManager
  ) {}

  /**
   * Get the chat history folder from settings
   */
  private getChatHistoryFolder(): string {
    return getSettings().chatHistoryFolder;
  }

  /**
   * Save current chat history to a markdown file
   */
  async saveChat(modelKey: string, options: SaveChatOptions = {}): Promise<void> {
    const {
      silent = false,
      skipTopicGeneration = false,
      conversationId: preferredConversationId,
      messages: messagesOverride,
    } = options;
    try {
      const messages =
        messagesOverride && messagesOverride.length > 0
          ? messagesOverride
          : this.messageRepo.getDisplayMessages();
      if (messages.length === 0) {
        if (!silent) {
          new Notice("No messages to save.");
        }
        return;
      }

      const chatContent = this.formatChatContent(messages);
      const firstMessageEpoch = messages[0].timestamp?.epoch || Date.now();

      // Ensure the save folder exists (supports nested paths) using utility helper.
      await ensureFolderExists(this.getChatHistoryFolder());

      // Prefer explicit conversationId, then bound id, then legacy epoch (epoch can collide across chats).
      let existingFile: TFile | null = null;
      const preferred = preferredConversationId?.trim();
      if (preferred) {
        existingFile = await this.findFileByConversationId(preferred);
      }
      if (!existingFile && this.currentConversationId?.trim()) {
        existingFile = await this.findFileByConversationId(this.currentConversationId.trim());
      }
      if (!existingFile) {
        existingFile = await this.findFileByEpoch(firstMessageEpoch);
      }
      const existingFrontmatter = existingFile
        ? this.app.metadataCache.getFileCache(existingFile)?.frontmatter
        : undefined;

      let existingTopic: string | undefined = existingFrontmatter?.topic;
      let existingLastAccessedAt: number | undefined = existingFrontmatter?.lastAccessedAt;
      let existingConversationId: string | undefined =
        typeof existingFrontmatter?.conversationId === "string"
          ? existingFrontmatter.conversationId.trim()
          : undefined;

      // For hidden directory files, metadataCache returns null — read frontmatter via adapter
      if (existingFile && !existingFrontmatter) {
        try {
          const adapterFm = await readFrontmatterViaAdapter(this.app, existingFile.path);
          if (adapterFm) {
            if (adapterFm.topic) existingTopic = adapterFm.topic;
            if (adapterFm.lastAccessedAt) existingLastAccessedAt = Number(adapterFm.lastAccessedAt);
            if (typeof adapterFm.conversationId === "string" && adapterFm.conversationId.trim()) {
              existingConversationId = adapterFm.conversationId.trim();
            }
          }
        } catch {
          // Ignore — proceed without preserved frontmatter
        }
      }

      const projectForNote =
        options.projectForFrontmatter !== undefined ? options.projectForFrontmatter : getCurrentProject();
      const conversationId =
        preferredConversationId ||
        this.currentConversationId ||
        existingConversationId ||
        this.createConversationId();
      this.currentConversationId = conversationId;

      const preferredFileName = existingFile
        ? existingFile.path
        : this.generateFileName(conversationId);

      const noteContent = this.generateNoteContent(
        chatContent,
        firstMessageEpoch,
        modelKey,
        conversationId,
        projectForNote,
        existingTopic,
        existingLastAccessedAt
      );
      let targetFile: TFile | null = existingFile;

      // Check if existingFile is a real vault file (not a synthetic object for hidden dirs)
      const existingFileIsReal =
        existingFile != null && isInVaultCache(this.app, existingFile.path);

      if (existingFile && existingFileIsReal) {
        // If the file exists in the vault cache, update via vault API
        await this.app.vault.modify(existingFile, noteContent);
        logInfo(`[ChatPersistenceManager] Updated existing chat file: ${existingFile.path}`);
      } else if (
        !isInVaultCache(this.app, preferredFileName) &&
        (await this.app.vault.adapter.exists(preferredFileName))
      ) {
        // File exists on disk but not in the vault cache.
        // This happens when the save folder is a hidden directory (path starting with '.')
        // because Obsidian's metadata cache does not index hidden paths.
        await this.app.vault.adapter.write(preferredFileName, noteContent);
        if (!silent) {
          new Notice("Existing chat note found - updating it now.");
        }
        logInfo(
          `[ChatPersistenceManager] Updated existing chat file via adapter: ${preferredFileName}`
        );
      } else {
        // File doesn't exist, create a new one
        try {
          targetFile = await this.app.vault.create(preferredFileName, noteContent);
          if (!silent) {
            new Notice(`Chat saved as note: ${preferredFileName}`);
          }
          logInfo(`[ChatPersistenceManager] Created new chat file: ${preferredFileName}`);
        } catch (error) {
          if (this.isFileAlreadyExistsError(error)) {
            const conflictFile = this.app.vault.getAbstractFileByPath(preferredFileName);
            if (conflictFile && conflictFile instanceof TFile) {
              // Read existing frontmatter to preserve lastAccessedAt and topic
              const conflictFrontmatter =
                this.app.metadataCache.getFileCache(conflictFile)?.frontmatter;
              existingTopic = conflictFrontmatter?.topic ?? existingTopic;
              const conflictLastAccessedAt = conflictFrontmatter?.lastAccessedAt;

              // Regenerate content with preserved frontmatter values
              const updatedContent = this.generateNoteContent(
                chatContent,
                firstMessageEpoch,
                modelKey,
                conversationId,
                projectForNote,
                existingTopic,
                conflictLastAccessedAt
              );
              await this.app.vault.modify(conflictFile, updatedContent);
              targetFile = conflictFile;
              if (!silent) {
                new Notice("Existing chat note found - updating it now.");
              }
              logInfo(
                `[ChatPersistenceManager] Resolved save conflict by updating existing chat file: ${conflictFile.path}`
              );
            } else {
              // File exists on disk but not in vault cache (hidden directory)
              await this.app.vault.adapter.write(preferredFileName, noteContent);
              if (!silent) {
                new Notice("Existing chat note found - updating it now.");
              }
              logInfo(
                `[ChatPersistenceManager] Resolved save conflict via adapter: ${preferredFileName}`
              );
            }
          } else if (this.isNameTooLongError(error)) {
            // Single fallback: minimal guaranteed-to-work filename with fixed id
            const fallbackName = `${this.getChatHistoryFolder()}/${conversationId.slice(0, 8)}.md`;

            try {
              targetFile = await this.app.vault.create(fallbackName, noteContent);
              if (!silent) {
                new Notice(`Chat saved as note: ${fallbackName}`);
              }
              logWarn(
                `[ChatPersistenceManager] Used minimal filename due to length constraints: ${fallbackName}`
              );
            } catch (fallbackError) {
              if (this.isFileAlreadyExistsError(fallbackError)) {
                const conflictFile = this.app.vault.getAbstractFileByPath(fallbackName);
                if (conflictFile && conflictFile instanceof TFile) {
                  // Read existing frontmatter to preserve lastAccessedAt
                  const conflictFrontmatter =
                    this.app.metadataCache.getFileCache(conflictFile)?.frontmatter;
                  const conflictLastAccessedAt = conflictFrontmatter?.lastAccessedAt;
                  const conflictTopic = conflictFrontmatter?.topic;

                  // Regenerate content with preserved frontmatter values
                  const updatedContent = this.generateNoteContent(
                    chatContent,
                    firstMessageEpoch,
                    modelKey,
                    conversationId,
                    projectForNote,
                    conflictTopic,
                    conflictLastAccessedAt
                  );
                  await this.app.vault.modify(conflictFile, updatedContent);
                  targetFile = conflictFile;
                  if (!silent) {
                    new Notice("Existing chat note found - updating it now.");
                  }
                  logInfo(
                    `[ChatPersistenceManager] Resolved fallback save conflict by updating existing chat file: ${conflictFile.path}`
                  );
                } else {
                  // File exists on disk but not in vault cache (hidden directory)
                  await this.app.vault.adapter.write(fallbackName, noteContent);
                  if (!silent) {
                    new Notice("Existing chat note found - updating it now.");
                  }
                  logInfo(
                    `[ChatPersistenceManager] Resolved fallback save conflict via adapter: ${fallbackName}`
                  );
                }
              } else {
                throw fallbackError;
              }
            }
          } else {
            throw error;
          }
        }
      }

      if (!skipTopicGeneration) {
        await this.generateTopicIfNeeded(targetFile, messages, existingTopic);
      }
    } catch (error) {
      logError("[ChatPersistenceManager] Error saving chat:", error);
      if (!silent) {
        new Notice("Failed to save chat as note. Check console for details.");
      }
    }
  }

  /**
   * Load chat history from a markdown file
   */
  async loadChat(file: TFile): Promise<ChatMessage[]> {
    try {
      let loadedConversationId =
        this.app.metadataCache.getFileCache(file)?.frontmatter?.conversationId ?? null;
      if (!loadedConversationId) {
        try {
          const adapterFm = await readFrontmatterViaAdapter(this.app, file.path);
          loadedConversationId =
            typeof adapterFm?.conversationId === "string" ? adapterFm.conversationId : null;
        } catch {
          // Ignore and try basename fallback below.
        }
      }
      // Stable chat files are named `{conversationId}.md`; if frontmatter is unread (cache/hidden
      // path timing), synthesizing a random id would fork lineage and the next save creates a new file.
      if (!loadedConversationId || !String(loadedConversationId).trim()) {
        const base = file.basename?.trim();
        if (base) {
          loadedConversationId = base;
        }
      }
      const normalizedConversationId =
        typeof loadedConversationId === "string" && loadedConversationId.trim()
          ? loadedConversationId.trim()
          : this.createConversationId();
      this.currentConversationId = normalizedConversationId;
      await this.ensureConversationIdOnFile(file, normalizedConversationId);

      let content: string;
      try {
        content = await this.app.vault.read(file);
      } catch {
        // Fallback for hidden directory files not indexed by Obsidian
        content = await this.app.vault.adapter.read(file.path);
      }
      const messages = this.parseChatContent(content);
      logInfo(`[ChatPersistenceManager] Loaded ${messages.length} messages from ${file.path}`);
      return messages;
    } catch (error) {
      logError("[ChatPersistenceManager] Error loading chat:", error);
      new Notice("Failed to load chat history. Check console for details.");
      return [];
    }
  }

  /**
   * Reset active conversation binding so next save starts a new chat file lineage.
   */
  resetCurrentConversation(): void {
    this.currentConversationId = null;
  }

  /**
   * Get currently bound conversationId for the active save lineage.
   */
  getCurrentConversationId(): string | null {
    return this.currentConversationId;
  }

  /**
   * Get all chat history files from the vault
   */
  async getChatHistoryFiles(): Promise<TFile[]> {
    const folderFiles = await listMarkdownFiles(this.app, this.getChatHistoryFolder());
    if (folderFiles.length === 0) return [];

    // Get current project ID if in a project
    const currentProject = getCurrentProject();

    // Filter files based on project context
    return folderFiles.filter((file) => {
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
      const fileProjectId =
        typeof frontmatter?.projectId === "string" && frontmatter.projectId.trim()
          ? frontmatter.projectId.trim()
          : null;
      if (currentProject) {
        return fileProjectId === currentProject.id;
      } else {
        return fileProjectId === null;
      }
    });
  }

  /**
   * Format messages into markdown content
   */
  private formatChatContent(messages: ChatMessage[]): string {
    return messages
      .map((message) => {
        const timestamp = message.timestamp ? message.timestamp.display : "Unknown time";

        // Strip agent reasoning block from AI messages before saving
        let messageText = message.message;
        if (message.sender === AI_SENDER) {
          const reasoningData = parseReasoningBlock(messageText);
          if (reasoningData) {
            messageText = reasoningData.contentAfter;
          }
        }

        let content = `**${message.sender}**: ${messageText}`;

        // Include context information if present
        if (message.context) {
          const contextParts: string[] = [];

          if (message.context.notes?.length) {
            contextParts.push(
              `Notes: ${message.context.notes.map((note) => note.path).join(", ")}`
            );
          }

          if (message.context.urls?.length) {
            contextParts.push(`URLs: ${message.context.urls.join(", ")}`);
          }

          if (message.context.webTabs?.length) {
            contextParts.push(
              `Web Tabs: ${message.context.webTabs.map((tab) => tab.url).join(", ")}`
            );
          }

          if (message.context.tags?.length) {
            contextParts.push(`Tags: ${message.context.tags.join(", ")}`);
          }

          if (message.context.folders?.length) {
            contextParts.push(`Folders: ${message.context.folders.join(", ")}`);
          }

          if (contextParts.length > 0) {
            content += `\n[Context: ${contextParts.join(" | ")}]`;
          }
        }

        content += `\n[Timestamp: ${timestamp}]`;
        return content;
      })
      .join("\n\n");
  }

  /**
   * Parse markdown content back into messages
   */
  private parseChatContent(content: string): ChatMessage[] {
    const messages: ChatMessage[] = [];

    // Extract the YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    let chatContent = content;

    if (frontmatterMatch) {
      chatContent = content.slice(frontmatterMatch[0].length).trim();
    }

    // Parse messages from the content
    // Look for message pattern: **user**: or **ai**: followed by content
    const messagePattern = /\*\*(user|ai)\*\*: ([\s\S]*?)(?=(?:\n\*\*(?:user|ai)\*\*: )|$)/g;

    let match;
    while ((match = messagePattern.exec(chatContent)) !== null) {
      const sender = match[1] === "user" ? USER_SENDER : AI_SENDER;
      const fullContent = match[2].trim();

      // Split content into lines to extract timestamp, context, and message
      const contentLines = fullContent.split("\n");
      let messageText = fullContent;
      let timestamp = "Unknown time";
      let contextInfo: any = undefined;

      // Check for context and timestamp lines
      let endIndex = contentLines.length;

      // Check if last line is a timestamp
      if (contentLines[endIndex - 1]?.startsWith("[Timestamp: ")) {
        const timestampMatch = contentLines[endIndex - 1].match(/\[Timestamp: (.*?)\]/);
        if (timestampMatch) {
          timestamp = timestampMatch[1];
          endIndex--;
        }
      }

      // Check if second-to-last line is context
      if (endIndex > 0 && contentLines[endIndex - 1]?.startsWith("[Context: ")) {
        const contextMatch = contentLines[endIndex - 1].match(/\[Context: (.*?)\]/);
        if (contextMatch) {
          const contextStr = contextMatch[1];
          contextInfo = this.parseContextString(contextStr);
          endIndex--;
        }
      }

      // Message is everything before context and timestamp
      messageText = contentLines.slice(0, endIndex).join("\n").trim();

      // Strip old tool call markers and agent reasoning blocks from AI messages
      if (sender === AI_SENDER) {
        // Strip old tool call banners: <!--TOOL_CALL_START:...-->...<!--TOOL_CALL_END:...-->
        messageText = messageText.replace(
          /<!--TOOL_CALL_START:[^:]+:[^:]+:[^:]+:[^:]+:[^:]*:[^:]+-->[\s\S]*?<!--TOOL_CALL_END:[^:]+:[\s\S]*?-->/g,
          ""
        );
        // Strip agent reasoning blocks: <!--AGENT_REASONING:...-->
        const reasoningData = parseReasoningBlock(messageText);
        if (reasoningData) {
          messageText = reasoningData.contentAfter;
        }
        // Clean up any resulting multiple consecutive newlines
        messageText = messageText.replace(/\n{3,}/g, "\n\n").trim();
      }

      // Parse the timestamp
      let epoch: number | undefined;
      if (timestamp !== "Unknown time") {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
          epoch = date.getTime();
        }
      }

      messages.push({
        message: messageText,
        sender,
        isVisible: true,
        timestamp: epoch
          ? {
              epoch,
              display: timestamp,
              fileName: "",
            }
          : null,
        context: contextInfo,
      });
    }

    return messages;
  }

  /**
   * Parse context string back into context object
   */
  private parseContextString(contextStr: string): any {
    const context: any = {
      notes: [],
      urls: [],
      tags: [],
      folders: [],
      webTabs: [],
    };

    // Split by | to get different context types
    const parts = contextStr.split(" | ");

    for (const part of parts) {
      const trimmed = part.trim();

      if (trimmed.startsWith("Notes: ")) {
        const notesStr = trimmed.substring(7); // Remove "Notes: "
        if (notesStr) {
          // Parse note paths and resolve to TFile objects
          context.notes = notesStr
            .split(", ")
            .map((pathStr) => {
              const trimmedPath = pathStr.trim();

              // Try to resolve by full path first (new format)
              const file = this.app.vault.getAbstractFileByPath(trimmedPath);
              if (file instanceof TFile) {
                return file;
              }

              // Backward compatibility: If path not found, try basename resolution
              const basename = trimmedPath.includes("/")
                ? trimmedPath.split("/").pop()!
                : trimmedPath;

              const matches = this.app.vault
                .getMarkdownFiles()
                .filter((f) => f.basename === basename);

              if (matches.length === 1) {
                logInfo(
                  `[ChatPersistenceManager] Resolved legacy basename "${basename}" to ${matches[0].path}`
                );
                return matches[0];
              } else if (matches.length > 1) {
                logWarn(
                  `[ChatPersistenceManager] Ambiguous basename "${basename}", skipping. Matches: ${matches.map((f) => f.path).join(", ")}`
                );
              } else {
                logWarn(`[ChatPersistenceManager] Note not found: ${trimmedPath}`);
              }

              return null;
            })
            .filter((note): note is TFile => note !== null);
        }
      } else if (trimmed.startsWith("URLs: ")) {
        const urlsStr = trimmed.substring(6); // Remove "URLs: "
        if (urlsStr) {
          context.urls = urlsStr.split(", ").map((url) => url.trim());
        }
      } else if (trimmed.startsWith("Web Tabs: ") || trimmed.startsWith("WebTabs: ")) {
        const webTabsStr = trimmed.startsWith("Web Tabs: ")
          ? trimmed.substring(10) // Remove "Web Tabs: "
          : trimmed.substring(9); // Remove "WebTabs: "
        if (webTabsStr) {
          context.webTabs = webTabsStr
            .split(", ")
            .map((url) => url.trim())
            .filter((url) => url.length > 0)
            .map((url) => ({ url }));
        }
      } else if (trimmed.startsWith("Tags: ")) {
        const tagsStr = trimmed.substring(6); // Remove "Tags: "
        if (tagsStr) {
          context.tags = tagsStr.split(", ").map((tag) => tag.trim());
        }
      } else if (trimmed.startsWith("Folders: ")) {
        const foldersStr = trimmed.substring(9); // Remove "Folders: "
        if (foldersStr) {
          context.folders = foldersStr.split(", ").map((folder) => folder.trim());
        }
      }
    }

    // Only return context if it has any content
    if (
      context.notes.length > 0 ||
      context.urls.length > 0 ||
      context.tags.length > 0 ||
      context.folders.length > 0 ||
      context.webTabs.length > 0
    ) {
      return context;
    }

    return undefined;
  }

  /**
   * Find a file by its epoch in the frontmatter
   */
  private async findFileByEpoch(epoch: number): Promise<TFile | null> {
    const files = await this.getChatHistoryFiles();

    for (const file of files) {
      // Try metadata cache first (works for non-hidden directories)
      let epochValue: unknown = this.app.metadataCache.getFileCache(file)?.frontmatter?.epoch;

      // Fallback for hidden directory files: read frontmatter via adapter
      if (epochValue === undefined) {
        try {
          const adapterFm = await readFrontmatterViaAdapter(this.app, file.path);
          if (adapterFm?.epoch) epochValue = Number(adapterFm.epoch);
        } catch {
          continue;
        }
      }

      const frontmatterEpoch =
        typeof epochValue === "number"
          ? epochValue
          : typeof epochValue === "string"
            ? Number(epochValue)
            : undefined;
      if (
        typeof frontmatterEpoch === "number" &&
        !Number.isNaN(frontmatterEpoch) &&
        frontmatterEpoch === epoch
      ) {
        return file;
      }
    }

    return null;
  }

  /**
   * Generate AI topic for the conversation
   */
  private async generateAITopic(messages: ChatMessage[]): Promise<string | undefined> {
    if (!this.chainManager) {
      return undefined;
    }

    try {
      const chatModel = this.chainManager.chatModelManager.getChatModel();
      if (!chatModel) {
        return undefined;
      }

      // Constants for topic generation
      const TOPIC_GENERATION_MESSAGE_LIMIT = 6;
      const TOPIC_GENERATION_CHAR_LIMIT = 200;

      // Get conversation content for topic generation - using reduce for efficiency
      const conversationSummary = messages.reduce((acc, m, i) => {
        if (i >= TOPIC_GENERATION_MESSAGE_LIMIT) return acc;
        return (
          acc +
          (acc ? "\n" : "") +
          `${m.sender}: ${m.message.slice(0, TOPIC_GENERATION_CHAR_LIMIT)}`
        );
      }, "");

      const prompt = `Generate a concise title (max 5 words) for this conversation based on its content. Return only the title without any explanation or quotes.

Conversation:
${conversationSummary}`;

      const response = await chatModel.invoke(prompt);
      const responseContent =
        typeof response === "string"
          ? response
          : ((response as { content?: unknown; text?: unknown }).content ??
            (response as { content?: unknown; text?: unknown }).text ??
            response);
      const topic = extractTextFromChunk(responseContent)
        .trim()
        .replace(/^["']|["']$/g, "") // Remove quotes if present
        .replace(/[\\/:*?"<>|]/g, "") // Remove invalid filename characters
        .slice(0, 50); // Limit length

      return topic || undefined;
    } catch (error) {
      logError("[ChatPersistenceManager] Error generating AI topic:", error);
      return undefined;
    }
  }

  /**
   * Generate a stable file name for the chat using conversation ID only.
   */
  private generateFileName(conversationId: string): string {
    return `${this.getChatHistoryFolder()}/${conversationId}.md`;
  }

  /**
   * Generate the full note content with frontmatter
   */
  private generateNoteContent(
    chatContent: string,
    firstMessageEpoch: number,
    modelKey: string,
    conversationId: string,
    project: ProjectConfig | null,
    topic?: string,
    lastAccessedAt?: number
  ): string {
    return `---
epoch: ${firstMessageEpoch}
modelKey: "${escapeYamlString(modelKey)}"
conversationId: "${escapeYamlString(conversationId)}"
${topic ? `topic: "${topic}"` : ""}
${lastAccessedAt ? `lastAccessedAt: ${lastAccessedAt}` : ""}
${project ? `projectId: ${project.id}` : ""}
${project ? `projectName: ${project.name}` : ""}
tags:
  - copilot-conversation
---

${chatContent}`;
  }

  /**
   * Generate a unique conversation ID for durable chat identity.
   */
  private createConversationId(): string {
    return uuidv4();
  }

  /**
   * Ensure a chat file has a conversationId frontmatter key.
   */
  private async ensureConversationIdOnFile(file: TFile, conversationId: string): Promise<void> {
    try {
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
      if (typeof frontmatter?.conversationId === "string" && frontmatter.conversationId.trim()) {
        return;
      }
      await patchFrontmatter(this.app, file.path, { conversationId });
    } catch (error) {
      logWarn(`[ChatPersistenceManager] Failed to backfill conversationId for ${file.path}`, error);
    }
  }

  /**
   * Find a file by conversationId in frontmatter.
   */
  private async findFileByConversationId(conversationId: string): Promise<TFile | null> {
    const target = conversationId.trim();
    if (!target) return null;
    const files = await this.getChatHistoryFiles();
    for (const file of files) {
      let idValue: unknown =
        this.app.metadataCache.getFileCache(file)?.frontmatter?.conversationId ?? undefined;
      if (idValue === undefined) {
        try {
          const adapterFm = await readFrontmatterViaAdapter(this.app, file.path);
          idValue = adapterFm?.conversationId;
        } catch {
          continue;
        }
      }
      if (typeof idValue === "string" && idValue.trim() === target) {
        return file;
      }
    }
    return null;
  }

  /**
   * Generate topic and write it into frontmatter.
   */
  private async generateTopicIfNeeded(
    file: TFile | null,
    messages: ChatMessage[],
    existingTopic?: string
  ): Promise<void> {
    // AI topic generation removed - no longer configured
    return;
  }

  /**
   * Apply the AI-generated topic to the note's YAML frontmatter
   */
  private async applyTopicToFrontmatter(file: TFile, topic: string): Promise<void> {
    try {
      await patchFrontmatter(this.app, file.path, { topic: topic.trim() });
      logInfo(`[ChatPersistenceManager] Applied AI topic to chat file: ${file.path}`);
    } catch (error) {
      logError("[ChatPersistenceManager] Error applying AI topic to file:", error);
    }
  }

  /**
   * Determine whether an error corresponds to an ENAMETOOLONG filesystem failure.
   * @param error - The thrown error.
   * @returns True when the error message indicates a name-length constraint violation.
   */
  private isNameTooLongError(error: unknown): boolean {
    if (!error) {
      return false;
    }

    const message = error instanceof Error ? error.message : String(error);
    const normalized = message.toLowerCase();
    return normalized.includes("enametoolong") || normalized.includes("name too long");
  }

  /**
   * Determine if an error indicates an Obsidian file-exists conflict.
   */
  private isFileAlreadyExistsError(error: unknown): boolean {
    if (!error) {
      return false;
    }
    const message = error instanceof Error ? error.message : String(error);
    return message.toLowerCase().includes("already exists");
  }

}
