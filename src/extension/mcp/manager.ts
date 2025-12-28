import { Tool } from "ai";

import { MCP_PATH_TOOLS } from "@/lib/config";

import { MCPClient } from "./client";
import { isSensitivePath } from "./safety";
import { MCPServerConfig, MCPServerStatus } from "./types";

type AnyTool = Tool<any, any>;

function wrapToolWithSafety(name: string, tool: AnyTool): AnyTool {
  // Only wrap tools that have path arguments
  if (!MCP_PATH_TOOLS.includes(name) || !tool.execute) {
    return tool;
  }

  const originalExecute = tool.execute;

  return {
    ...tool,
    execute: async (
      args: { path?: string; [key: string]: unknown },
      options: Parameters<typeof originalExecute>[1],
    ) => {
      // Check for sensitive paths
      if (args.path && isSensitivePath(args.path)) {
        console.warn(`[MCP Safety] Blocked access to sensitive file: ${args.path}`);
        return `Error: Access denied. "${args.path}" is a sensitive file and cannot be accessed.`;
      }

      return originalExecute(args, options);
    },
  };
}

class MCPManager {
  private clients: Map<string, MCPClient> = new Map();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();

  async initialize(configs: MCPServerConfig[] = []): Promise<void> {
    const enabledConfigs = configs.filter((c) => c.enabled !== false);

    if (enabledConfigs.length === 0) {
      console.log("[MCP] No servers configured");
      return;
    }

    console.log(`[MCP] Initializing ${enabledConfigs.length} server(s)`);

    const results = await Promise.allSettled(
      enabledConfigs.map((config) => this.addServer(config)),
    );

    const connected = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(`[MCP] Connected: ${connected}, Failed: ${failed}`);
  }

  async addServer(config: MCPServerConfig): Promise<void> {
    await this.removeServer(config.id);

    const client = new MCPClient(config);
    this.clients.set(config.id, client);

    try {
      await client.connect();
    } catch (error) {
      console.error(`[MCP] Failed to connect to ${config.name}:`, error);
      this.scheduleReconnect(config);
      throw error;
    }
  }

  async removeServer(serverId: string): Promise<void> {
    const timer = this.reconnectTimers.get(serverId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(serverId);
    }

    const client = this.clients.get(serverId);
    if (client) {
      await client.disconnect();
      this.clients.delete(serverId);
    }
  }

  private scheduleReconnect(config: MCPServerConfig, delay = 30000): void {
    const timer = setTimeout(async () => {
      console.log(`[MCP] Attempting reconnect to ${config.name}`);
      const client = this.clients.get(config.id);

      if (client && !client.isConnected()) {
        try {
          await client.connect();
          console.log(`[MCP] Reconnected to ${config.name}`);
        } catch {
          this.scheduleReconnect(config, Math.min(delay * 2, 300000));
        }
      }
    }, delay);

    this.reconnectTimers.set(config.id, timer);
  }

  async getAllTools(enabledTools?: string[]): Promise<Record<string, AnyTool>> {
    const allTools: Record<string, AnyTool> = {};

    for (const client of this.clients.values()) {
      if (client.isConnected()) {
        try {
          const tools = await client.getTools();
          Object.assign(allTools, tools);
        } catch (error) {
          console.error("[MCP] Error getting tools:", error);
        }
      }
    }

    // Filter tools if enabledTools is specified
    let tools = allTools;
    if (enabledTools && enabledTools.length > 0) {
      tools = {};
      for (const toolName of enabledTools) {
        if (allTools[toolName]) {
          tools[toolName] = allTools[toolName];
        }
      }
    }

    // Wrap tools with safety checks
    const safeTools: Record<string, AnyTool> = {};
    for (const [name, tool] of Object.entries(tools)) {
      safeTools[name] = wrapToolWithSafety(name, tool);
    }

    return safeTools;
  }

  hasConnectedServers(): boolean {
    for (const client of this.clients.values()) {
      if (client.isConnected()) {
        return true;
      }
    }
    return false;
  }

  getServerStatuses(): MCPServerStatus[] {
    return Array.from(this.clients.values()).map((c) => c.getStatus());
  }

  async dispose(): Promise<void> {
    for (const timer of this.reconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.reconnectTimers.clear();

    const disconnectPromises = Array.from(this.clients.values()).map((client) =>
      client.disconnect(),
    );
    await Promise.allSettled(disconnectPromises);
    this.clients.clear();

    console.log("[MCP] Disposed all connections");
  }
}

export const mcpManager = new MCPManager();
