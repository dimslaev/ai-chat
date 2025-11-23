# VSCode AI Chat Assistant

Privacy-first AI coding assistant with manual context control. File and line-range selection in editor. No telemetry, all data stays local.

## Architecture Overview

### Backend & Frontend Separation

**Backend**: `src/extension/` (Node.js)

- `extension.ts` - Activation, command/listener registration
- `webview.ts` - Message routing, lifecycle, file operations
- `chat.ts` - OpenAI streaming, message preparation, file reading
- `state.ts` - Global state (client, config, history, files, tokens)
- `config.ts` - Load/save/validate configurations

**Frontend**: `src/webview/` (Browser iframe)

- React + Radix UI + Zustand
- UI rendering, user interactions
- Entry: `index.tsx`

### Messaging

Type-safe `postMessage` communication (`src/lib/types.ts`). Extension = source of truth, webview = stateless UI.

**Key flows:**

1. Send message → OpenAI completion → stream `appendChunk` → UI updates
2. ⌘K⌘K → `activeFileChanged` → `attachFile` → extension state
3. Save config → `saveConfigs` → VSCode global state → new OpenAI client

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
