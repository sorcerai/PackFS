/**
 * Intent-based API definitions for Mastra integration
 * These provide structured operation patterns for filesystem operations
 */

/**
 * Access Intent - for read operations and file information
 */
export interface AccessIntent {
  /** Type of access operation to perform */
  purpose: 'read' | 'metadata' | 'exists';
  
  /** Target specification */
  target: {
    /** Path to the file or directory */
    path: string;
    /** Text encoding for file content (default: utf8) */
    encoding?: BufferEncoding;
  };
  
  /** Optional preferences for the operation */
  preferences?: {
    /** Include file metadata in response */
    includeMetadata?: boolean;
    /** Maximum file size to read (bytes) */
    maxSize?: number;
    /** Automatically chunk large files */
    chunkIfLarge?: boolean;
  };
}

/**
 * Discover Intent - for search and list operations  
 */
export interface DiscoverIntent {
  /** Type of discovery operation */
  purpose: 'list' | 'search_content' | 'search_semantic';
  
  /** Target specification */
  target: {
    /** Directory path to search within */
    path: string;
    /** Search query for content matching */
    query?: string;
    /** Advanced search criteria */
    criteria?: {
      /** Content pattern to search for */
      content?: string;
      /** File extension filter */
      extension?: string;
      /** Date range filter */
      modified?: { 
        after?: Date; 
        before?: Date; 
      };
      /** File size range filter */
      size?: { 
        min?: number; 
        max?: number; 
      };
    };
  };
  
  /** Operation options */
  options?: {
    /** Search subdirectories recursively */
    recursive?: boolean;
    /** Maximum number of results to return */
    maxResults?: number;
    /** Include file content in results */
    includeContent?: boolean;
    /** Follow document relationships in semantic search */
    followRelationships?: boolean;
  };
}

/**
 * Update Intent - for write and modification operations
 */
export interface UpdateIntent {
  /** Type of update operation */
  purpose: 'create' | 'update' | 'append' | 'delete';
  
  /** Target specification */
  target: {
    /** Path where to create/update the file */
    path: string;
  };
  
  /** File content to write (required for content operations) */
  content?: string;
  
  /** Operation options */
  options?: {
    /** Create parent directories if needed */
    createPath?: boolean;
    /** Create backup before updating */
    backup?: boolean;
    /** Use atomic write operations */
    atomic?: boolean;
    /** Preserve document relationships during updates */
    preserveRelationships?: boolean;
  };
}

/**
 * Union type of all intent types
 */
export type Intent = AccessIntent | DiscoverIntent | UpdateIntent;

/**
 * Standard result structure for all operations
 */
export interface IntentResult<T = any> {
  /** Whether the operation succeeded */
  success: boolean;
  /** Result data (varies by operation) */
  data?: T;
  /** Error message if operation failed */
  error?: string;
  /** Operation metadata */
  metadata?: {
    /** Operation execution time in milliseconds */
    executionTime?: number;
    /** Files accessed during operation */
    filesAccessed?: string[];
    /** Type of operation performed */
    operationType?: string;
  };
}

/**
 * Access operation result data
 */
export interface AccessResultData {
  /** File content (for read operations) */
  content?: string;
  /** Whether file exists */
  exists?: boolean;
  /** File metadata */
  metadata?: {
    /** File size in bytes */
    size: number;
    /** Last modified date */
    modified: string;
    /** File type */
    type: 'file' | 'directory';
    /** File permissions (if available) */
    permissions?: string;
  };
}

/**
 * Discovery operation result data
 */
export interface DiscoveryResultData {
  /** Array of found files/directories */
  results: Array<{
    /** File/directory path */
    path: string;
    /** Type of filesystem entry */
    type: 'file' | 'directory';
    /** File content (if requested) */
    content?: string;
    /** Content snippet for search results */
    snippet?: string;
    /** Relevance score for semantic search */
    relevance?: number;
    /** File metadata */
    metadata?: {
      /** File size in bytes */
      size: number;
      /** Last modified date */
      modified: string;
    };
  }>;
  /** Total number of results found */
  totalResults: number;
}

/**
 * Update operation result data
 */
export interface UpdateResultData {
  /** Whether file was created (vs updated) */
  created?: boolean;
  /** Whether file was deleted */
  deleted?: boolean;
  /** Path of the modified file */
  path?: string;
  /** Backup file path (if backup was created) */
  backupPath?: string;
}