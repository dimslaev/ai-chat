# Release Process

## Quick Release Workflow

### 1. Make Changes
```bash
# Make your code changes
git add .
git commit -m "Your commit message"
```

### 2. Bump Version

Choose the appropriate version bump:

**Patch** (0.0.1 → 0.0.2) - Bug fixes
```bash
npm run version:patch
```

**Minor** (0.0.1 → 0.1.0) - New features
```bash
npm run version:minor
```

**Major** (0.0.1 → 1.0.0) - Breaking changes
```bash
npm run version:major
```

This will automatically:
- Update version in package.json
- Create a git commit
- Create a git tag
- Build and package the extension

### 3. Release
```bash
npm run release
```

This pushes commits and tags to GitHub.

### 4. Test Locally (Optional)
```bash
npm run install:local
```

## Publishing to VS Code Marketplace

### First Time Setup

1. Create Azure DevOps account at https://dev.azure.com
2. Create a Personal Access Token (PAT):
   - Click User Settings → Personal Access Tokens
   - New Token → Name it "vscode-marketplace"
   - Organization: All accessible organizations
   - Scopes: Custom → Marketplace (Manage)
   - Copy the token (you won't see it again)

3. Login with vsce:
```bash
npm install -g @vscode/vsce
vsce login dimslaev
```

### Publishing

After releasing a new version:
```bash
vsce publish
```

Or publish without a separate release:
```bash
vsce publish patch  # or minor, major
```

## Distribution Options

### 1. VS Code Marketplace
Users install via:
```
code --install-extension dimslaev.ai-chat
```

### 2. GitHub Releases
1. Go to https://github.com/dimslaev/ai-chat/releases
2. Create new release with the tag
3. Upload the `.vsix` file
4. Users download and install:
```bash
code --install-extension ai-chat-x.x.x.vsix
```

### 3. Direct Distribution
Share the `.vsix` file directly and users run:
```bash
code --install-extension path/to/ai-chat-x.x.x.vsix
```

## Version Guidelines

- **Patch** (x.x.1): Bug fixes, documentation updates
- **Minor** (x.1.x): New features, backwards compatible
- **Major** (1.x.x): Breaking changes, major rewrites
