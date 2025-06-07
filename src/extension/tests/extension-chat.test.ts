import { Uri, workspace } from "vscode";
import type { ExtensionContext, Webview } from "vscode";
import { Extension } from "../extension";
import { Message, OpenAIStream } from "../../types";
import { setupChatTestEnvironment, createMockStream } from "./testUtils";

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

describe("Chat Functionality", () => {
  let mockContext: ExtensionContext;
  let mockWebview: Webview;
  let completeSpy: jest.SpyInstance;

  beforeEach(() => {
    const env = setupChatTestEnvironment();
    mockContext = env.mockContext;
    mockWebview = env.mockWebview;

    completeSpy = jest
      .spyOn(Extension.chat, "complete")
      .mockImplementation(async (params) => {
        if (params.stream) {
          return createMockStream([
            "Default ",
            "mock stream",
          ]) as unknown as OpenAIStream;
        }
        return undefined;
      });
  });

  afterEach(() => {
    completeSpy.mockRestore();
  });

  test("prepareMessages should format basic history with system prompt", async () => {
    Extension.chatHistory = [
      { id: "1", role: "user", content: "Hello" },
      { id: "2", role: "assistant", content: "Hi there!" },
    ];

    const preparedMessages = await Extension.chat.prepareMessages();

    expect(preparedMessages).toHaveLength(3); // System + 2 history messages
    expect(preparedMessages[0]).toEqual({
      role: "system",
      content: expect.any(String),
    });
    expect(preparedMessages[1]).toEqual({ role: "user", content: "Hello" });
    expect(preparedMessages[2]).toEqual({
      role: "assistant",
      content: "Hi there!",
    });
  });

  test("prepareMessages should include attached file content", async () => {
    const mockFileUri = Uri.file("/path/to/test.code");
    const mockFileContent = "const x = 10;";
    Extension.attachedFiles = [{ name: "test.code", fileUri: mockFileUri }];
    Extension.chatHistory = [
      { id: "1", role: "user", content: "Explain this code" },
    ];
    // Mock readFile for the specific URI
    (workspace.fs.readFile as jest.Mock).mockImplementation(async (uri) => {
      if (uri.path === mockFileUri.path) {
        return Buffer.from(mockFileContent);
      }
      return Buffer.from(""); // Default empty buffer
    });

    const preparedMessages = await Extension.chat.prepareMessages();

    expect(preparedMessages).toHaveLength(3);
    // System Prompt
    expect(preparedMessages[0]).toEqual({
      role: "system",
      content: expect.any(String),
    });
    // File Context Message
    expect(preparedMessages[1].role).toBe("user");
    expect(preparedMessages[1].content).toContain("test.code");
    expect(preparedMessages[1].content).toContain(mockFileContent);

    // History Message
    expect(preparedMessages[2]).toEqual({
      role: "user",
      content: "Explain this code",
    });
  });

  test("prepareMessages should append incomplete message", async () => {
    Extension.chatHistory = [
      { id: "1", role: "user", content: "Question" },
      { id: "2", role: "assistant", content: "Partial answer..." },
    ];
    Extension.incompleteMessage = "... continued answer.";

    const preparedMessages = await Extension.chat.prepareMessages();

    expect(preparedMessages).toHaveLength(4);
    expect(preparedMessages[0].role).toBe("system");
    expect(preparedMessages[1].role).toBe("user");
    expect(preparedMessages[2].role).toBe("assistant"); // Full last assistant message from history
    expect(preparedMessages[2].content).toBe("Partial answer...");
    // Check Incomplete Message appended
    expect(preparedMessages[3]).toEqual({
      role: "assistant",
      content: Extension.incompleteMessage,
    });
  });

  test("completeStream should handle successful stream completion", async () => {
    const userMessage: Message = {
      id: "1",
      role: "user",
      content: "Test query",
    };
    Extension.chatHistory = [userMessage];
    completeSpy.mockResolvedValue(
      createMockStream(["Hel", "lo ", "World!"]) as unknown as OpenAIStream
    );

    await Extension.chat.completeStream();

    expect(completeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ stream: true })
    );

    // Webview updates
    expect(mockWebview.postMessage).toHaveBeenCalledWith({
      type: "startAssistantMessage",
    });
    expect(mockWebview.postMessage).toHaveBeenCalledWith({
      type: "appendChunk",
      payload: "Hel",
    });
    expect(mockWebview.postMessage).toHaveBeenCalledWith({
      type: "appendChunk",
      payload: "lo ",
    });
    expect(mockWebview.postMessage).toHaveBeenCalledWith({
      type: "appendChunk",
      payload: "World!",
    });
    expect(mockWebview.postMessage).toHaveBeenCalledWith({
      type: "endAssistantMessage",
    });

    // State updates
    expect(Extension.chatHistory).toHaveLength(2); // user + assistant
    expect(Extension.chatHistory[1]).toEqual(
      expect.objectContaining({
        role: "assistant",
        content: "Hello World!",
      })
    );
    expect(Extension.incompleteMessage).toBe("");
  });

  test("completeStream should handle length-limited stream and set incompleteMessage", async () => {
    Extension.chatHistory = [{ id: "1", role: "user", content: "Long query" }];

    completeSpy.mockResolvedValue(
      createMockStream(
        ["Start...", " continues..."],
        "length"
      ) as unknown as OpenAIStream // Pass 'length' as finish reason
    );

    await Extension.chat.completeStream(); // Call the original function

    // Extension.chat.complete call
    expect(completeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ stream: true })
    );

    // Webview updates
    expect(mockWebview.postMessage).toHaveBeenCalledWith({
      type: "startAssistantMessage",
    });
    expect(mockWebview.postMessage).toHaveBeenCalledWith({
      type: "appendChunk",
      payload: "Start...",
    });
    expect(mockWebview.postMessage).toHaveBeenCalledWith({
      type: "appendChunk",
      payload: " continues...",
    });
    // Should NOT send endAssistantMessage when length limited
    expect(mockWebview.postMessage).not.toHaveBeenCalledWith({
      type: "endAssistantMessage",
    });

    // State updates
    expect(Extension.incompleteMessage).toBe("Start... continues...");
    expect(Extension.chatHistory).toHaveLength(1); // History only updated on full completion
    expect(completeSpy).toHaveBeenCalledTimes(2);
  });

  test("completeStream should handle aborted stream", async () => {
    Extension.chatHistory = [{ id: "1", role: "user", content: "Query" }];
    const handleErrorSpy = jest.spyOn(Extension.util, "handleError");

    // Mock a stream that we can interrupt
    async function* mockAbortableStream() {
      const chunkBase = {
        id: "mock-id",
        created: Date.now(),
        model: "test-model",
        object: "chat.completion.chunk" as const,
      };
      try {
        yield {
          ...chunkBase,
          choices: [
            { index: 0, delta: { content: "Part 1..." }, finish_reason: null },
          ],
        };
        // Simulate the abort happening after the first chunk
        Extension.abortController.abort();
        // Introduce a small delay to allow the abort signal to propagate if necessary
        await new Promise((resolve) => setImmediate(resolve));
        // This part should normally not be reached if abort works correctly
        yield {
          ...chunkBase,
          choices: [
            {
              index: 0,
              delta: { content: "Part 2 (should not process)" },
              finish_reason: "stop",
            },
          ],
        };
      } catch (error: any) {
        // Catch potential errors thrown due to abort (like AbortError)
        if (error.name !== "AbortError") {
          throw error; // Re-throw unexpected errors
        }
        console.log("Stream iteration aborted as expected.");
      }
    }
    completeSpy.mockResolvedValue(
      mockAbortableStream() as unknown as OpenAIStream
    );

    await Extension.chat.completeStream();

    // Extension.chat.complete
    expect(completeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ stream: true })
    );

    // Webview updates
    expect(mockWebview.postMessage).toHaveBeenCalledWith({
      type: "startAssistantMessage",
    });
    expect(mockWebview.postMessage).toHaveBeenCalledWith({
      type: "appendChunk",
      payload: "Part 1...",
    });
    // Should not process or post chunks after abort
    expect(mockWebview.postMessage).not.toHaveBeenCalledWith({
      type: "appendChunk",
      payload: "Part 2 (should not process)",
    });
    // Should send endAssistantMessage when aborted externally
    expect(mockWebview.postMessage).toHaveBeenCalledWith({
      type: "endAssistantMessage",
    });

    // State updates
    expect(Extension.incompleteMessage).toBe("");
    expect(Extension.chatHistory).toHaveLength(1);

    // Error handler NOT called for abort
    expect(handleErrorSpy).not.toHaveBeenCalled();

    handleErrorSpy.mockRestore();
  });

  test("completeStream should call handleError on API failure", async () => {
    Extension.chatHistory = [{ id: "1", role: "user", content: "Query" }];
    const apiError = new Error("Fake API error");
    completeSpy.mockRejectedValue(apiError);
    const handleErrorSpy = jest.spyOn(Extension.util, "handleError");

    await Extension.chat.completeStream();

    // Extension.chat.complete call
    expect(completeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ stream: true })
    );

    // Webview updates
    expect(mockWebview.postMessage).not.toHaveBeenCalledWith({
      type: "startAssistantMessage",
    });
    expect(mockWebview.postMessage).not.toHaveBeenCalledWith({
      type: "appendChunk",
      payload: expect.anything(),
    });
    expect(mockWebview.postMessage).not.toHaveBeenCalledWith({
      type: "endAssistantMessage",
    });

    // State updates
    expect(Extension.incompleteMessage).toBe("");
    expect(Extension.chatHistory).toHaveLength(1); // History not updated on failure

    // Error handler called
    expect(handleErrorSpy).toHaveBeenCalledWith(apiError);

    handleErrorSpy.mockRestore();
  });
});
