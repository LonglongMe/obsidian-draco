import { LLMChainRunner } from "./LLMChainRunner";

/**
 * Project-based chats: same execution path as {@link LLMChainRunner}.
 * Project context is injected in L1 via `ChatManager.getSystemPromptForMessage()`.
 */
export class ProjectChainRunner extends LLMChainRunner {}
