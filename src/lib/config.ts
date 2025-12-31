import { Configuration } from "./types";

export const MCP_TOOLS = [
  // File operations
  {
    id: "list_files_code",
    label: "List Files",
    shortName: "list",
    argKey: "path",
    hasPathArg: false,
  },
  {
    id: "read_file_code",
    label: "Read File",
    shortName: "read",
    argKey: "path",
    hasPathArg: true,
  },
  {
    id: "create_file_code",
    label: "Create File",
    shortName: "create",
    argKey: "path",
    hasPathArg: true,
  },
  {
    id: "replace_lines_code",
    label: "Edit File",
    shortName: "replace",
    argKey: "path",
    hasPathArg: true,
  },
  // Code intelligence
  {
    id: "get_document_symbols_code",
    label: "File Outline",
    shortName: "outline",
    argKey: "path",
    hasPathArg: true,
  },
  {
    id: "search_symbols_code",
    label: "Search Symbols",
    shortName: "symbols",
    argKey: "query",
    hasPathArg: false,
  },
  {
    id: "get_symbol_definition_code",
    label: "Go to Definition",
    shortName: "definition",
    argKey: "symbol",
    hasPathArg: false,
  },
  {
    id: "get_diagnostics_code",
    label: "Diagnostics",
    shortName: "diagnostics",
    argKey: "path",
    hasPathArg: true,
  },
  // Shell
  {
    id: "execute_shell_command_code",
    label: "Shell Command",
    shortName: "shell",
    argKey: "command",
    hasPathArg: false,
  },
] as const;

// Tools that need path safety checks (derived from MCP_TOOLS)
export const MCP_PATH_TOOLS: string[] = MCP_TOOLS.filter(
  (t) => t.hasPathArg,
).map((t) => t.id);

export const DEFAULT_CONFIG: Configuration = {
  id: "",
  name: "",
  active: false,
  apiKey: "",
  baseUrl: "",
  model: "",
  maxCompletionTokens: 8000,
  temperature: 0.1,
  historyLimit: 10,
  systemPrompt: "",
  frequencyPenalty: 0,
  presencePenalty: 0,
  topP: 1,
  mcpServers: [],
  mcpEnabledTools: MCP_TOOLS.map((t) => t.id),
};
