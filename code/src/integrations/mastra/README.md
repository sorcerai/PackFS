# PackFS Mastra Integration

This directory contains the integration between PackFS and the Mastra framework, providing semantic filesystem capabilities to Mastra agents and applications.

## Overview

The Mastra integration provides a set of tools that can be used with Mastra agents to perform file operations with semantic understanding. These tools allow agents to:

- Read and access files using natural language or direct paths
- Write and modify files with intelligent content handling
- Search for files using semantic understanding
- Organize files (move, copy, create directories) with intuitive operations

## Installation

```bash
npm install packfs-core
```

## Quick Start

```typescript
import { createMastraSemanticToolSuite } from 'packfs-core/mastra';

// Initialize the PackFS tools
const packfsTools = createMastraSemanticToolSuite({
  workingDirectory: '/path/to/your/files',
});

// Use the tools
const result = await packfsTools.fileReader.execute({
  path: 'README.md',
  purpose: 'read',
});

if (result.success) {
  console.log('File content:', result.data.content);
} else {
  console.error('Error:', result.error);
}
```

## Available Tools

The integration provides four main tools:

### 1. fileReader

Read and access file content with semantic understanding.

```typescript
// Direct parameters
const result = await packfsTools.fileReader.execute({
  path: 'README.md',
  purpose: 'read',
});

// Context-wrapped parameters (Mastra style)
const result = await packfsTools.fileReader.execute({
  context: {
    purpose: 'read',
    target: { path: 'README.md' },
  },
});

// Natural language query
const result = await packfsTools.fileReader.execute({
  query: 'read the README file',
});
```

### 2. fileWriter

Create and modify files with intelligent content handling.

```typescript
// Create a new file
const result = await packfsTools.fileWriter.execute({
  path: 'notes.txt',
  content: 'This is a test note.',
  mode: 'create', // 'create', 'append', or 'overwrite'
});

// Append to an existing file
const result = await packfsTools.fileWriter.execute({
  path: 'log.txt',
  content: 'New log entry',
  mode: 'append',
});
```

### 3. fileSearcher

Find files using semantic search and natural language queries.

```typescript
// Pattern-based search
const result = await packfsTools.fileSearcher.execute({
  pattern: '*.ts', // Find all TypeScript files
});

// Content search
const result = await packfsTools.fileSearcher.execute({
  context: {
    purpose: 'search_content',
    target: {
      path: 'src',
      query: 'function createMastra',
    },
  },
});
```

### 4. fileOrganizer

Move, copy, and organize files intelligently.

```typescript
// Create a directory
const result = await packfsTools.fileOrganizer.execute({
  operation: 'create_directory',
  destination: 'backup',
});

// Copy a file
const result = await packfsTools.fileOrganizer.execute({
  operation: 'copy',
  source: 'config.json',
  destination: 'backup/config.json',
});

// List directory contents
const result = await packfsTools.fileOrganizer.execute({
  operation: 'list',
  path: 'backup',
});
```

## Advanced Configuration

The integration supports advanced configuration options:

```typescript
const packfsTools = createMastraSemanticToolSuite({
  // IMPORTANT: Always provide workingDirectory
  workingDirectory: '/path/to/your/files',

  // Security options
  security: {
    allowedPaths: ['/path/to/your/files'],
    allowedExtensions: ['.txt', '.md', '.json', '.js', '.ts'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },

  // Performance options
  performance: {
    enableCaching: true,
    maxResults: 100,
    timeoutMs: 5000,
  },

  // Mastra-specific options
  mastra: {
    autoRetry: true,
    maxRetries: 3,
    enableTracing: true,
    agentContext: {
      agentName: 'FileManager',
      taskId: 'file-organization-task',
    },
  },
});
```

## Error Handling

All tools return a consistent result structure:

```typescript
{
  success: boolean;       // Whether the operation succeeded
  data?: any;             // The operation result (if successful)
  error?: string;         // Error message (if failed)
  troubleshooting?: {     // Helpful troubleshooting information
    expectedFormat: string;
    example: string;
    suggestedFix?: string;
  };
  metadata?: {            // Additional information about the operation
    executionTime: number;
    filesAccessed: string[];
    operationType: string;
  };
}
```

## Common Issues and Solutions

### 1. Initialization Failures

If you encounter `Cannot read properties of undefined (reading 'accessFile')`, ensure you're providing the `workingDirectory` parameter, even when using a custom filesystem:

```typescript
// Correct initialization with custom filesystem
const packfsTools = createMastraSemanticToolSuite({
  filesystem: customFilesystem,
  workingDirectory: '/path/to/your/files', // Always include this
});
```

### 2. Parameter Validation Issues

If you encounter parameter validation errors, check that you're providing the required parameters for each operation:

- For `fileReader`: Always provide `path` or `target.path`
- For `fileWriter`: Always provide `path` or `target.path` and `content`
- For `fileOrganizer`: For operations like `move` and `copy`, provide both `source` and `destination`

### 3. File Organization Operations

For file organization operations, make sure you're using the correct operation type:

```typescript
// Create directory (doesn't need source)
const result = await packfsTools.fileOrganizer.execute({
  operation: 'create_directory',
  destination: 'new-folder',
});

// Copy operation (needs both source and destination)
const result = await packfsTools.fileOrganizer.execute({
  operation: 'copy',
  source: 'file.txt',
  destination: 'new-folder/file.txt',
});
```

## Examples

See the [example.ts](./example.ts) file for complete usage examples.

## License

MIT
