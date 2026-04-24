import { cn } from "@/lib/utils";
import type { ChatRowStatusDot as ChatRowStatus } from "@/utils/chatListIndicators";
import React from "react";

/**
 * Yellow = generating, green = unread reply. Renders nothing when status is "none".
 */
export function ChatRowStatusDot({
  status,
  className,
}: {
  status: ChatRowStatus;
  className?: string;
}) {
  if (status === "none") return null;
  return (
    <span
      className={cn(
        "tw-size-2 tw-shrink-0 tw-rounded-full tw-shadow-sm",
        status === "running" ? "tw-bg-yellow-500" : "tw-bg-green-500",
        className
      )}
      title={status === "running" ? "Generating" : "New reply"}
    />
  );
}
