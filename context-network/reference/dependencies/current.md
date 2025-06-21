# PackFS Dependencies

Generated: 2025-06-20T18:53:59.097Z

## Production Dependencies

### @mastra/core@0.10.6
Mastra framework for AI agent development

### @mongodb-js/zstd@^1.2.2
Zstandard compression for Node.js

### @yarnpkg/fslib@3.1.2
Advanced filesystem operations library

### @yarnpkg/libzip@3.2.1
ZIP file handling library

### lz4@^0.6.5
LZ4 compression algorithm implementation

### zod@3.25.67
TypeScript-first schema validation library

## Development Dependencies

### Testing
- @types/jest@^29.5.0
- jest@^29.5.0
- ts-jest@^29.1.0

### TypeScript
- @types/node@^20.0.0
- @typescript-eslint/eslint-plugin@^6.0.0
- @typescript-eslint/parser@^6.0.0
- typescript@^5.0.0

### Linting
- eslint@^8.50.0
- eslint-config-prettier@^9.0.0
- eslint-plugin-prettier@^5.0.0
- prettier@^3.0.0

### Other
- ts-node@^10.9.0

## Package Scripts

```json
{
  "build": "npm run clean && npm run build:cjs && npm run build:esm && npm run build:types",
  "build:cjs": "tsc -p tsconfig.cjs.json",
  "build:esm": "tsc -p tsconfig.esm.json",
  "build:types": "tsc -p tsconfig.types.json",
  "clean": "rm -rf dist",
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage",
  "lint": "eslint src --ext .ts",
  "lint:fix": "eslint src --ext .ts --fix",
  "format": "prettier --write \"src/**/*.ts\"",
  "format:check": "prettier --check \"src/**/*.ts\"",
  "typecheck": "tsc --noEmit",
  "prepare": "npm run build",
  "prepublishOnly": "npm run build",
  "release": "node scripts/release.js patch",
  "release:minor": "node scripts/release.js minor",
  "release:major": "node scripts/release.js major",
  "release:dry": "node scripts/release.js patch --dry-run",
  "release:skip-tests": "node scripts/release.js patch --skip-tests",
  "release:alpha": "npm version prerelease --preid=alpha && npm publish --tag alpha",
  "release:beta": "npm version prerelease --preid=beta && npm publish --tag beta",
  "release:safe": "node scripts/test-and-publish.js",
  "release:safe:dry": "node scripts/test-and-publish.js --dry-run",
  "update-context": "node scripts/update-context-network.js",
  "extract-docs": "node scripts/extract-external-docs.js",
  "maintenance": "npm run update-context && npm run extract-docs"
}
```
