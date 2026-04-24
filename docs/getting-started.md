# Getting Started with Draco for Obsidian

Draco for Obsidian is an AI-powered plugin that brings large language models (LLMs) directly into your note-taking workflow. You can chat with AI, ask questions about your vault, run custom commands, and more — all without leaving Obsidian.

## What Can Draco Do?

- **Chat**: Have a conversation with an AI assistant
- **Vault Q&A**: Ask questions and get answers grounded in your own notes
- **Note editing**: Ask the AI to write or update your notes for you
- **Semantic search**: Find notes by meaning, not just keywords
- **Custom commands**: Run AI-powered prompts on selected text
- **Projects**: Create focused workspaces with isolated context

Draco supports multiple AI providers including OpenRouter, OpenAI, Anthropic, Google Gemini, Ollama (local), and more.

---

## Installation

### From Obsidian Community Plugins

1. Open **Obsidian Settings** → **Community plugins**
2. Turn off **Safe mode** if prompted
3. Click **Browse** and search for **Draco**
4. Click **Install**, then **Enable**

Draco is now installed. A robot icon will appear in the left sidebar ribbon.

### Manual Installation (Development)

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run build` to build the plugin
4. Copy `main.js`, `manifest.json`, and `styles.css` to your vault's `.obsidian/plugins/draco/` folder
5. Enable the plugin in Obsidian settings

---

## First-Time Setup

### Step 1: Open Plugin Settings

Go to **Settings** → **Draco** (scroll down to the Community Plugins section).

### Step 2: Add an API Key

On the **Basic** tab, click **Set Keys** to open the API key dialog. Enter the key for your chosen provider:

| Provider | Where to get a key |
|---|---|
| OpenRouter (recommended) | https://openrouter.ai/keys |
| OpenAI | https://platform.openai.com/api-keys |
| Anthropic | https://console.anthropic.com/settings/keys |
| Google Gemini | https://makersuite.google.com/app/apikey |

The default model is **OpenRouter Gemini 2.5 Flash**, which requires an OpenRouter API key. If you'd prefer a different provider, set up that key first, then change the default model.

### Step 3: Choose a Default Model

Still on the **Basic** tab, use the **Default Chat Model** dropdown to select the model you want to use. Any model whose provider has an API key configured will be available.

### Step 4: Choose a Chat Mode

Use the **Default Mode** dropdown to set which mode opens by default:

- **Chat** — General conversation, good for most tasks
- **Vault QA** — Ask questions answered from your notes
- **Projects** — Focused workspaces

Most users should start with **Chat** mode.

---

## Opening the Chat Panel

You can open Draco in several ways:

- Click the **robot icon** in the left ribbon (sidebar)
- Use the command palette: `Ctrl/Cmd+P` → **Open Draco Chat Window**
- Use the hotkey `Ctrl/Cmd+P` → **Toggle Draco Chat Window** to show/hide it

### Sidebar vs. Editor Tab

By default, Draco opens as a **view** (sidebar panel). You can change this in Settings → Draco → Basic → **Open chat in**:
- **View** — Opens in the sidebar, stays visible as you work
- **Editor** — Opens as an editor tab, giving it more screen space

---

## Your First Conversation

1. Open the chat panel
2. Type your message in the input box at the bottom
3. Press **Enter** (or **Shift+Enter** if you changed the send shortcut) to send
4. Watch the AI's response stream in real time
5. Continue the conversation naturally

The AI will automatically include your currently open note as context, so you can say things like "summarize this note" or "what are the action items in this note?"

---

## Keyboard Shortcuts

These are the default shortcuts. You can customize them in **Obsidian Settings** → **Hotkeys** → search for "Draco".

| Action | Default Shortcut |
|---|---|
| Open Draco Chat Window | *(unbound — assign in Hotkeys)* |
| Toggle Draco Chat Window | *(unbound — assign in Hotkeys)* |
| New Draco Chat | *(unbound — assign in Hotkeys)* |
| Quick Ask (floating input) | *(unbound — assign in Hotkeys)* |
| Trigger Quick Command | *(unbound — assign in Hotkeys)* |
| Add selection to chat context | *(unbound — assign in Hotkeys)* |

### Send Shortcut

By default, **Enter** sends a message and **Shift+Enter** adds a new line. You can swap this in Settings → Draco → Basic → **Default Send Shortcut**.

---

## Glossary

**LLM (Large Language Model)**
The AI "brain" behind Draco — a model trained on vast text to understand and generate human language, powering chat, summarization, and writing assistance.

**API (Application Programming Interface)**
A way for Draco to communicate with external AI services. You provide an API key, which is like a password that lets Draco use a provider's AI models on your behalf.

**API Key**
A secret token from an AI provider that authorizes Draco to make requests. Most providers require you to have a billing account with a positive balance.

**Token**
A small unit of text (roughly ¾ of a word) that AI models process. Tokens measure how much text the AI can handle at once and relate to usage costs.

**Context Window**
The amount of text the AI can consider at one time when generating a response. A larger context window means the AI can use more of your notes or conversation history.

**Embeddings**
A method of converting text into numbers that capture meaning. Embeddings let the AI find notes that are conceptually related, even if they don't share exact words.

**RAG (Retrieval-Augmented Generation)**
A technique that enhances AI responses by first searching for relevant notes, then generating an answer based on both your query and the retrieved content. This is how Vault QA works.

**Vector Store / Index**
A database that stores your notes as mathematical vectors (embeddings) so they can be searched by meaning. Think of it as a smart index that understands the context of your notes, not just their keywords.

---

## Next Steps

- [Chat Interface](chat-interface.md) — Learn about modes, history, and settings
- [LLM Providers](llm-providers.md) — Set up your preferred AI provider
- [Context and Mentions](context-and-mentions.md) — Control what context the AI sees
- [Vault Search and Indexing](vault-search-and-indexing.md) — Set up semantic search over your notes
- [Projects](projects.md) — Create focused workspaces
