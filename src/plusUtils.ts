/**
 * Legacy "Copilot Plus" commercial layer — removed for the DIY fork.
 * Stubs keep imports stable; all entitlement checks are effectively off.
 */
import {
  ChatModelProviders,
  ChatModels,
  DEFAULT_SETTINGS,
  EmbeddingModelProviders,
  EmbeddingModels,
  PlusUtmMedium,
} from "@/constants";
import { getSettings, updateSetting, useSettingsValue } from "@/settings/model";

export const DEFAULT_COPILOT_PLUS_CHAT_MODEL = ChatModels.COPILOT_PLUS_FLASH;
export const DEFAULT_COPILOT_PLUS_CHAT_MODEL_KEY =
  DEFAULT_COPILOT_PLUS_CHAT_MODEL + "|" + ChatModelProviders.COPILOT_PLUS;
export const DEFAULT_COPILOT_PLUS_EMBEDDING_MODEL = EmbeddingModels.COPILOT_PLUS_SMALL;
export const DEFAULT_COPILOT_PLUS_EMBEDDING_MODEL_KEY =
  DEFAULT_COPILOT_PLUS_EMBEDDING_MODEL + "|" + EmbeddingModelProviders.COPILOT_PLUS;

export const DEFAULT_FREE_CHAT_MODEL_KEY = DEFAULT_SETTINGS.defaultModelKey;
export const DEFAULT_FREE_EMBEDDING_MODEL_KEY = DEFAULT_SETTINGS.embeddingModelKey;

export function isSelfHostAccessValid(): boolean {
  return getSettings().enableSelfHostMode;
}

export function isSelfHostModeValid(): boolean {
  return getSettings().enableSelfHostMode;
}

export function isPlusModel(modelKey: string): boolean {
  return modelKey.split("|")[1] === EmbeddingModelProviders.COPILOT_PLUS;
}

export function isPlusEnabled(): boolean {
  return true;
}

export function useIsPlusUser(): boolean {
  return true;
}

export async function checkIsPlusUser(_context?: Record<string, unknown>): Promise<boolean> {
  return true;
}

export async function isSelfHostEligiblePlan(): Promise<boolean> {
  return true;
}

export function useIsSelfHostEligible(): boolean {
  return true;
}

export async function validateSelfHostMode(): Promise<boolean> {
  return true;
}

export async function refreshSelfHostModeValidation(): Promise<void> {}

export function applyPlusSettings(): void {
  // No-op: Plus onboarding removed.
}

export function createPlusPageUrl(medium: PlusUtmMedium): string {
  return `https://example.com/removed-plus#${encodeURIComponent(medium)}`;
}

export function navigateToPlusPage(_medium: PlusUtmMedium): void {}

export function turnOnPlus(): void {
  updateSetting("isPlusUser", true);
}

export function turnOffPlus(): void {
  updateSetting("isPlusUser", false);
}
