/**
 * Mastra framework integration for PackFS semantic filesystem
 * Mastra: The TypeScript AI framework - https://mastra.ai/
 */

import type {
  BaseIntegrationConfig,
  ToolResult,
  ToolDescription,
  FrameworkToolAdapter,
} from './types.js';
import { DiskSemanticBackend } from '../semantic/disk-semantic-backend.js';

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

  /**
   * Root path for filesystem operations (backward compatibility)
   * @deprecated Use workingDirectory instead
   */
  rootPath?: string;

  /**
   * Base path for filesystem operations (backward compatibility)
   * @deprecated Use workingDirectory instead
   */
  basePath?: string;
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

          // Flatten the result structure for LLM compatibility
          // LLMs expect direct access to properties like content, exists, files, etc.
          const flatResult: ToolResult = {
            success,
            error: success ? undefined : result.message || 'Operation failed',
            // Spread the result object to flatten nested properties
            ...(success && result ? result : {}),
            // Preserve metadata but enhance it with execution info
            metadata: {
              ...(result?.metadata || {}),
              executionTime: Date.now() - startTime,
              filesAccessed,
              operationType: params.operation || 'natural_language',
            },
          };
          
          // Remove any duplicate 'success' property from spreading
          if ('success' in flatResult && flatResult.success === success) {
            delete (flatResult as any).success;
            flatResult.success = success;
          }
          
          return flatResult;
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      },
    };
  }

  getToolDescription(): ToolDescription {
    return {
      name: 'semantic_filesystem',
      description:
        'Perform intelligent file operations using semantic understanding. Supports natural language queries like "create a config file", "find all documentation", or "read the main script file".\n\n' +
        'IMPORTANT: Use the workingDirectory parameter to operate on different project directories. For example:\n' +
        '- To read from a specific project: {"operation": "access", "purpose": "read", "target": {"path": "README.md"}, "workingDirectory": "/path/to/project"}\n' +
        '- To search in a context network: {"operation": "discover", "purpose": "search_semantic", "target": {"query": "configuration"}, "workingDirectory": "/path/to/context-network"}',
      parameters: {
        type: 'object',
        properties: {
          naturalLanguageQuery: {
            type: 'string',
            description:
              'Natural language description of the file operation to perform (e.g., "create a file called notes.txt with my thoughts", "find all JavaScript files", "read the README file")',
          },
          workingDirectory: {
            type: 'string',
            description: 'IMPORTANT: Specify the project directory or context network path to operate on. This allows you to work with different projects without reinitializing the tool. Use absolute paths (e.g., "/projects/my-project/context-network"). This parameter should be used whenever you need to access files in a specific project directory.',
          },
          operation: {
            type: 'string',
            description: 'Structured operation type when not using natural language',
            enum: ['access', 'update', 'discover', 'organize', 'remove'],
          },
          purpose: {
            type: 'string',
            description: 'Specific purpose within the operation type',
            enum: [
              // Access purposes
              'read',
              'preview',
              'metadata',
              'verify_exists',
              'create_or_get',
              // Update purposes
              'create',
              'append',
              'overwrite',
              'merge',
              'patch',
              // Discovery purposes
              'list',
              'find',
              'search_content',
              'search_semantic',
              'search_integrated',
              // Organization purposes
              'create_directory',
              'move',
              'copy',
              'group_semantic',
              'group_keywords',
              // Removal purposes
              'delete_file',
              'delete_directory',
              'delete_by_criteria',
            ],
          },
          target: {
            type: 'object',
            description: 'How to identify the target file(s)',
          },
          content: {
            type: 'string',
            description: 'Content to write when creating/updating files',
          },
          destination: {
            type: 'object',
            description: 'Destination for move/copy operations',
          },
          options: {
            type: 'object',
            description: 'Additional operation options',
          },
        },
        required: [],
      },
      examples: [
        {
          input: '{"naturalLanguageQuery": "create a file called todo.txt with my daily tasks"}',
          description: 'Create a new file using natural language',
        },
        {
          input: '{"naturalLanguageQuery": "find all TypeScript files in the src directory"}',
          description: 'Search for files using natural language',
        },
        {
          input: '{"naturalLanguageQuery": "read the package.json file"}',
          description: 'Access file content using natural language',
        },
        {
          input:
            '{"operation": "discover", "purpose": "search_semantic", "target": {"semanticQuery": "configuration"}}',
          description: 'Structured semantic search for configuration files',
        },
        {
          input: '{"operation": "access", "purpose": "read", "target": {"path": "README.md"}}',
          description: 'Structured file reading operation',
        },
        {
          input: '{"operation": "access", "purpose": "read", "target": {"path": "context-network/discovery.md"}, "workingDirectory": "/projects/project-a"}',
          description: 'Read file from a specific project directory',
        },
      ],
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

      if (
        ['create', 'append', 'overwrite', 'merge', 'patch'].includes(params.purpose) &&
        !params.content &&
        !params.naturalLanguageQuery
      ) {
        errors.push('Content is required for content update operations');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private async executeNaturalLanguageQuery(
    config: MastraIntegrationConfig,
    query: string
  ): Promise<any> {
    // Ensure filesystem is initialized
    if (!config.filesystem) {
      throw new Error(
        'PackFS Error: Filesystem is not initialized. ' +
        'You must provide either:\n' +
        '1. workingDirectory: an absolute path to your project directory\n' +
        '   Example: { workingDirectory: "/path/to/project" }\n' +
        '2. filesystem: a pre-initialized filesystem instance\n' +
        '   Example: { filesystem: new DiskSemanticBackend("/path/to/project") }\n\n' +
        'For more details, see: https://github.com/jwynia/PackFS/blob/main/docs/GETTING_STARTED.md'
      );
    }

    // Use the semantic filesystem's natural language processing
    const nlResult = await config.filesystem.interpretNaturalLanguage({
      query,
      context: {
        workingDirectory: config.workingDirectory,
        agentContext: config.mastra?.agentContext,
      },
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

  private async executeStructuredOperation(
    config: MastraIntegrationConfig,
    params: any
  ): Promise<any> {
    // Ensure filesystem is initialized
    if (!config.filesystem) {
      throw new Error(
        'PackFS Error: Filesystem is not initialized. ' +
        'You must provide either:\n' +
        '1. workingDirectory: an absolute path to your project directory\n' +
        '   Example: { workingDirectory: "/path/to/project" }\n' +
        '2. filesystem: a pre-initialized filesystem instance\n' +
        '   Example: { filesystem: new DiskSemanticBackend("/path/to/project") }\n\n' +
        'For more details, see: https://github.com/jwynia/PackFS/blob/main/docs/GETTING_STARTED.md'
      );
    }

    // Merge workingDirectory into options if provided
    const operationOptions = {
      ...params.options,
      ...(params.workingDirectory && { workingDirectory: params.workingDirectory })
    };

    switch (params.operation) {
      case 'access':
        return await config.filesystem.accessFile({
          purpose: params.purpose,
          target: params.target,
          preferences: params.options,
          options: operationOptions,
        });

      case 'update':
        return await config.filesystem.updateContent({
          purpose: params.purpose,
          target: params.target,
          content: params.content,
          options: operationOptions,
        });

      case 'discover':
        return await config.filesystem.discoverFiles({
          purpose: params.purpose,
          target: params.target,
          options: operationOptions,
        });

      case 'organize':
        return await config.filesystem.organizeFiles({
          purpose: params.purpose,
          source: params.source,
          destination: params.destination,
          options: operationOptions,
        });

      case 'remove':
        return await config.filesystem.removeFiles({
          purpose: params.purpose,
          target: params.target,
          options: operationOptions,
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
  // Initialize configuration with defaults and handle backward compatibility
  const normalizedConfig: MastraIntegrationConfig = {
    // Handle both rootPath and basePath for backward compatibility
    workingDirectory: config.workingDirectory || config.rootPath || config.basePath,
    // Initialize filesystem if not provided
    filesystem: config.filesystem || createDefaultFilesystem(config),
    // Copy other properties
    security: config.security,
    performance: config.performance,
    mastra: config.mastra,
  };

  // Validate configuration
  if (!normalizedConfig.workingDirectory) {
    throw new Error('PackFS Error: rootPath or basePath is required for Mastra integration');
  }

  if (!normalizedConfig.filesystem) {
    throw new Error(
      'PackFS Error: Could not initialize filesystem. Please provide a valid filesystem object or rootPath.'
    );
  }

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
            description:
              'Natural language description of what file to read (e.g., "read the main configuration file", "show me the README")',
          },
          path: {
            type: 'string',
            description: 'Direct file path if known',
          },
          purpose: {
            type: 'string',
            enum: ['read', 'preview', 'metadata'],
            description: 'How to access the file',
          },
          context: {
            type: 'object',
            description: 'Context object for backward compatibility',
          },
        },
        required: [],
      },
      execute: async (params: any) => {
        try {
          // Handle both direct parameters and wrapped context
          const inputParams = params.context || params;

          if (inputParams.query) {
            const result = await baseAdapter.createTool(normalizedConfig).execute({
              naturalLanguageQuery: inputParams.query,
            });

            // The base adapter already flattens, but keep consistent with other methods
            return result;
          } else {
            // Handle different parameter formats
            const purpose = inputParams.purpose || 'read';
            const path = inputParams.path || (inputParams.target && inputParams.target.path);

            if (!path) {
              return {
                success: false,
                error: 'Path is required for file operations',
                troubleshooting: {
                  expectedFormat: 'Either provide path directly or target.path in context object',
                  example:
                    '{ path: "file.txt", purpose: "read" } or { context: { purpose: "read", target: { path: "file.txt" } } }',
                },
              };
            }

            const result = await baseAdapter.createTool(normalizedConfig).execute({
              operation: 'access',
              purpose: purpose,
              target: { path: path },
              preferences: inputParams.preferences || inputParams.options,
            });

            // Ensure consistent response structure and include content field
            if (result.success) {
              return {
                success: true,
                exists: result.exists,
                content: result.content,
                metadata: result.metadata,
                executionMetadata: result.metadata,
              };
            }
            return result;
          }
        } catch (error) {
          return {
            success: false,
            error:
              error instanceof Error ? `PackFS Error: ${error.message}` : 'Unknown PackFS error',
            troubleshooting: {
              checkConfiguration: true,
              suggestedFix: 'Ensure filesystem object is properly initialized and path is valid',
            },
          };
        }
      },
    },

    fileWriter: {
      name: 'write_file',
      description: 'Create and modify files with intelligent content handling',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'Natural language description of what to write (e.g., "create a README with project info", "add my notes to the todo file")',
          },
          path: {
            type: 'string',
            description: 'File path to write to',
          },
          content: {
            type: 'string',
            description: 'Content to write',
          },
          mode: {
            type: 'string',
            enum: ['create', 'append', 'overwrite'],
            description: 'How to write the content',
          },
          context: {
            type: 'object',
            description: 'Context object for backward compatibility',
          },
        },
        required: [],
      },
      execute: async (params: any) => {
        try {
          // Handle both direct parameters and wrapped context
          const inputParams = params.context || params;

          if (inputParams.query) {
            const result = await baseAdapter.createTool(normalizedConfig).execute({
              naturalLanguageQuery: inputParams.query,
            });

            // The base adapter already flattens, but keep consistent with other methods
            return result;
          } else {
            // Handle different parameter formats
            const purpose = inputParams.purpose || inputParams.mode || 'create';
            const path = inputParams.path || (inputParams.target && inputParams.target.path);
            const content = inputParams.content;

            if (!path) {
              return {
                success: false,
                error: 'Path is required for file operations',
                troubleshooting: {
                  expectedFormat: 'Either provide path directly or target.path in context object',
                  example:
                    '{ path: "file.txt", content: "data", mode: "create" } or { context: { purpose: "create", target: { path: "file.txt" }, content: "data" } }',
                },
              };
            }

            if (!content && ['create', 'update', 'append'].includes(purpose)) {
              return {
                success: false,
                error: 'Content is required for write operations',
                troubleshooting: {
                  expectedFormat: 'Provide content parameter with the data to write',
                  example: '{ path: "file.txt", content: "data", mode: "create" }',
                },
              };
            }

            const result = await baseAdapter.createTool(normalizedConfig).execute({
              operation: 'update',
              purpose: purpose,
              target: { path: path },
              content: content,
              options: inputParams.options,
            });

            // Ensure consistent response structure
            if (result.success) {
              // Result is already flattened by base adapter
              return result;
            }
            return result;
          }
        } catch (error) {
          return {
            success: false,
            error:
              error instanceof Error ? `PackFS Error: ${error.message}` : 'Unknown PackFS error',
            troubleshooting: {
              checkConfiguration: true,
              suggestedFix:
                'Ensure filesystem object is properly initialized and parameters are valid',
            },
          };
        }
      },
    },

    fileSearcher: {
      name: 'search_files',
      description: 'Find files using semantic search and natural language queries',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'Natural language search query (e.g., "find all JavaScript files", "look for configuration files", "search for files about machine learning")',
          },
          pattern: {
            type: 'string',
            description: 'Glob pattern for file matching',
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of results to return',
          },
          context: {
            type: 'object',
            description: 'Context object for backward compatibility',
          },
        },
        required: [],
      },
      execute: async (params: any) => {
        try {
          // Handle both direct parameters and wrapped context
          const inputParams = params.context || params;

          if (inputParams.query) {
            const result = await baseAdapter.createTool(normalizedConfig).execute({
              naturalLanguageQuery: inputParams.query,
            });

            // The base adapter already flattens, so check top-level properties
            if (result.success) {
              return {
                success: true,
                results: result.files || result.results || [],
                totalFound: result.totalFound || 0,
                searchTime: result.searchTime || 0,
                metadata: result.metadata,
              };
            }
            return result;
          } else {
            // Handle different parameter formats
            const purpose = inputParams.purpose || 'search_content';
            const path = inputParams.path || (inputParams.target && inputParams.target.path) || '.';
            const query = inputParams.searchQuery || inputParams.pattern || '';

            const result = await baseAdapter.createTool(normalizedConfig).execute({
              operation: 'discover',
              purpose: purpose,
              target: {
                path: path,
                query: query,
                criteria: inputParams.criteria,
              },
              options: inputParams.options || {
                maxResults: inputParams.maxResults,
                recursive: true,
              },
            });

            // Fix response structure: convert 'files' to 'results' and ensure proper structure
            if (result.success) {
              return {
                success: true,
                results: result.files || result.results || [],
                totalFound: result.totalFound || 0,
                searchTime: result.searchTime || 0,
                metadata: result.metadata,
              };
            }
            return result;
          }
        } catch (error) {
          return {
            success: false,
            error:
              error instanceof Error ? `PackFS Error: ${error.message}` : 'Unknown PackFS error',
            troubleshooting: {
              checkConfiguration: true,
              suggestedFix:
                'Ensure filesystem object is properly initialized and parameters are valid',
            },
          };
        }
      },
    },

    fileOrganizer: {
      name: 'organize_files',
      description: 'Move, copy, and organize files intelligently',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'Natural language description of organization task (e.g., "move all images to photos folder", "copy config files to backup")',
          },
          operation: {
            type: 'string',
            enum: ['move', 'copy', 'create_directory', 'list'],
            description: 'Organization operation to perform',
          },
          source: {
            type: 'string',
            description: 'Source file or pattern',
          },
          destination: {
            type: 'string',
            description: 'Destination path',
          },
          context: {
            type: 'object',
            description: 'Context object for backward compatibility',
          },
        },
        required: [],
      },
      execute: async (params: any) => {
        try {
          // Handle both direct parameters and wrapped context
          const inputParams = params.context || params;

          if (inputParams.query) {
            const result = await baseAdapter.createTool(normalizedConfig).execute({
              naturalLanguageQuery: inputParams.query,
            });

            // The base adapter already flattens, but keep consistent with other methods
            return result;
          } else {
            // Special handling for list operation which is actually a discover operation
            if (inputParams.purpose === 'list' || inputParams.operation === 'list') {
              // Use source parameter if provided, otherwise fall back to path or target.path
              const path =
                inputParams.source ||
                inputParams.path ||
                (inputParams.target && inputParams.target.path) ||
                '.';

              const result = await baseAdapter.createTool(normalizedConfig).execute({
                operation: 'discover',
                purpose: 'list',
                target: { path: path },
                options: inputParams.options,
              });

              // Fix response structure: convert 'files' to 'results' and ensure proper structure
              if (result.success) {
                return {
                  success: true,
                  results: result.files || result.results || [],
                  totalFound: result.totalFound || 0,
                  searchTime: result.searchTime || 0,
                  metadata: result.metadata,
                };
              }
              return result;
            }

            // Handle different parameter formats for other operations
            const purpose = inputParams.purpose || inputParams.operation || 'move';
            const sourcePath =
              inputParams.source || (inputParams.target && inputParams.target.path);
            const destPath = inputParams.destination || inputParams.dest;

            if (!sourcePath && purpose !== 'create_directory') {
              return {
                success: false,
                error: 'Source path is required for organize operations',
                troubleshooting: {
                  expectedFormat: 'Provide source parameter with the file/directory to organize',
                  example: '{ operation: "move", source: "file.txt", destination: "folder/" }',
                },
              };
            }

            if (!destPath) {
              return {
                success: false,
                error: 'Destination path is required for organize operations',
                troubleshooting: {
                  expectedFormat: 'Provide destination parameter with the target location',
                  example: '{ operation: "move", source: "file.txt", destination: "folder/" }',
                },
              };
            }

            // For create_directory operation, we don't need a source
            if (purpose === 'create_directory') {
              const result = await baseAdapter.createTool(normalizedConfig).execute({
                operation: 'organize',
                purpose: purpose,
                destination: { path: destPath },
                options: inputParams.options,
              });

              // Ensure consistent response structure
              if (result.success && result.data) {
                return {
                  success: true,
                  ...result.data,
                  metadata: result.metadata,
                };
              }
              return result;
            }

            // For other operations like copy and move, we need both source and destination
            try {
              const result = await baseAdapter.createTool(normalizedConfig).execute({
                operation: 'organize',
                purpose: purpose,
                source: { path: sourcePath },
                destination: { path: destPath },
                options: inputParams.options,
              });

              // If operation failed, provide more detailed error information
              if (!result.success) {
                console.log(`File organization operation failed: ${purpose}`, {
                  source: sourcePath,
                  destination: destPath,
                  error: result.message || result.error || 'Unknown error',
                });

                return {
                  success: false,
                  error: `Failed to ${purpose} file: ${result.message || result.error || 'Unknown error'}`,
                  troubleshooting: {
                    operation: purpose,
                    source: sourcePath,
                    destination: destPath,
                    suggestedFix: 'Check file paths and permissions',
                  },
                  originalError: result,
                };
              }

              // Ensure consistent response structure
              if (result.success) {
                // Result is already flattened by base adapter
                return result;
              }
              return result;
            } catch (error) {
              console.error(`Exception in ${purpose} operation:`, error);
              throw error;
            }
          }
        } catch (error) {
          return {
            success: false,
            error:
              error instanceof Error ? `PackFS Error: ${error.message}` : 'Unknown PackFS error',
            troubleshooting: {
              checkConfiguration: true,
              suggestedFix:
                'Ensure filesystem object is properly initialized and parameters are valid',
            },
          };
        }
      },
    },
  };
}

/**
 * Create a default filesystem instance based on configuration
 */
function createDefaultFilesystem(config: MastraIntegrationConfig): any {
  try {
    // Get base path from config
    const basePath = config.workingDirectory || config.rootPath || config.basePath;

    if (!basePath) {
      throw new Error('rootPath or basePath is required to create a filesystem');
    }

    // Create semantic backend
    const semanticBackend = new DiskSemanticBackend(basePath, {
      enableNaturalLanguage: true,
      semanticThreshold: 0.5,
      chunkingConfig: {
        maxChunkSize: 1024,
        overlapSize: 128,
      },
    });

    // Initialize backend
    semanticBackend.initialize().catch(console.error);

    // Create filesystem interface adapter
    return {
      accessFile: async (params: any) => {
        return semanticBackend.accessFile(params);
      },
      updateContent: async (params: any) => {
        return semanticBackend.updateContent(params);
      },
      discoverFiles: async (params: any) => {
        return semanticBackend.discoverFiles(params);
      },
      organizeFiles: async (params: any) => {
        return semanticBackend.organizeFiles(params);
      },
      removeFiles: async (params: any) => {
        return semanticBackend.removeFiles(params);
      },
      executeWorkflow: async (params: any) => {
        return semanticBackend.executeWorkflow(params);
      },
      interpretNaturalLanguage: async (params: any) => {
        return semanticBackend.interpretNaturalLanguage(params);
      },
    };
  } catch (error) {
    console.error('Failed to create default filesystem:', error);
    throw new Error(
      `Failed to create default filesystem: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
