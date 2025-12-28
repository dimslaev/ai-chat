import { createMCPClient } from "@ai-sdk/mcp";

import {
  MCPClientInstance,
  MCPServerConfig,
  MCPServerStatus,
} from "@/extension/mcp/types";
import { AnyTool } from "@/extension/types";

/**
 * MCP client wrapper
 * connection lifecycle and tool retrieval for one server
 */

export class MCPClient {
  #client: MCPClientInstance | null = null;
  #config: MCPServerConfig;
  #status: MCPServerStatus;

  constructor(config: MCPServerConfig) {
    this.#config = config;
    this.#status = {
      id: config.id,
      name: config.name,
      connected: false,
      toolCount: 0,
    };
  }

  async connect(): Promise<void> {
    try {
      this.#client = await createMCPClient({
        transport: {
          type: this.#config.transport ?? "http",
          url: this.#config.url,
        },
      });

      const tools = await this.#client.tools();
      this.#status = {
        id: this.#config.id,
        name: this.#config.name,
        connected: true,
        toolCount: Object.keys(tools).length,
      };

      console.log(
        `[MCP] Connected to ${this.#config.name} (${this.#status.toolCount} tools)`,
      );
    } catch (error) {
      this.#status = {
        id: this.#config.id,
        name: this.#config.name,
        connected: false,
        error: error instanceof Error ? error.message : "Connection failed",
        toolCount: 0,
      };
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.#client) {
      try {
        await this.#client.close();
      } catch (error) {
        console.error(`[MCP] Error closing ${this.#config.name}:`, error);
      }
      this.#client = null;
      this.#status.connected = false;
    }
  }

  async getTools(): Promise<Record<string, AnyTool>> {
    if (!this.#client || !this.#status.connected) {
      return {};
    }
    try {
      return await this.#client.tools();
    } catch (error) {
      console.error(
        `[MCP] Failed to get tools from ${this.#config.name}:`,
        error,
      );
      return {};
    }
  }

  getStatus(): MCPServerStatus {
    return { ...this.#status };
  }

  isConnected(): boolean {
    return this.#status.connected;
  }
}
