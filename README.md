# VS Code AI Chat

**[Install from VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=Dimslaev.ai-chat-vscode)**

Privacy-first AI coding assistant. No telemetry, no database, no third parties - all data stays local.

Two modes for different workflows:

- **Chat mode**: You control the context. Select specific lines, attach files, get focused responses without the AI scanning your entire codebase.

- **Agent mode**: Enable MCP tools via [vscode-mcp-server](https://github.com/anthropics/vscode-mcp-server) for file operations, terminal commands, and codebase search. The AI can read, write, and execute - with safety filters for sensitive files.

## Demo

https://github.com/user-attachments/assets/7ce375f6-2a12-4ea7-8d45-ffef16cd7804

## Features

#### ▸ Manual context control

Attach opened files in editor or specific line ranges to chat. No automatic codebase scanning - you decide exactly what the AI sees.

#### ▸ Agent mode with MCP tools

Connect to vscode-mcp-server and toggle ⚡︎ agent mode. Configure which tools are enabled per provider/model config.

**Tools will never read your env vars or sensitive files (see `mcp/safety.ts`).**

#### ▸ Multiple model configs

Set up profiles with different models, system prompts, temperatures, and enabled tools.

#### ▸ Image and PDF attachments

Images sent via vision API. PDFs extracted as text. Attach any file type as context.

#### ▸ Export chat to markdown

Save conversations as formatted markdown files for documentation or sharing.

#### ▸ Token usage tracking

Monitor prompt and completion tokens in real-time.

#### ▸ Keyboard shortcuts

| Shortcut      | Action                                      |
| ------------- | ------------------------------------------- |
| `CMD + K + K` | Toggle current file/selection as attachment |
| `CMD + K + O` | Switch model configuration                  |
| `CMD + K + I` | Focus chat input                            |
