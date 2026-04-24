import React from "react";

import { Notice } from "obsidian";

import { RebuildIndexConfirmModal } from "@/components/modals/RebuildIndexConfirmModal";
import { SemanticSearchToggleModal } from "@/components/modals/SemanticSearchToggleModal";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { getModelDisplayWithIcons } from "@/components/ui/model-display";
import { SettingItem } from "@/components/ui/setting-item";
import { SettingsGroup } from "@/components/ui/settings-group";
import { VAULT_VECTOR_STORE_STRATEGIES } from "@/constants";
import { getModelKeyFromModel, updateSetting, useSettingsValue } from "@/settings/model";
import { PatternListEditor } from "@/settings/v2/components/PatternListEditor";

export const QASettings: React.FC = () => {
  const settings = useSettingsValue();
  const isMiyoSearchActive = settings.enableMiyo;
  const visibleEmbeddingModels = settings.activeEmbeddingModels;

  const handleSetDefaultEmbeddingModel = async (modelKey: string) => {
    if (modelKey === settings.embeddingModelKey) return;

    if (settings.enableSemanticSearchV3) {
      new RebuildIndexConfirmModal(app, async () => {
        updateSetting("embeddingModelKey", modelKey);
        const VectorStoreManager = (await import("@/search/vectorStoreManager")).default;
        await VectorStoreManager.getInstance().indexVaultToVectorStore(false, {
          userInitiated: true,
        });
      }).open();
      return;
    }

    updateSetting("embeddingModelKey", modelKey);
    new Notice("Embedding model saved. Enable Semantic Search to build the index.");
  };

  return (
    <div className="tw-py-2">
      {/* Search Settings Group */}
      <SettingsGroup title="Search">
        <SettingItem
          type="switch"
          title="Enable Semantic Search"
          description="Enable semantic search for meaning-based document retrieval"
          checked={settings.enableSemanticSearchV3}
          onCheckedChange={(checked) => {
            new SemanticSearchToggleModal(
              app,
              async () => {
                updateSetting("enableSemanticSearchV3", checked);
                if (!checked && settings.enableMiyo) {
                  updateSetting("enableMiyo", false);
                }
                if (checked) {
                  const VectorStoreManager = (await import("@/search/vectorStoreManager"))
                    .default;
                  await VectorStoreManager.getInstance().indexVaultToVectorStore(false, {
                    userInitiated: true,
                  });
                }
              },
              checked
            ).open();
          }}
        />

        <SettingItem
          type="switch"
          title="Enable Inline Citations"
          description="AI responses will include footnote-style citations"
          checked={settings.enableInlineCitations}
          onCheckedChange={(checked) => updateSetting("enableInlineCitations", checked)}
        />

        <SettingItem
          type="select"
          title="Embedding Model"
          description={
            <div className="tw-flex tw-items-center tw-gap-1.5">
              <span>Powers semantic vault search</span>
              <HelpTooltip
                content={
                  <div className="tw-flex tw-max-w-96 tw-flex-col tw-gap-2">
                    <div className="tw-pt-2 tw-text-sm tw-text-muted">
                      This model converts text into vector representations.
                      Changing it requires rebuilding your vault's vector index.
                    </div>
                  </div>
                }
              />
            </div>
          }
          value={settings.embeddingModelKey}
          onChange={handleSetDefaultEmbeddingModel}
          options={visibleEmbeddingModels.map((model) => ({
            label: getModelDisplayWithIcons(model),
            value: getModelKeyFromModel(model),
          }))}
          placeholder="Model"
          disabled={isMiyoSearchActive}
        />

        <SettingItem
          type="select"
          title="Auto-Index Strategy"
          description="Decide when you want the vault to be indexed"
          value={settings.indexVaultToVectorStore}
          onChange={(value) => {
            updateSetting("indexVaultToVectorStore", value);
          }}
          options={VAULT_VECTOR_STORE_STRATEGIES.map((strategy) => ({
            label: strategy,
            value: strategy,
          }))}
          placeholder="Strategy"
        />

        <SettingItem
          type="slider"
          title="Max Sources"
          description="Top N relevant notes to pass to the LLM"
          min={1}
          max={128}
          step={1}
          value={settings.maxSourceChunks}
          onChange={(value) => updateSetting("maxSourceChunks", value)}
        />
      </SettingsGroup>

      {/* Embedding Settings Group - Only shown when semantic search is enabled */}
      {settings.enableSemanticSearchV3 && (
        <SettingsGroup title="Embedding">
          <SettingItem
            type="slider"
            title="Requests per Minute"
            description="Decrease if you are rate limited by your embedding provider"
            min={10}
            max={60}
            step={10}
            value={Math.min(settings.embeddingRequestsPerMin, 60)}
            onChange={(value) => updateSetting("embeddingRequestsPerMin", value)}
          />

          <SettingItem
            type="slider"
            title="Embedding Batch Size"
            description="Increase if you are rate limited by your embedding provider"
            min={1}
            max={128}
            step={1}
            value={settings.embeddingBatchSize}
            onChange={(value) => updateSetting("embeddingBatchSize", value)}
          />

          <SettingItem
            type="select"
            title="Number of Partitions"
            description="Increase if you have issues indexing large vaults"
            value={String(settings.numPartitions || 1)}
            onChange={(value) => updateSetting("numPartitions", Number(value))}
            options={[
              { label: "1", value: "1" },
              { label: "2", value: "2" },
              { label: "4", value: "4" },
              { label: "8", value: "8" },
              { label: "16", value: "16" },
              { label: "32", value: "32" },
              { label: "40", value: "40" },
            ]}
            placeholder="Select partitions"
          />
        </SettingsGroup>
      )}

      {/* Lexical Search Settings Group */}
      <SettingsGroup title="Lexical Search">
        <SettingItem
          type="slider"
          title="RAM Limit"
          description="Maximum RAM usage for full-text search index"
          min={20}
          max={1000}
          step={20}
          value={settings.lexicalSearchRamLimit || 100}
          onChange={(value) => updateSetting("lexicalSearchRamLimit", value)}
          suffix=" MB"
        />

        <SettingItem
          type="switch"
          title="Enable Folder and Graph Boosts"
          description="Enable folder and graph-based relevance boosts"
          checked={settings.enableLexicalBoosts}
          onCheckedChange={(checked) => updateSetting("enableLexicalBoosts", checked)}
        />
      </SettingsGroup>

      {/* Filters Group */}
      <SettingsGroup title="Filters">
        <SettingItem
          type="custom"
          title="Exclusions"
          description="Exclude folders, tags, note titles or file extensions"
        >
          <PatternListEditor
            value={settings.qaExclusions}
            onChange={(value) => updateSetting("qaExclusions", value)}
          />
        </SettingItem>

        <SettingItem
          type="custom"
          title="Inclusions"
          description="Index only the specified paths, tags, or note titles"
        >
          <PatternListEditor
            value={settings.qaInclusions}
            onChange={(value) => updateSetting("qaInclusions", value)}
          />
        </SettingItem>
      </SettingsGroup>

      {/* Sync Settings Group */}
      <SettingsGroup title="Sync">
        <SettingItem
          type="switch"
          title="Enable Obsidian Sync for Copilot index"
          description="Store the semantic index in .obsidian for syncing"
          checked={settings.enableIndexSync}
          onCheckedChange={(checked) => updateSetting("enableIndexSync", checked)}
        />

        <SettingItem
          type="switch"
          title="Disable index loading on mobile"
          description="Save resources on mobile devices"
          checked={settings.disableIndexOnMobile}
          onCheckedChange={(checked) => updateSetting("disableIndexOnMobile", checked)}
        />
      </SettingsGroup>
    </div>
  );
};
