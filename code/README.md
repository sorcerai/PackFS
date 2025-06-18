# PackFS

Semantic filesystem operations for LLM agent frameworks with natural language understanding.

## Overview

PackFS is a TypeScript/Node.js library that provides intelligent filesystem operations through semantic understanding and natural language processing. Built specifically for LLM agent frameworks, it replaces traditional POSIX-style operations with intent-based semantic operations that understand what agents want to accomplish.

Inspired by the research in ["LLM-based Semantic File System for Large Codebases"](https://arxiv.org/html/2410.11843v5) and the [Python LSFS implementation](https://github.com/chenyushuo/LSFS), PackFS brings semantic filesystem capabilities to the TypeScript/Node.js ecosystem with a focus on agent framework integration.

## Features

- 🧠 **Semantic Operations**: Natural language file operations - "create a config file", "find all documentation", "organize by topic"
- 🤖 **LLM Agent Integration**: Native support for Mastra, LangChain.js, LlamaIndex.TS, and KaibanJS frameworks
- 📝 **Intent-Based Interface**: Replace traditional read/write with semantic operations like `accessFile`, `updateContent`, `discoverFiles`
- 🔍 **Intelligent Indexing**: Automatic keyword extraction and semantic file indexing for fast discovery
- 🔄 **Backward Compatibility**: Adapter pattern allows gradual migration from traditional filesystem operations
- 💾 **Multiple Backends**: Memory and persistent disk backends with semantic indexing
- 🔒 **Security Controls**: Path validation, sandboxing, and permission systems

## Installation

```bash
npm install @packfs/core
```

## Quick Start

### Semantic Operations

```typescript
import { MemorySemanticBackend } from '@packfs/core';

// Initialize semantic filesystem
const fs = new MemorySemanticBackend();

// Natural language file operations
const result = await fs.interpretNaturalLanguage({
  query: "create a config file with database settings",
  context: { workingDirectory: "/app" }
});

// Intent-based operations
const configResult = await fs.updateContent({
  purpose: 'create',
  target: { path: '/app/config.json' },
  content: JSON.stringify({ database: { host: 'localhost', port: 5432 } })
});

// Semantic file discovery
const docs = await fs.discoverFiles({
  purpose: 'search_semantic',
  target: { semanticQuery: 'documentation and readme files' }
});

console.log(`Found ${docs.files.length} documentation files`);
```

### Traditional Interface (Backward Compatible)

```typescript
import { DiskBackend, SecurityEngine } from '@packfs/core';

// Traditional POSIX-style operations still supported
const security = new SecurityEngine({
  maxFileSize: 1024 * 1024,
  allowedExtensions: ['txt', 'md', 'json'],
  allowedPaths: ['/safe/**']
});

const backend = new DiskBackend({ security });
const content = await backend.read('/safe/file.txt');
```

### Framework Integrations

#### Mastra (TypeScript-First AI Framework)

```typescript
import { createMastraSemanticFilesystemTool, MemorySemanticBackend } from '@packfs/core';

const filesystem = new MemorySemanticBackend();
const tool = createMastraSemanticFilesystemTool({
  filesystem,
  workingDirectory: '/project',
  mastra: {
    enableTracing: true,
    agentContext: { role: 'developer' }
  }
});

// Use with Mastra agents
const result = await tool.execute({
  naturalLanguageQuery: "create a README with project information"
});
```

#### LangChain.js

```typescript
import { createLangChainSemanticFilesystemTool } from '@packfs/core';

const tool = createLangChainSemanticFilesystemTool({
  filesystem: new MemorySemanticBackend(),
  workingDirectory: '/project',
  langchain: { verbose: true }
});

// LangChain DynamicTool compatible
const response = await tool.func("read the configuration file");
console.log(response); // File content as string
```

#### LlamaIndex.TS

```typescript
import { createLlamaIndexSemanticFilesystemTool } from '@packfs/core';

const tool = createLlamaIndexSemanticFilesystemTool({
  filesystem: new MemorySemanticBackend(),
  workingDirectory: '/project'
});

// LlamaIndex FunctionTool compatible
const result = await tool.call({
  action: 'search',
  searchTerm: 'API documentation'
});
```

#### KaibanJS (Multi-Agent Systems)

```typescript
import { createKaibanSemanticFilesystemTool } from '@packfs/core';

const tool = createKaibanSemanticFilesystemTool({
  filesystem: new MemorySemanticBackend(),
  workingDirectory: '/shared',
  kaiban: {
    agentId: 'file-manager',
    enableStatePersistence: true
  }
});

// Multi-agent collaboration
const result = await tool.handler({
  action: 'write',
  path: '/shared/team-notes.md',
  content: 'Team meeting notes',
  collaboration: {
    shareWith: ['agent-001', 'agent-002'],
    notifyAgents: true
  }
});
```

### Semantic File Discovery

```typescript
import { DiskSemanticBackend } from '@packfs/core';

// Persistent semantic indexing
const fs = new DiskSemanticBackend({ 
  rootPath: '/project',
  indexPath: '.packfs/semantic-index.json'
});

// Find files by semantic meaning
const configFiles = await fs.discoverFiles({
  purpose: 'search_semantic',
  target: { semanticQuery: 'configuration and settings' }
});

// Find files by content patterns
const apiDocs = await fs.discoverFiles({
  purpose: 'search_content',
  target: { pattern: 'API|endpoint|route' }
});

// Organize files by topic
const organized = await fs.organizeFiles({
  purpose: 'group_semantic',
  source: { path: '/project/docs' },
  destination: { path: '/project/organized' },
  options: { groupBy: 'topic' }
});
```

## API Reference

### Semantic Interface

- `SemanticFileSystemInterface` - Abstract base for semantic operations
- `MemorySemanticBackend` - In-memory semantic filesystem
- `DiskSemanticBackend` - Persistent semantic filesystem with indexing

### Semantic Operations

- `accessFile(intent)` - Read, preview, or verify file existence
- `updateContent(intent)` - Create, append, overwrite, or patch files
- `discoverFiles(intent)` - List, find, or search files semantically
- `organizeFiles(intent)` - Move, copy, or group files by semantic criteria
- `removeFiles(intent)` - Delete files or directories
- `interpretNaturalLanguage(query)` - Convert natural language to intents

### Traditional Interface (Backward Compatible)

- `FileSystemInterface` - Abstract base class for traditional operations
- `MemoryBackend` - In-memory storage
- `DiskBackend` - Local filesystem storage
- `SecurityEngine` - Security validation and access control

### Framework Integrations

- `createMastraSemanticFilesystemTool` - Mastra framework integration
- `createLangChainSemanticFilesystemTool` - LangChain.js integration
- `createLlamaIndexSemanticFilesystemTool` - LlamaIndex.TS integration
- `createKaibanSemanticFilesystemTool` - KaibanJS multi-agent integration

## Development

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Run tests
npm test

# Run linting
npm run lint

# Format code
npm run format
```

## Semantic Design Philosophy

PackFS is built around semantic understanding rather than traditional filesystem operations:

- **Intent-Based Operations**: Instead of `fs.readFile()`, use semantic operations like `accessFile({ purpose: 'read' })`
- **Natural Language Support**: Agents can use plain English - "create a config file" instead of complex API calls
- **Contextual Understanding**: Operations understand the semantic meaning of file content and organization
- **Framework Native**: Built specifically for LLM agent frameworks with their patterns and needs

Inspired by the [LSFS research paper](https://arxiv.org/html/2410.11843v5), PackFS implements the concept of semantic filesystem operations that better match how LLM agents think about and work with files.

## Security Considerations

While semantic operations are the primary focus, PackFS maintains strong security:

- Path validation and normalization prevent traversal attacks
- Configurable sandbox restrictions
- File size limits and extension controls
- Permission-based access control

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our GitHub repository.
