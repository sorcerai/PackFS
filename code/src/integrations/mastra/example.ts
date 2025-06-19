/**
 * Example usage of PackFS Mastra integration
 *
 * This file demonstrates the correct usage patterns for the PackFS Mastra integration,
 * including initialization, parameter handling, and error handling.
 */

import { createMastraSemanticToolSuite } from '../mastra.js';
import { DiskSemanticBackend } from '../../semantic/disk-semantic-backend.js';

/**
 * Example 1: Basic initialization with workingDirectory
 * This is the simplest way to initialize the PackFS Mastra tools
 */
async function basicInitializationExample() {
  console.log('Example 1: Basic initialization');

  // Initialize with just a working directory
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const packfsTools = createMastraSemanticToolSuite({
    workingDirectory: '/path/to/your/files',
  });

  // The tools are now ready to use
  console.log('Available tools:');
  console.log('- fileReader: Read and access file content');
  console.log('- fileWriter: Create and modify files');
  console.log('- fileSearcher: Find files using semantic search');
  console.log('- fileOrganizer: Move, copy, and organize files');
}

/**
 * Example 2: Reading files with different parameter formats
 * This demonstrates the flexibility in parameter handling
 */
async function readingFilesExample() {
  console.log('\nExample 2: Reading files');

  const packfsTools = createMastraSemanticToolSuite({
    workingDirectory: '/path/to/your/files',
  });

  // Method 1: Direct parameters (simplest)
  const result1 = await packfsTools.fileReader.execute({
    path: 'README.md',
    purpose: 'read',
  });

  if (result1.success) {
    console.log('File content:', result1.data.content.substring(0, 50) + '...');
  } else {
    console.error('Error reading file:', result1.error);
  }

  // Method 2: Context-wrapped parameters (compatible with Mastra's context pattern)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const result2 = await packfsTools.fileReader.execute({
    context: {
      purpose: 'read',
      target: { path: 'README.md' },
    },
  });

  // Method 3: Natural language query
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const result3 = await packfsTools.fileReader.execute({
    query: 'read the README file',
  });
}

/**
 * Example 3: Writing files
 */
async function writingFilesExample() {
  console.log('\nExample 3: Writing files');

  const packfsTools = createMastraSemanticToolSuite({
    workingDirectory: '/path/to/your/files',
  });

  // Method 1: Direct parameters
  const result1 = await packfsTools.fileWriter.execute({
    path: 'notes.txt',
    content: 'This is a test note.',
    mode: 'create', // 'create', 'append', or 'overwrite'
  });

  if (result1.success) {
    console.log('File created successfully');
  } else {
    console.error('Error creating file:', result1.error);
    if (result1.troubleshooting) {
      console.log('Troubleshooting:', result1.troubleshooting);
    }
  }

  // Method 2: Context-wrapped parameters
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const result2 = await packfsTools.fileWriter.execute({
    context: {
      purpose: 'create',
      target: { path: 'config.json' },
      content: JSON.stringify({ setting: 'value' }, null, 2),
    },
  });

  // Method 3: Natural language query
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const result3 = await packfsTools.fileWriter.execute({
    query: 'create a file called todo.txt with a list of tasks',
  });
}

/**
 * Example 4: Searching files
 */
async function searchingFilesExample() {
  console.log('\nExample 4: Searching files');

  const packfsTools = createMastraSemanticToolSuite({
    workingDirectory: '/path/to/your/files',
  });

  // Method 1: Pattern-based search
  const result1 = await packfsTools.fileSearcher.execute({
    pattern: '*.ts', // Find all TypeScript files
  });

  if (result1.success) {
    console.log('Found files:', result1.data.files.length);
    result1.data.files.slice(0, 3).forEach((file: { path: string }) => {
      console.log(`- ${file.path}`);
    });
  }

  // Method 2: Context-wrapped parameters
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const result2 = await packfsTools.fileSearcher.execute({
    context: {
      purpose: 'search_content',
      target: {
        path: 'src',
        query: 'function createMastra',
      },
    },
  });

  // Method 3: Natural language query
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const result3 = await packfsTools.fileSearcher.execute({
    query: 'find all configuration files',
  });
}

/**
 * Example 5: Organizing files
 */
async function organizingFilesExample() {
  console.log('\nExample 5: Organizing files');

  const packfsTools = createMastraSemanticToolSuite({
    workingDirectory: '/path/to/your/files',
  });

  // Create a directory
  const createDirResult = await packfsTools.fileOrganizer.execute({
    operation: 'create_directory',
    destination: 'backup',
  });

  if (createDirResult.success) {
    console.log('Directory created successfully');

    // Copy a file
    const copyResult = await packfsTools.fileOrganizer.execute({
      operation: 'copy',
      source: 'config.json',
      destination: 'backup/config.json',
    });

    if (copyResult.success) {
      console.log('File copied successfully');
    } else {
      console.error('Error copying file:', copyResult.error);
      if (copyResult.troubleshooting) {
        console.log('Troubleshooting:', copyResult.troubleshooting);
      }
    }
  }

  // List directory contents
  const listResult = await packfsTools.fileOrganizer.execute({
    operation: 'list',
    path: 'backup',
  });

  if (listResult.success) {
    console.log('Directory contents:', listResult.results.length, 'files');
  }

  // Method 2: Context-wrapped parameters
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const moveResult = await packfsTools.fileOrganizer.execute({
    context: {
      purpose: 'move',
      source: { path: 'temp.txt' },
      destination: { path: 'backup/temp.txt' },
    },
  });
}

/**
 * Example 6: Error handling
 */
async function errorHandlingExample() {
  console.log('\nExample 6: Error handling');

  const packfsTools = createMastraSemanticToolSuite({
    workingDirectory: '/path/to/your/files',
  });

  // Example of handling a missing path error
  const result = await packfsTools.fileReader.execute({
    purpose: 'read',
    // path intentionally omitted
  } as any);

  if (!result.success) {
    console.error('Error:', result.error);

    // PackFS provides helpful troubleshooting information
    if (result.troubleshooting) {
      console.log('Troubleshooting:');
      console.log('- Expected format:', result.troubleshooting.expectedFormat);
      console.log('- Example:', result.troubleshooting.example);
    }
  }
}

/**
 * Example 7: Advanced initialization with custom filesystem and security options
 */
async function advancedInitializationExample() {
  console.log('\nExample 7: Advanced initialization');

  // Create and initialize a custom semantic backend
  const semanticBackend = new DiskSemanticBackend('/path/to/your/files', {
    enableNaturalLanguage: true,
    semanticThreshold: 0.7,
    chunkingConfig: {
      maxChunkSize: 2048,
      overlapSize: 256,
    },
  });

  await semanticBackend.initialize();

  // Initialize with custom filesystem and security options
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const packfsTools = createMastraSemanticToolSuite({
    // IMPORTANT: Always provide workingDirectory even with custom filesystem
    workingDirectory: '/path/to/your/files',

    // Use the custom filesystem
    filesystem: semanticBackend,

    // Configure security options
    security: {
      allowedPaths: ['/path/to/your/files'],
      allowedExtensions: ['.txt', '.md', '.json', '.js', '.ts'],
      maxFileSize: 10 * 1024 * 1024, // 10MB
    },

    // Configure performance options
    performance: {
      enableCaching: true,
      maxResults: 100,
      timeoutMs: 5000,
    },

    // Mastra-specific options
    mastra: {
      autoRetry: true,
      maxRetries: 3,
      enableTracing: true,
      agentContext: {
        agentName: 'FileManager',
        taskId: 'file-organization-task',
      },
    },
  });

  console.log('Initialized with advanced options');
}

// Run all examples
async function runAllExamples() {
  await basicInitializationExample();
  await readingFilesExample();
  await writingFilesExample();
  await searchingFilesExample();
  await organizingFilesExample();
  await errorHandlingExample();
  await advancedInitializationExample();
}

// Uncomment to run examples
// runAllExamples().catch(console.error);

export {
  basicInitializationExample,
  readingFilesExample,
  writingFilesExample,
  searchingFilesExample,
  organizingFilesExample,
  errorHandlingExample,
  advancedInitializationExample,
  runAllExamples,
};
