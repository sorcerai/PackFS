/**
 * Common types for framework integrations
 */

import type { SemanticFileSystemInterface } from '../semantic';

/**
 * Base configuration for all framework integrations
 */
export interface BaseIntegrationConfig {
  /**
   * The semantic filesystem backend to use
   * If not provided, a default filesystem will be created based on workingDirectory
   */
  filesystem?: SemanticFileSystemInterface;

  /** Working directory for filesystem operations */
  workingDirectory?: string;

  /** Security configuration */
  security?: {
    allowedPaths?: string[];
    forbiddenPaths?: string[];
    maxFileSize?: number;
    allowedExtensions?: string[];
  };

  /** Performance configuration */
  performance?: {
    maxResults?: number;
    timeoutMs?: number;
    enableCaching?: boolean;
  };
}

/**
 * Tool execution result for framework integrations
 */
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    executionTime?: number;
    filesAccessed?: string[];
    operationType?: string;
    agentId?: string;
    taskId?: string;
    [key: string]: any;
  };
}

/**
 * Natural language tool description for frameworks
 */
export interface ToolDescription {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<
      string,
      {
        type: string;
        description: string;
        enum?: string[];
        required?: boolean;
      }
    >;
    required?: string[];
  };
  examples?: Array<{
    input: string;
    description: string;
  }>;
}

/**
 * Framework-specific tool adapter interface
 */
export interface FrameworkToolAdapter<TFrameworkTool = any> {
  /** Convert PackFS semantic operations to framework-specific tool */
  createTool(config: BaseIntegrationConfig): TFrameworkTool;

  /** Get tool description for the framework */
  getToolDescription(): ToolDescription;

  /** Validate tool parameters before execution */
  validateParameters(params: any): { valid: boolean; errors?: string[] };
}
