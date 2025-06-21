# PackFS File Tree

Generated: 2025-06-20T18:53:59.090Z

## Source Files (/src)

```
src
├── __tests__
│   ├── chunker.test.ts
│   ├── index.test.ts
│   └── security.test.ts
├── backends
│   ├── disk.ts
│   ├── index.ts
│   ├── memory.ts
│   └── types.ts
├── benchmarks
│   └── benchmark-scripts.ts
├── compression
│   ├── BrotliStrategy.ts
│   ├── COMPRESSION_PERFORMANCE.md
│   ├── CompressionEngine.ts
│   ├── CompressionStrategy.ts
│   ├── index.ts
│   ├── LZ4Strategy.ts
│   └── ZstdStrategy.ts
├── core
│   ├── filesystem.ts
│   ├── index.ts
│   ├── logger.ts
│   ├── path-validator.ts
│   ├── security.ts
│   └── types.ts
├── enhanced
│   ├── EnhancedPackFS.ts.skip
│   ├── index.ts
│   └── SimpleEnhancedPackFS.ts
├── integrations
│   ├── autogpt
│   │   ├── index.ts
│   │   ├── plugin.ts
│   │   └── types.ts
│   ├── crewai
│   │   ├── index.ts
│   │   ├── tool.ts
│   │   └── types.ts
│   ├── langchain
│   │   ├── index.ts
│   │   ├── tool.ts
│   │   └── types.ts
│   ├── mastra
│   │   ├── __tests__
│   │   │   ├── integration.disabled
│   │   │   │   └── mastra-tools.test.ts
│   │   │   └── unit
│   │   │       ├── mastra-tools-fix.test.ts
│   │   │       ├── packfs-v0.1.14-fixes.test.ts
│   │   │       ├── security-validator.test.ts
│   │   │       └── tool-factory.test.ts
│   │   ├── intents
│   │   │   └── index.ts
│   │   ├── schemas
│   │   │   └── index.ts
│   │   ├── security
│   │   │   ├── config.ts
│   │   │   └── validator.ts
│   │   ├── tools
│   │   ├── example.ts
│   │   ├── index.ts
│   │   ├── README.md
│   │   ├── README.test.md
│   │   └── types.ts
│   ├── semantic-kernel
│   ├── index.ts
│   ├── integrations.test.ts
│   ├── kaiban-js.ts
│   ├── langchain-js.ts
│   ├── llamaindex-ts.ts
│   ├── mastra.ts
│   └── types.ts
├── processors
│   ├── chunker.ts
│   ├── index.ts
│   ├── text.ts
│   └── types.ts
├── semantic
│   ├── compatibility-adapter.ts
│   ├── disk-semantic-backend-keywordmap.test.ts
│   ├── disk-semantic-backend.test.ts
│   ├── disk-semantic-backend.ts
│   ├── error-recovery.ts
│   ├── index.ts
│   ├── intent-processor.ts
│   ├── interface.ts
│   ├── memory-semantic-backend.ts
│   ├── semantic.test.ts
│   ├── SemanticSearchAPI.ts
│   └── types.ts
├── storage
│   ├── HybridStorageStrategy.ts
│   └── index.ts
├── index.ts
└── README.md
```

## Test Files (/tests)

```
tests
├── compression
│   ├── BrotliStrategy.test.ts
│   ├── compression-ratios.test.ts
│   ├── CompressionEngine.test.ts
│   ├── LZ4Strategy.test.ts
│   └── ZstdStrategy.test.ts
├── semantic
│   └── error-recovery.test.ts
├── logger-integration.test.ts
└── logger.test.ts
```

## Key Directories

### Core Components
- `/src/core/` - Core interfaces and utilities
- `/src/semantic/` - Semantic filesystem implementation
- `/src/backends/` - Storage backend implementations
- `/src/processors/` - Content processing utilities

### Integrations
- `/src/integrations/` - Framework adapters
- `/src/integrations/mastra/` - Mastra framework integration

### Enhanced Features (Experimental)
- `/src/compression/` - Compression strategies
- `/src/storage/` - Hybrid storage implementation
- `/src/enhanced/` - Enhanced filesystem features

### Configuration
- `/src/index.ts` - Main entry point and exports
- `/tsconfig.*.json` - TypeScript configurations
- `/package.json` - Package configuration
