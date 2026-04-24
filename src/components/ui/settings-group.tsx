import React from "react";
import { cn } from "@/lib/utils";

interface SettingsGroupProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const SettingsGroup: React.FC<SettingsGroupProps> = ({ title, children, className }) => {
  return (
    <div className={cn("tw-mb-6", className)}>
      {/* Group Title - 首字母大写 */}
      <h3 className="tw-mb-2 tw-text-sm tw-font-semibold tw-text-muted">
        {title}
      </h3>

      {/* Group Container - 圆角灰色矩形 */}
      <div className="tw-rounded-lg tw-bg-secondary tw-p-1">
        <div className="tw-flex tw-flex-col tw-divide-y tw-divide-border tw-rounded-md tw-bg-secondary tw-overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
};
