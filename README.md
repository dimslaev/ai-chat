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

### Config

- Click "Model" button in the AI Chat panel
- Fill in your API details

  - _you can get these at https://manager.infomaniak.com/ > Cloud Computing > AI Tools_
  - API Key: Your Infomaniak AI API key
  - Base URL: `https://api.infomaniak.com/1/ai/[PRODUCT_ID]/openai`
  - Model: Choose from `qwen3`, `mistral24b`, or `mistral3`

- Save and start chatting

### Development

1. Modify the code
2. Press F5 to open vscode dev host
3. CMD+SHIFT+P > Developer:Toggle Developer Tools (to see the webview logs)
