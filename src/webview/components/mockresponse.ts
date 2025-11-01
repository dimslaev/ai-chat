import { Message } from "../../lib/types";

export const mockUserMessage = `I'm having trouble with a TypeScript function that calculates the sum of an array. The function seems to work fine, but I'm experiencing a scrolling issue when hovering over the code block during streaming. The problem is that wheel events don't bubble up properly from code blocks. Can you help me with this?`;

export const mockAssistantMessage = `Thank you for reaching out and providing details about the issue you're experiencing. I understand that you're having trouble with a TypeScript function that calculates the sum of an array, and you're encountering a scrolling issue when hovering over the code block during streaming.

The issue with wheel events not bubbling up properly from code blocks is a common challenge. This typically happens because the event listeners for wheel events are not set up to handle the bubbling phase correctly. To address this, we need to ensure that the event listeners are properly configured.

One approach to mitigate this issue is to add an event listener that specifically targets wheel events and stops their propagation if they originate from a code block. This can help prevent the unwanted scrolling behavior during streaming. Here's an example of how you can modify your code to include this event listener:

\`\`\`typescript
function calculateSum(numbers: number[]): number {
  let total = 0;
  for (let i = 0; i < numbers.length; i++) {
    total += numbers[i];
  }
  return total;
}

const result = calculateSum([1, 2, 3, 4, 5]);
console.log("Sum is:", result);

// Ensure wheel events are properly handled
document.addEventListener('wheel', function(event) {
  if (event.target.closest('code')) {
    event.stopPropagation();
  }
}, { passive: true });
\`\`\`

In this modified code snippet, we've added an event listener that checks if the wheel event originates from a code block. If it does, the event propagation is stopped, which should help mitigate the scrolling issue you're experiencing.

Additionally, it's important to ensure that your code is well-structured and easy to read. This can help you and others quickly identify and address any issues that may arise. If you have any further questions or need additional assistance, please don't hesitate to ask. I'm here to help!`;

interface StreamingCallbacks {
  addMessage: (message: Message) => void;
  setIsStreaming: (isStreaming: boolean) => void;
  appendToLastMessage: (chunk: string) => void;
}

export const simulateStreamingResponse = (
  callbacks: StreamingCallbacks
): (() => void) => {
  const { addMessage, setIsStreaming, appendToLastMessage } = callbacks;

  addMessage({
    id: "1",
    role: "user" as const,
    content: mockUserMessage,
  });

  addMessage({
    id: "2",
    role: "assistant" as const,
    content: "",
  });

  setIsStreaming(true);

  let currentIndex = 0;
  const mockResponse = mockAssistantMessage;
  const streamInterval = setInterval(() => {
    if (currentIndex >= mockResponse.length) {
      setIsStreaming(false);
      clearInterval(streamInterval);
      return;
    }
    const nextIndex = Math.min(
      mockResponse.length,
      currentIndex + Math.random() * 5 + 1
    );
    const chunk = mockResponse.slice(currentIndex, nextIndex);
    appendToLastMessage(chunk);
    currentIndex = nextIndex;
  }, 20);

  return () => clearInterval(streamInterval);
};
