# Getting Started with PackFS

This guide will help you get started with PackFS, focusing on proper initialization and common usage patterns.

## Installation

```bash
npm install packfs-core
```

## Important: Initialization Requirements

### ⚠️ The #1 Most Common Error

The most common error when using PackFS is:
```
"Filesystem is not initialized. Please provide a valid filesystem or workingDirectory."
```

This happens because **PackFS requires either a `workingDirectory` or `filesystem` parameter** when creating tools or filesystem instances.

## Basic Initialization Patterns

### 1. Direct Filesystem Creation (Simplest)

```typescript
import { createFileSystem } from 'packfs-core';

// Create a basic filesystem - workingDirectory is OPTIONAL here
const fs = createFileSystem({
  backend: 'disk',
  basePath: '/path/to/files' // Optional, defaults to current directory
});

// Use the filesystem
const content = await fs.readFile('README.md');
```

### 2. Semantic Filesystem (Recommended for AI/LLM Use)

```typescript
import { DiskSemanticBackend } from 'packfs-core';

// Create a semantic filesystem - path is REQUIRED here
const semanticFs = new DiskSemanticBackend('/absolute/path/to/project');
await semanticFs.initialize(); // Don't forget to initialize!

// Use with natural language
const result = await semanticFs.interpretNaturalLanguage({
  query: 'find all configuration files'
});
```

### 3. Mastra Integration (For Mastra Framework Users)

```typescript
import { createMastraSemanticFilesystemTool } from 'packfs-core';

// IMPORTANT: workingDirectory is REQUIRED for Mastra tools
const packfsTool = createMastraSemanticFilesystemTool({
  workingDirectory: '/path/to/your/project', // REQUIRED!
  // Alternative: provide a pre-initialized filesystem
  // filesystem: new DiskSemanticBackend('/path/to/project')
});

// Use with Mastra agents
const agent = new Agent({
  name: 'file-assistant',
  tools: { packfsTool }
});
```

## Common Initialization Patterns

### Using Current Directory

```typescript
import { createMastraSemanticFilesystemTool } from 'packfs-core';
import { resolve } from 'path';

const packfsTool = createMastraSemanticFilesystemTool({
  workingDirectory: process.cwd() // Use current working directory
});
```

### Using Project Root

```typescript
import { createMastraSemanticFilesystemTool } from 'packfs-core';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __dirname = dirname(fileURLToPath(import.meta.url));

const packfsTool = createMastraSemanticFilesystemTool({
  workingDirectory: join(__dirname, '..', '..') // Go up to project root
});
```

### With Security Configuration

```typescript
const packfsTool = createMastraSemanticFilesystemTool({
  workingDirectory: '/path/to/project',
  security: {
    maxFileSize: 5 * 1024 * 1024, // 5MB limit
    allowedExtensions: ['.md', '.txt', '.json', '.js', '.ts'],
    forbiddenPaths: ['node_modules', '.git', '.env', 'secrets']
  }
});
```

## Debugging Initialization Issues

If you encounter initialization errors:

1. **Check your path is absolute:**
   ```typescript
   // ❌ Wrong - relative path
   workingDirectory: './files'
   
   // ✅ Correct - absolute path
   workingDirectory: '/home/user/project/files'
   ```

2. **Ensure the directory exists:**
   ```typescript
   import { existsSync } from 'fs';
   
   const workDir = '/path/to/project';
   if (!existsSync(workDir)) {
     throw new Error(`Directory does not exist: ${workDir}`);
   }
   ```

3. **Use path resolution utilities:**
   ```typescript
   import { resolve } from 'path';
   
   // Convert relative to absolute
   workingDirectory: resolve('./files')
   ```

## Framework-Specific Guides

- [Mastra Integration Guide](../src/integrations/mastra/README.md)
- [LangChain Integration Guide](../src/integrations/langchain/README.md) 
- [AutoGPT Integration Guide](../src/integrations/autogpt/README.md)

## Next Steps

Once you have PackFS initialized properly:

1. Read the [API Documentation](./API.md) for detailed method references
2. Check out [Examples](../examples/) for common use cases
3. Learn about [Security Configuration](./SECURITY.md) for production use
4. Explore [Semantic Search Features](./SEMANTIC_SEARCH.md) for AI-powered file operations

## Need Help?

If you're still encountering issues:

1. Double-check that you're providing the required `workingDirectory` parameter
2. Ensure paths are absolute, not relative
3. Verify the directory exists and is accessible
4. Check the [Troubleshooting Guide](./TROUBLESHOOTING.md)
5. Open an issue on [GitHub](https://github.com/jwynia/PackFS/issues)