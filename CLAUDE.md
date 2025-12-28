# VSCode AI Chat Assistant

Privacy-first AI coding assistant with manual context control. File and line-range selection in editor. No telemetry, all data stays local.

## Architecture Overview

### Backend & Frontend Separation

**Backend**: `src/extension/` (Node.js)

- `index.ts` - Extension entry point: activation, initialization, cleanup
- `types.ts` - Shared type definitions for AI SDK tools
- `core/` - Core modules
  - `config.ts` - Configuration loading, saving, validation via VSCode global state
  - `state.ts` - Global state: config, history, files, tokens, abort controller
  - `providers.ts` - AI SDK provider factory (OpenAI, Mistral)
  - `webview.ts` - Webview panel setup, HTML generation, message binding
- `services/` - Business logic
  - `completion.ts` - AI completion orchestration: tool execution + streaming
  - `stream.ts` - Stream response handling: chunks, tokens, history
  - `file-reader.ts` - File content reading: text, images, PDFs
  - `file-writer.ts` - File export: chat markdown, config JSON
  - `types.ts` - Type definitions for streaming handlers
- `handlers/` - Message & command handlers
  - `messages.ts` - Webview message router for all UI commands
  - `editor.ts` - Editor keyboard commands and file change listeners
- `mcp/` - Model Context Protocol integration
  - `client.ts` - MCP client wrapper for single server
  - `manager.ts` - Multi-server lifecycle: init, reconnect, cleanup
  - `types.ts` - MCP type definitions
  - `safety.ts` - File path security: sensitive file blocking

**Frontend**: `src/webview/` (Browser iframe)

- React + Radix UI + Zustand
- UI rendering, user interactions
- Entry: `index.tsx`

### AI SDK Integration

Uses Vercel AI SDK (`ai` package) with provider packages:
- `@ai-sdk/openai` - OpenAI-compatible APIs
- `@ai-sdk/mistral` - Mistral AI
- `@ai-sdk/mcp` - MCP tool integration

Key functions: `streamText()` for responses, `generateText()` for tool execution loops.

### MCP Tools

When MCP server is configured, tools from the server replace built-in tools:
- Tools filtered by `config.mcpEnabledTools` array
- Manager handles connection lifecycle and reconnection
- Works with vscode-mcp-server for VS Code integration

### Messaging

Type-safe `postMessage` communication (`src/lib/types.ts`). Extension = source of truth, webview = stateless UI.

**Key flows:**

1. Send message → AI SDK completion → stream `appendChunk` → UI updates
2. ⌘K⌘K → `activeFileChanged` → `attachFile` → extension state
3. Save config → `saveConfigs` → VSCode global state

### Store & Hooks

**Store** (`src/webview/store/chat.ts`): Zustand with `subscribeWithSelector`. Pure state only: messages, files, configs, streaming status, tokens.

**Hooks** (`src/webview/hooks/`):

- `useChatSync.ts` - Listens to extension messages. Restores state, handles streaming. Called once in `Container.tsx`.
- `useChatActions.ts` - User commands: `submitMessage()`, `editMessage()`, `stopStream()`, `attachFile()`, `saveChat()`.
- `useChatConfig.ts` - Config persistence to extension.

**Why separate?** Unidirectional flow: User → Actions → Extension → Sync → Store → UI. Prevents circular dependencies.

### Build

```
npm run build              # Full production build
npm run build:extension    # Extension only
npm run build:webview      # Webview only
```

### UI

- Use Radix UI Themes components
- Inline styles only, avoid global.css
