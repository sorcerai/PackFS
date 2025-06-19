/**
 * Mastra framework integration for PackFS semantic filesystem
 * Mastra: The TypeScript AI framework - https://mastra.ai/
 */

import type { 
  BaseIntegrationConfig, 
  ToolResult, 
  ToolDescription, 
  FrameworkToolAdapter 
} from './types.js';

/**
 * Mastra-specific configuration extending base config
 */
export interface MastraIntegrationConfig extends BaseIntegrationConfig {
  /** Mastra-specific options */
  mastra?: {
    /** Enable automatic error recovery */
    autoRetry?: boolean;
    
    /** Maximum retry attempts */
    maxRetries?: number;
    
    /** Enable operation tracing */
    enableTracing?: boolean;
    
    /** Custom agent context */
    agentContext?: Record<string, any>;
  };
}

/**
 * Mastra tool interface (simplified based on Mastra patterns)
 */
interface MastraTool {
  name: string;
  description: string;
  parameters: any;
  execute: (params: any) => Promise<any>;
}

/**
 * PackFS semantic filesystem tool for Mastra
 * Provides unified file operations through natural language interface
 */
export class MastraSemanticFilesystemTool implements FrameworkToolAdapter<MastraTool> {
  createTool(config: MastraIntegrationConfig): MastraTool {
    return {
      name: 'semantic_filesystem',
      description: this.getToolDescription().description,
      parameters: this.getToolDescription().parameters,
      execute: async (params: any): Promise<ToolResult> => {
        try {
          // Validate parameters
          const validation = this.validateParameters(params);
          if (!validation.valid) {
            return {
              success: false,
              error: `Invalid parameters: ${validation.errors?.join(', ')}`,
            };
          }

          const startTime = Date.now();
          let result: any;
          const filesAccessed: string[] = [];

          // Handle different operation types through natural language
          if (params.naturalLanguageQuery) {
            result = await this.executeNaturalLanguageQuery(config, params.naturalLanguageQuery);
          } else {
            result = await this.executeStructuredOperation(config, params);
          }

          // Track files accessed for metadata
          if (params.target?.path) {
            filesAccessed.push(params.target.path);
          }

          // Check if the semantic operation was successful
          const success = result.success !== false;
          
          return {
            success,
            data: result,
            error: success ? undefined : result.message || 'Operation failed',
            metadata: {
              executionTime: Date.now() - startTime,
              filesAccessed,
              operationType: params.operation || 'natural_language'
            }
          };

        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      }
    };
  }

  getToolDescription(): ToolDescription {
    return {
      name: 'semantic_filesystem',
      description: 'Perform intelligent file operations using semantic understanding. Supports natural language queries like "create a config file", "find all documentation", or "read the main script file".',
      parameters: {
        type: 'object',
        properties: {
          naturalLanguageQuery: {
            type: 'string',
            description: 'Natural language description of the file operation to perform (e.g., "create a file called notes.txt with my thoughts", "find all JavaScript files", "read the README file")'
          },
          operation: {
            type: 'string',
            description: 'Structured operation type when not using natural language',
            enum: ['access', 'update', 'discover', 'organize', 'remove']
          },
          purpose: {
            type: 'string',
            description: 'Specific purpose within the operation type',
            enum: [
              // Access purposes
              'read', 'preview', 'metadata', 'verify_exists', 'create_or_get',
              // Update purposes  
              'create', 'append', 'overwrite', 'merge', 'patch',
              // Discovery purposes
              'list', 'find', 'search_content', 'search_semantic', 'search_integrated',
              // Organization purposes
              'create_directory', 'move', 'copy', 'group_semantic', 'group_keywords',
              // Removal purposes
              'delete_file', 'delete_directory', 'delete_by_criteria'
            ]
          },
          target: {
            type: 'object',
            description: 'How to identify the target file(s)'
          },
          content: {
            type: 'string',
            description: 'Content to write when creating/updating files'
          },
          destination: {
            type: 'object',
            description: 'Destination for move/copy operations'
          },
          options: {
            type: 'object',
            description: 'Additional operation options'
          }
        },
        required: []
      },
      examples: [
        {
          input: '{"naturalLanguageQuery": "create a file called todo.txt with my daily tasks"}',
          description: 'Create a new file using natural language'
        },
        {
          input: '{"naturalLanguageQuery": "find all TypeScript files in the src directory"}',
          description: 'Search for files using natural language'
        },
        {
          input: '{"naturalLanguageQuery": "read the package.json file"}',
          description: 'Access file content using natural language'
        },
        {
          input: '{"operation": "discover", "purpose": "search_semantic", "target": {"semanticQuery": "configuration"}}',
          description: 'Structured semantic search for configuration files'
        },
        {
          input: '{"operation": "access", "purpose": "read", "target": {"path": "README.md"}}',
          description: 'Structured file reading operation'
        }
      ]
    };
  }

  validateParameters(params: any): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    // Must have either natural language query or structured operation
    if (!params.naturalLanguageQuery && !params.operation) {
      errors.push('Must provide either naturalLanguageQuery or operation');
    }

    // If using structured operation, validate required fields
    if (params.operation) {
      if (!params.purpose) {
        errors.push('Purpose is required when using structured operations');
      }

      if (!params.target && !['create_directory'].includes(params.purpose)) {
        errors.push('Target is required for most operations');
      }

      if (['create', 'append', 'overwrite', 'merge', 'patch'].includes(params.purpose) && !params.content && !params.naturalLanguageQuery) {
        errors.push('Content is required for content update operations');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private async executeNaturalLanguageQuery(config: MastraIntegrationConfig, query: string): Promise<any> {
    // Use the semantic filesystem's natural language processing
    const nlResult = await config.filesystem.interpretNaturalLanguage({
      query,
      context: {
        workingDirectory: config.workingDirectory,
        agentContext: config.mastra?.agentContext
      }
    });

    if (!nlResult.success) {
      throw new Error(`Failed to interpret query: ${nlResult.message}`);
    }

    // Execute the interpreted intent
    const intent = nlResult.interpretedIntent;
    
    if ('purpose' in intent) {
      switch (intent.purpose) {
        case 'read':
        case 'preview':
        case 'metadata':
        case 'verify_exists':
        case 'create_or_get':
          return await config.filesystem.accessFile(intent as any);
        
        case 'create':
        case 'append':
        case 'overwrite':
        case 'merge':
        case 'patch':
          return await config.filesystem.updateContent(intent as any);
        
        case 'create_directory':
        case 'move':
        case 'copy':
        case 'group_semantic':
        case 'group_keywords':
          return await config.filesystem.organizeFiles(intent as any);
        
        case 'list':
        case 'find':
        case 'search_content':
        case 'search_semantic':
        case 'search_integrated':
          return await config.filesystem.discoverFiles(intent as any);
        
        case 'delete_file':
        case 'delete_directory':
        case 'delete_by_criteria':
          return await config.filesystem.removeFiles(intent as any);
      }
    }

    // Handle workflow intents
    return await config.filesystem.executeWorkflow(intent as any);
  }

  private async executeStructuredOperation(config: MastraIntegrationConfig, params: any): Promise<any> {
    switch (params.operation) {
      case 'access':
        return await config.filesystem.accessFile({
          purpose: params.purpose,
          target: params.target,
          preferences: params.options
        });

      case 'update':
        return await config.filesystem.updateContent({
          purpose: params.purpose,
          target: params.target,
          content: params.content,
          options: params.options
        });

      case 'discover':
        return await config.filesystem.discoverFiles({
          purpose: params.purpose,
          target: params.target,
          options: params.options
        });

      case 'organize':
        return await config.filesystem.organizeFiles({
          purpose: params.purpose,
          source: params.source,
          destination: params.destination,
          options: params.options
        });

      case 'remove':
        return await config.filesystem.removeFiles({
          purpose: params.purpose,
          target: params.target,
          options: params.options
        });

      default:
        throw new Error(`Unknown operation: ${params.operation}`);
    }
  }
}

/**
 * Create a Mastra semantic filesystem tool with the given configuration
 */
export function createMastraSemanticFilesystemTool(config: MastraIntegrationConfig): MastraTool {
  const adapter = new MastraSemanticFilesystemTool();
  return adapter.createTool(config);
}

/**
 * Utility to create multiple Mastra tools for different semantic operations
 * Provides more granular control for complex agent workflows
 */
export function createMastraSemanticToolSuite(config: MastraIntegrationConfig): {
  fileReader: MastraTool;
  fileWriter: MastraTool;
  fileSearcher: MastraTool;
  fileOrganizer: MastraTool;
} {
  const baseAdapter = new MastraSemanticFilesystemTool();

  return {
    fileReader: {
      name: 'read_file',
      description: 'Read and access file content with semantic understanding',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Natural language description of what file to read (e.g., "read the main configuration file", "show me the README")'
          },
          path: {
            type: 'string', 
            description: 'Direct file path if known'
          },
          purpose: {
            type: 'string',
            enum: ['read', 'preview', 'metadata'],
            description: 'How to access the file'
          }
        },
        required: []
      },
      execute: async (params: any) => {
        if (params.query) {
          return await baseAdapter.createTool(config).execute({
            naturalLanguageQuery: params.query
          });
        } else {
          return await baseAdapter.createTool(config).execute({
            operation: 'access',
            purpose: params.purpose || 'read',
            target: { path: params.path }
          });
        }
      }
    },

    fileWriter: {
      name: 'write_file',
      description: 'Create and modify files with intelligent content handling',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Natural language description of what to write (e.g., "create a README with project info", "add my notes to the todo file")'
          },
          path: {
            type: 'string',
            description: 'File path to write to'
          },
          content: {
            type: 'string',
            description: 'Content to write'
          },
          mode: {
            type: 'string',
            enum: ['create', 'append', 'overwrite'],
            description: 'How to write the content'
          }
        },
        required: []
      },
      execute: async (params: any) => {
        if (params.query) {
          return await baseAdapter.createTool(config).execute({
            naturalLanguageQuery: params.query
          });
        } else {
          return await baseAdapter.createTool(config).execute({
            operation: 'update',
            purpose: params.mode || 'create',
            target: { path: params.path },
            content: params.content
          });
        }
      }
    },

    fileSearcher: {
      name: 'search_files',
      description: 'Find files using semantic search and natural language queries',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Natural language search query (e.g., "find all JavaScript files", "look for configuration files", "search for files about machine learning")'
          },
          pattern: {
            type: 'string',
            description: 'Glob pattern for file matching'
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of results to return'
          }
        },
        required: ['query']
      },
      execute: async (params: any) => {
        return await baseAdapter.createTool(config).execute({
          naturalLanguageQuery: params.query
        });
      }
    },

    fileOrganizer: {
      name: 'organize_files',
      description: 'Move, copy, and organize files intelligently',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Natural language description of organization task (e.g., "move all images to photos folder", "copy config files to backup")'
          },
          operation: {
            type: 'string',
            enum: ['move', 'copy', 'create_directory'],
            description: 'Organization operation to perform'
          },
          source: {
            type: 'string',
            description: 'Source file or pattern'
          },
          destination: {
            type: 'string',
            description: 'Destination path'
          }
        },
        required: []
      },
      execute: async (params: any) => {
        if (params.query) {
          return await baseAdapter.createTool(config).execute({
            naturalLanguageQuery: params.query
          });
        } else {
          return await baseAdapter.createTool(config).execute({
            operation: 'organize',
            purpose: params.operation,
            source: params.source ? { path: params.source } : undefined,
            destination: { path: params.destination }
          });
        }
      }
    }
  };
}