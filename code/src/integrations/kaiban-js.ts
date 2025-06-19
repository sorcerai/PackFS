/**
 * KaibanJS integration for PackFS semantic filesystem
 * KaibanJS: The JavaScript Framework for Building Multi-Agent Systems - https://www.kaibanjs.com/
 */

import type {
  BaseIntegrationConfig,
  ToolResult,
  ToolDescription,
  FrameworkToolAdapter,
} from './types.js';

/**
 * KaibanJS-specific configuration
 */
export interface KaibanIntegrationConfig extends BaseIntegrationConfig {
  /** KaibanJS-specific options */
  kaiban?: {
    /** Agent ID for tracking operations */
    agentId?: string;

    /** Task context for multi-agent coordination */
    taskContext?: Record<string, any>;

    /** Enable state persistence */
    enableStatePersistence?: boolean;

    /** Custom Redux-style state handlers */
    stateHandlers?: {
      onBeforeOperation?: (operation: string, params: any) => void;
      onAfterOperation?: (operation: string, result: any) => void;
      onError?: (operation: string, error: Error) => void;
    };
  };
}

/**
 * KaibanJS Tool interface (based on KaibanJS patterns)
 */
interface KaibanTool {
  name: string;
  description: string;
  parameters?: any;
  handler: (params: any, context?: any) => Promise<any>;
  metadata?: {
    agentId?: string;
    category?: string;
    permissions?: string[];
  };
}

/**
 * KaibanJS Task Action for file operations
 */
interface KaibanTaskAction {
  type: string;
  payload: any;
  meta?: {
    agentId: string;
    timestamp: number;
    operationType: string;
  };
}

/**
 * PackFS semantic filesystem tool for KaibanJS
 * Integrated with KaibanJS's Redux-inspired state management
 */
export class KaibanSemanticFilesystemTool implements FrameworkToolAdapter<KaibanTool> {
  createTool(config: KaibanIntegrationConfig): KaibanTool {
    return {
      name: 'semantic_filesystem',
      description: this.getToolDescription().description,
      parameters: this.getKaibanParameters(),
      handler: async (params: any, context?: any): Promise<any> => {
        const agentId = config.kaiban?.agentId || context?.agentId || 'unknown';

        try {
          // Pre-operation hook
          config.kaiban?.stateHandlers?.onBeforeOperation?.(
            params.action || 'natural_query',
            params
          );

          const result = await this.executeOperation(config, params, context);

          // Post-operation hook
          config.kaiban?.stateHandlers?.onAfterOperation?.(
            params.action || 'natural_query',
            result
          );

          return this.formatKaibanResponse(result, agentId);
        } catch (error) {
          // Error hook
          const err = error instanceof Error ? error : new Error('Unknown error');
          config.kaiban?.stateHandlers?.onError?.(params.action || 'natural_query', err);

          throw err;
        }
      },
      metadata: {
        agentId: config.kaiban?.agentId,
        category: 'filesystem',
        permissions: ['read', 'write', 'search', 'organize'],
      },
    };
  }

  getToolDescription(): ToolDescription {
    return {
      name: 'semantic_filesystem',
      description:
        'Multi-agent compatible filesystem operations with semantic understanding and state management. Supports collaborative file operations across agent teams.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            description: 'Type of filesystem operation',
            enum: [
              'read',
              'write',
              'search',
              'list',
              'organize',
              'delete',
              'collaborate',
              'natural_query',
            ],
          },
          query: {
            type: 'string',
            description:
              'Natural language description of the operation for multi-agent understanding',
          },
          path: {
            type: 'string',
            description: 'File or directory path',
          },
          content: {
            type: 'string',
            description: 'Content for write operations',
          },
          searchQuery: {
            type: 'string',
            description: 'Search term or semantic query',
          },
          collaboration: {
            type: 'object',
            description: 'Multi-agent collaboration options',
          },
          options: {
            type: 'object',
            description: 'Operation-specific options',
          },
        },
        required: [],
      },
      examples: [
        {
          input:
            '{"action": "natural_query", "query": "read the shared configuration file for agent coordination"}',
          description: 'Natural language file access with agent context',
        },
        {
          input:
            '{"action": "write", "path": "shared/team-notes.md", "content": "Meeting notes", "collaboration": {"shareWith": ["agent1", "agent2"], "notifyAgents": true}}',
          description: 'Collaborative file writing with agent notification',
        },
        {
          input:
            '{"action": "search", "searchQuery": "task assignments", "collaboration": {"taskId": "coordination-123"}}',
          description: 'Search files related to specific multi-agent task',
        },
      ],
    };
  }

  validateParameters(params: any): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!params.action && !params.query) {
      errors.push('Must provide either action or query');
    }

    // Validate collaboration-specific requirements
    if (params.collaboration?.shareWith && !Array.isArray(params.collaboration.shareWith)) {
      errors.push('shareWith must be an array of agent IDs');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private getKaibanParameters(): any {
    return {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'Type of filesystem operation',
          enum: [
            'read',
            'write',
            'search',
            'list',
            'organize',
            'delete',
            'collaborate',
            'natural_query',
          ],
        },
        query: {
          type: 'string',
          description: 'Natural language description of the operation',
        },
        path: { type: 'string' },
        content: { type: 'string' },
        searchQuery: { type: 'string' },
        collaboration: {
          type: 'object',
          properties: {
            shareWith: { type: 'array', items: { type: 'string' } },
            lockFile: { type: 'boolean' },
            notifyAgents: { type: 'boolean' },
            taskId: { type: 'string' },
          },
        },
        options: { type: 'object' },
      },
    };
  }

  private async executeOperation(
    config: KaibanIntegrationConfig,
    params: any,
    context?: any
  ): Promise<ToolResult> {
    const startTime = Date.now();

    // Validate parameters
    const validation = this.validateParameters(params);
    if (!validation.valid) {
      return {
        success: false,
        error: `Invalid parameters: ${validation.errors?.join(', ')}`,
      };
    }

    try {
      let result: any;

      // Handle natural language queries or actions without specific structure
      if (params.action === 'natural_query' || (params.query && !params.action)) {
        result = await this.executeNaturalLanguageQuery(config, params.query, context);
      } else {
        result = await this.executeKaibanAction(config, params, context);
      }

      // Handle collaboration features
      if (params.collaboration) {
        result = await this.handleCollaboration(config, params.collaboration, result, context);
      }

      // Check if the semantic operation was successful
      const success = result.success !== false;

      return {
        success,
        data: result,
        error: success ? undefined : result.message || 'Operation failed',
        metadata: {
          executionTime: Date.now() - startTime,
          operationType: params.action || 'natural_query',
          agentId: context?.agentId || config.kaiban?.agentId,
          taskId: context?.taskId || params.collaboration?.taskId,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async executeNaturalLanguageQuery(
    config: KaibanIntegrationConfig,
    query: string,
    context?: any
  ): Promise<any> {
    // Ensure filesystem is initialized
    if (!config.filesystem) {
      throw new Error(
        'Filesystem is not initialized. Please provide a valid filesystem or workingDirectory.'
      );
    }

    const nlResult = await config.filesystem.interpretNaturalLanguage({
      query,
      context: {
        workingDirectory: config.workingDirectory,
        agentContext: {
          ...config.kaiban?.taskContext,
          ...context,
          agentId: config.kaiban?.agentId,
        },
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
          // Ensure filesystem is initialized
          if (!config.filesystem) {
            throw new Error(
              'Filesystem is not initialized. Please provide a valid filesystem or workingDirectory.'
            );
          }
          return await config.filesystem.accessFile(intent);

        case 'create':
        case 'append':
        case 'overwrite':
        case 'merge':
        case 'patch':
          // Ensure filesystem is initialized
          if (!config.filesystem) {
            throw new Error(
              'Filesystem is not initialized. Please provide a valid filesystem or workingDirectory.'
            );
          }
          return await config.filesystem.updateContent(intent);

        case 'create_directory':
        case 'move':
        case 'copy':
        case 'group_semantic':
        case 'group_keywords':
          // Ensure filesystem is initialized
          if (!config.filesystem) {
            throw new Error(
              'Filesystem is not initialized. Please provide a valid filesystem or workingDirectory.'
            );
          }
          return await config.filesystem.organizeFiles(intent);

        case 'list':
        case 'find':
        case 'search_content':
        case 'search_semantic':
        case 'search_integrated':
          // Ensure filesystem is initialized
          if (!config.filesystem) {
            throw new Error(
              'Filesystem is not initialized. Please provide a valid filesystem or workingDirectory.'
            );
          }
          return await config.filesystem.discoverFiles(intent);

        case 'delete_file':
        case 'delete_directory':
        case 'delete_by_criteria':
          // Ensure filesystem is initialized
          if (!config.filesystem) {
            throw new Error(
              'Filesystem is not initialized. Please provide a valid filesystem or workingDirectory.'
            );
          }
          return await config.filesystem.removeFiles(intent);
      }
    }

    // Handle workflow intents - only if it has workflow structure
    if ('steps' in intent) {
      // Ensure filesystem is initialized
      if (!config.filesystem) {
        throw new Error(
          'Filesystem is not initialized. Please provide a valid filesystem or workingDirectory.'
        );
      }
      return await config.filesystem.executeWorkflow(intent);
    }

    throw new Error('Unrecognized intent type');
  }

  private async executeKaibanAction(
    config: KaibanIntegrationConfig,
    params: any,
    context?: any
  ): Promise<any> {
    switch (params.action) {
      case 'read':
        // Ensure filesystem is initialized
        if (!config.filesystem) {
          throw new Error(
            'Filesystem is not initialized. Please provide a valid filesystem or workingDirectory.'
          );
        }
        return await config.filesystem.accessFile({
          purpose: 'read',
          target: { path: params.path },
          preferences: params.options,
        });

      case 'write':
        // Ensure filesystem is initialized
        if (!config.filesystem) {
          throw new Error(
            'Filesystem is not initialized. Please provide a valid filesystem or workingDirectory.'
          );
        }
        return await config.filesystem.updateContent({
          purpose: params.append ? 'append' : 'create',
          target: { path: params.path },
          content: params.content,
          options: params.options,
        });

      case 'search':
        // Ensure filesystem is initialized
        if (!config.filesystem) {
          throw new Error(
            'Filesystem is not initialized. Please provide a valid filesystem or workingDirectory.'
          );
        }
        return await config.filesystem.discoverFiles({
          purpose: 'search_semantic',
          target: { semanticQuery: params.searchQuery },
          options: params.options,
        });

      case 'list':
        // Ensure filesystem is initialized
        if (!config.filesystem) {
          throw new Error(
            'Filesystem is not initialized. Please provide a valid filesystem or workingDirectory.'
          );
        }
        return await config.filesystem.discoverFiles({
          purpose: 'list',
          target: { path: params.path || '.' },
          options: params.options,
        });

      case 'organize':
        // Ensure filesystem is initialized
        if (!config.filesystem) {
          throw new Error(
            'Filesystem is not initialized. Please provide a valid filesystem or workingDirectory.'
          );
        }
        return await config.filesystem.organizeFiles({
          purpose: params.operation || 'move',
          source: { path: params.source },
          destination: { path: params.destination },
          options: params.options,
        });

      case 'delete':
        // Ensure filesystem is initialized
        if (!config.filesystem) {
          throw new Error(
            'Filesystem is not initialized. Please provide a valid filesystem or workingDirectory.'
          );
        }
        return await config.filesystem.removeFiles({
          purpose: 'delete_file',
          target: { path: params.path },
          options: params.options,
        });

      case 'collaborate':
        // Special KaibanJS action for multi-agent collaboration
        return await this.handleCollaborativeOperation(config, params, context);

      default:
        throw new Error(`Unknown action: ${params.action}`);
    }
  }

  private async handleCollaboration(
    config: KaibanIntegrationConfig,
    collaboration: any,
    result: any,
    context?: any
  ): Promise<any> {
    // Add collaboration metadata to result
    const collaborativeResult = {
      ...result,
      collaboration: {
        sharedWith: collaboration.shareWith || [],
        locked: collaboration.lockFile || false,
        notified: collaboration.notifyAgents || false,
        taskId: collaboration.taskId,
        agentId: config.kaiban?.agentId || context?.agentId,
        timestamp: new Date().toISOString(),
      },
    };

    // In a real implementation, this would:
    // 1. Notify specified agents
    // 2. Update shared state
    // 3. Handle file locking
    // 4. Coordinate with task management

    return collaborativeResult;
  }

  private async handleCollaborativeOperation(
    config: KaibanIntegrationConfig,
    params: any,
    context?: any
  ): Promise<any> {
    // Special handling for multi-agent collaboration scenarios
    const agentId = config.kaiban?.agentId || context?.agentId;

    return {
      success: true,
      message: `Collaborative operation initiated by agent ${agentId}`,
      collaboration: {
        agentId,
        operation: params.operation,
        participants: params.participants || [],
        taskId: params.taskId || context?.taskId,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private formatKaibanResponse(result: ToolResult, agentId: string): any {
    if (!result.success) {
      return {
        success: false,
        error: result.error,
        agentId,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      success: true,
      data: result.data,
      metadata: {
        ...result.metadata,
        agentId,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

/**
 * Create a KaibanJS compatible semantic filesystem tool
 */
export function createKaibanSemanticFilesystemTool(config: KaibanIntegrationConfig): KaibanTool {
  const adapter = new KaibanSemanticFilesystemTool();
  return adapter.createTool(config);
}

/**
 * Create KaibanJS task actions for file operations
 * These can be dispatched through KaibanJS's Redux-style state management
 */
export function createKaibanFileSystemActions(config: KaibanIntegrationConfig) {
  const agentId = config.kaiban?.agentId || 'unknown';

  return {
    readFile: (path: string, options?: any): KaibanTaskAction => ({
      type: 'FILESYSTEM_READ',
      payload: { path, options },
      meta: {
        agentId,
        timestamp: Date.now(),
        operationType: 'read',
      },
    }),

    writeFile: (path: string, content: string, options?: any): KaibanTaskAction => ({
      type: 'FILESYSTEM_WRITE',
      payload: { path, content, options },
      meta: {
        agentId,
        timestamp: Date.now(),
        operationType: 'write',
      },
    }),

    searchFiles: (query: string, options?: any): KaibanTaskAction => ({
      type: 'FILESYSTEM_SEARCH',
      payload: { query, options },
      meta: {
        agentId,
        timestamp: Date.now(),
        operationType: 'search',
      },
    }),

    collaborateOnFile: (path: string, operation: string, agents: string[]): KaibanTaskAction => ({
      type: 'FILESYSTEM_COLLABORATE',
      payload: { path, operation, agents },
      meta: {
        agentId,
        timestamp: Date.now(),
        operationType: 'collaborate',
      },
    }),
  };
}

/**
 * Create a specialized multi-agent file coordination tool
 */
export function createKaibanMultiAgentFileCoordinator(config: KaibanIntegrationConfig): KaibanTool {
  return {
    name: 'multi_agent_file_coordinator',
    description:
      'Coordinate file operations across multiple agents with conflict resolution and state synchronization',
    parameters: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['lock', 'unlock', 'sync', 'resolve_conflict', 'broadcast_change'],
          description: 'Coordination operation',
        },
        path: { type: 'string', description: 'File path to coordinate' },
        agentIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Agents involved in coordination',
        },
        priority: { type: 'number', description: 'Operation priority for conflict resolution' },
        taskId: { type: 'string', description: 'Associated task ID' },
      },
      required: ['operation', 'path'],
    },
    handler: async (params: any, context?: any) => {
      const agentId = config.kaiban?.agentId || context?.agentId;

      // Simulate multi-agent coordination logic
      // In a real implementation, this would integrate with KaibanJS's state management

      return {
        success: true,
        coordination: {
          operation: params.operation,
          path: params.path,
          coordinatingAgent: agentId,
          participants: params.agentIds || [],
          priority: params.priority || 1,
          taskId: params.taskId,
          timestamp: new Date().toISOString(),
          status: 'coordinated',
        },
      };
    },
    metadata: {
      agentId: config.kaiban?.agentId,
      category: 'coordination',
      permissions: ['coordinate', 'lock', 'sync'],
    },
  };
}
