# PackFS - Filesystem Access for LLM Agent Frameworks

PackFS is an NPM package that provides robust, secure filesystem access specifically designed for LLM agent frameworks. It offers a comprehensive library of interface functions that consuming frameworks can wrap in tools, enabling intelligent file operations while maintaining safety and performance.

This project leverages a context network approach for documentation and knowledge management (more info at https://jwynia.github.io/context-networks/). The context network captures the complex design decisions, architectural patterns, and domain knowledge that underlies PackFS's development, ensuring maintainability and enabling effective collaboration between human developers and AI agents.

## Key Features

PackFS addresses the critical challenges identified in filesystem tool design for LLM agents:

- **Intelligent Content Management**: Semantic chunking, hierarchical summarization, and intelligent preview generation for files exceeding context windows
- **Robust Abstraction Layers**: Interface-driven design with composable backends enabling seamless switching between memory, disk, and cloud storage
- **Safety-First Design**: Path validation, permission systems, virtual filesystems, and comprehensive error handling designed specifically for LLM comprehension

## Getting Started

### Installation
```bash
npm install packfs
```

### Basic Usage
```typescript
import { PackFS } from 'packfs';

const fs = new PackFS({
  backend: 'disk',
  sandbox: './workspace',
  permissions: ['read', 'write']
});

// Intelligent file operations designed for LLM agents
const content = await fs.readWithContext('large-file.txt');
const preview = await fs.generatePreview('document.pdf');
const metadata = await fs.getEnhancedMetadata('data.json');
```

### Framework Integration
PackFS is designed to be wrapped by LLM agent frameworks:

```typescript
// Example: LangChain integration
import { PackFSToolkit } from 'packfs/langchain';

const toolkit = new PackFSToolkit({
  filesystem: fs,
  allowedOperations: ['read', 'write', 'list']
});
```

## Architecture

PackFS implements a three-layer architecture optimized for LLM agent interactions:

### Core Layer
- **FileSystem Interface**: Abstract filesystem operations with pluggable backends
- **Content Processors**: Semantic chunking, summarization, and preview generation
- **Security Engine**: Path validation, sandboxing, and permission management

### Integration Layer
- **Framework Adapters**: Pre-built integrations for LangChain, AutoGPT, CrewAI, and Semantic Kernel
- **Tool Wrappers**: Ready-to-use tool definitions for common agent frameworks
- **Error Handlers**: LLM-friendly error messages with recovery suggestions

### Backend Layer
- **Storage Backends**: Memory, disk, cloud storage with unified interface
- **Virtual Filesystems**: Safe testing and agent isolation environments
- **Caching System**: Three-tier caching for optimal performance

## Design Principles

PackFS is built on research-backed principles for LLM filesystem tools:

1. **Semantic Awareness**: Operations understand content meaning, not just file paths
2. **Context Window Optimization**: Intelligent content management for large files
3. **Safety First**: Multiple layers of protection against destructive operations
4. **Framework Agnostic**: Clean interfaces that work with any agent framework
5. **TypeScript Native**: Full type safety and excellent developer experience

## Documentation

Comprehensive documentation is available in the context network:
- **Architecture Decisions**: See `context-network/decisions/`
- **Component Documentation**: See `context-network/elements/`
- **Integration Guides**: See `context-network/processes/`
- **Research Foundation**: See `inbox/llm-filesystem-tools-report.md`

## Contributing

PackFS development follows a context network approach. Before contributing:

1. Review the context network documentation in `./context-network/`
2. Understand the design principles and architectural decisions
3. Follow the documented development processes
4. Update relevant context network nodes with your changes

## License

MIT License - see LICENSE file for details.
