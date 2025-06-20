/**
 * LLM Tool Integration Example for PackFS v0.1.15
 * Shows how to integrate PackFS as a tool for LLM agents
 */

import { createFileSystem } from 'packfs-core';

// Example tool definition for an LLM framework
const packfsTools = {
  name: 'filesystem',
  description: 'Manage files using natural language',
  
  async execute(query: string) {
    const fs = createFileSystem('/workspace');
    return await fs.executeNaturalLanguage(query);
  }
};

// Example: Claude/ChatGPT function calling
const fileSystemFunction = {
  name: 'manage_files',
  description: 'Perform file operations using natural language descriptions',
  parameters: {
    type: 'object',
    properties: {
      instruction: {
        type: 'string',
        description: 'Natural language description of the file operation to perform'
      }
    },
    required: ['instruction']
  },
  
  async function(args: { instruction: string }) {
    const fs = createFileSystem('/workspace');
    const result = await fs.executeNaturalLanguage(args.instruction);
    
    return {
      success: result.success,
      result: result.result,
      confidence: result.confidence,
      interpretation: result.interpretedIntent
    };
  }
};

// Example LLM conversation flow
async function conversationExample() {
  const fs = createFileSystem('/project');

  // User: "I need to organize my project files"
  // LLM: "I'll help you organize your project files. Let me analyze the structure..."
  
  const analysis = await fs.executeNaturalLanguage(
    "List all files and analyze the project structure"
  );

  // LLM: "I found the following structure... Would you like me to:"
  // "1. Group files by type (code, docs, config)"
  // "2. Create a standard project structure"
  // "3. Clean up temporary files"
  
  // User: "Create a standard project structure"
  
  const result = await fs.executeNaturalLanguage(
    "Create standard directories (src, docs, tests, config) and move files accordingly"
  );

  // LLM can explain what it did
  console.log("File organization complete:", result);
}

// Example: Multi-step file processing
async function complexWorkflowExample() {
  const fs = createFileSystem('/data-processing');

  // Step 1: Find all data files
  const dataFiles = await fs.executeNaturalLanguage(
    "Find all CSV and JSON data files"
  );

  // Step 2: Create processed directory
  await fs.executeNaturalLanguage(
    "Create a 'processed' directory if it doesn't exist"
  );

  // Step 3: Process each file (pseudo-code for processing)
  for (const file of dataFiles.result.files) {
    // Read file with semantic understanding
    const content = await fs.executeNaturalLanguage(
      `Read the data from ${file.path} and prepare it for processing`
    );

    // Process data (your logic here)
    const processed = processData(content.result);

    // Save processed result
    await fs.executeNaturalLanguage(
      `Save the processed data to processed/${file.path} with proper formatting`
    );
  }

  // Step 4: Generate summary
  await fs.executeNaturalLanguage(
    "Create a summary.md file listing all processed files with statistics"
  );
}

// Example: Content-aware file operations
async function contentAwareExample() {
  const fs = createFileSystem('/documents');

  // Smart file operations based on content
  await fs.executeNaturalLanguage(
    "Find all documents mentioning 'API' and create an API documentation folder with copies"
  );

  await fs.executeNaturalLanguage(
    "Identify configuration files and validate they have proper structure"
  );

  await fs.executeNaturalLanguage(
    "Find duplicate or similar files and suggest which ones to keep"
  );

  // Semantic file generation
  await fs.executeNaturalLanguage(
    "Create a project README based on the existing code structure and files"
  );
}

// Dummy function for the example
function processData(data: any): any {
  return { processed: true, ...data };
}

// Run examples
async function main() {
  console.log('=== LLM Tool Integration Examples ===\n');
  
  await conversationExample();
  await complexWorkflowExample();
  await contentAwareExample();
}

main().catch(console.error);