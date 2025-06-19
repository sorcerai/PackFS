/**
 * PackFS - Secure filesystem access for LLM agent frameworks
 */

export * from './core/index.js';
export * from './backends/index.js';
export * from './processors/index.js';
export * from './semantic/index.js';
export * from './integrations/index.js';

// Re-export types for convenience
export type {
  FileSystemInterface,
  FileSystemOptions,
  FileMetadata,
  SecurityConfig
} from './core/index.js';

export type {
  ContentProcessor
} from './processors/index.js';

// Semantic interface types
export type {
  SemanticFileSystemInterface,
  FileAccessIntent,
  FileAccessResult,
  ContentUpdateIntent,
  ContentUpdateResult,
  OrganizationIntent,
  OrganizationResult,
  DiscoveryIntent,
  DiscoveryResult,
  RemovalIntent,
  RemovalResult,
  WorkflowIntent,
  WorkflowResult,
  NaturalLanguageIntent,
  NaturalLanguageResult,
  SemanticConfig
} from './semantic/index.js';