#!/usr/bin/env node

/**
 * Extract External Documentation
 * Fetches and stores external API documentation for quick reference
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const contextNetworkDir = join(rootDir, '..', 'context-network');
const externalDocsDir = join(contextNetworkDir, 'reference', 'external');

async function ensureDirectories() {
  await fs.mkdir(externalDocsDir, { recursive: true });
}

// Extract TypeScript definitions from node_modules
async function extractTypeDefinitions() {
  console.log('📘 Extracting TypeScript definitions...');
  
  const libraries = [
    {
      name: 'mastra',
      package: '@mastra/core',
      types: ['Tool', 'ToolInput', 'ToolOutput', 'RuntimeContext']
    },
    {
      name: 'langchain',
      package: '@langchain/core',
      types: ['DynamicTool', 'StructuredTool']
    },
    {
      name: 'llamaindex',
      package: 'llamaindex',
      types: ['FunctionTool', 'ToolMetadata']
    }
  ];
  
  let content = `# External Library Type Definitions

Generated: ${new Date().toISOString()}

This document contains extracted type definitions from external libraries used by PackFS.

`;

  for (const lib of libraries) {
    console.log(`  Extracting ${lib.name} types...`);
    
    try {
      // Try to find the package's type definitions
      const packagePath = join(rootDir, 'node_modules', lib.package);
      const packageJsonPath = join(packagePath, 'package.json');
      
      if (await fs.access(packageJsonPath).then(() => true).catch(() => false)) {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
        const typesPath = packageJson.types || packageJson.typings;
        
        content += `\n## ${lib.name} (${lib.package})\n\n`;
        content += `Version: ${packageJson.version}\n\n`;
        
        if (typesPath) {
          const fullTypesPath = join(packagePath, typesPath);
          
          // Read the main types file
          try {
            const typesContent = await fs.readFile(fullTypesPath, 'utf8');
            
            // Extract specific type definitions
            for (const typeName of lib.types) {
              const typeRegex = new RegExp(`(export\\s+)?(interface|type|class)\\s+${typeName}[^{]*{[^}]+}`, 'gs');
              const matches = typesContent.match(typeRegex);
              
              if (matches) {
                content += `### ${typeName}\n\n\`\`\`typescript\n${matches[0]}\n\`\`\`\n\n`;
              }
            }
          } catch (error) {
            content += `Could not read types from ${typesPath}\n\n`;
          }
        }
      }
    } catch (error) {
      content += `\n## ${lib.name} (${lib.package})\n\nNot installed or types not found.\n\n`;
    }
  }
  
  await fs.writeFile(join(externalDocsDir, 'type-definitions.md'), content);
}

// Create Mastra API reference
async function createMastraReference() {
  console.log('🤖 Creating Mastra API reference...');
  
  const content = `# Mastra Framework API Reference

Generated: ${new Date().toISOString()}

## Core Concepts

### Tool Definition
\`\`\`typescript
interface Tool {
  name: string;
  description: string;
  inputSchema: z.ZodSchema;
  outputSchema: z.ZodSchema;
  execute: (input: ToolInput, context: RuntimeContext) => Promise<ToolOutput>;
}
\`\`\`

### Tool Input/Output
\`\`\`typescript
interface ToolInput {
  [key: string]: any; // Validated by inputSchema
}

interface ToolOutput {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}
\`\`\`

### Runtime Context
\`\`\`typescript
interface RuntimeContext {
  agentId?: string;
  sessionId?: string;
  userId?: string;
  [key: string]: any;
}
\`\`\`

## PackFS Mastra Tools

### Tool Suite Creation
\`\`\`typescript
const tools = createMastraSemanticToolSuite({
  workingDirectory: string;  // Required
  filesystem?: SemanticFileSystemInterface;
  maxFileSize?: number;
  allowedExtensions?: string[];
  pathRestrictions?: string[];
  rateLimit?: { requestsPerMinute: number };
});
\`\`\`

### Available Tools

#### fileReader
- **Purpose**: Read files with semantic targeting
- **Input Schema**:
  - \`filePath\` (string): Path or semantic description
  - \`encoding\` (string, optional): File encoding
- **Output**: File content or error with suggestions

#### fileWriter  
- **Purpose**: Write or update files
- **Input Schema**:
  - \`filePath\` (string): Target file path
  - \`content\` (string): Content to write
  - \`mode\` (string, optional): 'overwrite' | 'append' | 'create'
- **Output**: Success status with bytes written

#### fileSearcher
- **Purpose**: Search for files by content or name
- **Input Schema**:
  - \`query\` (string): Search query
  - \`searchType\` (string): 'content' | 'filename' | 'semantic'
  - \`maxResults\` (number, optional): Result limit
- **Output**: Array of matching files with metadata

#### fileLister
- **Purpose**: List directory contents
- **Input Schema**:
  - \`directory\` (string): Directory to list
  - \`recursive\` (boolean, optional): Include subdirectories
  - \`pattern\` (string, optional): Filter pattern
- **Output**: Directory listing with file metadata

## Integration Examples

### With Mastra Agent
\`\`\`typescript
import { Agent } from '@mastra/core';
import { createMastraSemanticToolSuite } from 'packfs-core';

const agent = new Agent({
  name: 'FileAssistant',
  tools: createMastraSemanticToolSuite({
    workingDirectory: '/project'
  })
});

const result = await agent.run({
  messages: [{ 
    role: 'user', 
    content: 'Find and read the configuration file' 
  }]
});
\`\`\`

### Direct Tool Usage
\`\`\`typescript
const tools = createMastraSemanticToolSuite({
  workingDirectory: '/project'
});

const readResult = await tools.fileReader.execute({
  filePath: 'config file'
}, {
  agentId: 'agent-123'
});
\`\`\`

## Security Features

### Path Validation
- Prevents directory traversal attacks
- Validates against path restrictions
- Normalizes paths for consistency

### Rate Limiting  
- Configurable requests per minute
- Per-agent tracking
- Prevents abuse

### File Filtering
- Extension whitelist/blacklist
- Size limits
- Content type validation

## Error Handling

All tools return consistent error format:
\`\`\`typescript
{
  success: false,
  error: string,
  suggestions?: Array<{
    type: string;
    description: string;
    data: any;
  }>
}
\`\`\`

Common errors:
- File not found (includes suggestions)
- Permission denied
- Rate limit exceeded
- Invalid path
- File too large
`;

  await fs.writeFile(join(externalDocsDir, 'mastra-api.md'), content);
}

// Create a script runner reference
async function createScriptReference() {
  console.log('📜 Creating script reference...');
  
  const packageJson = JSON.parse(await fs.readFile(join(rootDir, 'package.json'), 'utf8'));
  const scripts = packageJson.scripts || {};
  
  let content = `# PackFS Scripts Reference

Generated: ${new Date().toISOString()}

## Available NPM Scripts

`;

  // Categorize scripts
  const categories = {
    'Build': ['build', 'build:cjs', 'build:esm', 'build:types', 'clean'],
    'Test': ['test', 'test:watch', 'test:coverage'],
    'Quality': ['lint', 'lint:fix', 'format', 'format:check', 'typecheck'],
    'Release': ['release', 'release:minor', 'release:major', 'release:dry', 'release:alpha', 'release:beta'],
    'Maintenance': ['update-context']
  };
  
  for (const [category, scriptNames] of Object.entries(categories)) {
    content += `### ${category} Scripts\n\n`;
    
    for (const scriptName of scriptNames) {
      if (scripts[scriptName]) {
        content += `#### npm run ${scriptName}\n`;
        content += `\`\`\`bash\n${scripts[scriptName]}\n\`\`\`\n`;
        
        // Add descriptions
        const descriptions = {
          'build': 'Build all outputs (ESM, CommonJS, and types)',
          'test': 'Run all tests',
          'test:coverage': 'Run tests with coverage report',
          'typecheck': 'Check TypeScript types without building',
          'release': 'Create a patch release',
          'update-context': 'Update context network reference docs'
        };
        
        if (descriptions[scriptName]) {
          content += `${descriptions[scriptName]}\n`;
        }
        content += '\n';
      }
    }
  }
  
  content += `## Custom Scripts

### Update Context Network
\`\`\`bash
npm run update-context
\`\`\`
Updates all reference documentation in the context network.

### Extract External Docs
\`\`\`bash
node scripts/extract-external-docs.js
\`\`\`
Extracts type definitions and API documentation from dependencies.

## Development Workflow

1. **Before starting work:**
   \`\`\`bash
   npm run update-context
   \`\`\`

2. **During development:**
   \`\`\`bash
   npm run test:watch
   npm run typecheck
   \`\`\`

3. **Before committing:**
   \`\`\`bash
   npm run lint:fix
   npm run format
   npm test
   \`\`\`

4. **Creating a release:**
   \`\`\`bash
   npm run release:dry  # Test first
   npm run release      # Create release
   \`\`\`
`;

  await fs.writeFile(join(externalDocsDir, 'scripts.md'), content);
}

// Main function
async function main() {
  console.log('📚 Extracting external documentation...\n');
  
  await ensureDirectories();
  await extractTypeDefinitions();
  await createMastraReference();
  await createScriptReference();
  
  console.log('\n✅ External documentation extracted!');
}

main().catch(console.error);