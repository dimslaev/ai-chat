import { Uri, window } from "vscode";
import type {
  ExtensionContext,
  WebviewView,
  Webview,
  WebviewViewProvider,
} from "vscode";
import { Extension } from "../extension";
import {
  setupWebviewTestEnvironment,
  simulateWebviewMessage,
} from "./testUtils";

jest.mock(
  "vscode",
  () => ({
    window: {
      registerWebviewViewProvider: jest.fn(),
      onDidChangeActiveTextEditor: jest.fn(),
      activeTextEditor: undefined,
    },
    workspace: {
      fs: {
        readFile: jest.fn(),
      },
    },
    Uri: {
      joinPath: jest.fn((baseUri, ...paths) => {
        const joinedPath = `${baseUri.path}/${paths.join("/")}`;
        return { fsPath: joinedPath, path: joinedPath };
      }),
      file: jest.fn((path) => ({ fsPath: path, path: path })),
      parse: jest.fn((uriString) => ({ fsPath: uriString, path: uriString })),
    },
    ExtensionContext: jest.fn(() => ({
      subscriptions: [],
      extensionUri: "mockExtensionUri",
    })),
  }),
  { virtual: true }
);

const mockCompleteStream = jest.fn();

describe("Webview Functionality", () => {
  let mockContext: ExtensionContext;
  let mockWebviewView: WebviewView;
  let mockWebview: Webview;
  let messageHandler: (message: any) => any;
  let provider: WebviewViewProvider;
  let originalCompleteStream: any;

  beforeEach(() => {
    const env = setupWebviewTestEnvironment();
    mockContext = env.mockContext;
    mockWebview = env.mockWebview;
    mockWebviewView = env.mockWebviewView;
    provider = env.provider;
    messageHandler = env.messageHandler;

    // Mock completeStream after activation happens inside setupWebviewTestEnvironment
    originalCompleteStream = Extension.chat.completeStream;
    Extension.chat.completeStream = mockCompleteStream;
  });

  afterEach(() => {
    // Restore the original function after each test
    Extension.chat.completeStream = originalCompleteStream;
  });

  test("resolveWebviewView should configure the webview", () => {
    const provider = (window.registerWebviewViewProvider as jest.Mock).mock
      .calls[0][1];

    provider.resolveWebviewView(mockWebviewView);

    expect(mockWebview.options).toEqual({
      enableScripts: true,
      localResourceRoots: [mockContext.extensionUri],
    });
    expect(mockWebview.html).toContain('<div id="root"></div>');
    expect(mockWebview.html).toContain(
      '<script src="vscode-resource://mock/extension/path/out/webview.js"></script>'
    );
    expect(mockWebview.onDidReceiveMessage).toHaveBeenCalledWith(
      expect.any(Function)
    );
    expect(mockWebviewView.onDidDispose).toHaveBeenCalledWith(
      expect.any(Function),
      null,
      mockContext.subscriptions
    );
  });

  test("handleMessage should call getState and post state back", () => {
    simulateWebviewMessage(messageHandler, "getState", undefined);

    expect(mockWebview.postMessage).toHaveBeenCalledWith({
      type: "setState",
      payload: expect.objectContaining({
        history: [], // Initial state
        attachedFiles: [], // Initial state
        suggestedFile: null, // Assuming no active editor in mock setup
      }),
    });
  });

  test("handleMessage should add message to history and call completeStream for sendMessage", () => {
    // Simulate receiving a 'sendMessage' message
    const userMessage = { id: "1", role: "user", content: "Hello AI" };
    simulateWebviewMessage(messageHandler, "sendMessage", userMessage);

    // Message was added to the history
    expect(Extension.chatHistory).toHaveLength(1);
    expect(Extension.chatHistory[0]).toEqual(userMessage);
    expect(mockCompleteStream).toHaveBeenCalledTimes(1);
  });

  test("handleMessage should abort stream and notify webview for stopStream", () => {
    const abortSpy = jest.spyOn(Extension.abortController, "abort");

    // Simulate receiving a 'stopStream' message
    simulateWebviewMessage(messageHandler, "stopStream", undefined);

    // Abort was called
    expect(abortSpy).toHaveBeenCalledTimes(1);

    // Webview was notified
    expect(mockWebview.postMessage).toHaveBeenCalledWith({
      type: "endAssistantMessage",
    });

    abortSpy.mockRestore();
  });

  test("handleMessage should add file to attachedFiles for attachFile", () => {
    // Simulate receiving an 'attachFile' message
    const mockFileUri = Uri.file("/path/to/mock/file.txt");
    const attachFilePayload = { name: "file.txt", fileUri: mockFileUri };
    simulateWebviewMessage(messageHandler, "attachFile", attachFilePayload);

    // File was added to the attachedFiles array
    expect(Extension.attachedFiles).toHaveLength(1);
    expect(Extension.attachedFiles[0]).toEqual({
      name: "file.txt",
      fileUri: mockFileUri,
    });
  });

  test("handleMessage should remove file from attachedFiles for removeAttachedFile", () => {
    // 1. Add a mock file first (state is reset in beforeEach)
    const mockFileUri1 = Uri.file("/path/to/mock/file1.txt");
    const mockFileUri2 = Uri.file("/path/to/mock/file2.ts");
    Extension.attachedFiles = [
      { name: "file1.txt", fileUri: mockFileUri1 },
      { name: "file2.ts", fileUri: mockFileUri2 },
    ];

    // 2. Simulate receiving a 'removeAttachedFile' message for file1.txt
    const removeFilePayload = { name: "file1.txt", fileUri: mockFileUri1 };
    simulateWebviewMessage(
      messageHandler,
      "removeAttachedFile",
      removeFilePayload
    );

    // 3. File1.txt was removed and File2.ts remains
    expect(Extension.attachedFiles).toHaveLength(1);
    expect(Extension.attachedFiles[0]).toEqual({
      name: "file2.ts",
      fileUri: mockFileUri2,
    });
  });

  test("handleMessage should clear history and files for cleanup", () => {
    // 1. Add some mock data (state is reset in beforeEach)
    Extension.chatHistory = [
      { id: "1", role: "user", content: "test message" },
    ];
    Extension.attachedFiles = [
      { name: "test.txt", fileUri: Uri.file("/test.txt") },
    ];

    // 2. Simulate receiving a 'cleanup' message
    simulateWebviewMessage(messageHandler, "cleanup", undefined);

    // 3. Assert that history and files are cleared
    expect(Extension.chatHistory).toHaveLength(0);
    expect(Extension.attachedFiles).toHaveLength(0);
  });
});
