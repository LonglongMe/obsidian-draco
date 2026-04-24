<h1 align="center">Draco for Obsidian</h1>

<h2 align="center">
Your Second Brain, Now Conversational
</h2>

<p align="center">
  <img src="https://img.shields.io/badge/version-DIY--Community-blue?style=for-the-badge" alt="Version">
</p>

<p align="center">
  <a href="#what-is-draco">What is Draco</a> |
  <a href="#why-use-draco">Why Draco</a> |
  <a href="#features">Features</a> |
  <a href="#use-cases">Use Cases</a> |
  <a href="#installation">Installation</a> |
  <a href="#configuration">Configuration</a>
</p>

---

## What is Draco

Draco is a privacy-first AI assistant for Obsidian that transforms your knowledge base into a conversational workspace. Unlike generic AI chatbots, Draco understands your notes, learns from your writing, and helps you think better—all without compromising your data ownership.

### The Philosophy

Your notes are more than just text files—they're an extension of your thinking. Draco is built on the belief that AI should work *with* your knowledge, not against it. It doesn't replace your note-taking; it enhances it by making your years of accumulated knowledge instantly accessible and actionable.

### Three Ways to Work

| Mode | Best For | What It Does |
|------|----------|--------------|
| **Chat** | Quick questions about current work | References your active note and selection |
| **Vault QA** | Deep research across your knowledge | Searches your entire vault for answers |
| **Projects** | Sustained work on specific topics | Creates isolated workspaces with dedicated context |

---

## Why Use Draco

### The Problem with Generic AI

Generic AI assistants don't know your notes exist. They give generic answers to specific questions. You spend more time explaining context than getting answers.

### How Draco Solves It

- **Context-Aware**: Every conversation happens in the context of your actual notes
- **Knowledge-Backed**: Answers draw from your vault, not generic training data
- **Workflow-Native**: Lives inside Obsidian where you already work
- **Privacy-Preserving**: Your notes never leave your control unless you choose

### Who Is It For

- **Researchers** building knowledge bases who need to synthesize information
- **Writers** who want to reference past work without leaving their flow
- **Students** organizing coursework who need to connect concepts
- **Professionals** managing project documentation who need quick answers
- **Thinkers** who use Zettelkasten or other note-taking systems

---

## Features

### Conversational Interface

Draco provides a chat interface that feels natural while being deeply integrated with your note-taking:

- **Smart Context Detection**: Automatically includes your current note, or lets you reference any note with `[[Note Title]]`
- **Multi-Modal Support**: Chat with images, code snippets, and formatted text
- **Persistent History**: Every conversation is saved and searchable
- **Inline References**: AI responses reference the specific notes they draw from

### Three Interaction Modes

#### Chat Mode
Have flowing conversations that reference your current context. Perfect for:
- Summarizing the note you're currently editing
- Brainstorming ideas related to your current work
- Asking clarifying questions about complex topics
- Getting writing suggestions based on your style

#### Vault QA Mode
Ask questions that span your entire knowledge base. Ideal for:
- Finding connections between distant notes
- Synthesizing research across multiple sources
- Answering questions like "What have I written about X?"
- Discovering forgotten insights

#### Project Mode
Create dedicated workspaces for sustained work. Each project:
- Has its own isolated chat history
- Can be configured with specific folders, tags, or notes as permanent context
- Remembers its own system prompt for consistent personality
- Keeps work organized and separate from other topics

### Context Management

Draco gives you fine-grained control over what the AI knows:

| Context Type | How It Works |
|--------------|--------------|
| **Active Note** | Current file you're editing |
| **Note References** | Use `[[Note Name]]` to include specific notes |
| **Folder Context** | Include entire folders of notes |
| **Tag Filters** | Include notes with specific tags |
| **Web Content** | Reference web pages and YouTube videos |
| **Selected Text** | Highlight text and add it directly |

### Model Flexibility

Draco is model-agnostic, supporting:

**Cloud Providers**: OpenAI, Anthropic, Google, Azure, and more via OpenRouter
**Local Models**: Ollama, LM Studio for complete privacy
**Custom Endpoints**: Any OpenAI-compatible API

Switch models per conversation based on your needs—use fast models for quick questions, powerful models for complex analysis.

### Custom Commands

Create reusable AI workflows for repetitive tasks:

- **Templates**: Define prompts you use repeatedly
- **Variables**: Insert dynamic content like dates or note titles
- **Shortcuts**: Trigger commands quickly from the chat
- **Export**: Share useful commands with others

---

## Use Cases

### For Researchers

**Scenario**: You've written 50 notes about a topic over two years. Now you need to write a paper.

**With Draco**:
- Create a Project with your research notes as context
- Ask "What are the three main themes across my research?"
- Request "Find contradictions between my early and recent notes"
- Generate an outline based on your actual content

### For Writers

**Scenario**: You're writing a blog post and know you've covered this topic before.

**With Draco**:
- Reference related notes with `[[Previous Post]]`
- Ask "How does this draft differ from my previous take?"
- Get suggestions for connections to make
- Maintain consistent voice across your body of work

### For Project Management

**Scenario**: Your team has extensive documentation scattered across folders.

**With Draco**:
- Create a Project for each major initiative
- Add relevant documentation folders as permanent context
- Ask specific questions without searching manually
- Get summaries of project status based on meeting notes

### For Learning

**Scenario**: You're studying a new field and taking extensive notes.

**With Draco**:
- Build a Project for the subject
- Ask "Explain the connection between X and Y" using your notes
- Test your understanding: "What are the gaps in my knowledge of this topic?"
- Generate study questions from your own notes

### For Personal Knowledge Management

**Scenario**: You practice Zettelkasten or similar methods.

**With Draco**:
- Discover unexpected connections between atomic notes
- Ask your system questions like "What have I learned about habits?"
- Surface forgotten insights from years of note-taking
- Generate new note ideas based on existing content

---

## Installation

### Quick Start (Recommended)

The fastest way to get Draco running:

1. Open **Obsidian Settings** → **Community Plugins**
2. Turn off **Safe mode** (if this is your first community plugin)
3. Click **Browse** and search for **Draco**
4. Click **Install**, then **Enable**

That's it. Draco is now ready to connect to your AI provider.

### First-Time Setup

After installation, you'll need to configure your AI provider. Don't worry—you can change this anytime, and Draco supports both cloud and local options.

---

## Configuration

### Connecting Your AI Provider

Draco needs an AI model to power conversations. You have three options:

**Option 1: Cloud API (Easiest)**
- Get an API key from [OpenRouter](https://openrouter.ai/keys) (recommended) or any major provider
- Enter it in **Settings → Draco → Basic → Set Keys**
- Choose your preferred model

**Option 2: Local Models (Most Private)**
- Install [Ollama](https://ollama.com) or [LM Studio](https://lmstudio.ai)
- Run models locally on your machine
- Configure Draco to use `http://localhost:11434` (Ollama) or LM Studio's server

**Option 3: Multiple Providers**
- Set up multiple API keys
- Switch between models based on task needs
- Use fast/cheap models for simple questions, powerful models for complex analysis

### Choosing Your Default Mode

Draco has three conversation modes. Set your default based on how you work:

| If You Mostly... | Set Default To |
|------------------|----------------|
| Ask about the note you're currently editing | **Chat** |
| Research across your entire knowledge base | **Vault QA** |
| Work on specific projects with dedicated context | **Projects** |

You can always switch modes per-conversation. The default just sets your starting point.

### Organizing with Projects

Projects are Draco's superpower for sustained work. Think of them as dedicated AI assistants for specific topics.

**When to Create a Project:**
- You're writing a book or research paper
- Managing a complex work initiative
- Learning a new subject over months
- Building a knowledge base on a specific topic

**What a Project Includes:**
- Dedicated chat history (chats don't mix with general conversations)
- Customizable context (specific folders, tags, or notes)
- Configurable system prompt (consistent personality for the topic)
- Persistent configuration (survives between Obsidian sessions)

---

## Usage

### Starting Your First Conversation

Open Draco by clicking the **robot icon** in the left ribbon, or press `Ctrl/Cmd+P` and search for "Draco".

The chat panel slides out from the right. You'll see:
- A conversation area (where history appears)
- An input box at the bottom
- Mode and model selectors

### Working in Chat Mode

Best for: Questions about your current note, quick brainstorming, writing assistance.

Chat Mode automatically includes your active note as context. Just start typing questions:

> "What are the main arguments in this note?"
> "Help me expand the section on implementation details"
> "What connections should I make to other notes?"

**Pro Tip**: Reference specific notes anytime with `[[Note Title]]` syntax, even if they're not open:

> "Compare the approach in [[Project Alpha]] with [[Project Beta]]"

### Working in Vault QA Mode

Best for: Research questions, finding connections, discovering forgotten insights.

Vault QA searches your entire knowledge base. Ask broad questions:

> "What have I written about habit formation?"
> "Find all notes mentioning both 'marketing' and 'budget'"
> "Summarize everything I know about this topic"

**Understanding Responses**: Draco will cite the specific notes it referenced. Click citations to open those notes.

### Working in Project Mode

Best for: Sustained work on specific topics, complex research, project management.

**Creating a Project:**

1. Click the **Projects** tab in the sidebar
2. Click **New Project**
3. Give it a name and configure context:
   - Add folders of relevant notes
   - Include specific tags
   - Set a custom system prompt (optional)
4. Start chatting within the project

**Why Projects Matter:**

Projects keep conversations organized. A "Book Research" project's chats won't mix with "Work Projects" chats. Each project can have its own personality—formal for work, creative for fiction writing.

### Managing Context

Context is how you tell Draco what to know. You have several tools:

**Automatic Context:**
- Your active note (in Chat mode)
- Project configuration (in Project mode)

**Manual Context:**
- Type `[[Note Name]]` to include specific notes
- Right-click selected text → "Add to Draco Context"
- Use `@` mentions to search and add context inline

**Context Badges:**
Look for badges above the chat input showing what's currently included. Click the X on any badge to remove it.

### Using Custom Commands

Commands are reusable AI workflows you create.

**Accessing Commands:**
- Type `/` in the chat input to see your commands
- Use the command palette (`Ctrl/Cmd+P`)
- Set a custom hotkey for quick access

**When to Use Commands:**
- Daily standup summaries
- Weekly note reviews
- Specific formatting tasks
- Analysis patterns you use repeatedly

---

## Best Practices

### For Best Results

**Be Specific**: Instead of "Summarize this," try "Summarize the key decisions and their rationale"

**Iterate**: First drafts of AI responses are starting points. Ask follow-ups: "Expand on the second point" or "Make this more actionable"

**Verify Sources**: Always check the notes Draco cites. AI can misinterpret—your original notes are the ground truth

**Use Projects**: Don't dump everything into general chat. Projects keep your history organized and context focused

### Privacy Tips

**For Maximum Privacy:**
- Use local models via Ollama or LM Studio
- Your notes never leave your machine
- Conversations are stored only in your Obsidian vault

**For Cloud Models:**
- Only your queries and relevant note excerpts are sent to the AI provider
- Your entire vault isn't uploaded—just what you choose to include as context
- Use projects to limit what context is available

### Workflow Integration

**Morning Review**: Use Vault QA to ask "What did I work on yesterday?" based on your daily notes

**Writing Sessions**: Use Chat Mode with your draft to get real-time feedback and expansion

**Research Phases**: Create a Project, add relevant folders, and accumulate insights over weeks

**Meeting Prep**: Ask Draco to summarize relevant project notes before a meeting

---

## Documentation

Explore the `docs/` folder for detailed guidance:

- [Getting Started](docs/getting-started.md) — Your first hour with Draco
- [Chat Interface](docs/chat-interface.md) — Mastering the conversation panel
- [Context and Mentions](docs/context-and-mentions.md) — Controlling what Draco knows
- [Projects](docs/projects.md) — Organizing work with dedicated workspaces
- [Custom Commands](docs/custom-commands.md) — Building reusable AI workflows
- [LLM Providers](docs/llm-providers.md) — Connecting your preferred AI models
- [System Prompts](docs/system-prompts.md) — Customizing AI personality
- [Troubleshooting](docs/troubleshooting-and-faq.md) — Common issues and solutions

---

## Philosophy & License

Draco is released under the AGPL-3.0 License because we believe:

- **Knowledge tools should be open**: You should understand how your AI assistant works
- **Data ownership matters**: You control your notes, your conversations, and your configuration
- **No vendor lock-in**: Switch providers, models, or even to local AI without losing your setup
- **Community-driven**: The best tools evolve from real user needs, not corporate roadmaps

This project builds upon the open-source ecosystem, particularly the original Copilot for Obsidian plugin. We've adapted it for users who want complete control over their AI integration—whether that means self-hosting models, using multiple providers, or simply knowing exactly how their data flows.

---

## Support & Community

**For Bug Reports & Feature Requests**: Use the GitHub issue tracker

**For Questions**: Check the [Troubleshooting Guide](docs/troubleshooting-and-faq.md) first

**Development**: Draco is a community-driven project. Contributions, forks, and adaptations are welcome under the AGPL license.

---

<p align="center">
<strong>Built for thinkers who own their knowledge.</strong>
</p>
