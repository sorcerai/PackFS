# Migration Guide: v0.1.8 to v0.1.15

## Overview

PackFS v0.1.15 introduces a semantic filesystem architecture while maintaining compatibility with traditional filesystem operations. The main changes involve how you initialize the filesystem.

## Breaking Changes

### 1. Initialization

**Before (v0.1.8):**
```typescript
import { PackFS } from 'packfs-core';
const fs = new PackFS('/root/path');
```

**After (v0.1.15):**
```typescript
import { createFileSystem } from 'packfs-core';
const fs = createFileSystem('/root/path');
```

### 2. Method Name Changes

The filesystem now uses standard POSIX-style method names:

| Old Method | New Method | Notes |
|------------|------------|-------|
| `deleteFile()` | `remove()` | Works for both files and directories |
| `listFiles()` | `readdir()` | Returns all entries (files and directories) |
| `createDirectory()` | `mkdir()` | Second parameter for recursive creation |
| `listDirectories()` | `readdir()` + filtering | Use `stat()` to check if entries are directories |

### 3. Advanced Initialization

If you need more control over the filesystem setup:

```typescript
import { 
  createEnhancedFileSystem,
  DiskSemanticBackend,
  DiskBackend,
  SecurityEngine
} from 'packfs-core';

// Create components manually
const security = new SecurityEngine({ rootPath: '/tmp/test' });
const diskBackend = new DiskBackend('/tmp/test', security);
const semanticBackend = new DiskSemanticBackend(diskBackend);
const fs = createEnhancedFileSystem(semanticBackend);
```

## New Features in v0.1.15

### Semantic Search
```typescript
const results = await fs.findFiles('config files', {
  searchType: 'semantic',
  maxResults: 10
});
```

### Natural Language Operations
```typescript
const result = await fs.executeNaturalLanguage(
  'find all JavaScript files modified in the last week'
);
```

### Enhanced File Reading
```typescript
const { content, metadata, chunks } = await fs.readFileEnhanced('large-file.txt', {
  chunkingStrategy: 'semantic'
});
```

## Common Patterns

### Listing Only Files
```typescript
// Old way
const files = await fs.listFiles('/path');

// New way
const entries = await fs.readdir('/path');
const files = [];
for (const entry of entries) {
  const stat = await fs.stat(`/path/${entry}`);
  if (stat.isFile) files.push(entry);
}
```

### Listing Only Directories
```typescript
// Old way
const dirs = await fs.listDirectories('/path');

// New way
const entries = await fs.readdir('/path');
const dirs = [];
for (const entry of entries) {
  const stat = await fs.stat(`/path/${entry}`);
  if (stat.isDirectory) dirs.push(entry);
}
```

## Error Handling

The new version provides more detailed error messages through the semantic backend:

```typescript
try {
  await fs.writeFile('file.txt', 'content');
} catch (error) {
  // Error messages now include semantic context
  console.error(error.message);
}
```

## Framework Integrations

Framework integrations have been updated to use the new initialization:

```typescript
// LangChain.js
import { createLangChainTools } from 'packfs-core/langchain';
const tools = createLangChainTools('/workspace');

// Mastra
import { createMastraTools } from 'packfs-core/mastra';
const { readFileTool, writeFileTool } = createMastraTools('/workspace');
```

## Troubleshooting

### "createEnhancedFileSystem is not a function"
Make sure you're importing from the main package:
```typescript
import { createFileSystem } from 'packfs-core';
// NOT from 'packfs-core/semantic'
```

### "this.semanticBackend.updateContent is not a function"
This happens when passing a string instead of a semantic backend to `createEnhancedFileSystem`. Use the `createFileSystem` helper instead:
```typescript
// Wrong
const fs = createEnhancedFileSystem('/path');

// Correct
const fs = createFileSystem('/path');
```

### Missing methods
The methods exist but with standard names. See the method mapping table above.

## Need Help?

- Check the [examples directory](./examples) for working code samples
- Review the [API documentation](./docs/api.md)
- File issues on GitHub if you encounter problems