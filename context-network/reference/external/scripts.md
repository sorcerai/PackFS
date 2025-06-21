# PackFS Scripts Reference

Generated: 2025-06-20T18:54:05.466Z

## Available NPM Scripts

### Build Scripts

#### npm run build
```bash
npm run clean && npm run build:cjs && npm run build:esm && npm run build:types
```
Build all outputs (ESM, CommonJS, and types)

#### npm run build:cjs
```bash
tsc -p tsconfig.cjs.json
```

#### npm run build:esm
```bash
tsc -p tsconfig.esm.json
```

#### npm run build:types
```bash
tsc -p tsconfig.types.json
```

#### npm run clean
```bash
rm -rf dist
```

### Test Scripts

#### npm run test
```bash
jest
```
Run all tests

#### npm run test:watch
```bash
jest --watch
```

#### npm run test:coverage
```bash
jest --coverage
```
Run tests with coverage report

### Quality Scripts

#### npm run lint
```bash
eslint src --ext .ts
```

#### npm run lint:fix
```bash
eslint src --ext .ts --fix
```

#### npm run format
```bash
prettier --write "src/**/*.ts"
```

#### npm run format:check
```bash
prettier --check "src/**/*.ts"
```

#### npm run typecheck
```bash
tsc --noEmit
```
Check TypeScript types without building

### Release Scripts

#### npm run release
```bash
node scripts/release.js patch
```
Create a patch release

#### npm run release:minor
```bash
node scripts/release.js minor
```

#### npm run release:major
```bash
node scripts/release.js major
```

#### npm run release:dry
```bash
node scripts/release.js patch --dry-run
```

#### npm run release:alpha
```bash
npm version prerelease --preid=alpha && npm publish --tag alpha
```

#### npm run release:beta
```bash
npm version prerelease --preid=beta && npm publish --tag beta
```

### Maintenance Scripts

#### npm run update-context
```bash
node scripts/update-context-network.js
```
Update context network reference docs

## Custom Scripts

### Update Context Network
```bash
npm run update-context
```
Updates all reference documentation in the context network.

### Extract External Docs
```bash
node scripts/extract-external-docs.js
```
Extracts type definitions and API documentation from dependencies.

## Development Workflow

1. **Before starting work:**
   ```bash
   npm run update-context
   ```

2. **During development:**
   ```bash
   npm run test:watch
   npm run typecheck
   ```

3. **Before committing:**
   ```bash
   npm run lint:fix
   npm run format
   npm test
   ```

4. **Creating a release:**
   ```bash
   npm run release:dry  # Test first
   npm run release      # Create release
   ```
