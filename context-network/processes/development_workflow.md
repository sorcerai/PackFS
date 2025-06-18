# Development Workflow

## Purpose
This document describes the development workflow for PackFS, including build processes, testing procedures, and contribution guidelines.

## Classification
- **Domain:** Processes
- **Stability:** Semi-stable
- **Abstraction:** Procedural
- **Confidence:** Established

## Content

### Development Environment Setup

#### Prerequisites
- Node.js 16+ (for ES2020 support)
- npm 7+ (for workspaces support)
- Git
- VSCode (recommended) or any TypeScript-capable IDE

#### Initial Setup
```bash
# Clone the repository
git clone <repository-url>
cd packfs

# Navigate to code directory
cd code

# Install dependencies
npm install

# Run initial build
npm run build

# Run tests to verify setup
npm test
```

### Build System

#### Build Architecture
The build system uses TypeScript compiler (tsc) with multiple configuration files to produce:
- **CommonJS modules** (`dist/cjs/`) - For Node.js require() compatibility
- **ES modules** (`dist/esm/`) - For modern import/export syntax
- **Type declarations** (`dist/types/`) - For TypeScript consumers

#### Build Commands
```bash
# Full build (clean + all targets)
npm run build

# Individual build targets
npm run build:cjs    # CommonJS build
npm run build:esm    # ES modules build
npm run build:types  # Type declarations only

# Clean build artifacts
npm run clean

# Type checking without building
npm run typecheck
```

#### Build Configuration
- **tsconfig.json**: Base configuration with strict settings
- **tsconfig.cjs.json**: CommonJS-specific settings
- **tsconfig.esm.json**: ESM-specific settings
- **tsconfig.types.json**: Type declaration generation

### Testing Workflow

#### Test Structure
```
src/__tests__/
├── index.test.ts      # Core export tests
├── security.test.ts   # Security engine tests
└── chunker.test.ts    # Semantic chunker tests
```

#### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- security.test.ts
```

#### Writing Tests
1. **Location**: Place tests in `src/__tests__/` directory
2. **Naming**: Use `*.test.ts` suffix
3. **Structure**: Use describe/test blocks
4. **Style**: Test public APIs, not implementation details

Example test:
```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    test('should handle normal case', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = component.method(input);
      
      // Assert
      expect(result).toBe('expected');
    });
    
    test('should handle edge case', () => {
      // Test edge cases and error conditions
    });
  });
});
```

### Code Quality

#### Linting
```bash
# Run ESLint
npm run lint

# Auto-fix lint issues
npm run lint:fix
```

#### Formatting
```bash
# Check formatting
npm run format:check

# Auto-format code
npm run format
```

#### Type Checking
```bash
# Type check without building
npm run typecheck
```

### Development Workflow

#### Feature Development
1. **Create feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Implement feature**
   - Write code following TypeScript best practices
   - Add/update tests for new functionality
   - Update types as needed

3. **Run quality checks**
   ```bash
   npm run typecheck
   npm test
   npm run lint
   ```

4. **Build and verify**
   ```bash
   npm run build
   ```

5. **Commit changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

#### Bug Fixes
1. **Create bug fix branch**
   ```bash
   git checkout -b fix/issue-description
   ```

2. **Write failing test** (TDD approach)
3. **Fix the bug**
4. **Verify fix passes test**
5. **Run full test suite**
6. **Commit with descriptive message**

### Import/Export Guidelines

#### Source Code Imports
- Use relative imports without `.js` extension
- Import types using `import type` syntax
- Group imports: external, internal, types

```typescript
// External imports
import { join } from 'path';

// Internal imports
import { SecurityEngine } from '../core/security';
import { MemoryBackend } from '../backends/memory';

// Type imports
import type { FileSystemOptions } from '../core/types';
```

#### Build Output
- CommonJS build removes `.js` extensions
- ESM build removes `.js` extensions
- Both work with Node.js module resolution

### Debugging

#### VSCode Configuration
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

#### Debug Commands
```bash
# Debug specific test
node --inspect-brk node_modules/.bin/jest --runInBand security.test.ts

# Debug build process
node --inspect-brk node_modules/.bin/tsc -p tsconfig.json
```

### Release Process

#### Version Bumping
```bash
# Patch release (0.1.0 -> 0.1.1)
npm version patch

# Minor release (0.1.0 -> 0.2.0)
npm version minor

# Major release (0.1.0 -> 1.0.0)
npm version major
```

#### Pre-release Checklist
1. [ ] All tests passing
2. [ ] No lint errors
3. [ ] Build successful
4. [ ] Documentation updated
5. [ ] CHANGELOG updated
6. [ ] Version bumped

#### Publishing
```bash
# Dry run (see what would be published)
npm publish --dry-run

# Publish to npm
npm publish
```

### Troubleshooting

#### Common Issues

**Build Errors**
- Check Node.js version (16+ required)
- Delete `node_modules` and reinstall
- Clear TypeScript cache: `rm -rf dist *.tsbuildinfo`

**Test Failures**
- Check for timing issues in async tests
- Verify test isolation (no shared state)
- Use `--runInBand` for debugging

**Import Errors**
- Ensure imports don't include `.js` in source
- Check `tsconfig.json` module resolution
- Verify `package.json` exports configuration

## Relationships
- **Parent Nodes:** [processes/creation.md]
- **Child Nodes:** None
- **Related Nodes:** 
  - [architecture/implementation_details.md] - implements - Technical details of the codebase
  - [decisions/adr_001_typescript_npm_package_setup_for_mastra_compatibility.md] - follows - Build setup decisions

## Navigation Guidance
- **Access Context:** Reference when setting up development environment or debugging build issues
- **Common Next Steps:** After setup, proceed to feature development or bug fixing
- **Related Tasks:** Environment setup, continuous integration, release management
- **Update Patterns:** Update when build tools or processes change

## Metadata
- **Created:** 2024-01-18
- **Last Updated:** 2024-01-18
- **Updated By:** Development team

## Change History
- 2024-01-18: Initial documentation of development workflow