#!/usr/bin/env node

/**
 * Context Network Maintenance Scripts
 * Automatically updates reference documentation in the context network
 */

import { promises as fs } from 'fs';
import { join, dirname, relative, extname } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const contextNetworkDir = join(rootDir, '..', 'context-network');

// Ensure context network directories exist
async function ensureDirectories() {
  const dirs = [
    join(contextNetworkDir, 'reference'),
    join(contextNetworkDir, 'reference', 'api'),
    join(contextNetworkDir, 'reference', 'filetree'),
    join(contextNetworkDir, 'reference', 'tests'),
    join(contextNetworkDir, 'reference', 'dependencies'),
  ];
  
  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }
}

// Generate file tree listing
async function updateFileTree() {
  console.log('📁 Updating file tree...');
  
  const ignoreDirs = new Set([
    'node_modules', '.git', 'dist', 'coverage', '.next', '.nuxt', 
    'build', '.cache', '.turbo', '.DS_Store'
  ]);
  
  async function scanDirectory(dir, prefix = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const lines = [];
    
    const sortedEntries = entries
      .filter(entry => !ignoreDirs.has(entry.name) && !entry.name.startsWith('.'))
      .sort((a, b) => {
        // Directories first, then files
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });
    
    for (let i = 0; i < sortedEntries.length; i++) {
      const entry = sortedEntries[i];
      const isLast = i === sortedEntries.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const extension = isLast ? '    ' : '│   ';
      
      lines.push(`${prefix}${connector}${entry.name}`);
      
      if (entry.isDirectory() && entry.name !== 'node_modules') {
        const subDir = join(dir, entry.name);
        const subLines = await scanDirectory(subDir, prefix + extension);
        lines.push(...subLines);
      }
    }
    
    return lines;
  }
  
  const srcTree = await scanDirectory(join(rootDir, 'src'));
  const testTree = await scanDirectory(join(rootDir, 'tests'));
  
  const content = `# PackFS File Tree

Generated: ${new Date().toISOString()}

## Source Files (/src)

\`\`\`
src
${srcTree.join('\n')}
\`\`\`

## Test Files (/tests)

\`\`\`
tests
${testTree.join('\n')}
\`\`\`

## Key Directories

### Core Components
- \`/src/core/\` - Core interfaces and utilities
- \`/src/semantic/\` - Semantic filesystem implementation
- \`/src/backends/\` - Storage backend implementations
- \`/src/processors/\` - Content processing utilities

### Integrations
- \`/src/integrations/\` - Framework adapters
- \`/src/integrations/mastra/\` - Mastra framework integration

### Enhanced Features (Experimental)
- \`/src/compression/\` - Compression strategies
- \`/src/storage/\` - Hybrid storage implementation
- \`/src/enhanced/\` - Enhanced filesystem features

### Configuration
- \`/src/index.ts\` - Main entry point and exports
- \`/tsconfig.*.json\` - TypeScript configurations
- \`/package.json\` - Package configuration
`;

  await fs.writeFile(join(contextNetworkDir, 'reference', 'filetree', 'current.md'), content);
}

// Generate test listing
async function updateTestList() {
  console.log('🧪 Updating test list...');
  
  async function findTests(dir, basePath = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const tests = [];
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relativePath = join(basePath, entry.name);
      
      if (entry.isDirectory() && entry.name !== 'node_modules') {
        const subTests = await findTests(fullPath, relativePath);
        tests.push(...subTests);
      } else if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.js')) {
        const content = await fs.readFile(fullPath, 'utf8');
        const testCases = [];
        
        // Extract test descriptions
        const describeMatches = content.matchAll(/describe\(['"`](.*?)['"`]/g);
        const itMatches = content.matchAll(/it\(['"`](.*?)['"`]/g);
        
        for (const match of describeMatches) {
          testCases.push({ type: 'suite', name: match[1] });
        }
        
        for (const match of itMatches) {
          testCases.push({ type: 'test', name: match[1] });
        }
        
        tests.push({
          file: relativePath,
          cases: testCases
        });
      }
    }
    
    return tests;
  }
  
  const allTests = await findTests(join(rootDir, 'tests'));
  
  // Group by category
  const categories = {
    semantic: [],
    integrations: [],
    core: [],
    processors: [],
    other: []
  };
  
  for (const test of allTests) {
    if (test.file.includes('semantic/')) categories.semantic.push(test);
    else if (test.file.includes('integrations/')) categories.integrations.push(test);
    else if (test.file.includes('core/')) categories.core.push(test);
    else if (test.file.includes('processors/')) categories.processors.push(test);
    else categories.other.push(test);
  }
  
  let content = `# PackFS Test Reference

Generated: ${new Date().toISOString()}

## Test Statistics
- Total test files: ${allTests.length}
- Total test suites: ${allTests.reduce((sum, t) => sum + t.cases.filter(c => c.type === 'suite').length, 0)}
- Total test cases: ${allTests.reduce((sum, t) => sum + t.cases.filter(c => c.type === 'test').length, 0)}

## Test Files by Category
`;

  // Format each category
  for (const [category, tests] of Object.entries(categories)) {
    if (tests.length === 0) continue;
    
    content += `\n### ${category.charAt(0).toUpperCase() + category.slice(1)} Tests\n\n`;
    
    for (const test of tests) {
      content += `#### ${test.file}\n`;
      
      const suites = test.cases.filter(c => c.type === 'suite');
      const cases = test.cases.filter(c => c.type === 'test');
      
      if (suites.length > 0) {
        content += `**Test Suites:**\n`;
        for (const suite of suites) {
          content += `- ${suite.name}\n`;
        }
      }
      
      if (cases.length > 0) {
        content += `\n**Test Cases:**\n`;
        for (const testCase of cases) {
          content += `- ${testCase.name}\n`;
        }
      }
      
      content += '\n';
    }
  }
  
  content += `
## Running Tests

### All tests
\`\`\`bash
npm test
\`\`\`

### Specific test file
\`\`\`bash
npm test -- tests/semantic/error-recovery.test.ts
\`\`\`

### With coverage
\`\`\`bash
npm test -- --coverage
\`\`\`

### Watch mode
\`\`\`bash
npm test -- --watch
\`\`\`
`;

  await fs.writeFile(join(contextNetworkDir, 'reference', 'tests', 'all-tests.md'), content);
}

// Extract API from TypeScript files
async function updateAPIReference() {
  console.log('📚 Updating API reference...');
  
  // Extract exports from main index.ts
  const indexContent = await fs.readFile(join(rootDir, 'src', 'index.ts'), 'utf8');
  const exports = [];
  
  // Match export statements
  const exportMatches = indexContent.matchAll(/export\s+{([^}]+)}\s+from\s+['"`](.*?)['"`]/g);
  
  for (const match of exportMatches) {
    const items = match[1].split(',').map(item => item.trim());
    const source = match[2];
    exports.push({ items, source });
  }
  
  // Also get direct exports
  const directExportMatches = indexContent.matchAll(/export\s+(const|function|class|interface|type)\s+(\w+)/g);
  for (const match of directExportMatches) {
    exports.push({ items: [match[2]], source: 'index.ts', type: match[1] });
  }
  
  let content = `# PackFS API Reference

Generated: ${new Date().toISOString()}

## Main Exports

The following items are exported from \`packfs-core\`:

`;

  // Group exports by category
  const categories = {
    'Semantic Operations': [],
    'Backends': [],
    'Integrations': [],
    'Types': [],
    'Utilities': [],
    'Other': []
  };
  
  for (const exp of exports) {
    for (const item of exp.items) {
      let category = 'Other';
      
      if (item.includes('Semantic') || item.includes('Intent') || item.includes('Result')) {
        category = 'Semantic Operations';
      } else if (item.includes('Backend')) {
        category = 'Backends';
      } else if (item.includes('create') && item.includes('Tool')) {
        category = 'Integrations';
      } else if (item.includes('Config') || item.includes('Options') || /^[A-Z]/.test(item) && !item.includes('create')) {
        category = 'Types';
      } else if (item.includes('create') || item.includes('Processor')) {
        category = 'Utilities';
      }
      
      categories[category].push({ name: item, source: exp.source });
    }
  }
  
  for (const [category, items] of Object.entries(categories)) {
    if (items.length === 0) continue;
    
    content += `\n### ${category}\n\n`;
    for (const item of items) {
      content += `- \`${item.name}\` - from ${item.source}\n`;
    }
  }
  
  content += `
## Usage Examples

### Basic Filesystem Creation
\`\`\`typescript
import { createFileSystem } from 'packfs-core';

const fs = createFileSystem({
  workingDirectory: '/path/to/project'
});
\`\`\`

### Framework Integration
\`\`\`typescript
import { createMastraSemanticToolSuite } from 'packfs-core';

const tools = createMastraSemanticToolSuite({
  workingDirectory: '/path/to/project'
});
\`\`\`

### Direct Backend Usage
\`\`\`typescript
import { DiskSemanticBackend, MemorySemanticBackend } from 'packfs-core';

const diskFs = new DiskSemanticBackend('/path/to/project');
const memFs = new MemorySemanticBackend();
\`\`\`
`;

  await fs.writeFile(join(contextNetworkDir, 'reference', 'api', 'exports.md'), content);
}

// Update dependency information
async function updateDependencies() {
  console.log('📦 Updating dependency reference...');
  
  const packageJson = JSON.parse(await fs.readFile(join(rootDir, 'package.json'), 'utf8'));
  
  let content = `# PackFS Dependencies

Generated: ${new Date().toISOString()}

## Production Dependencies

`;

  if (packageJson.dependencies) {
    const deps = Object.entries(packageJson.dependencies);
    for (const [name, version] of deps) {
      content += `### ${name}@${version}\n`;
      
      // Add known descriptions
      const descriptions = {
        '@mastra/core': 'Mastra framework for AI agent development',
        'zod': 'TypeScript-first schema validation library',
        '@mongodb-js/zstd': 'Zstandard compression for Node.js',
        'lz4': 'LZ4 compression algorithm implementation',
        '@yarnpkg/fslib': 'Advanced filesystem operations library',
        '@yarnpkg/libzip': 'ZIP file handling library'
      };
      
      if (descriptions[name]) {
        content += `${descriptions[name]}\n`;
      }
      content += '\n';
    }
  }
  
  content += `## Development Dependencies

`;

  if (packageJson.devDependencies) {
    const devDeps = Object.entries(packageJson.devDependencies);
    const categories = {
      'Testing': [],
      'TypeScript': [],
      'Linting': [],
      'Other': []
    };
    
    for (const [name, version] of devDeps) {
      if (name.includes('jest') || name.includes('test')) {
        categories.Testing.push({ name, version });
      } else if (name.includes('typescript') || name.includes('@types')) {
        categories.TypeScript.push({ name, version });
      } else if (name.includes('eslint') || name.includes('prettier')) {
        categories.Linting.push({ name, version });
      } else {
        categories.Other.push({ name, version });
      }
    }
    
    for (const [category, deps] of Object.entries(categories)) {
      if (deps.length === 0) continue;
      
      content += `### ${category}\n`;
      for (const dep of deps) {
        content += `- ${dep.name}@${dep.version}\n`;
      }
      content += '\n';
    }
  }
  
  content += `## Package Scripts

\`\`\`json
${JSON.stringify(packageJson.scripts, null, 2)}
\`\`\`
`;

  await fs.writeFile(join(contextNetworkDir, 'reference', 'dependencies', 'current.md'), content);
}

// Main update function
async function updateAll() {
  console.log('🔄 Updating context network reference documentation...\n');
  
  await ensureDirectories();
  
  await updateFileTree();
  await updateTestList();
  await updateAPIReference();
  await updateDependencies();
  
  // Create index for reference section
  const indexContent = `# Reference Documentation

This directory contains automatically generated reference documentation.
Run \`npm run update-context\` to regenerate these files.

## Available References

### 📁 [File Tree](./filetree/current.md)
Complete source and test file structure

### 🧪 [Test List](./tests/all-tests.md)
All test files with their test cases

### 📚 [API Reference](./api/exports.md)
Exported functions, types, and interfaces

### 📦 [Dependencies](./dependencies/current.md)
Current dependencies and versions

## Maintenance

These files are generated by \`/scripts/update-context-network.js\`.

To update all reference documentation:
\`\`\`bash
npm run update-context
\`\`\`

To update specific sections:
\`\`\`bash
node scripts/update-context-network.js --filetree
node scripts/update-context-network.js --tests
node scripts/update-context-network.js --api
node scripts/update-context-network.js --deps
\`\`\`

Last updated: ${new Date().toISOString()}
`;

  await fs.writeFile(join(contextNetworkDir, 'reference', 'index.md'), indexContent);
  
  console.log('\n✅ Context network reference documentation updated!');
  console.log(`📍 Location: ${relative(process.cwd(), join(contextNetworkDir, 'reference'))}`);
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  updateAll().catch(console.error);
} else {
  // Run specific updates based on flags
  (async () => {
    await ensureDirectories();
    
    if (args.includes('--filetree')) await updateFileTree();
    if (args.includes('--tests')) await updateTestList();
    if (args.includes('--api')) await updateAPIReference();
    if (args.includes('--deps')) await updateDependencies();
  })().catch(console.error);
}