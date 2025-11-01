## Vscode AI Chat

No telemetry, no database - completely private AI coding assistant.

Works great with open models hosted by Infomaniak provider.

- context-aware file attachment
- smark task classification
- multiple providers
- custom system prompt

### Config

- Click "Model" button in the AI Chat panel
- Fill in your API details

  - _you can get these at https://manager.infomaniak.com/ > Cloud Computing > AI Tools_
  - API Key: Your Infomaniak AI API key
  - Base URL: `https://api.infomaniak.com/1/ai/[PRODUCT_ID]/openai`
  - Model: choose from available options or select a custom model name

- Save and start chatting

### Development

1. Modify the code
2. Press F5 to open vscode dev host
3. CMD+SHIFT+P > Developer:Toggle Developer Tools (to see the webview logs)
