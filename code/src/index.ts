/**
 * PackFS - Secure filesystem access for LLM agent frameworks
 */

export * from './core/index';
export * from './backends/index';
export * from './processors/index';
export * from './semantic/index';

// Re-export types for convenience
export type {
  FileSystemInterface,
  FileSystemOptions,
  FileMetadata,
  SecurityConfig
} from './core/index';

export type {
  ContentProcessor
} from './processors/index';

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
} from './semantic/index';