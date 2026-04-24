<h1 align="center">Draco for Obsidian</h1>

<h2 align="center">
AI Assistant for Your Second Brain
</h2>

<p align="center">
  <img src="https://img.shields.io/badge/version-DIY--Community-blue?style=for-the-badge" alt="Version">
</p>

<p align="center">
  <a href="#features">Features</a> |
  <a href="#installation">Installation</a> |
  <a href="#configuration">Configuration</a> |
  <a href="#usage">Usage</a>
</p>

## Overview

Draco is a DIY version of an AI assistant plugin for Obsidian. It brings the power of large language models directly into your note-taking workflow, with focus on:

- **Chat with your notes** - Have conversations referencing your vault content
- **Vault Q&A** - Ask questions and get answers based on your knowledge base
- **Project-based conversations** - Create focused workspaces with isolated context
- **Bring Your Own Model** - Use any OpenAI-compatible API or local models

This is a community-driven version focused on core functionality without commercial dependencies.

## Features

### Core Capabilities

- **Chat Mode** - Chat with AI using your current note as context
- **Vault QA Mode** - Search and query your entire vault
- **Project Mode** - Focused workspaces with isolated chat history
- **Custom Commands** - Create reusable AI prompts for common tasks

### Supported Providers

| Type | Providers |
|------|-----------|
| Cloud | OpenRouter, OpenAI, Anthropic, Google Gemini, Groq, DeepSeek, Azure, AWS Bedrock, and more |
| Local | Ollama, LM Studio |

### Key Principles

- **Your data stays yours** - No cloud dependencies for core features
- **No provider lock-in** - Use any model you prefer
- **Open and customizable** - Fully configurable to your needs

## Installation

### From Obsidian Community Plugins

1. Open **Obsidian → Settings → Community plugins**
2. Turn off **Safe mode** (if enabled)
3. Click **Browse**, search for **Draco**
4. Click **Install**, then **Enable**

### Manual Installation (Development)

1. Clone this repository
2. Run `npm install`
3. Run `npm run build`
4. Copy the built files to your vault's `.obsidian/plugins/draco/` folder
5. Enable the plugin in Obsidian settings

## Configuration

### Set Up API Keys

1. Go to **Settings → Draco → Basic**
2. Click **Set Keys**
3. Add your API key for your preferred provider

**Recommended**: [OpenRouter](https://openrouter.ai/keys) provides access to multiple models with a single key.

### Choose Default Model

1. In the **Basic** tab, select your **Default Chat Model**
2. Choose your preferred **Default Mode**:
   - **Chat** - General conversation with current note context
   - **Vault QA** - Query your entire vault
   - **Projects** - Focused project workspaces

## Usage

### Opening the Chat Panel

- Click the **robot icon** in the left ribbon
- Or use command palette: `Ctrl/Cmd+P` → **Open Draco Chat Window**

### Chat Mode

Reference notes using `[[Note Title]]` syntax:

> Summarize [[Q3 Retrospective]] and identify action items.

### Vault QA Mode

Ask questions about your entire knowledge base:

> What are the recurring themes in my research about AI?

### Project Mode

Create focused workspaces:

1. Go to **Projects** tab in the chat panel
2. Create a new project with specific folders/tags
3. Chat within that isolated context

### Custom Commands

Create reusable prompts in **Settings → Draco → Command**:

| Feature | How to Access |
|---------|---------------|
| Add selection to context | Right-click selected text |
| Quick command | Shortcut (customizable) |
| Command palette in chat | Type `/` in chat |

## Documentation

See the `docs/` folder for detailed guides:

- [Getting Started](docs/getting-started.md)
- [LLM Providers](docs/llm-providers.md)
- [Chat Interface](docs/chat-interface.md)
- [Context and Mentions](docs/context-and-mentions.md)
- [Custom Commands](docs/custom-commands.md)
- [Vault Search and Indexing](docs/vault-search-and-indexing.md)
- [Projects](docs/projects.md)
- [System Prompts](docs/system-prompts.md)
- [Troubleshooting](docs/troubleshooting-and-faq.md)

## Development

### Build Commands

```bash
npm run build        # Production build
npm run lint         # Run ESLint
npm run format       # Format with Prettier
npm run test         # Run tests
```

### Project Structure

```
src/
├── components/     # React UI components
├── core/          # Core business logic
├── LLMProviders/  # Model provider integrations
├── search/        # Vault search functionality
├── settings/      # Settings UI
├── tools/         # Built-in tools
└── ...
```

## License

This project is licensed under the AGPL-3.0 License.

## Acknowledgments

This is a community-driven fork based on the original Copilot for Obsidian plugin, adapted for DIY/self-hosted use cases.

## Support

For issues and feature requests, please use the GitHub issue tracker.
