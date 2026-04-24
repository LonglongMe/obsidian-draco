# Context and Mentions

Draco uses **context** to give the AI information about your notes, selected text, and more. You can control exactly what context the AI sees using automatic context, @-mentions, and manual commands.

---

## Automatic Context

### Active Note

By default, the content of your currently open note is automatically included in every message you send. This means you can ask things like:

- "Summarize this note"
- "What are the action items here?"
- "Add a conclusion section"

To disable automatic note context: **Settings → Draco → Basic → Auto-add active note to context** (toggle off).

### Active Web Tab (Desktop Only)

If you have the Draco Web Viewer open alongside your notes, the content of the currently active web tab is automatically included as context (labeled `{activeWebTab}`). This lets you ask the AI to help you work with web content.

### Selected Text

If you highlight text in a note and then type in the chat, the selected text is automatically included as context. This is useful for asking about or transforming a specific part of a note.

You can enable/disable automatic selection adding in **Settings → Draco → Basic → Auto-add selection to context**.

### Images in Markdown

If your note contains images (e.g., `![[screenshot.png]]`), and you're using a model with **Vision** capability, those images are automatically included in the context. Draco will pass the image data to the AI so it can see and describe the image.

To control this behavior: **Settings → Draco → Basic → Pass markdown images to AI**.

---

## @-Mentions

Type `@` in the chat input to mention and include specific items as context.

### @note — Include a Specific Note

Type `@` followed by the note title to add a note to context:

```
@My Meeting Notes tell me what was decided in this meeting
```

The note's full content is included in the request.

### @folder — Include a Folder of Notes

Type `@` followed by a folder name to include all notes in that folder:

```
@Projects/ what tasks are still open?
```

### @tags — Include Notes by Tag

Use `#` after `@` to include all notes with a specific tag:

```
@#work/project summarize the status of the work project
```

---

## Adding Context Manually

### Add Selection to Chat Context

Use the command palette: **Add selection to chat context**

Highlights the selected text and adds it to the chat as context without sending a message. Useful when you want to build up context before sending.

### Add Web Selection to Chat Context

Use the command palette: **Add web selection to chat context**

Works similarly but captures selected text from the Web Viewer. Available on desktop only.

### Adding an Image as Context

Drag an image directly into the chat input box, or click the **image button** in the bottom-right corner of the chat input. The image is sent to the AI if your selected model supports **Vision** capability.

---

## Context Indicators

When context items are added to your message, Draco shows small pills or badges in the chat input area showing what's included (e.g., the note name, a tag). This helps you confirm exactly what the AI will see.

---

## Context Behavior by Mode

| Context Type | Chat | Vault QA | Projects |
|---|---|---|---|
| Active note | Yes (auto) | Yes (auto) | Yes (auto) |
| Selected text | Yes (auto) | Yes (auto) | Yes (auto) |
| @note / @folder | Yes | Yes | Yes |
| @vault search | Yes (explicit) | Auto | Auto |
| Images (vision) | Yes | Yes | Yes |
| Active web tab | Desktop only | Desktop only | Desktop only |

---

## Related

- [Chat Interface](chat-interface.md) — How the chat panel works
- [Vault Search and Indexing](vault-search-and-indexing.md) — How vault search works
