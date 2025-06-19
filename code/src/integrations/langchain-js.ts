/**
 * LangChain.js integration for PackFS semantic filesystem
 * LangChain JavaScript/TypeScript - https://js.langchain.com/
 */

import type { 
  BaseIntegrationConfig, 
  ToolResult, 
  ToolDescription, 
  FrameworkToolAdapter 
} from './types.js';

/**
 * LangChain-specific configuration
 */
export interface LangChainIntegrationConfig extends BaseIntegrationConfig {
  /** LangChain-specific options */
  langchain?: {
    /** Enable verbose logging */
    verbose?: boolean;
    
    /** Tool metadata for LangChain */
    metadata?: Record<string, any>;
    
    /** Custom callbacks */
    callbacks?: any[];
  };
}

/**
 * LangChain DynamicTool-compatible structure
 */
interface LangChainDynamicTool {
  name: string;
  description: string;
  func: (input: any) => Promise<string>;
  schema?: any;
}

/**
 * PackFS semantic filesystem tool for LangChain.js
 * Compatible with LangChain's tool calling and agent frameworks
 */
export class LangChainSemanticFilesystemTool implements FrameworkToolAdapter<LangChainDynamicTool> {
  createTool(config: LangChainIntegrationConfig): LangChainDynamicTool {
    return {
      name: 'semantic_filesystem',
      description: this.getToolDescription().description,
      schema: this.getLangChainSchema(),
      func: async (input: any): Promise<string> => {
        try {
          const result = await this.executeOperation(config, input);
          return this.formatLangChainResponse(result);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          return `Error: ${errorMsg}`;
        }
      }
    };
  }

  getToolDescription(): ToolDescription {
    return {
      name: 'semantic_filesystem',
      description: 'Perform intelligent file operations using semantic understanding and natural language. Can read, write, search, organize files with AI-powered understanding.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Natural language description of the file operation (e.g., "read the config file", "create a notes file with my thoughts", "find all documentation")'
          },
          operation: {
            type: 'string',
            description: 'Specific operation type',
            enum: ['read', 'write', 'search', 'list', 'organize', 'delete']
          },
          path: {
            type: 'string',
            description: 'File path when operation requires specific file'
          },
          content: {
            type: 'string',
            description: 'Content to write when creating/updating files'
          },
          pattern: {
            type: 'string',
            description: 'Search pattern or glob for finding files'
          },
          options: {
            type: 'object',
            description: 'Additional options for the operation'
          }
        },
        required: ['query']
      },
      examples: [
        {
          input: '{"query": "read the README file"}',
          description: 'Read a specific file using natural language'
        },
        {
          input: '{"query": "create a todo list file with my daily tasks"}',
          description: 'Create a new file with content'
        },
        {
          input: '{"query": "find all JavaScript files in the project"}',
          description: 'Search for files by type'
        }
      ]
    };
  }

  validateParameters(params: any): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!params.query && !params.operation) {
      errors.push('Must provide either query or operation');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private getLangChainSchema(): any {
    // LangChain.js schema format
    return {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language description of the file operation to perform'
        },
        operation: {
          type: 'string',
          description: 'Specific operation type (optional, can be inferred from query)',
          enum: ['read', 'write', 'search', 'list', 'organize', 'delete']
        },
        path: {
          type: 'string',
          description: 'File path when operation requires specific file'
        },
        content: {
          type: 'string',
          description: 'Content to write when creating/updating files'
        },
        pattern: {
          type: 'string',
          description: 'Search pattern or glob for finding files'
        },
        options: {
          type: 'object',
          description: 'Additional options for the operation',
          properties: {
            maxResults: { type: 'number' },
            includeContent: { type: 'boolean' },
            recursive: { type: 'boolean' }
          }
        }
      },
      required: ['query']
    };
  }

  private async executeOperation(config: LangChainIntegrationConfig, input: any): Promise<ToolResult> {
    const startTime = Date.now();

    // Parse input - LangChain might pass as string or object
    let params: any;
    if (typeof input === 'string') {
      try {
        params = JSON.parse(input);
      } catch {
        // If not JSON, treat as natural language query
        params = { query: input };
      }
    } else {
      params = input;
    }

    // Validate parameters
    const validation = this.validateParameters(params);
    if (!validation.valid) {
      return {
        success: false,
        error: `Invalid parameters: ${validation.errors?.join(', ')}`
      };
    }

    try {
      let result: any;

      // If we have a natural language query, use NL processing
      if (params.query && !params.operation) {
        const nlResult = await config.filesystem.interpretNaturalLanguage({
          query: params.query,
          context: {
            workingDirectory: config.workingDirectory
          }
        });

        if (!nlResult.success) {
          throw new Error(`Failed to interpret query: ${nlResult.message}`);
        }

        // Execute the interpreted intent
        result = await this.executeSemanticIntent(config, nlResult.interpretedIntent);
      } else {
        // Handle structured operations
        result = await this.executeStructuredOperation(config, params);
      }

      return {
        success: true,
        data: result,
        metadata: {
          executionTime: Date.now() - startTime,
          operationType: params.operation || 'natural_language'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async executeSemanticIntent(config: LangChainIntegrationConfig, intent: any): Promise<any> {
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

  private async executeStructuredOperation(config: LangChainIntegrationConfig, params: any): Promise<any> {
    switch (params.operation) {
      case 'read':
        return await config.filesystem.accessFile({
          purpose: 'read',
          target: { path: params.path },
          preferences: params.options
        });

      case 'write':
        return await config.filesystem.updateContent({
          purpose: params.append ? 'append' : 'create',
          target: { path: params.path },
          content: params.content,
          options: params.options
        });

      case 'search':
        const target: any = {};
        if (params.pattern && params.pattern !== '*') {
          target.pattern = params.pattern;
        }
        if (params.query) {
          target.semanticQuery = params.query;
        }
        if (!target.pattern && !target.semanticQuery) {
          target.semanticQuery = 'all files';
        }
        
        return await config.filesystem.discoverFiles({
          purpose: 'search_semantic',
          target,
          options: params.options
        });

      case 'list':
        return await config.filesystem.discoverFiles({
          purpose: 'list',
          target: { path: params.path || '.' },
          options: params.options
        });

      case 'organize':
        return await config.filesystem.organizeFiles({
          purpose: params.mode || 'move',
          source: { path: params.source },
          destination: { path: params.destination },
          options: params.options
        });

      case 'delete':
        return await config.filesystem.removeFiles({
          purpose: 'delete_file',
          target: { path: params.path },
          options: params.options
        });

      default:
        throw new Error(`Unknown operation: ${params.operation}`);
    }
  }

  private formatLangChainResponse(result: ToolResult): string {
    if (!result.success) {
      return `Error: ${result.error}`;
    }

    const data = result.data;

    // Format different types of results for LangChain text output
    if (data.content !== undefined) {
      // File content result
      return typeof data.content === 'string' ? data.content : '[Binary content]';
    }

    if (data.files && Array.isArray(data.files)) {
      // File discovery result
      const fileList = data.files.map((f: any) => {
        let info = f.path;
        if (f.metadata?.size) {
          info += ` (${f.metadata.size} bytes)`;
        }
        if (f.relevanceScore) {
          info += ` [relevance: ${f.relevanceScore.toFixed(2)}]`;
        }
        return info;
      }).join('\n');
      
      return `Found ${data.files.length} files:\n${fileList}`;
    }

    if (data.bytesWritten !== undefined) {
      // Write operation result
      return `Successfully ${data.created ? 'created' : 'updated'} file (${data.bytesWritten} bytes)`;
    }

    if (data.filesAffected !== undefined) {
      // Organization result
      return `Operation completed: ${data.filesAffected} files affected`;
    }

    if (data.filesDeleted !== undefined) {
      // Deletion result
      return `Deleted ${data.filesDeleted} files, freed ${data.freedSpace} bytes`;
    }

    if (data.exists !== undefined) {
      // Existence check - but if this was a read operation and file doesn't exist, treat as error
      if (!data.exists && data.content === undefined) {
        return 'Error: File not found';
      }
      return data.exists ? 'File exists' : 'File does not exist';
    }

    // Generic success response
    return 'Operation completed successfully';
  }
}

/**
 * Create a LangChain.js compatible semantic filesystem tool
 */
export function createLangChainSemanticFilesystemTool(config: LangChainIntegrationConfig): LangChainDynamicTool {
  const adapter = new LangChainSemanticFilesystemTool();
  return adapter.createTool(config);
}

/**
 * Create multiple specialized LangChain tools for different operations
 * Useful for agents that need granular control over file operations
 */
export function createLangChainSemanticToolSet(config: LangChainIntegrationConfig): {
  fileReader: LangChainDynamicTool;
  fileWriter: LangChainDynamicTool;
  fileSearcher: LangChainDynamicTool;
  fileManager: LangChainDynamicTool;
} {
  return {
    fileReader: {
      name: 'read_file',
      description: 'Read file content using path or natural language description',
      func: async (input: any) => {
        const params = typeof input === 'string' ? { query: input } : input;
        const result = await config.filesystem.accessFile({
          purpose: 'read',
          target: params.path ? { path: params.path } : { semanticQuery: params.query }
        });
        return result.success ? (result.content as string) : `Error: ${result.message}`;
      }
    },

    fileWriter: {
      name: 'write_file',
      description: 'Create or update files with content',
      schema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path to write to' },
          content: { type: 'string', description: 'Content to write' },
          mode: { type: 'string', enum: ['create', 'append', 'overwrite'], description: 'Write mode' }
        },
        required: ['path', 'content']
      },
      func: async (input: any) => {
        const params = typeof input === 'string' ? JSON.parse(input) : input;
        const result = await config.filesystem.updateContent({
          purpose: params.mode || 'create',
          target: { path: params.path },
          content: params.content
        });
        return result.success ? 
          `File ${result.created ? 'created' : 'updated'} successfully (${result.bytesWritten} bytes)` :
          `Error: ${result.message}`;
      }
    },

    fileSearcher: {
      name: 'search_files',
      description: 'Search for files using patterns or semantic queries',
      schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query or pattern' },
          maxResults: { type: 'number', description: 'Maximum results to return' }
        },
        required: ['query']
      },
      func: async (input: any) => {
        const params = typeof input === 'string' ? { query: input } : input;
        const result = await config.filesystem.discoverFiles({
          purpose: 'search_semantic',
          target: { semanticQuery: params.query },
          options: { maxResults: params.maxResults }
        });
        
        if (!result.success) {
          return `Error: ${result.message}`;
        }
        
        const fileList = result.files.map(f => f.path).join('\n');
        return `Found ${result.files.length} files:\n${fileList}`;
      }
    },

    fileManager: {
      name: 'manage_files',
      description: 'Move, copy, delete, and organize files',
      schema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['move', 'copy', 'delete', 'mkdir'], description: 'Management action' },
          source: { type: 'string', description: 'Source path' },
          destination: { type: 'string', description: 'Destination path (for move/copy)' }
        },
        required: ['action', 'source']
      },
      func: async (input: any) => {
        const params = typeof input === 'string' ? JSON.parse(input) : input;
        
        let result: any;
        
        switch (params.action) {
          case 'move':
          case 'copy':
            result = await config.filesystem.organizeFiles({
              purpose: params.action,
              source: { path: params.source },
              destination: { path: params.destination }
            });
            break;
            
          case 'delete':
            result = await config.filesystem.removeFiles({
              purpose: 'delete_file',
              target: { path: params.source }
            });
            break;
            
          case 'mkdir':
            result = await config.filesystem.organizeFiles({
              purpose: 'create_directory',
              destination: { path: params.source }
            });
            break;
            
          default:
            return `Error: Unknown action ${params.action}`;
        }
        
        return result.success ? 
          `${params.action} operation completed successfully` :
          `Error: ${result.message}`;
      }
    }
  };
}