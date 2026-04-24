import React from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  label: string;
  id: string;
}

interface TabItemProps {
  tab: TabItem;
  isSelected: boolean;
  onClick: () => void;
}

export const TabItem: React.FC<TabItemProps> = ({ tab, isSelected, onClick }) => {
  return (
    <button
      role="tab"
      id={`tab-${tab.id}`}
      aria-controls={`tabpanel-${tab.id}`}
      aria-selected={isSelected}
      onClick={onClick}
      className={cn(
        // Layout
        "tw-relative tw-px-4 tw-py-2 tw-rounded-t-md",
        "tw-cursor-pointer",
        // Typography
        "tw-text-sm",
        "tw-transition-all tw-duration-150",
        // 选中状态：深灰色背景 + 正常文字色
        // 未选中状态：透明背景 + 灰色文字
        isSelected
          ? "tw-font-medium tw-text-normal tw-bg-secondary"
          : "tw-text-muted hover:tw-text-normal"
      )}
    >
      {tab.label}

      {/* Active indicator - 选中时底部有accent色线 */}
      {isSelected && (
        <span className="tw-absolute tw-bottom-0 tw-left-2 tw-right-2 tw-h-[2px] tw-bg-accent tw-rounded-full" />
      )}
    </button>
  );
};

interface TabContentProps {
  id: string;
  children: React.ReactNode;
  isSelected: boolean;
}

export const TabContent: React.FC<TabContentProps> = ({ id, children, isSelected }) => {
  if (!isSelected) return null;

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${id}`}
      aria-labelledby={`tab-${id}`}
    >
      {children}
    </div>
  );
};
