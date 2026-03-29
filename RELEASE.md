# Release Process

### 1. Make Changes

```bash
# Make your code changes
git add .
git commit -m "Your commit message"
```

### 2. Bump Version

Choose the appropriate version bump:

```bash
npm version patch # or minor or major
```

### 3. Release

```bash
npm run release
```

### 4. Publish

```bash
vsce publish
```
