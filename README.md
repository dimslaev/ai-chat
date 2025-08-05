## Vscode AI Chat

- AI-powered chat using Infomaniak's AI models
- Attaching multiple files to chat context

### Installation

1. Clone the project locally
2. Package and install:

```bash
npm install -g @vscode/vsce
npm run package
npm run install
```

### Development

1. Set environment variables in `.vscode/launch.json`:

```json
"env": {
  "OPENAI_API_KEY": "your-openai-api-key-here",
  "OPENAI_BASE_URL": "https://api.infomaniak.com/1/ai/[YOUR_PRODUCT_ID]]/openai",
  "OPENAI_MODEL": "llama3"
}
```

2. Modify the code
3. Press F5 to open vscode dev host
4. CMD+SHIFT+P > Developer:Toggle Developer Tools (to see the webview logs)
