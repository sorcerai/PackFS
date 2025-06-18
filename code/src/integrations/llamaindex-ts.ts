/**
 * LlamaIndex.TS integration for PackFS semantic filesystem
 * LlamaIndex TypeScript - https://www.llamaindex.ai/
 */

import type { 
  BaseIntegrationConfig, 
  ToolResult, 
  ToolDescription, 
  FrameworkToolAdapter 
} from './types';

/**
 * LlamaIndex-specific configuration
 */
export interface LlamaIndexIntegrationConfig extends BaseIntegrationConfig {
  /** LlamaIndex-specific options */
  llamaIndex?: {
    /** Enable verbose logging */
    verbose?: boolean;
    
    /** Tool metadata for LlamaIndex */
    metadata?: Record<string, any>;
    
    /** Function calling configuration */
    functionCalling?: {
      /** Enable auto function calling */
      autoCall?: boolean;
      
      /** Maximum function call depth */
      maxDepth?: number;
    };
  };
}

/**
 * LlamaIndex FunctionTool interface (based on LlamaIndex.TS patterns)
 */
interface LlamaIndexFunctionTool {
  metadata: {
    name: string;
    description: string;
    parameters?: any;
  };
  call: (input: any) => Promise<any>;
}

/**
 * LlamaIndex Tool specification format
 */
interface LlamaIndexToolSpec {
  name: string;
  description: string;
  parameters: any;
  fn: (params: any) => Promise<string>;
}

/**
 * PackFS semantic filesystem tool for LlamaIndex.TS
 * Compatible with LlamaIndex's function calling and agent frameworks
 */
export class LlamaIndexSemanticFilesystemTool implements FrameworkToolAdapter<LlamaIndexFunctionTool> {
  createTool(config: LlamaIndexIntegrationConfig): LlamaIndexFunctionTool {
    return {
      metadata: {
        name: 'semantic_filesystem',
        description: this.getToolDescription().description,
        parameters: this.getLlamaIndexParameters()
      },
      call: async (input: any): Promise<any> => {
        try {
          const result = await this.executeOperation(config, input);
          return this.formatLlamaIndexResponse(result);
        } catch (error) {
          throw new Error(`Semantic filesystem error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    };
  }

  getToolDescription(): ToolDescription {
    return {
      name: 'semantic_filesystem',
      description: 'Intelligent file system operations with semantic understanding. Supports natural language queries for reading, writing, searching, and organizing files.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            description: 'The type of file operation to perform',
            enum: ['read', 'write', 'search', 'list', 'organize', 'delete', 'natural_query']
          },
          query: {
            type: 'string',
            description: 'Natural language description of the operation (e.g., "read the configuration file", "find all documentation files")'
          },
          path: {
            type: 'string',
            description: 'Specific file or directory path'
          },
          content: {
            type: 'string',
            description: 'Content to write when creating or updating files'
          },
          searchTerm: {
            type: 'string',
            description: 'Search term or pattern for finding files'
          },
          options: {
            type: 'object',
            description: 'Additional options for the operation',
            properties: {
              maxResults: { type: 'number', description: 'Maximum number of search results' },
              includeContent: { type: 'boolean', description: 'Include file content in results' },
              recursive: { type: 'boolean', description: 'Search recursively in subdirectories' },
              fileTypes: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'File extensions to filter by (e.g., ["js", "ts", "md"])' 
              }
            }
          }
        },
        required: ['action']
      },
      examples: [
        {
          input: '{"action": "natural_query", "query": "read the README file"}',
          description: 'Use natural language to read a file'
        },
        {
          input: '{"action": "write", "path": "notes.txt", "content": "My important notes"}',
          description: 'Create a new file with content'
        },
        {
          input: '{"action": "search", "searchTerm": "configuration", "options": {"fileTypes": ["json", "yaml"]}}',
          description: 'Search for configuration files'
        }
      ]
    };
  }

  validateParameters(params: any): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!params.action) {
      errors.push('Action is required');
    }

    // Validate action-specific requirements
    switch (params.action) {
      case 'read':
        if (!params.path && !params.query) {
          errors.push('Read action requires either path or query');
        }
        break;
      
      case 'write':
        if (!params.path) {
          errors.push('Write action requires path');
        }
        if (!params.content && !params.query) {
          errors.push('Write action requires content or query');
        }
        break;
      
      case 'search':
        if (!params.searchTerm && !params.query) {
          errors.push('Search action requires searchTerm or query');
        }
        break;
      
      case 'organize':
        if (!params.source && !params.query) {
          errors.push('Organize action requires source or query');
        }
        break;
      
      case 'delete':
        if (!params.path && !params.query) {
          errors.push('Delete action requires path or query');
        }
        break;
      
      case 'natural_query':
        if (!params.query) {
          errors.push('Natural query action requires query');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private getLlamaIndexParameters(): any {
    return {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'The type of file operation to perform',
          enum: ['read', 'write', 'search', 'list', 'organize', 'delete', 'natural_query']
        },
        query: {
          type: 'string',
          description: 'Natural language description of the operation'
        },
        path: {
          type: 'string',
          description: 'Specific file or directory path'
        },
        content: {
          type: 'string',
          description: 'Content to write when creating or updating files'
        },
        searchTerm: {
          type: 'string',
          description: 'Search term or pattern for finding files'
        },
        source: {
          type: 'string',
          description: 'Source path for move/copy operations'
        },
        destination: {
          type: 'string',
          description: 'Destination path for move/copy operations'
        },
        options: {
          type: 'object',
          description: 'Additional options for the operation'
        }
      },
      required: ['action']
    };
  }

  private async executeOperation(config: LlamaIndexIntegrationConfig, input: any): Promise<ToolResult> {
    const startTime = Date.now();

    // Validate parameters
    const validation = this.validateParameters(input);
    if (!validation.valid) {
      return {
        success: false,
        error: `Invalid parameters: ${validation.errors?.join(', ')}`
      };
    }

    try {
      let result: any;

      // Handle natural language queries
      if (input.action === 'natural_query' || (input.query && !input.path && !input.searchTerm)) {
        result = await this.executeNaturalLanguageQuery(config, input.query);
      } else {
        result = await this.executeStructuredAction(config, input);
      }

      return {
        success: true,
        data: result,
        metadata: {
          executionTime: Date.now() - startTime,
          operationType: input.action,
          filesAccessed: this.extractFilesAccessed(input, result)
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async executeNaturalLanguageQuery(config: LlamaIndexIntegrationConfig, query: string): Promise<any> {
    const nlResult = await config.filesystem.interpretNaturalLanguage({
      query,
      context: {
        workingDirectory: config.workingDirectory
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
          return await config.filesystem.accessFile(intent);
        
        case 'create':
        case 'append':
        case 'overwrite':
        case 'merge':
        case 'patch':
          return await config.filesystem.updateContent(intent);
        
        case 'create_directory':
        case 'move':
        case 'copy':
        case 'group_semantic':
        case 'group_keywords':
          return await config.filesystem.organizeFiles(intent);
        
        case 'list':
        case 'find':
        case 'search_content':
        case 'search_semantic':
        case 'search_integrated':
          return await config.filesystem.discoverFiles(intent);
        
        case 'delete_file':
        case 'delete_directory':
        case 'delete_by_criteria':
          return await config.filesystem.removeFiles(intent);
      }
    }

    // Handle workflow intents
    return await config.filesystem.executeWorkflow(intent);
  }

  private async executeStructuredAction(config: LlamaIndexIntegrationConfig, input: any): Promise<any> {
    switch (input.action) {
      case 'read':
        return await config.filesystem.accessFile({
          purpose: 'read',
          target: { path: input.path },
          preferences: input.options
        });

      case 'write':
        return await config.filesystem.updateContent({
          purpose: input.append ? 'append' : 'create',
          target: { path: input.path },
          content: input.content,
          options: input.options
        });

      case 'search':
        return await config.filesystem.discoverFiles({
          purpose: 'search_semantic',
          target: { 
            semanticQuery: input.searchTerm,
            criteria: input.options?.fileTypes ? { type: input.options.fileTypes } : undefined
          },
          options: input.options
        });

      case 'list':
        return await config.filesystem.discoverFiles({
          purpose: 'list',
          target: { path: input.path || '.' },
          options: input.options
        });

      case 'organize':
        const orgPurpose = input.operation || (input.destination ? 'move' : 'create_directory');
        return await config.filesystem.organizeFiles({
          purpose: orgPurpose,
          source: input.source ? { path: input.source } : undefined,
          destination: { path: input.destination || input.path },
          options: input.options
        });

      case 'delete':
        return await config.filesystem.removeFiles({
          purpose: 'delete_file',
          target: { path: input.path },
          options: input.options
        });

      default:
        throw new Error(`Unknown action: ${input.action}`);
    }
  }

  private formatLlamaIndexResponse(result: ToolResult): any {
    if (!result.success) {
      throw new Error(result.error || 'Operation failed');
    }

    const data = result.data;

    // Return structured data for LlamaIndex to process
    return {
      success: true,
      data: data,
      metadata: result.metadata
    };
  }

  private extractFilesAccessed(input: any, result: any): string[] {
    const files: string[] = [];
    
    if (input.path) files.push(input.path);
    if (input.source) files.push(input.source);
    if (input.destination) files.push(input.destination);
    
    if (result.files && Array.isArray(result.files)) {
      files.push(...result.files.map((f: any) => f.path));
    }
    
    return files;
  }
}

/**
 * Create a LlamaIndex.TS compatible semantic filesystem tool
 */
export function createLlamaIndexSemanticFilesystemTool(config: LlamaIndexIntegrationConfig): LlamaIndexFunctionTool {
  const adapter = new LlamaIndexSemanticFilesystemTool();
  return adapter.createTool(config);
}

/**
 * Create a LlamaIndex ToolSpec for the semantic filesystem
 * This format is used for agent tool registration
 */
export function createLlamaIndexSemanticToolSpec(config: LlamaIndexIntegrationConfig): LlamaIndexToolSpec {
  const adapter = new LlamaIndexSemanticFilesystemTool();
  const description = adapter.getToolDescription();
  
  return {
    name: description.name,
    description: description.description,
    parameters: description.parameters,
    fn: async (params: any): Promise<string> => {
      const tool = adapter.createTool(config);
      const result = await tool.call(params);
      
      // Convert result to string for LlamaIndex
      if (typeof result === 'string') {
        return result;
      }
      
      return JSON.stringify(result, null, 2);
    }
  };
}

/**
 * Create specialized LlamaIndex tools for different file operations
 */
export function createLlamaIndexSemanticToolSuite(config: LlamaIndexIntegrationConfig): {
  fileReader: LlamaIndexFunctionTool;
  fileWriter: LlamaIndexFunctionTool;
  fileSearcher: LlamaIndexFunctionTool;
  fileManager: LlamaIndexFunctionTool;
} {
  return {
    fileReader: {
      metadata: {
        name: 'read_file',
        description: 'Read file content using path or natural language description',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Natural language file description or direct path' },
            includeMetadata: { type: 'boolean', description: 'Include file metadata in response' }
          },
          required: ['query']
        }
      },
      call: async (input: any) => {
        let target: any;
        if (input.query.includes('/') || input.query.includes('.')) {
          target = { path: input.query };
        } else {
          target = { semanticQuery: input.query };
        }

        const result = await config.filesystem.accessFile({
          purpose: 'read',
          target,
          preferences: { includeMetadata: input.includeMetadata }
        });

        if (!result.success) {
          throw new Error(result.message || 'Failed to read file');
        }

        return {
          content: result.content,
          metadata: result.metadata,
          exists: result.exists
        };
      }
    },

    fileWriter: {
      metadata: {
        name: 'write_file',
        description: 'Create or update files with content',
        parameters: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'File path to write to' },
            content: { type: 'string', description: 'Content to write' },
            mode: { type: 'string', enum: ['create', 'append', 'overwrite'], description: 'Write mode' },
            createPath: { type: 'boolean', description: 'Create directory path if needed' }
          },
          required: ['path', 'content']
        }
      },
      call: async (input: any) => {
        const result = await config.filesystem.updateContent({
          purpose: input.mode || 'create',
          target: { path: input.path },
          content: input.content,
          options: { createPath: input.createPath }
        });

        if (!result.success) {
          throw new Error(result.message || 'Failed to write file');
        }

        return {
          bytesWritten: result.bytesWritten,
          created: result.created,
          path: input.path
        };
      }
    },

    fileSearcher: {
      metadata: {
        name: 'search_files',
        description: 'Search for files using semantic queries or patterns',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query (semantic or pattern)' },
            maxResults: { type: 'number', description: 'Maximum results to return' },
            fileTypes: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'File extensions to filter by' 
            },
            includeContent: { type: 'boolean', description: 'Include file content in results' }
          },
          required: ['query']
        }
      },
      call: async (input: any) => {
        const result = await config.filesystem.discoverFiles({
          purpose: 'search_semantic',
          target: { 
            semanticQuery: input.query,
            criteria: input.fileTypes ? { type: input.fileTypes } : undefined
          },
          options: {
            maxResults: input.maxResults,
            includeContent: input.includeContent
          }
        });

        if (!result.success) {
          throw new Error(result.message || 'Search failed');
        }

        return {
          files: result.files,
          totalFound: result.totalFound,
          searchTime: result.searchTime
        };
      }
    },

    fileManager: {
      metadata: {
        name: 'manage_files',
        description: 'Move, copy, delete, and organize files',
        parameters: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['move', 'copy', 'delete', 'mkdir'], description: 'Management action' },
            source: { type: 'string', description: 'Source path' },
            destination: { type: 'string', description: 'Destination path (for move/copy)' },
            recursive: { type: 'boolean', description: 'Apply recursively' }
          },
          required: ['action', 'source']
        }
      },
      call: async (input: any) => {
        let result: any;

        switch (input.action) {
          case 'move':
          case 'copy':
            result = await config.filesystem.organizeFiles({
              purpose: input.action,
              source: { path: input.source },
              destination: { path: input.destination },
              options: { recursive: input.recursive }
            });
            break;

          case 'delete':
            result = await config.filesystem.removeFiles({
              purpose: 'delete_file',
              target: { path: input.source },
              options: { recursive: input.recursive }
            });
            break;

          case 'mkdir':
            result = await config.filesystem.organizeFiles({
              purpose: 'create_directory',
              destination: { path: input.source },
              options: { recursive: input.recursive }
            });
            break;

          default:
            throw new Error(`Unknown action: ${input.action}`);
        }

        if (!result.success) {
          throw new Error(result.message || 'File management operation failed');
        }

        return result;
      }
    }
  };
}