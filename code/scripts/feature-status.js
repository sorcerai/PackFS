#!/usr/bin/env node

/**
 * Feature Status Tracker
 * Analyzes code and tests to determine feature implementation status
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const contextNetworkDir = join(rootDir, '..', 'context-network');

// Feature definitions
const features = [
  {
    name: 'Semantic File Operations',
    category: 'Core',
    files: ['src/semantic/interface.ts', 'src/semantic/memory-semantic-backend.ts', 'src/semantic/disk-semantic-backend.ts'],
    tests: ['tests/semantic/semantic-interface.test.ts'],
    exports: ['SemanticFileSystemInterface', 'FileAccessIntent', 'ContentUpdateIntent']
  },
  {
    name: 'Error Recovery Suggestions',
    category: 'Core',
    files: ['src/semantic/error-recovery.ts'],
    tests: ['tests/semantic/error-recovery.test.ts'],
    exports: ['ErrorRecoveryEngine', 'ErrorSuggestion']
  },
  {
    name: 'Logging System',
    category: 'Core',
    files: ['src/core/logger.ts'],
    tests: ['tests/core/logger.test.ts'],
    exports: ['Logger', 'LogLevel', 'ConsoleTransport', 'FileTransport']
  },
  {
    name: 'Mastra Integration',
    category: 'Integration',
    files: ['src/integrations/mastra.ts'],
    tests: ['tests/integrations/mastra.test.ts'],
    exports: ['createMastraSemanticToolSuite', 'createPackfsTools']
  },
  {
    name: 'LangChain.js Integration',
    category: 'Integration',
    files: ['src/integrations/langchain-js.ts'],
    tests: ['tests/integrations/langchain-js.test.ts'],
    exports: ['createLangChainSemanticFilesystemTool']
  },
  {
    name: 'LlamaIndex Integration',
    category: 'Integration',
    files: ['src/integrations/llamaindex-ts.ts'],
    tests: ['tests/integrations/llamaindex-ts.test.ts'],
    exports: ['createLlamaIndexSemanticFilesystemTool']
  },
  {
    name: 'Compression Strategies',
    category: 'Enhanced',
    files: ['src/compression/CompressionStrategy.ts', 'src/compression/BrotliStrategy.ts'],
    tests: ['tests/compression/BrotliStrategy.test.ts'],
    exports: ['CompressionStrategy', 'BrotliStrategy', 'LZ4Strategy', 'ZstdStrategy']
  },
  {
    name: 'Hybrid Storage',
    category: 'Enhanced',
    files: ['src/storage/HybridStorageStrategy.ts'],
    tests: [],
    exports: ['HybridStorageStrategy']
  }
];

async function checkFeatureStatus() {
  const results = [];
  
  for (const feature of features) {
    const status = {
      name: feature.name,
      category: feature.category,
      implementation: 0,
      tests: 0,
      exports: 0,
      overall: 'Not Started'
    };
    
    // Check implementation files
    let implementedFiles = 0;
    for (const file of feature.files) {
      const filePath = join(rootDir, file);
      if (await fs.access(filePath).then(() => true).catch(() => false)) {
        implementedFiles++;
      }
    }
    status.implementation = Math.round((implementedFiles / feature.files.length) * 100);
    
    // Check test files
    let testFiles = 0;
    for (const test of feature.tests) {
      const testPath = join(rootDir, test);
      if (await fs.access(testPath).then(() => true).catch(() => false)) {
        testFiles++;
      }
    }
    status.tests = feature.tests.length > 0 
      ? Math.round((testFiles / feature.tests.length) * 100)
      : 0;
    
    // Check exports
    const indexPath = join(rootDir, 'src/index.ts');
    const indexContent = await fs.readFile(indexPath, 'utf8');
    let exportedItems = 0;
    for (const exportName of feature.exports) {
      if (indexContent.includes(exportName)) {
        exportedItems++;
      }
    }
    status.exports = Math.round((exportedItems / feature.exports.length) * 100);
    
    // Calculate overall status
    const avgCompletion = (status.implementation + status.tests + status.exports) / 3;
    if (avgCompletion === 100) {
      status.overall = '✅ Complete';
    } else if (avgCompletion >= 80) {
      status.overall = '🔵 Stable';
    } else if (avgCompletion >= 50) {
      status.overall = '🟡 In Progress';
    } else if (avgCompletion > 0) {
      status.overall = '🟠 Started';
    } else {
      status.overall = '⭕ Not Started';
    }
    
    results.push(status);
  }
  
  return results;
}

async function generateReport() {
  console.log('📊 Analyzing feature implementation status...\n');
  
  const results = await checkFeatureStatus();
  
  // Generate markdown report
  let content = `# PackFS Feature Status Report

Generated: ${new Date().toISOString()}

## Summary

`;

  // Group by category
  const categories = {};
  for (const result of results) {
    if (!categories[result.category]) {
      categories[result.category] = [];
    }
    categories[result.category].push(result);
  }
  
  // Summary table
  content += `| Category | Complete | Stable | In Progress | Started | Not Started |
|----------|----------|--------|-------------|---------|-------------|
`;
  
  for (const [category, features] of Object.entries(categories)) {
    const counts = {
      '✅ Complete': 0,
      '🔵 Stable': 0,
      '🟡 In Progress': 0,
      '🟠 Started': 0,
      '⭕ Not Started': 0
    };
    
    for (const feature of features) {
      counts[feature.overall]++;
    }
    
    content += `| ${category} | ${counts['✅ Complete']} | ${counts['🔵 Stable']} | ${counts['🟡 In Progress']} | ${counts['🟠 Started']} | ${counts['⭕ Not Started']} |\n`;
  }
  
  content += `\n## Detailed Status\n\n`;
  
  for (const [category, features] of Object.entries(categories)) {
    content += `### ${category} Features\n\n`;
    content += `| Feature | Status | Implementation | Tests | Exports |\n`;
    content += `|---------|--------|----------------|-------|--------|\n`;
    
    for (const feature of features) {
      content += `| ${feature.name} | ${feature.overall} | ${feature.implementation}% | ${feature.tests}% | ${feature.exports}% |\n`;
    }
    content += '\n';
  }
  
  content += `## Status Legend

- ✅ **Complete**: 100% implementation, tests, and exports
- 🔵 **Stable**: ≥80% complete, production-ready
- 🟡 **In Progress**: ≥50% complete, usable but not finished
- 🟠 **Started**: <50% complete, early development
- ⭕ **Not Started**: No implementation found

## Next Steps

`;

  // Find features needing work
  const needsWork = results
    .filter(r => r.overall !== '✅ Complete')
    .sort((a, b) => {
      const avg = (f) => (f.implementation + f.tests + f.exports) / 3;
      return avg(b) - avg(a);
    });
  
  if (needsWork.length > 0) {
    content += `### Features Needing Attention\n\n`;
    for (const feature of needsWork.slice(0, 5)) {
      content += `1. **${feature.name}**\n`;
      if (feature.implementation < 100) content += `   - Complete implementation (${feature.implementation}% done)\n`;
      if (feature.tests < 100) content += `   - Add tests (${feature.tests}% done)\n`;
      if (feature.exports < 100) content += `   - Export from index.ts (${feature.exports}% done)\n`;
      content += '\n';
    }
  }
  
  // Save report
  await fs.mkdir(join(contextNetworkDir, 'reference', 'status'), { recursive: true });
  await fs.writeFile(join(contextNetworkDir, 'reference', 'status', 'features.md'), content);
  
  // Also output to console
  console.log('Feature Status Summary:');
  console.log('======================\n');
  
  for (const [category, features] of Object.entries(categories)) {
    console.log(`${category}:`);
    for (const feature of features) {
      console.log(`  ${feature.overall} ${feature.name}`);
    }
    console.log('');
  }
  
  console.log(`✅ Report saved to: ${join(contextNetworkDir, 'reference', 'status', 'features.md')}`);
}

generateReport().catch(console.error);