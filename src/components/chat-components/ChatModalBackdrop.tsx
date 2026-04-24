import React from "react";

/**
 * Full-bleed dimmed backdrop for progress / indexing cards over the message column.
 */
export function ChatModalBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="tw-absolute tw-inset-0 tw-z-modal tw-flex tw-items-center tw-justify-center tw-rounded-xl tw-bg-muted/40 tw-backdrop-blur-[1px]">
      {children}
    </div>
  );
}
