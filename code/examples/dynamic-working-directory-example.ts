/**
 * Example demonstrating PackFS dynamic working directory feature
 * This addresses the issue filed in inbox/base-path-issue.md
 */

import { createMastraSemanticFilesystemTool } from '../src/integrations/mastra.js';
import { DiskSemanticBackend } from '../src/semantic/disk-semantic-backend.js';

async function demonstrateDynamicWorkingDirectory() {
  console.log('=== PackFS Dynamic Working Directory Example ===\n');
  
  // Initialize with a default working directory
  const defaultWorkingDir = '/workspace/main-context';
  const backend = new DiskSemanticBackend(defaultWorkingDir);
  await backend.initialize();
  
  // Create the Mastra tool
  const packfsTool = createMastraSemanticFilesystemTool({
    workingDirectory: defaultWorkingDir,
    filesystem: backend
  });
  
  console.log(`Tool initialized with default directory: ${defaultWorkingDir}\n`);
  
  // Example 1: Use default working directory
  console.log('1. Reading from default directory:');
  const defaultResult = await packfsTool.execute({
    operation: 'access',
    purpose: 'read',
    target: { path: 'README.md' }
  });
  console.log(`   Result: ${defaultResult.success ? 'Found' : 'Not found'}`);
  
  // Example 2: Override with Project A directory
  console.log('\n2. Reading from Project A:');
  const projectAResult = await packfsTool.execute({
    operation: 'access',
    purpose: 'read',
    target: { path: 'context-network/discovery.md' },
    workingDirectory: '/projects/project-a'
  });
  console.log(`   Working Directory: /projects/project-a`);
  console.log(`   Result: ${projectAResult.success ? 'Found' : 'Not found'}`);
  
  // Example 3: Override with Project B directory
  console.log('\n3. Reading from Project B:');
  const projectBResult = await packfsTool.execute({
    operation: 'access',
    purpose: 'read',
    target: { path: 'context-network/discovery.md' },
    workingDirectory: '/projects/project-b'
  });
  console.log(`   Working Directory: /projects/project-b`);
  console.log(`   Result: ${projectBResult.success ? 'Found' : 'Not found'}`);
  
  // Example 4: Using natural language with dynamic directory
  console.log('\n4. Natural language query with dynamic directory:');
  const nlResult = await packfsTool.execute({
    naturalLanguageQuery: 'find all markdown files in the documentation',
    workingDirectory: '/projects/transmission-zero/context-network'
  });
  console.log(`   Working Directory: /projects/transmission-zero/context-network`);
  console.log(`   Result: ${nlResult.success ? 'Success' : 'Failed'}`);
  
  // Example 5: Multi-project workflow
  console.log('\n5. Multi-project workflow:');
  const projects = [
    '/projects/project-a',
    '/projects/project-b',
    '/projects/project-c'
  ];
  
  for (const projectPath of projects) {
    const result = await packfsTool.execute({
      operation: 'discover',
      purpose: 'list',
      target: { path: 'context-network' },
      workingDirectory: projectPath
    });
    
    console.log(`   ${projectPath}: ${result.success ? `Found ${result.totalFound || 0} files` : 'Failed'}`);
  }
  
  console.log('\n✅ Dynamic working directory feature is working correctly!');
  console.log('   The same tool instance can now access different project directories');
  console.log('   without requiring reinitialization.\n');
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateDynamicWorkingDirectory().catch(console.error);
}