/**
 * Demonstrates PackFS error recovery suggestions
 * When file operations fail, PackFS provides intelligent suggestions
 */

import { createFileSystem } from '../src/index.js';

async function demonstrateErrorRecovery() {
  // Initialize filesystem
  const fs = createFileSystem({
    workingDirectory: process.cwd()
  });

  console.log('=== PackFS Error Recovery Demo ===\n');

  // Example 1: File not found with directory listing suggestion
  console.log('1. Attempting to read non-existent file...');
  const result1 = await fs.accessFile({
    purpose: 'read',
    target: { path: 'docs/api/overview.md' }
  });

  if (!result1.success) {
    console.log('\nError:', result1.message);
    
    if (result1.suggestions && result1.suggestions.length > 0) {
      console.log('\nPackFS Suggestions:');
      for (const suggestion of result1.suggestions) {
        console.log(`- ${suggestion.description}`);
        if (suggestion.type === 'directory_listing' && suggestion.data.files) {
          console.log(`  Files found: ${suggestion.data.files.map((f: any) => f.name || f).join(', ')}`);
        }
      }
    }
  }

  console.log('\n---\n');

  // Example 2: Empty search results with alternative suggestions
  console.log('2. Searching for non-existent content...');
  const result2 = await fs.discoverFiles({
    purpose: 'search_content',
    target: { semanticQuery: 'quantum computing blockchain AI' }
  });

  console.log(`Found ${result2.files.length} files`);
  
  if (result2.suggestions && result2.suggestions.length > 0) {
    console.log('\nPackFS Suggestions:');
    for (const suggestion of result2.suggestions) {
      console.log(`- ${suggestion.description}`);
      if (suggestion.data.broadTerms) {
        console.log(`  Try searching for: ${suggestion.data.broadTerms.join(', ')}`);
      }
    }
  }

  console.log('\n---\n');

  // Example 3: Similar filename suggestions
  console.log('3. Looking for a file with wrong extension...');
  const result3 = await fs.accessFile({
    purpose: 'read',
    target: { path: 'package.yml' }  // Should be package.json
  });

  if (!result3.success) {
    console.log('\nError:', result3.message?.split('\n')[0]);
    
    if (result3.suggestions && result3.suggestions.length > 0) {
      console.log('\nPackFS found these alternatives:');
      for (const suggestion of result3.suggestions) {
        if (suggestion.type === 'alternative_path' && suggestion.data.alternatives) {
          console.log(`- Try: ${suggestion.data.alternatives.join(' or ')}`);
        }
        if (suggestion.type === 'search_results' && suggestion.data.foundLocations) {
          console.log(`- Found '${suggestion.data.requestedFile}' in: ${suggestion.data.foundLocations.join(', ')}`);
        }
      }
    }
  }
}

// Run the demo
demonstrateErrorRecovery().catch(console.error);