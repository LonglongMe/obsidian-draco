import { ChainType } from "@/chainFactory";
import { Button } from "@/components/ui/button";
import { SettingItem } from "@/components/ui/setting-item";
import { SettingsGroup } from "@/components/ui/settings-group";
import { getModelDisplayWithIcons } from "@/components/ui/model-display";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { COPILOT_FOLDER_ROOT, DEFAULT_CHAT_HISTORY_FOLDER, DEFAULT_OPEN_AREA, SEND_SHORTCUT } from "@/constants";
import { useTab } from "@/contexts/TabContext";
import { getModelKeyFromModel, updateSetting, useSettingsValue } from "@/settings/model";
import { checkModelApiKey } from "@/utils";
import { FolderOpen, Key } from "lucide-react";
import { Notice } from "obsidian";
import React from "react";
import { ApiKeyDialog } from "./ApiKeyDialog";

const ChainType2Label: Record<ChainType, string> = {
  [ChainType.LLM_CHAIN]: "Chat",
  [ChainType.VAULT_QA_CHAIN]: "Vault QA (Basic)",
  [ChainType.PROJECT_CHAIN]: "Projects (alpha)",
};

export const BasicSettings: React.FC = () => {
  const settings = useSettingsValue();
  const { setSelectedTab } = useTab();

  const defaultModelActivated = !!settings.activeModels.find(
    (m) => m.enabled && getModelKeyFromModel(m) === settings.defaultModelKey
  );
  const enableActivatedModels = settings.activeModels
    .filter((m) => m.enabled)
    .map((model) => ({
      label: getModelDisplayWithIcons(model),
      value: getModelKeyFromModel(model),
    }));

  return (
    <div className="tw-py-2">
      {/* General Settings Group */}
      <SettingsGroup title="General">
        {/* API Key Section */}
        <SettingItem
          type="custom"
          title="API Keys"
          description="Configure API keys for different AI providers"
        >
          <Button
            onClick={() => {
              new ApiKeyDialog(app, () => setSelectedTab("model")).open();
            }}
            variant="secondary"
            size="sm"
          >
            <Key className="tw-mr-1 tw-h-4 tw-w-4" />
            Set Keys
          </Button>
        </SettingItem>

        <SettingItem
          type="select"
          title="Default Chat Model"
          description="Select the Chat model to use"
          value={defaultModelActivated ? settings.defaultModelKey : "Select Model"}
          onChange={(value) => {
            const selectedModel = settings.activeModels.find(
              (m) => m.enabled && getModelKeyFromModel(m) === value
            );
            if (!selectedModel) return;
            updateSetting("defaultModelKey", value);
          }}
          options={
            defaultModelActivated
              ? enableActivatedModels
              : [{ label: "Select Model", value: "Select Model" }, ...enableActivatedModels]
          }
        />

        <SettingItem
          type="select"
          title="Default Mode"
          description="Select the default chat mode"
          value={settings.defaultChainType}
          onChange={(value) => updateSetting("defaultChainType", value as ChainType)}
          options={Object.entries(ChainType2Label).map(([key, value]) => ({
            label: value,
            value: key,
          }))}
        />

        <SettingItem
          type="select"
          title="Open Plugin In"
          description="Choose where to open the plugin"
          value={settings.defaultOpenArea}
          onChange={(value) => updateSetting("defaultOpenArea", value as DEFAULT_OPEN_AREA)}
          options={[
            { label: "Sidebar View", value: DEFAULT_OPEN_AREA.VIEW },
            { label: "Editor", value: DEFAULT_OPEN_AREA.EDITOR },
          ]}
        />
      </SettingsGroup>

      {/* Behavior Settings Group */}
      <SettingsGroup title="Behavior">
        <SettingItem
          type="select"
          title="Send Shortcut"
          description="Choose keyboard shortcut to send messages"
          value={settings.defaultSendShortcut}
          onChange={(value) => updateSetting("defaultSendShortcut", value as SEND_SHORTCUT)}
          options={[
            { label: "Enter", value: SEND_SHORTCUT.ENTER },
            { label: "Shift + Enter", value: SEND_SHORTCUT.SHIFT_ENTER },
          ]}
        />

        <SettingItem
          type="switch"
          title="Auto-Add Active Content to Context"
          description="Automatically add the active note or Web Viewer tab to chat context"
          checked={settings.autoAddActiveContentToContext}
          onCheckedChange={(checked) => {
            updateSetting("autoAddActiveContentToContext", checked);
          }}
        />

        <SettingItem
          type="switch"
          title="Auto-Add Selection to Context"
          description="Automatically add selected text to chat context"
          checked={settings.autoAddSelectionToContext}
          onCheckedChange={(checked) => {
            updateSetting("autoAddSelectionToContext", checked);
          }}
        />
      </SettingsGroup>

      {/* Display Settings Group */}
      <SettingsGroup title="Display">
        <SettingItem
          type="switch"
          title="Images in Markdown"
          description="Pass embedded images in markdown to the AI"
          checked={settings.passMarkdownImages}
          onCheckedChange={(checked) => {
            updateSetting("passMarkdownImages", checked);
          }}
        />

        <SettingItem
          type="switch"
          title="Suggested Prompts"
          description="Show suggested prompts in the chat view"
          checked={settings.showSuggestedPrompts}
          onCheckedChange={(checked) => updateSetting("showSuggestedPrompts", checked)}
        />

        <SettingItem
          type="switch"
          title="Relevant Notes"
          description="Show relevant notes in the chat view"
          checked={settings.showRelevantNotes}
          onCheckedChange={(checked) => updateSetting("showRelevantNotes", checked)}
        />
      </SettingsGroup>

      {/* Storage Settings Group */}
      <SettingsGroup title="Storage">
        <SettingItem
          type="text"
          title="Chat History Folder"
          description="Folder where chat conversations are saved"
          value={settings.chatHistoryFolder}
          onChange={(value) => updateSetting("chatHistoryFolder", value)}
          placeholder={DEFAULT_CHAT_HISTORY_FOLDER}
        />
        <SettingItem
          type="text"
          title="Debug Log Folder"
          description="Folder where debug logs are saved"
          value={settings.debugFolder}
          onChange={(value) => updateSetting("debugFolder", value)}
          placeholder={`${COPILOT_FOLDER_ROOT}/debug`}
        />
      </SettingsGroup>
    </div>
  );
};
