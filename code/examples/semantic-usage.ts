/**
 * Semantic API usage example for PackFS v0.1.15
 * Shows how to use the natural language and semantic features designed for LLMs
 */

import { createFileSystem } from 'packfs-core';

async function main() {
  const fs = createFileSystem('/tmp/packfs-test');

  // Natural Language Operations - The primary interface for LLMs
  console.log('=== Natural Language File Operations ===\n');

  // Create files using natural language
  await fs.executeNaturalLanguage(
    "Create a new file called config.json with some default settings"
  );

  await fs.executeNaturalLanguage(
    "Make a README.md file that explains this is a test project"
  );

  // Search for files semantically
  const searchResult = await fs.executeNaturalLanguage(
    "Find all configuration files"
  );
  console.log('Config files found:', searchResult);

  // Organize files using natural language
  await fs.executeNaturalLanguage(
    "Create a docs folder and move all markdown files into it"
  );

  // Complex operations
  await fs.executeNaturalLanguage(
    "Find all JSON files modified today and create a backup folder with copies"
  );

  // Semantic Search Features
  console.log('\n=== Semantic Search ===\n');

  // Search by meaning, not just keywords
  const results = await fs.findFiles('configuration settings', {
    searchType: 'semantic',
    maxResults: 5,
    includeContent: true
  });

  console.log('Semantic search results:', results);

  // Content-based search
  const contentResults = await fs.findFiles('default settings', {
    searchType: 'content',
    maxResults: 10
  });

  // Enhanced Reading with Semantic Chunking
  console.log('\n=== Semantic File Processing ===\n');

  // Read large files with intelligent chunking
  const enhanced = await fs.readFileEnhanced('large-document.md', {
    purpose: 'preview',
    chunkingStrategy: 'semantic'
  });

  console.log('Preview:', enhanced.preview);
  console.log('Semantic chunks:', enhanced.chunks?.length);

  // Direct Semantic API Usage
  console.log('\n=== Direct Semantic Operations ===\n');

  const semanticBackend = fs.getSemanticBackend();

  // Access files with intent
  const accessResult = await semanticBackend.accessFile({
    purpose: 'preview',
    target: { path: 'config.json' },
    preferences: { maxPreviewLength: 200 }
  });

  // Update content with semantic understanding
  await semanticBackend.updateContent({
    purpose: 'merge',
    target: { path: 'config.json' },
    content: JSON.stringify({ newSetting: 'value' }),
    mergeStrategy: 'deep'
  });

  // Discover files by semantic criteria
  const discovered = await semanticBackend.discoverFiles({
    purpose: 'search_semantic',
    target: { semanticQuery: 'files related to project configuration' },
    options: { maxResults: 20 }
  });

  // Organize files intelligently
  await semanticBackend.organizeFiles({
    purpose: 'group_semantic',
    target: { directory: 'organized' },
    criteria: 'Group files by their semantic purpose'
  });

  // Workflow Example
  console.log('\n=== Semantic Workflows ===\n');

  const workflowResult = await semanticBackend.executeWorkflow({
    name: 'process_documentation',
    steps: [
      {
        operation: 'discover',
        intent: {
          purpose: 'find',
          target: { pattern: '*.md' }
        }
      },
      {
        operation: 'access',
        intent: {
          purpose: 'read',
          target: { path: '${step0.files[0].path}' }
        }
      },
      {
        operation: 'update',
        intent: {
          purpose: 'create',
          target: { path: 'summary.md' },
          content: 'Summary of documentation files...'
        }
      }
    ],
    errorHandling: 'continue'
  });

  console.log('Workflow completed:', workflowResult.success);
}

// Example: LLM Agent Integration
async function llmAgentExample() {
  const fs = createFileSystem('/workspace');

  // LLM receives user request: "Can you organize my project files?"
  const userRequest = "Can you organize my project files?";

  // LLM translates to semantic operation
  const result = await fs.executeNaturalLanguage(userRequest);

  // LLM can explain what it did
  if (result.success) {
    console.log(`I've organized your files based on: ${result.interpretedIntent}`);
    console.log(`Confidence: ${result.confidence}`);
  }
}

// Example: Semantic File Discovery for RAG
async function ragExample() {
  const fs = createFileSystem('/knowledge-base');

  // Find relevant files for a query
  const query = "How do I configure the authentication system?";
  
  const relevantFiles = await fs.findFiles(query, {
    searchType: 'semantic',
    maxResults: 5,
    includeContent: true
  });

  // Return files ranked by relevance
  relevantFiles.forEach(file => {
    console.log(`File: ${file.path} (relevance: ${file.relevanceScore})`);
    console.log(`Content preview: ${file.content?.substring(0, 200)}...`);
  });
}

main().catch(console.error);