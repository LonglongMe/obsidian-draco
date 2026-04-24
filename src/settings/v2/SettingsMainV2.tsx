import { TabContent, TabItem, type TabItem as TabItemType } from "@/components/ui/setting-tabs";
import { TabProvider, useTab } from "@/contexts/TabContext";
import CopilotPlugin from "@/main";
import { CommandSettings } from "@/settings/v2/components/CommandSettings";
import React from "react";
import { AdvancedSettings } from "./components/AdvancedSettings";
import { BasicSettings } from "./components/BasicSettings";
import { ModelSettings } from "./components/ModelSettings";
import { QASettings } from "./components/QASettings";

const TAB_IDS = ["basic", "model", "QA", "command", "advanced"] as const;
type TabId = (typeof TAB_IDS)[number];

// tabs - simple text labels
const tabs: TabItemType[] = TAB_IDS.map((id) => ({
  id,
  label: id.charAt(0).toUpperCase() + id.slice(1),
}));

const SettingsContent: React.FC = () => {
  const { selectedTab, setSelectedTab } = useTab();

  return (
    <div className="tw-flex tw-flex-col">
      {/* Tab Navigation - 居中显示 */}
      <div className="tw-flex tw-justify-center tw-gap-1 tw-border-b tw-border-border">
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            isSelected={selectedTab === tab.id}
            onClick={() => setSelectedTab(tab.id)}
          />
        ))}
      </div>

      {/* Tab Content */}
      <div className="tw-pt-4">
        {TAB_IDS.map((id) => {
          const Component = components[id];
          return (
            <TabContent key={id} id={id} isSelected={selectedTab === id}>
              <Component />
            </TabContent>
          );
        })}
      </div>
    </div>
  );
};

// tab components
const components: Record<TabId, React.FC> = {
  basic: () => <BasicSettings />,
  model: () => <ModelSettings />,
  QA: () => <QASettings />,
  command: () => <CommandSettings />,
  advanced: () => <AdvancedSettings />,
};

interface SettingsMainV2Props {
  plugin: CopilotPlugin;
}

const SettingsMainV2: React.FC<SettingsMainV2Props> = () => {
  return (
    <TabProvider>
      <SettingsContent />
    </TabProvider>
  );
};

export default SettingsMainV2;
