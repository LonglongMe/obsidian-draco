# Troubleshooting and FAQ

This guide covers common errors, provider-specific issues, performance problems, and frequently asked questions.

---

## First Steps for Any Issue

Before diving into specific fixes, try these steps first:

1. **Check you're on the latest version** of Draco
2. **Disable other plugins** temporarily to rule out conflicts
3. **Enable Debug Mode** in Settings → Draco → Advanced → Debug Mode
4. **Open the developer console**: `Cmd+Option+I` on Mac, `Ctrl+Shift+I` on Windows

---

## Common Errors

### "API key not set" or "No API key configured"

**Cause**: The model you selected doesn't have a valid API key for its provider.

**Fix**:
1. Go to **Settings → Draco → Basic → Set Keys**
2. Enter the API key for the provider your model uses
3. If you're unsure which provider a model uses, check **Settings → Draco → Model** — each model shows its provider

### Rate Limit Errors

**Cause**: You've sent too many requests to the API in a short time.

**Fix**:
- Wait a minute and try again
- If this happens frequently during indexing, reduce **Embedding Requests per Minute** in QA settings (try 10–20)
- Consider upgrading your API plan with the provider

### Connection Errors / Timeout

**Cause**: Network issue, provider outage, or the request took too long.

**Fix**:
- Check your internet connection
- Try again after a few seconds
- Check the provider's status page for outages
- If using a local model (Ollama/LM Studio), make sure the local server is running

### "Draco index does not exist"

**Cause**: You're trying to use Vault QA or semantic search but the vault hasn't been indexed yet.

**Fix**:
1. Make sure you have an embedding model configured with a valid API key (**Settings → Draco → QA → Embedding Model**)
2. Run **Command palette → Index (refresh) vault**
3. Wait for indexing to complete

### "RangeError: invalid string length"

**Cause**: Your vault is too large for a single index partition.

**Fix**: Increase the number of partitions in **Settings → Draco → QA → Partitions**. A good target is keeping the first index file under ~400 MB (check the `.obsidian/` folder for `copilot-index` files and their sizes).

### Response Gets Cut Off

**Cause**: The AI's response hit the Max Tokens limit.

**Fix**: Increase **Max Tokens** in Settings → Draco → Model (or the per-session gear icon). Default is 6,000 tokens.

### Notes Not Found in Search

Even after indexing, relevant notes aren't being returned? Try:
1. Review your QA inclusions/exclusions to confirm the notes aren't filtered out
2. Try a different embedding model for non-English notes
3. Run **List all indexed files** (debug command) to verify the notes are indexed
4. Run **Force reindex vault** for a clean rebuild

---

## Provider-Specific Issues

### Ollama

**Problem**: "Connection refused" or model not responding

**Fix**:
- Make sure Ollama is running: open a terminal and run `ollama serve`
- Verify the model is downloaded: `ollama list`
- Check that the port in Draco settings matches (default: 11434)
- On some systems, Ollama uses `http://127.0.0.1:11434` instead of `http://localhost:11434` — try both
- Remember to set `OLLAMA_ORIGINS=app://obsidian.md*` when starting Ollama

### Azure OpenAI

**Problem**: Authentication errors or model not found

**Fix**:
Azure OpenAI requires all four fields to be filled in correctly:
1. API Key
2. Instance Name (your Azure resource name, e.g., `my-azure-openai`)
3. Deployment Name (the name you gave your model deployment)
4. API Version (e.g., `2024-02-01`)

Any missing or incorrect field will cause errors.

### Amazon Bedrock

**Problem**: "Model not found" or access denied

**Fix**:
- Always use **cross-region inference profile IDs**, not bare model IDs:
  - ✅ `us.anthropic.claude-sonnet-4-5-20250929-v1:0`
  - ❌ `anthropic.claude-sonnet-4-5-20250929-v1:0`
- Make sure your IAM credentials have Bedrock access permissions
- Confirm the model is available in your region

### LM Studio

**Problem**: Cannot connect to local server

**Fix**:
- Ensure LM Studio server is running (Developer tab → Start Server)
- Make sure **CORS is enabled** in LM Studio settings
- Check the port matches (default: 1234)
- Verify a model is loaded in LM Studio

### Google Gemini

**Problem**: "QUOTA_EXCEEDED" or slow responses

**Fix**:
- Check your quota at https://console.cloud.google.com
- Try switching to the Flash model (faster, higher quota)
- Consider using Google via OpenRouter instead for a unified quota

### DeepSeek

**Problem**: Response cuts off or streaming errors

**Fix**:
- DeepSeek reasoning models can produce very long outputs; try increasing Max Tokens
- If you see streaming errors, check the DeepSeek status page
- Try switching between deepseek-chat and deepseek-reasoner

---

## Performance Issues

### Slow Indexing

**Cause**: Large vault with many notes, or low rate limit setting.

**Fix**:
- Check **Embedding Requests per Minute** — higher values speed up indexing but may cause rate limits
- Use exclusions to skip folders you don't need indexed (e.g., large archive folders)
- Use the incremental **Index (refresh) vault** command instead of Force Reindex when possible

### High Memory Usage

**Cause**: Large lexical search index or many indexed files.

**Fix**:
- Reduce **Lexical Search RAM Limit** in QA settings (default 100 MB, range 20–1000 MB)
- Add more folders to exclusions to reduce the index size
- On mobile, disable indexing altogether

### UI Lag

**Cause**: Rendering many chat messages or a very long conversation.

**Fix**:
- Start a new chat — long conversations can slow down rendering
- Auto-compact will trigger automatically at 128,000 tokens to keep conversations manageable
- Lower your auto-compact threshold if you're hitting performance issues early

---

## Settings Issues

### Reset Settings to Default

If your settings get into a bad state, you can reset:

1. Go to **Settings → Draco** → find the reset option
2. Or delete the `data.json` file from the plugin folder: `.obsidian/plugins/draco/data.json`

⚠️ Resetting will delete all your settings including API keys. Back them up first.

### API Key Encryption

Draco can encrypt your API keys at rest for added security.

**Enable**: **Settings → Draco → Advanced → Enable Encryption**

If you see strange authentication errors after enabling this, try disabling encryption and re-entering your keys.

### Debug Mode and Logs

For reporting bugs:

1. **Enable Debug Mode**: **Settings → Draco → Advanced → Debug Mode**
2. **Create a log file**: **Settings → Draco → Advanced → Create Log File**
3. The log file opens in your vault — attach it to your bug report

---

## Frequently Asked Questions

### Is my data private? Does Draco send my notes to the cloud?

Draco itself doesn't store your notes on any server. However, when you send a message, the content (including any context from your notes) is sent to the AI provider you've configured (OpenAI, Anthropic, etc.) via their API. Each provider has its own privacy policy. Your notes are not sent anywhere until you actively use the chat.

Chat history is saved as markdown files in your vault. Nothing is stored on external servers.

**For maximum privacy**: Consider using Ollama or LM Studio with a local model — nothing leaves your machine.

### Can I reference a specific note in chat?

Yes — use `[[Note Title]]` syntax directly in your message. Draco adds that note's content as context in the background. You can also use @-mentions. See [Context and Mentions](context-and-mentions.md) for the full list of ways to add context.

### How do I make Draco always reply in English?

Go to **Settings → Draco → Advanced → Default System Prompt**, create a custom prompt, and add "Always respond in English." as an instruction. See [System Prompts](system-prompts.md).

### Can Draco understand images in my notes?

Yes, but only with models that have **Vision** capability (shown by a vision icon in the model list). Make sure:
1. You're using a vision-capable model
2. **Settings → Draco → Basic → Pass markdown images to AI** is enabled

### Why can't Draco read my PDF?

- Large PDFs (over 10 MB) should be converted to markdown first
- For large PDF collections, **Projects mode** is better suited (supports PDF as context natively)

### Can I use Draco offline?

With local models (Ollama or LM Studio), yes — once a model is downloaded, it runs fully offline. Cloud providers (OpenAI, Anthropic, etc.) require an internet connection.

Lexical vault search works offline. Semantic search requires an embedding model, which may also need an internet connection unless you're using a local embedding provider.

### What's the difference between Chat mode and Vault QA mode?

- **Chat** — General conversation. The AI only has access to your current note and anything you explicitly mention.
- **Vault QA** — Specifically designed for asking questions about your vault. Draco automatically searches your notes for relevant content and includes it as context.

For most question-and-answer tasks over your vault, use **Vault QA** mode.

### Can I use multiple providers at the same time?

Yes. You can have API keys configured for multiple providers simultaneously and switch between models from different providers at any time. You can even set a different model for quick commands vs. regular chat.

### Where are my saved chats stored?

Chat conversations are saved as markdown files in your vault, in the folder `copilot/copilot-conversations/` by default. You can change this folder in **Settings → Draco → Basic → Default save folder**.

### How do I clear the Draco cache?

Use **Command palette → Clear Copilot cache**. This clears cached responses and processed files. It does not affect your chat history or the vault index.

### What is the `copilot/` folder in my vault?

The `copilot/` folder is created by the plugin and stores:
- `copilot-conversations/` — Saved chat histories
- `copilot-custom-prompts/` — Your custom commands
- `system-prompts/` — Your custom system prompts

This folder is automatically excluded from vault search to avoid cluttering results.

### How do I switch modes?

Click the mode selector at the top of the chat panel. Available modes:
- Chat
- Vault QA
- Projects

### The AI keeps forgetting what we talked about earlier

This usually means the conversation has grown too long and older turns are being trimmed from context. Options:
- Lower **Conversation Turns in Context** in Model settings
- Let auto-compact handle it (it summarizes old turns automatically)
- Start a new chat and reference the previous chat file

---

## Getting More Help

For issues and feature requests, please use the GitHub issue tracker.

---

## Related

- [Getting Started](getting-started.md) — First-time setup
- [LLM Providers](llm-providers.md) — Provider-specific setup details
- [Vault Search and Indexing](vault-search-and-indexing.md) — Index management
