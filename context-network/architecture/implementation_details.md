# Implementation Details

## Purpose
This document captures the technical implementation details of the PackFS system, including code structure, patterns used, and specific implementation decisions.

## Classification
- **Domain:** Architecture
- **Stability:** Dynamic
- **Abstraction:** Implementation
- **Confidence:** Established

## Content

### Project Structure

```
/workspace/code/
├── src/                          # Source code
│   ├── index.ts                  # Main entry point with all exports
│   ├── core/                     # Core interfaces and utilities
│   │   ├── index.ts             # Core exports
│   │   ├── types.ts             # Core type definitions
│   │   ├── filesystem.ts        # Abstract filesystem interface
│   │   ├── security.ts          # Security engine implementation
│   │   └── path-validator.ts    # Path validation utilities
│   ├── backends/                 # Storage backend implementations
│   │   ├── index.ts             # Backend exports
│   │   ├── types.ts             # Backend interfaces
│   │   ├── memory.ts            # In-memory backend
│   │   └── disk.ts              # Disk-based backend
│   ├── processors/               # Content processing utilities
│   │   ├── index.ts             # Processor exports
│   │   ├── types.ts             # Processor interfaces
│   │   ├── text.ts              # Text file processor
│   │   └── chunker.ts           # Semantic text chunker
│   ├── integrations/             # Framework integrations
│   │   ├── langchain/           # LangChain adapter
│   │   ├── autogpt/             # AutoGPT plugin
│   │   └── crewai/              # CrewAI tool
│   └── __tests__/               # Test files
├── dist/                         # Build output
│   ├── esm/                     # ES modules build
│   ├── cjs/                     # CommonJS build
│   └── types/                   # TypeScript declarations
├── package.json                  # NPM package configuration
├── tsconfig.json                # Base TypeScript config
├── tsconfig.esm.json            # ESM build config
├── tsconfig.cjs.json            # CommonJS build config
├── tsconfig.types.json          # Type declarations config
├── jest.config.js               # Jest test configuration
├── .eslintrc.json               # ESLint configuration
├── .prettierrc                  # Prettier configuration
├── .gitignore                   # Git ignore rules
├── README.md                    # Package documentation
└── LICENSE                      # MIT license

```

### TypeScript Configuration

#### Base Configuration (`tsconfig.json`)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "lib": ["ES2020"],
    "moduleResolution": "node",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

Key decisions:
- **ES2020 Target**: Modern JavaScript features while maintaining compatibility
- **Strict Mode**: Full TypeScript strict checking for maximum type safety
- **Source Maps**: Enable debugging of TypeScript code
- **Declaration Maps**: Better IDE support for consumers

### Module System

#### Dual Module Support
The package supports both ESM and CommonJS through separate builds:

1. **ESM Build** (`dist/esm/`):
   - Native ES modules
   - `.js` extension with `"type": "module"` in package.json
   - Tree-shakeable imports

2. **CommonJS Build** (`dist/cjs/`):
   - Traditional Node.js modules
   - `require()` compatible
   - Backward compatibility

3. **Type Declarations** (`dist/types/`):
   - Shared TypeScript declarations
   - Single source of truth for types

#### Export Configuration (`package.json`)
```json
{
  "exports": {
    ".": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js"
    },
    "./langchain": {
      "types": "./dist/types/integrations/langchain/index.d.ts",
      "import": "./dist/esm/integrations/langchain/index.js",
      "require": "./dist/cjs/integrations/langchain/index.js"
    }
  }
}
```

### Core Implementation Patterns

#### Abstract Base Class Pattern
```typescript
// FileSystem Interface uses abstract class instead of interface
// to provide both contract and potential shared functionality
export abstract class FileSystemInterface {
  abstract readFile(path: string, options?: ReadOptions): Promise<string | Buffer>;
  abstract writeFile(path: string, data: string | Buffer, options?: WriteOptions): Promise<void>;
  // ... other abstract methods
}
```

#### Configuration Object Pattern
```typescript
// All major classes use configuration objects for flexibility
export interface SecurityConfig {
  readonly sandboxPath?: string;
  readonly maxFileSize: number;
  readonly allowedExtensions: string[];
  readonly blockedPaths: string[];
  readonly validatePaths: boolean;
}

export class SecurityEngine {
  constructor(private readonly config: SecurityConfig) {}
}
```

#### Type-Safe Error Handling
```typescript
// Validation results include error details
export interface ValidationResult {
  readonly isValid: boolean;
  readonly error?: string;
  readonly normalizedPath?: string;
}
```

### Security Implementation

#### Path Validation Strategy
1. **Normalization**: Convert all paths to consistent format
2. **Traversal Detection**: Block `..` and `~` patterns
3. **Sandbox Enforcement**: Ensure paths stay within boundaries
4. **Blocklist Checking**: Prevent access to sensitive paths

#### Security Layers
```typescript
// Multiple validation layers
validateOperation(path: string, operation: 'read' | 'write' | 'delete'): boolean {
  // Layer 1: Blocked paths
  if (this.isBlockedPath(path)) return false;
  
  // Layer 2: Path format validation
  if (this.config.validatePaths && !this.isValidPath(path)) return false;
  
  // Layer 3: Extension checking (implicit in other methods)
  // Layer 4: Size validation (checked during write)
  
  return true;
}
```

### Backend Implementation Details

#### Memory Backend Storage
```typescript
// Simple Map-based storage with metadata
interface MemoryFile {
  data: Buffer;
  metadata: FileMetadata;
}

private files = new Map<string, MemoryFile>();
```

#### Disk Backend Safety
```typescript
// All paths are resolved relative to basePath
const fullPath = join(this.basePath, path);

// Directory creation is recursive by default
await fs.mkdir(dir, { recursive: true });
```

### Content Processing

#### Semantic Chunking Algorithm
1. **Paragraph-First**: Split by double newlines
2. **Sentence Fallback**: Split large paragraphs by sentences
3. **Word-Level Split**: Ultimate fallback for very long sentences
4. **Overlap Support**: Configurable overlap between chunks

```typescript
// Prevent infinite loops in edge cases
const nextStart = end - this.options.overlapSize;
start = Math.max(nextStart, start + 1); // Always progress
```

### Testing Strategy

#### Test Organization
- Unit tests for each component
- Integration tests for component interactions
- Separate test files mirror source structure
- Mock-free testing using MemoryBackend

#### Test Coverage Goals
- 70%+ coverage for all metrics
- Critical paths have 100% coverage
- Security features thoroughly tested
- Edge cases documented in tests

### Build System

#### NPM Scripts
```json
{
  "build": "npm run clean && npm run build:cjs && npm run build:esm && npm run build:types",
  "build:cjs": "tsc -p tsconfig.cjs.json",
  "build:esm": "tsc -p tsconfig.esm.json",
  "build:types": "tsc -p tsconfig.types.json",
  "test": "jest",
  "typecheck": "tsc --noEmit"
}
```

#### Build Pipeline
1. Clean previous builds
2. Build CommonJS (with .js imports removed)
3. Build ES Modules (with .js imports removed)
4. Generate type declarations
5. All outputs include source maps

### Performance Considerations

#### Memory Efficiency
- Backends use Buffer for binary data
- Streaming planned for large files
- Chunker processes text incrementally

#### Async Patterns
- All I/O operations are async
- No blocking operations
- Promise-based API throughout

### Framework Integration Patterns

#### Tool Definition Pattern
```typescript
// Consistent tool definition across frameworks
getToolDefinition() {
  return {
    name: this.config.toolName,
    description: this.config.description,
    parameters: {
      // Standardized parameter schema
    }
  };
}
```

#### Stub Implementation
Current integrations are stubs that:
1. Define the interface contract
2. Show the integration pattern
3. Return mock responses
4. Ready for full implementation

## Relationships
- **Parent Nodes:** [architecture/component_map.md] - details - Provides implementation details for components
- **Child Nodes:** None
- **Related Nodes:** 
  - [decisions/adr_001_typescript_npm_package_setup_for_mastra_compatibility.md] - implements - Implementation follows ADR decisions
  - [cross_cutting/api_design_guide.md] - follows - API design principles

## Navigation Guidance
- **Access Context:** Reference this document when implementing new features or understanding existing code
- **Common Next Steps:** Review specific component implementations or add new features
- **Related Tasks:** Feature development, debugging, performance optimization
- **Update Patterns:** Update when implementation patterns change or new patterns are established

## Metadata
- **Created:** 2024-01-18
- **Last Updated:** 2024-01-18
- **Updated By:** Implementation team

## Change History
- 2024-01-18: Initial documentation of implementation details