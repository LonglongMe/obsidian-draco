import { Button } from "@/components/ui/button";
import { SettingItem } from "@/components/ui/setting-item";
import { SettingsGroup } from "@/components/ui/settings-group";
import { ObsidianNativeSelect } from "@/components/ui/obsidian-native-select";
import { logFileManager } from "@/logFileManager";
import { flushRecordedPromptPayloadToLog } from "@/LLMProviders/chainRunner/utils/promptPayloadRecorder";
import { updateSetting, useSettingsValue } from "@/settings/model";
import { ArrowUpRight, Plus } from "lucide-react";
import React from "react";
import { getPromptFilePath, SystemPromptAddModal } from "@/system-prompts";
import { useSystemPrompts } from "@/system-prompts/state";

export const AdvancedSettings: React.FC = () => {
  const settings = useSettingsValue();
  const prompts = useSystemPrompts();

  const defaultPromptExists = prompts.some(
    (prompt) => prompt.title === settings.defaultSystemPromptTitle
  );

  const displayValue = defaultPromptExists ? settings.defaultSystemPromptTitle : "";

  const handleSelectChange = (value: string) => {
    updateSetting("defaultSystemPromptTitle", value);
  };

  const handleOpenSourceFile = () => {
    if (!displayValue) return;
    const filePath = getPromptFilePath(displayValue);
    (app as any).setting.close();
    app.workspace.openLinkText(filePath, "", true);
  };

  const handleAddPrompt = () => {
    const modal = new SystemPromptAddModal(app, prompts);
    modal.open();
  };

  return (
    <div className="tw-py-2">
      {/* System Prompts Group */}
      <SettingsGroup title="System Prompts">
        <SettingItem
          type="custom"
          title="Default System Prompt"
          description="Customize the system prompt for all messages"
        >
          <div className="tw-flex tw-items-center tw-gap-2">
            <ObsidianNativeSelect
              value={displayValue}
              onChange={(e) => handleSelectChange(e.target.value)}
              options={[
                { label: "None (use built-in prompt)", value: "" },
                ...prompts.map((prompt) => ({
                  label:
                    prompt.title === settings.defaultSystemPromptTitle
                      ? `${prompt.title} (Default)`
                      : prompt.title,
                  value: prompt.title,
                })),
              ]}
              containerClassName="tw-flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleOpenSourceFile}
              className="tw-size-8 tw-shrink-0 tw-p-0"
              title="Open the source file"
              disabled={!displayValue}
            >
              <ArrowUpRight className="tw-size-4" />
            </Button>
            <Button
              variant="default"
              size="icon"
              onClick={handleAddPrompt}
              title="Add new prompt"
              className="tw-size-8"
            >
              <Plus className="tw-size-4" />
            </Button>
          </div>
        </SettingItem>

        <SettingItem
          type="text"
          title="System Prompts Folder Name"
          description="Folder where system prompts are stored"
          value={settings.userSystemPromptsFolder}
          onChange={(value) => updateSetting("userSystemPromptsFolder", value)}
          placeholder="copilot/system-prompts"
        />
      </SettingsGroup>

      {/* Debug & Logs Group */}
      <SettingsGroup title="Debug & Logs">
        <SettingItem
          type="switch"
          title="Enable Encryption"
          description="Enable encryption for the API keys"
          checked={settings.enableEncryption}
          onCheckedChange={(checked) => {
            updateSetting("enableEncryption", checked);
          }}
        />

        <SettingItem
          type="switch"
          title="Debug Mode"
          description="Log debug messages to the console"
          checked={settings.debug}
          onCheckedChange={(checked) => {
            updateSetting("debug", checked);
          }}
        />

        <SettingItem
          type="custom"
          title="Create Log File"
          description={`Open the Copilot log file (${logFileManager.getLogPath()}) for reporting issues`}
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              await flushRecordedPromptPayloadToLog();
              await logFileManager.flush();
              await logFileManager.openLogFile();
            }}
          >
            Create Log File
          </Button>
        </SettingItem>
      </SettingsGroup>
    </div>
  );
};
