## Vscode AI Chat

- AI-powered chat using Infomaniak's AI models
- Continuous streaming (no stop due to max tokens)
- Attaching multiple files to chat context
- Tool calling using a dedicated (secondary) model

### Tools calling

Configuring the tools calling model will allow you to use the `Agent` mode.

The following tools are currently supported, enabling comprehensive context and prompt analysis for more accurate responses:

- **File Reading** - Read and analyze code files
- **Directory Listing** - Explore project structure
- **File Info** - Get metadata about files/directories

`Qwen 3 1.7b` has been tested for the purpose, and can be run locally on compatible hardware (e.g. Apple M2/M3 Chip, 16GB RAM).

To run the model, install [ollama](https://ollama.com/) and run the command in terminal:

```
ollama run qwen3:1.7b // install and run
ollama serve // on subsequent uses
```

### Configuration

The extension can be configured through VS Code settings.

```json
{
  "aiChat.apiKey": "your-api-key",
  "aiChat.baseURL": "https://api.infomaniak.com/1/ai",
  "aiChat.model": "llama3",
  "aiChat.toolsApiKey": "your-api-key",
  "aiChat.toolsBaseURL": "http://127.0.0.1:11434/v1",
  "aiChat.toolsModel": "qwen3:1.7b",
  "aiChat.toolsEnabled": true
}
```

### Installation

Clone the project locally and install using the command:

```
code --install-extension /PATH/TO/PROJECT/vscode-ai-chat-0.0.1.vsix
```

### Development

1. Install and watch:

```
npm i
npm run watch
```

2. Press F5 to open vscode dev host
3. CMD+SHIFT+P > Developer:Toggle Developer Tools (to see the webview logs)

To build the extension:

```
npm install -g @vscode/vsce
vsce package
```
