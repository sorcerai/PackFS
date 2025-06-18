# PackFS

Secure filesystem access for LLM agent frameworks.

## Overview

PackFS provides robust, secure filesystem operations designed specifically for LLM agent frameworks. It offers safety-first design with sandboxing, permission systems, and intelligent content processing for large files.

## Features

- 🔒 **Security First**: Path validation, sandboxing, and permission controls
- 📦 **Framework Integrations**: Pre-built adapters for LangChain, AutoGPT, CrewAI, and Semantic Kernel  
- 🧠 **Intelligent Processing**: Semantic chunking and content processing for large files
- 🔧 **Dual Module Support**: Both ESM and CommonJS exports
- 💾 **Multiple Backends**: Memory, disk, and extensible storage backends

## Installation

```bash
npm install @packfs/core
```

## Quick Start

### Basic Usage

```typescript
import { SecurityEngine, MemoryBackend } from '@packfs/core';

// Configure security
const security = new SecurityEngine({
  maxFileSize: 1024 * 1024, // 1MB
  allowedExtensions: ['txt', 'md', 'json'],
  blockedPaths: ['/etc', '/root'],
  validatePaths: true
});

// Use memory backend for testing
const backend = new MemoryBackend();
await backend.initialize();

// Write and read files
await backend.write('/test/file.txt', Buffer.from('Hello, PackFS!'));
const content = await backend.read('/test/file.txt');
console.log(content.toString()); // "Hello, PackFS!"
```

### Framework Integrations

#### LangChain

```typescript
import { PackFSLangChainTool } from '@packfs/core/langchain';

const tool = new PackFSLangChainTool({
  sandbox: '/safe/directory',
  maxFileSize: 1024 * 1024
});

const toolDef = tool.getToolDefinition();
// Use with LangChain agents
```

#### AutoGPT

```typescript
import { PackFSAutoGPTPlugin } from '@packfs/core/autogpt';

const plugin = new PackFSAutoGPTPlugin({
  sandbox: '/safe/directory'
});

const manifest = plugin.getManifest();
// Register with AutoGPT
```

#### CrewAI

```typescript
import { PackFSCrewAITool } from '@packfs/core/crewai';

const tool = new PackFSCrewAITool({
  sandbox: '/safe/directory'
});

const toolDef = tool.getToolDefinition();
// Use with CrewAI agents
```

### Content Processing

```typescript
import { SemanticChunker, TextProcessor } from '@packfs/core';

// Process large files with semantic chunking
const chunker = new SemanticChunker({
  maxChunkSize: 4000,
  overlapSize: 200
});

const largeText = "..."; // Large document content
const result = chunker.chunk(largeText);

console.log(`Split into ${result.metadata.chunkCount} chunks`);
console.log(`Average chunk size: ${result.metadata.avgChunkSize} characters`);
```

## API Reference

### Core Classes

- `FileSystemInterface` - Abstract base class for filesystem implementations
- `SecurityEngine` - Security validation and access control
- `PathValidator` - Path normalization and validation utilities

### Backends

- `MemoryBackend` - In-memory storage for testing and caching
- `DiskBackend` - Local filesystem storage with safety controls

### Processors

- `TextProcessor` - Basic text file processing
- `SemanticChunker` - Intelligent text chunking for large files

### Framework Integrations

- `PackFSLangChainTool` - LangChain tool adapter
- `PackFSAutoGPTPlugin` - AutoGPT plugin implementation  
- `PackFSCrewAITool` - CrewAI tool adapter

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

## Security Considerations

PackFS is designed with security as a primary concern:

- All file paths are validated and normalized
- Sandbox restrictions prevent access outside designated directories
- File size limits prevent memory exhaustion
- Extension allowlists control what file types can be accessed
- Path traversal attacks are prevented

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our GitHub repository.