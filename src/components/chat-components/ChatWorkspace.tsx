import { Button } from "@/components/ui/button";
import { MessageCirclePlus, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import React from "react";

export interface ChatWorkspaceProps {
  showConversationSidebar: boolean;
  onToggleConversationSidebar: () => void;
  onNewChat: () => void;
  /** Renders nothing when hidden if the sidebar component handles `isVisible` internally */
  sidebar: React.ReactNode;
  main: React.ReactNode;
  createProjectDialog: React.ReactNode;
}

/**
 * Chat view chrome: toolbar (sidebar / new chat), sidebar + main split, create-project dialog.
 */
export function ChatWorkspace({
  showConversationSidebar,
  onToggleConversationSidebar,
  onNewChat,
  sidebar,
  main,
  createProjectDialog,
}: ChatWorkspaceProps) {
  return (
    <>
      <div className="tw-flex tw-size-full tw-flex-col tw-overflow-hidden">
        <div className="tw-flex tw-h-10 tw-items-center tw-border-b tw-px-2">
          <Button
            variant="ghost2"
            size="icon"
            title={showConversationSidebar ? "Hide Conversations" : "Show Conversations"}
            onClick={onToggleConversationSidebar}
          >
            {showConversationSidebar ? (
              <PanelLeftClose className="tw-size-4" />
            ) : (
              <PanelLeftOpen className="tw-size-4" />
            )}
          </Button>
          <Button variant="ghost2" size="icon" title="New Chat" onClick={onNewChat}>
            <MessageCirclePlus className="tw-size-4" />
          </Button>
        </div>
        <div className="tw-flex tw-min-h-0 tw-flex-1 tw-overflow-hidden">
          {sidebar}
          {showConversationSidebar ? <div className="tw-w-px tw-bg-border" /> : null}
          <div
            className={`tw-flex tw-min-w-0 tw-flex-1 tw-flex-col tw-overflow-hidden ${
              showConversationSidebar ? "tw-pl-2" : ""
            }`}
          >
            {main}
          </div>
        </div>
      </div>
      {createProjectDialog}
    </>
  );
}
