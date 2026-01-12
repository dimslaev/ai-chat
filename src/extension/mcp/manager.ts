import { MCPClient } from "@/extension/mcp/client";
import { isSensitivePath, isWorkspacePath } from "@/extension/mcp/safety";
import { MCPServerConfig, MCPServerStatus } from "@/extension/mcp/types";
import { AnyTool } from "@/extension/types";
import { MCP_PATH_TOOLS } from "@/lib/config";

/**
 * Multi-server MCP lifecycle
 * init, reconnect, tool aggregation, cleanup
 */

class MCPManager {
  #clients: Map<string, MCPClient> = new Map();
  #reconnectTimers: Map<string, NodeJS.Timeout> = new Map();

  // Initializes and connects to all enabled MCP servers
  async init(configs: MCPServerConfig[] = []): Promise<void> {
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

  // Creates client and connects to a server (schedules reconnect on failure)
  async addServer(config: MCPServerConfig): Promise<void> {
    await this.removeServer(config.id);

    const client = new MCPClient(config);
    this.#clients.set(config.id, client);

    try {
      await client.connect();
    } catch (error) {
      console.error(`[MCP] Failed to connect to ${config.name}:`, error);
      this.#scheduleReconnect(config);
      throw error;
    }
  }

  // Disconnects and removes a server, cancels pending reconnect
  async removeServer(serverId: string): Promise<void> {
    const timer = this.#reconnectTimers.get(serverId);
    if (timer) {
      clearTimeout(timer);
      this.#reconnectTimers.delete(serverId);
    }

    const client = this.#clients.get(serverId);
    if (client) {
      await client.disconnect();
      this.#clients.delete(serverId);
    }
  }

  // Collects tools from all servers, filters by enabled list, wraps with safety
  async getAllTools(enabledTools?: string[]): Promise<Record<string, AnyTool>> {
    const allTools: Record<string, AnyTool> = {};

    for (const client of this.#clients.values()) {
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
      safeTools[name] = this.#wrapToolWithSafety(name, tool);
    }

    return safeTools;
  }

  // Returns connection status for all servers
  getServerStatuses(): MCPServerStatus[] {
    return Array.from(this.#clients.values()).map((c) => c.getStatus());
  }

  // Checks if at least one server is connected
  hasConnectedServers(): boolean {
    for (const client of this.#clients.values()) {
      if (client.isConnected()) {
        return true;
      }
    }
    return false;
  }

  // Cleans up all connections and timers
  async dispose(): Promise<void> {
    for (const timer of this.#reconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.#reconnectTimers.clear();

    const disconnectPromises = Array.from(this.#clients.values()).map(
      (client) => client.disconnect(),
    );
    await Promise.allSettled(disconnectPromises);
    this.#clients.clear();

    console.log("[MCP] Disposed all connections");
  }

  // Schedules reconnection attempt with exponential backoff
  #scheduleReconnect(config: MCPServerConfig, delay = 30000): void {
    const timer = setTimeout(async () => {
      console.log(`[MCP] Attempting reconnect to ${config.name}`);
      const client = this.#clients.get(config.id);

      if (client && !client.isConnected()) {
        try {
          await client.connect();
          console.log(`[MCP] Reconnected to ${config.name}`);
        } catch {
          this.#scheduleReconnect(config, Math.min(delay * 2, 300000));
        }
      }
    }, delay);

    this.#reconnectTimers.set(config.id, timer);
  }

  // Wraps path-based tools to block access to sensitive files
  #wrapToolWithSafety(name: string, tool: AnyTool): AnyTool {
    if (!MCP_PATH_TOOLS.includes(name) || !tool.execute) return tool;

    const originalExecute = tool.execute;

    return {
      ...tool,
      execute: async (
        args: { path?: string; [key: string]: unknown },
        options: Parameters<typeof originalExecute>[1],
      ) => {
        if (
          args.path &&
          (!isWorkspacePath(args.path) || isSensitivePath(args.path))
        ) {
          return `Error: Access denied for "${args.path}"`;
        }
        return originalExecute(args, options);
      },
    };
  }
}

export const mcpManager = new MCPManager();
