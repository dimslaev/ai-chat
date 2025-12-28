/**
 * File path security
 * block sensitive files and ignored directories
 */

// Patterns for sensitive files that should never be read
const SENSITIVE_PATTERNS = [
  /\.env($|\.)/i, // .env, .env.local, .env.production, etc.
  /\.pem$/i, // SSL certificates
  /\.key$/i, // Private keys
  /\.p12$/i, // PKCS12 files
  /\.pfx$/i, // PFX certificates
  /credentials/i, // credentials.json, etc.
  /secrets?\.json$/i, // secrets.json, secret.json
  /\.npmrc$/i, // NPM auth tokens
  /\.netrc$/i, // Network credentials
  /id_rsa/i, // SSH keys
  /id_ed25519/i, // SSH keys
  /\.ssh\//i, // SSH directory
];

// Directories to ignore
const IGNORED_DIRS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  ".cache",
  "coverage",
  ".nyc_output",
  "__pycache__",
  ".pytest_cache",
  "venv",
  ".venv",
  "vendor",
  "target", // Rust
  ".gradle",
  ".idea",
  ".vscode",
];

// Glob pattern for VS Code's exclude
export const EXCLUDE_PATTERN = IGNORED_DIRS.map((d) => `**/${d}/**`).join(",");

export function isSensitivePath(filePath: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(filePath));
}

export function isIgnoredPath(filePath: string): boolean {
  const parts = filePath.split(/[/\\]/);
  return parts.some((part) => IGNORED_DIRS.includes(part));
}

export function filterEntries(
  entries: Array<{ name: string; type: "file" | "directory" }>,
): Array<{ name: string; type: "file" | "directory" }> {
  return entries.filter(({ name, type }) => {
    if (type === "directory" && IGNORED_DIRS.includes(name)) return false;
    if (type === "file" && isSensitivePath(name)) return false;
    return true;
  });
}
