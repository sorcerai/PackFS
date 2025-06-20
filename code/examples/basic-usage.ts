/**
 * Legacy POSIX API usage example for PackFS v0.1.15
 * Shows traditional filesystem operations for backward compatibility
 * 
 * Note: For LLM/AI applications, see semantic-usage.ts for the primary API
 */

import { createFileSystem } from 'packfs-core';

async function main() {
  // Simple one-line initialization
  const fs = createFileSystem('/tmp/packfs-test');

  // Now you can use standard filesystem operations:
  
  // Write a file
  await fs.writeFile('test.txt', 'Hello, PackFS!');
  
  // Read a file
  const content = await fs.readFile('test.txt');
  console.log('File content:', content);
  
  // List directory contents
  const files = await fs.readdir('.');
  console.log('Files:', files);
  
  // Create a directory
  await fs.mkdir('mydir', true);
  
  // Delete a file
  await fs.remove('test.txt');
  
  // Check if file exists
  const exists = await fs.exists('test.txt');
  console.log('File exists:', exists);

  // Use enhanced semantic features
  const searchResults = await fs.findFiles('Hello', {
    searchType: 'content',
    maxResults: 10
  });
  console.log('Search results:', searchResults);
}

main().catch(console.error);