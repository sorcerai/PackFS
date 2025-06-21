/**
 * Semantic interface types for PackFS
 * Based on LSFS research findings for LLM-optimized file operations
 */

// Core semantic operation results
export interface SemanticOperationResult {
  readonly success: boolean;
  readonly message?: string;
  readonly metadata?: Record<string, unknown>;
  readonly suggestions?: ErrorSuggestion[];
}

// Error recovery suggestions
export interface ErrorSuggestion {
  readonly type: 'directory_listing' | 'similar_files' | 'parent_directory' | 'alternative_path' | 'search_results';
  readonly description: string;
  readonly data: any;
  readonly confidence: number;
}

// File targeting options - multiple ways to identify files
export interface FileTarget {
  // Direct path specification
  path?: string;
  
  // Pattern-based targeting
  pattern?: string;
  
  // Semantic query targeting
  semanticQuery?: string;
  
  // Criteria-based targeting
  criteria?: {
    name?: string;
    content?: string;
    size?: { min?: number; max?: number };
    modified?: { after?: Date; before?: Date };
    type?: string[];
    tags?: string[];
  };
}

// File access operations - unified access intent
export interface FileAccessIntent {
  // What the agent wants to accomplish
  purpose: 'read' | 'preview' | 'metadata' | 'verify_exists' | 'prepare_edit' | 'create_or_get';
  
  // How to identify the file(s)
  target: FileTarget;
  
  // Preferences for handling the operation
  preferences?: {
    maxSize?: number;
    encoding?: BufferEncoding;
    chunkingStrategy?: 'none' | 'semantic' | 'fixed';
    includeMetadata?: boolean;
    createIfMissing?: boolean;
  };
}

export interface FileAccessResult extends Omit<SemanticOperationResult, 'metadata'> {
  readonly content?: string | Buffer;
  readonly metadata?: FileMetadata;
  readonly chunks?: string[];
  readonly preview?: string;
  readonly exists: boolean;
}

// Content update operations
export interface ContentUpdateIntent {
  purpose: 'create' | 'append' | 'overwrite' | 'merge' | 'patch';
  target: FileTarget;
  content: string | Buffer;
  options?: {
    createPath?: boolean;
    backupOriginal?: boolean;
    verifyContent?: boolean;
    mode?: number;
  };
}

export interface ContentUpdateResult extends SemanticOperationResult {
  readonly bytesWritten?: number;
  readonly created: boolean;
  readonly backupPath?: string;
}

// File organization operations
export interface OrganizationIntent {
  purpose: 'create_directory' | 'move' | 'copy' | 'group_semantic' | 'group_keywords';
  source?: FileTarget;
  destination: FileTarget;
  options?: {
    recursive?: boolean;
    overwrite?: boolean;
    preserveTimestamps?: boolean;
    groupingCriteria?: string;
  };
}

export interface OrganizationResult extends SemanticOperationResult {
  readonly filesAffected: number;
  readonly newPaths?: string[];
  readonly groupedFiles?: Array<{
    group: string;
    files: string[];
  }>;
}

// File discovery operations
export interface DiscoveryIntent {
  purpose: 'list' | 'find' | 'search_content' | 'search_semantic' | 'search_integrated';
  target: FileTarget;
  options?: {
    maxResults?: number;
    sortBy?: 'name' | 'size' | 'modified' | 'relevance';
    includeContent?: boolean;
    recursive?: boolean;
  };
}

export interface DiscoveryResult extends SemanticOperationResult {
  readonly files: Array<{
    path: string;
    metadata: FileMetadata;
    content?: string;
    relevanceScore?: number;
  }>;
  readonly totalFound: number;
  readonly searchTime: number;
}

// File removal operations
export interface RemovalIntent {
  purpose: 'delete_file' | 'delete_directory' | 'delete_by_criteria';
  target: FileTarget;
  options?: {
    recursive?: boolean;
    dryRun?: boolean;
    moveToTrash?: boolean;
  };
}

export interface RemovalResult extends SemanticOperationResult {
  readonly filesDeleted: number;
  readonly directoriesDeleted: number;
  readonly freedSpace: number;
  readonly deletedPaths: string[];
}

// Advanced semantic operations
export interface WorkflowStep {
  operation: 'access' | 'update' | 'organize' | 'discover' | 'remove';
  intent: FileAccessIntent | ContentUpdateIntent | OrganizationIntent | DiscoveryIntent | RemovalIntent;
  dependencies?: string[]; // IDs of previous steps this depends on
  id: string;
}

export interface WorkflowIntent {
  steps: WorkflowStep[];
  options?: {
    atomic?: boolean; // All steps succeed or all rollback
    continueOnError?: boolean;
    maxConcurrency?: number;
  };
}

export interface WorkflowResult extends SemanticOperationResult {
  readonly stepResults: Array<{
    stepId: string;
    result: SemanticOperationResult;
    duration: number;
  }>;
  readonly totalDuration: number;
  readonly rollbackRequired: boolean;
}

// Natural language operation
export interface NaturalLanguageIntent {
  query: string;
  context?: {
    workingDirectory?: string;
    recentFiles?: string[];
    agentContext?: Record<string, unknown>;
  };
}

export interface NaturalLanguageResult extends SemanticOperationResult {
  readonly interpretedIntent: 
    | FileAccessIntent 
    | ContentUpdateIntent 
    | OrganizationIntent 
    | DiscoveryIntent 
    | RemovalIntent 
    | WorkflowIntent;
  readonly confidence: number;
  readonly alternatives?: Array<{
    intent: FileAccessIntent | ContentUpdateIntent | OrganizationIntent | DiscoveryIntent | RemovalIntent;
    confidence: number;
  }>;
}

// Core FileMetadata from existing types
export interface FileMetadata {
  readonly path: string;
  readonly size: number;
  readonly mtime: Date;
  readonly isDirectory: boolean;
  readonly permissions: number;
  readonly mimeType?: string;
  readonly tags?: string[];
  readonly semanticSignature?: string; // For semantic similarity
}

// Configuration for semantic operations
export interface SemanticConfig {
  readonly defaultMaxResults: number;
  readonly semanticThreshold: number;
  readonly enableNaturalLanguage: boolean;
  readonly chunkingConfig: {
    maxChunkSize: number;
    overlapSize: number;
  };
}