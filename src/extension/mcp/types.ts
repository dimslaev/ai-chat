// MCP type definitions: server config, status, and client instance
import { createMCPClient } from "@ai-sdk/mcp";

export interface MCPServerConfig {
  id: string;
  name: string;
  url: string;
  transport?: "http" | "sse";
  enabled?: boolean;
}

export interface MCPServerStatus {
  id: string;
  name: string;
  connected: boolean;
  error?: string;
  toolCount: number;
}

export type MCPClientInstance = Awaited<ReturnType<typeof createMCPClient>>;
