export const vscodeMock = (jst: typeof jest) => ({
  window: {
    registerWebviewViewProvider: jst.fn(),
    onDidChangeActiveTextEditor: jst.fn(),
    activeTextEditor: undefined,
  },
  workspace: {
    fs: {
      readFile: jst.fn(),
    },
  },
  Uri: {
    joinPath: jst.fn((baseUri, ...paths) => {
      const joinedPath = `${baseUri.path}/${paths.join("/")}`;
      return { fsPath: joinedPath, path: joinedPath };
    }),
    file: jst.fn((path) => ({ fsPath: path, path: path })),
    parse: jst.fn((uriString) => ({ fsPath: uriString, path: uriString })),
  },
  ExtensionContext: jst.fn(() => ({
    subscriptions: [],
    extensionUri: "mockExtensionUri",
  })),
});

import type {
  ExtensionContext,
  WebviewView,
  Webview,
  WebviewViewProvider,
} from "vscode";
import { Uri, workspace, window } from "vscode";
import OpenAI from "openai";
import { activate, Extension } from "../extension";

/**
 * Creates a basic mock for ExtensionContext.
 */
export function createMockContext(): ExtensionContext {
  return {
    subscriptions: [],
    extensionUri: Uri.file("/mock/extension/path"),
    // Add other context properties if needed, mocking them as necessary
  } as unknown as ExtensionContext;
}

/**
 * Creates a basic mock for Webview.
 */
export function createMockWebview(): Webview {
  return {
    options: {},
    html: "",
    onDidReceiveMessage: jest.fn(),
    postMessage: jest.fn(),
    asWebviewUri: jest.fn((uri) => `vscode-resource:/${uri.path}`),
  } as unknown as Webview;
}

/**
 * Creates a basic mock for WebviewView using a provided mock webview.
 * @param mockWebview The mock webview instance.
 */
export function createMockWebviewView(mockWebview: Webview): WebviewView {
  return {
    webview: mockWebview,
    onDidDispose: jest.fn(),
    // Add other view properties if needed
  } as unknown as WebviewView;
}

/**
 * Resets the state of the Extension class between tests.
 */
export function resetExtensionState(): void {
  Extension.chatHistory = [];
  Extension.attachedFiles = [];
  Extension.incompleteMessage = "";
  Extension.currentWebview = null as any; // Try null, cast as any to bypass strict check for now
  // Ensure a fresh AbortController for each relevant test setup
  Extension.abortController = new AbortController();
  // Clear any mocks specific to Extension static methods if needed
}

export interface WebviewTestEnvironment {
  mockContext: ExtensionContext;
  mockWebview: Webview;
  mockWebviewView: WebviewView;
  provider: WebviewViewProvider;
  messageHandler: (message: any) => any;
}

/**
 * Sets up the common environment for Webview functionality tests.
 * Creates mocks, activates the extension, resolves the webview, and resets state.
 */
export function setupWebviewTestEnvironment(): WebviewTestEnvironment {
  jest.clearAllMocks(); // Clear mocks at the beginning

  // Reset relevant Extension state
  Extension.chatHistory = [];
  Extension.attachedFiles = [];
  // Extension.currentWebview will be set by resolveWebviewView
  Extension.abortController = new AbortController(); // Reset abort controller
  Extension.incompleteMessage = "";

  // Create mocks
  const mockContext = createMockContext();
  const mockWebview = createMockWebview();
  const mockWebviewView = createMockWebviewView(mockWebview);

  // Activate extension
  activate(mockContext);

  // Get the provider and resolve the webview
  const provider = (window.registerWebviewViewProvider as jest.Mock).mock
    .calls[0][1];
  provider.resolveWebviewView(mockWebviewView); // This sets Extension.currentWebview

  // Ensure currentWebview is set after resolveWebviewView
  if (!Extension.currentWebview) {
    throw new Error(
      "Extension.currentWebview was not set after resolving the view"
    );
  }

  // Get the message handler
  const messageHandler = (mockWebview.onDidReceiveMessage as jest.Mock).mock
    .calls[0][0];

  return {
    mockContext,
    mockWebview,
    mockWebviewView,
    provider,
    messageHandler,
  };
}

export interface ChatTestEnvironment extends WebviewTestEnvironment {
  // Add any chat-specific return values if needed later
}

/**
 * Sets up the common environment for Chat functionality tests.
 * Leverages setupWebviewTestEnvironment and performs chat-specific resets.
 */
export function setupChatTestEnvironment(): ChatTestEnvironment {
  const baseEnv = setupWebviewTestEnvironment();

  // Mock readFile globally for chat tests (can be overridden in specific tests)
  (workspace.fs.readFile as jest.Mock).mockResolvedValue(Buffer.from(""));

  // Chat-specific resets are already covered by setupWebviewTestEnvironment

  return {
    ...baseEnv,
  };
}

/**
 * Simulates the webview sending a message to the extension.
 * @param messageHandler The message handler function obtained from the mock webview.
 * @param type The message type (e.g., 'getState', 'sendMessage').
 * @param payload The message payload.
 */
export function simulateWebviewMessage(
  messageHandler: (message: any) => any,
  type: string,
  payload: any
) {
  messageHandler({ type, payload });
}

/**
 * Creates a mock stream of OpenAI chat completion chunks.
 * @param chunksContent - An array of strings, each representing the content of a delta chunk.
 * @param finishReason - The finish reason for the last chunk ('stop', 'length', etc.). Defaults to 'stop'.
 * @returns An AsyncIterable simulating the OpenAI stream.
 */
export async function* createMockStream(
  chunksContent: string[],
  finishReason: OpenAI.ChatCompletionChunk.Choice["finish_reason"] = "stop"
): AsyncIterable<OpenAI.ChatCompletionChunk> {
  const chunkBase = {
    id: `mock-id-${Date.now()}`,
    created: Date.now(),
    model: "test-model",
    object: "chat.completion.chunk" as const,
  };

  for (let i = 0; i < chunksContent.length; i++) {
    const isLastChunk = i === chunksContent.length - 1;
    yield {
      ...chunkBase,
      choices: [
        {
          index: 0,
          delta: { content: chunksContent[i] },
          finish_reason: isLastChunk ? finishReason : null,
        },
      ],
    };
  }
}
