/**
 * Type definitions for Mastra PackFS integration
 */

import { z } from 'zod';
import { createTool } from '@mastra/core/tools';
import type { SecurityConfig } from './security/config';

/**
 * Configuration for PackFS Mastra tools
 */
export interface PackfsToolConfig {
  /** Root path that all operations must stay within */
  rootPath: string;
  
  /** Permissions for tool generation */
  permissions: Array<'read' | 'write' | 'search' | 'list'>;
  
  /** Custom Zod schemas for validation (optional) */
  schemas?: {
    access?: z.ZodSchema;
    discover?: z.ZodSchema;
    update?: z.ZodSchema;
  };
  
  /** Security configuration */
  security?: Omit<SecurityConfig, 'rootPath'>;
  
  /** Semantic processing configuration */
  semantic?: SemanticConfig;
}

/**
 * Semantic processing configuration
 */
export interface SemanticConfig {
  /** Enable document relationship processing */
  enableRelationships?: boolean;
  
  /** Chunk size for semantic processing */
  chunkSize?: number;
  
  /** Overlap size between chunks */
  overlapSize?: number;
  
  /** Relevance threshold for semantic search */
  relevanceThreshold?: number;
}

/**
 * Mastra tool type (from @mastra/core)
 */
export type MastraTool = ReturnType<typeof createTool>;

/**
 * Tool set returned by createPackfsTools
 */
export interface PackfsToolSet {
  /** File reading tool (if read permission granted) */
  fileReader?: MastraTool;
  
  /** File writing tool (if write permission granted) */
  fileWriter?: MastraTool;
  
  /** File search tool (if search permission granted) */
  fileSearcher?: MastraTool;
  
  /** File listing tool (if list permission granted) */
  fileLister?: MastraTool;
}

/**
 * Internal tool context for execution
 */
export interface ToolContext {
  /** Security validator instance */
  validator: any; // MastraSecurityValidator
  
  /** PackFS instance for operations */
  filesystem: any; // Will use the existing filesystem interface
  
  /** Tool configuration */
  config: PackfsToolConfig;
}