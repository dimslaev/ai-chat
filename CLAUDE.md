# VSCode AI Chat Assistant

Privacy-first AI coding assistant with manual context control. File and line-range selection in editor. No telemetry, all data stays local.

## Architecture Overview

### Backend & Frontend Separation

**Backend**: `src/extension/` (Node.js)

- `index.ts` - Activation, command/listener registration
- `core/` - Core modules
  - `config.ts` - Load/save/validate configurations
  - `state.ts` - Global state (config, history, files, tokens)
  - `providers.ts` - AI SDK provider creation (OpenAI, Mistral)
- `services/` - Business logic
  - `completion.ts` - AI SDK streaming, message preparation, tool execution
  - `stream.ts` - Stream handling utilities
  - `file-reader.ts` - File reading for context
  - `file-writer.ts` - File writing operations
- `handlers/` - Message & command handlers
  - `messages.ts` - Webview message routing
  - `commands.ts` - VSCode command registration
- `mcp/` - Model Context Protocol integration
  - `client.ts` - MCP client wrapper
  - `manager.ts` - Multi-server lifecycle management
  - `types.ts` - MCP type definitions
- `webview/` - Webview provider setup

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
