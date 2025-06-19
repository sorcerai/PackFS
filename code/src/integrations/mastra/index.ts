/**
 * Native Mastra integration for PackFS
 * Provides tool factory pattern for seamless Mastra agent integration
 */

import { isAbsolute } from 'path';
import { createTool } from '@mastra/core/tools';
import { DiskBackend } from '../../backends/disk';
import { MastraSecurityValidator } from './security/validator';
import { schemas, outputSchemas } from './schemas';
import type { PackfsToolConfig, PackfsToolSet, ToolContext } from './types';
import type { AccessIntent, DiscoverIntent, UpdateIntent } from './intents';
import type { SecurityConfig } from './security/config';

// Use Mastra's tool type
type MastraTool = ReturnType<typeof createTool>;

/**
 * Create a PackFS tool set for Mastra agents
 * 
 * @param config Configuration for tool generation and security
 * @returns Object containing requested tools based on permissions
 */
export function createPackfsTools(config: PackfsToolConfig): PackfsToolSet {
  // Validate configuration
  validateConfig(config);

  // Create filesystem backend
  const backend = new DiskBackend(config.rootPath);
  
  // Create security validator
  const securityConfig: SecurityConfig = {
    rootPath: config.rootPath,
    ...config.security
  };
  const validator = new MastraSecurityValidator(securityConfig);

  // Create tool context
  const toolContext: ToolContext = {
    validator,
    filesystem: backend,
    config
  };

  const tools: PackfsToolSet = {};

  // Generate tools based on permissions
  if (config.permissions.includes('read')) {
    tools.fileReader = createFileReaderTool(toolContext);
  }

  if (config.permissions.includes('write')) {
    tools.fileWriter = createFileWriterTool(toolContext);
  }

  if (config.permissions.includes('search')) {
    tools.fileSearcher = createFileSearcherTool(toolContext);
  }

  if (config.permissions.includes('list')) {
    tools.fileLister = createFileListerTool(toolContext);
  }

  return tools;
}

/**
 * Validate tool configuration
 */
function validateConfig(config: PackfsToolConfig): void {
  if (!config.rootPath) {
    throw new Error('rootPath is required');
  }

  if (!isAbsolute(config.rootPath)) {
    throw new Error('rootPath must be absolute');
  }

  if (!config.permissions || config.permissions.length === 0) {
    throw new Error('At least one permission must be specified');
  }

  // Validate permissions
  const validPermissions = ['read', 'write', 'search', 'list'];
  for (const permission of config.permissions) {
    if (!validPermissions.includes(permission)) {
      throw new Error(`Invalid permission: ${permission}`);
    }
  }
}

/**
 * Create file reader tool for accessing file content and metadata
 */
function createFileReaderTool(context: ToolContext): MastraTool {
  return createTool({
    id: 'packfs-file-reader',
    description: 'Read files and directories through PackFS with security validation',
    inputSchema: context.config.schemas?.access ?? schemas.access,
    outputSchema: outputSchemas.file,
    execute: async ({ context: input }: { context: AccessIntent }) => {
      const startTime = Date.now();

      try {
        // Validate input
        const validatedInput = (context.config.schemas?.access ?? schemas.access).parse(input);
        
        // Security validation
        const validation = context.validator.validateOperation(validatedInput);
        if (!validation.valid) {
          return {
            success: false,
            error: validation.reason,
            executionMetadata: {
              executionTime: Date.now() - startTime,
              operationType: validatedInput.purpose
            }
          };
        }

        // Execute operation
        let result: any;
        switch (validatedInput.purpose) {
          case 'read':
            result = await executeReadOperation(context, validatedInput);
            break;
          case 'metadata':
            result = await executeMetadataOperation(context, validatedInput);
            break;
          case 'exists':
            result = await executeExistsOperation(context, validatedInput);
            break;
        }

        return {
          success: true,
          ...result,
          executionMetadata: {
            executionTime: Date.now() - startTime,
            filesAccessed: [validatedInput.target.path],
            operationType: validatedInput.purpose
          }
        };

      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          executionMetadata: {
            executionTime: Date.now() - startTime
          }
        };
      }
    }
  });
}

/**
 * Create file writer tool for creating and modifying files
 */
function createFileWriterTool(context: ToolContext): MastraTool {
  return createTool({
    id: 'packfs-file-writer',
    description: 'Create and update files through PackFS with security validation',
    inputSchema: context.config.schemas?.update ?? schemas.update,
    outputSchema: outputSchemas.update,
    execute: async ({ context: input }: { context: UpdateIntent }) => {
      const startTime = Date.now();

      try {
        // Validate input
        const validatedInput = (context.config.schemas?.update ?? schemas.update).parse(input);
        
        // Security validation
        const validation = context.validator.validateOperation(validatedInput);
        if (!validation.valid) {
          return {
            success: false,
            error: validation.reason,
            executionMetadata: {
              executionTime: Date.now() - startTime,
              operationType: validatedInput.purpose
            }
          };
        }

        // Execute operation
        let result: any;
        switch (validatedInput.purpose) {
          case 'create':
          case 'update':
            result = await executeWriteOperation(context, validatedInput);
            break;
          case 'append':
            result = await executeAppendOperation(context, validatedInput);
            break;
          case 'delete':
            result = await executeDeleteOperation(context, validatedInput);
            break;
        }

        return {
          success: true,
          ...result,
          executionMetadata: {
            executionTime: Date.now() - startTime,
            filesAccessed: [validatedInput.target.path],
            operationType: validatedInput.purpose
          }
        };

      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          executionMetadata: {
            executionTime: Date.now() - startTime
          }
        };
      }
    }
  });
}

/**
 * Create file searcher tool for finding files by content
 */
function createFileSearcherTool(context: ToolContext): MastraTool {
  return createTool({
    id: 'packfs-file-searcher',
    description: 'Search files and content through PackFS with semantic capabilities',
    inputSchema: context.config.schemas?.discover ?? schemas.discover,
    outputSchema: outputSchemas.search,
    execute: async ({ context: input }: { context: DiscoverIntent }) => {
      const startTime = Date.now();

      try {
        // Validate input
        const validatedInput = (context.config.schemas?.discover ?? schemas.discover).parse(input);
        
        // Security validation
        const validation = context.validator.validateOperation(validatedInput);
        if (!validation.valid) {
          return {
            success: false,
            error: validation.reason,
            results: [],
            totalResults: 0,
            metadata: {
              executionTime: Date.now() - startTime,
              operationType: validatedInput.purpose
            }
          };
        }

        // Execute search operation
        const result = await executeSearchOperation(context, validatedInput);

        return {
          success: true,
          ...result,
          executionMetadata: {
            executionTime: Date.now() - startTime,
            filesAccessed: [validatedInput.target.path],
            operationType: validatedInput.purpose
          }
        };

      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          results: [],
          totalResults: 0,
          metadata: {
            executionTime: Date.now() - startTime
          }
        };
      }
    }
  });
}

/**
 * Create file lister tool for directory listing
 */
function createFileListerTool(context: ToolContext): MastraTool {
  return createTool({
    id: 'packfs-file-lister',
    description: 'List directory contents through PackFS',
    inputSchema: context.config.schemas?.discover ?? schemas.discover,
    outputSchema: outputSchemas.search,
    execute: async ({ context: input, runtimeContext }: { context: DiscoverIntent, runtimeContext: any }) => {
      // Force purpose to 'list' for lister tool
      const listInput: DiscoverIntent = { ...input, purpose: 'list' };
      const searcherTool = createFileSearcherTool(context);
      if (!searcherTool.execute) {
        throw new Error('File searcher tool does not have execute method');
      }
      return searcherTool.execute({ context: listInput, runtimeContext });
    }
  });
}

// Helper functions for operation execution

async function executeReadOperation(context: ToolContext, intent: AccessIntent) {
  const content = await context.filesystem.read(intent.target.path);
  const encoding = intent.target.encoding || 'utf8';
  
  return {
    content: content.toString(encoding),
    exists: true
  };
}

async function executeMetadataOperation(context: ToolContext, intent: AccessIntent) {
  const exists = await context.filesystem.exists(intent.target.path);
  if (!exists) {
    return { exists: false };
  }

  const stats = await context.filesystem.stat(intent.target.path);
  return {
    exists: true,
    metadata: {
      size: stats.size,
      modified: stats.mtime.toISOString(),
      type: stats.isDirectory ? 'directory' : 'file'
    }
  };
}

async function executeExistsOperation(context: ToolContext, intent: AccessIntent) {
  const exists = await context.filesystem.exists(intent.target.path);
  return { exists };
}

async function executeWriteOperation(context: ToolContext, intent: UpdateIntent) {
  const exists = await context.filesystem.exists(intent.target.path);
  const isCreate = intent.purpose === 'create' || !exists;

  // Note: Creating parent directories would require additional backend support
  // For now, assume the path is valid

  await context.filesystem.write(intent.target.path, Buffer.from(intent.content!, 'utf8'));

  return {
    created: isCreate,
    path: intent.target.path
  };
}

async function executeAppendOperation(context: ToolContext, intent: UpdateIntent) {
  // Read existing content
  let existingContent = '';
  const exists = await context.filesystem.exists(intent.target.path);
  
  if (exists) {
    const buffer = await context.filesystem.read(intent.target.path);
    existingContent = buffer.toString('utf8');
  }

  // Append new content
  const newContent = existingContent + intent.content!;
  await context.filesystem.write(intent.target.path, Buffer.from(newContent, 'utf8'));

  return {
    created: !exists,
    path: intent.target.path
  };
}

async function executeDeleteOperation(context: ToolContext, intent: UpdateIntent) {
  const exists = await context.filesystem.exists(intent.target.path);
  if (exists) {
    await context.filesystem.delete(intent.target.path);
  }

  return {
    deleted: exists,
    path: intent.target.path
  };
}

async function executeSearchOperation(context: ToolContext, intent: DiscoverIntent) {
  const { target, options = {} } = intent;

  if (intent.purpose === 'list') {
    // Simple directory listing
    const files = await context.filesystem.list(target.path);
    const results = [];

    for (const file of files) {
      const filePath = `${target.path}/${file}`;
      try {
        const stats = await context.filesystem.stat(filePath);
        results.push({
          path: filePath,
          type: stats.isDirectory ? 'directory' as const : 'file' as const,
          metadata: {
            size: stats.size,
            modified: stats.mtime.toISOString()
          }
        });
      } catch (error) {
        // Skip files that can't be stat'd
        continue;
      }

      if (options.maxResults && results.length >= options.maxResults) {
        break;
      }
    }

    return {
      results,
      totalResults: results.length
    };
  }

  // For content and semantic search, we'd need more complex implementation
  // For now, return empty results
  return {
    results: [],
    totalResults: 0
  };
}

// Re-export types and schemas for convenience
export type { PackfsToolConfig, PackfsToolSet, MastraTool } from './types';
export type { AccessIntent, DiscoverIntent, UpdateIntent } from './intents';
export type { SecurityConfig } from './security/config';
export { MastraSecurityValidator } from './security/validator';
export { schemas, outputSchemas } from './schemas';