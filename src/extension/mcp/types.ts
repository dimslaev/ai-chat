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
