import { Uri, window } from "vscode";
import type { ExtensionContext, Webview, TextEditor } from "vscode";
import { activate, Extension } from "../extension";
import { createMockContext, createMockWebview } from "./testUtils";

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

describe("Extension Activation", () => {
  let mockContext: ExtensionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockContext = createMockContext();
  });

  test("should register webview provider and active text editor change on activation", () => {
    activate(mockContext);
    expect(window.registerWebviewViewProvider).toHaveBeenCalledWith(
      "ai-chat-view",
      expect.objectContaining({
        resolveWebviewView: expect.any(Function),
      })
    );
    expect(window.onDidChangeActiveTextEditor).toHaveBeenCalledWith(
      expect.any(Function)
    );
    expect(mockContext.subscriptions).toHaveLength(2);
  });
});

describe("Util Functionality", () => {
  let mockWebview: Webview;

  beforeEach(() => {
    jest.clearAllMocks();
    mockWebview = createMockWebview();
    Extension.currentWebview = mockWebview;
  });

  test("handleError should post apiError with message for Error object", () => {
    const error = new Error("Test Error Message");
    Extension.util.handleError(error);
    expect(mockWebview.postMessage).toHaveBeenCalledWith({
      type: "apiError",
      payload: { message: "Test Error Message", code: "" },
    });
  });

  test("handleError should post apiError with message for string error", () => {
    const error = "String error message";
    Extension.util.handleError(error);
    expect(mockWebview.postMessage).toHaveBeenCalledWith({
      type: "apiError",
      payload: { message: "String error message", code: "" },
    });
  });

  test("handleError should post apiError with code for object with code", () => {
    const error = { code: "ECONNREFUSED", otherProp: "value" };
    Extension.util.handleError(error);
    expect(mockWebview.postMessage).toHaveBeenCalledWith({
      type: "apiError",
      payload: { message: "", code: "ECONNREFUSED" },
    });
  });

  test("handleError should post apiError with message and code if both exist", () => {
    const error = { message: "Specific message", code: "RATE_LIMIT" };
    Extension.util.handleError(error);
    expect(mockWebview.postMessage).toHaveBeenCalledWith({
      type: "apiError",
      payload: { message: "Specific message", code: "RATE_LIMIT" },
    });
  });

  test("handleError should post apiError with null payload for unknown error type", () => {
    const error = { unknown: "structure" };
    Extension.util.handleError(error);
    expect(mockWebview.postMessage).toHaveBeenCalledWith({
      type: "apiError",
      payload: null,
    });
  });
});

describe("Editor Change Listener", () => {
  let mockContext: ExtensionContext;
  let mockWebview: Webview;
  let editorChangeListener: (editor: TextEditor | undefined) => any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockWebview = createMockWebview();
    Extension.currentWebview = mockWebview;

    mockContext = createMockContext();

    activate(mockContext);
    editorChangeListener = (window.onDidChangeActiveTextEditor as jest.Mock)
      .mock.calls[0][0];
  });

  test("should post activeFileChanged when editor changes", () => {
    const mockEditorUri = Uri.file("/path/to/active/file.ts");
    const mockEditor = {
      document: {
        uri: mockEditorUri,
      },
    } as TextEditor;

    editorChangeListener(mockEditor);

    expect(mockWebview.postMessage).toHaveBeenCalledWith({
      type: "activeFileChanged",
      payload: {
        name: "file.ts",
        fileUri: mockEditorUri,
      },
    });
  });

  test("should not post activeFileChanged when editor is undefined", () => {
    editorChangeListener(undefined);
    expect(mockWebview.postMessage).not.toHaveBeenCalled();
  });
});
