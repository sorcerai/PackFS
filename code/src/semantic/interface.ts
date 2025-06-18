/**
 * Semantic filesystem interface for PackFS
 * Based on LSFS research: unified intent-based operations instead of traditional POSIX methods
 */

import {
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
} from './types';

/**
 * Abstract semantic filesystem interface
 * Replaces traditional POSIX-style methods with unified intent-based operations
 * 
 * Traditional approach had 9+ separate methods:
 * - readFile(), writeFile(), stat(), exists(), mkdir(), etc.
 * 
 * LSFS approach unifies these into 5 semantic operations:
 * - accessFile() - handles read, stat, exists, preview, create_or_get
 * - updateContent() - handles write, append, create, merge, patch
 * - organizeFiles() - handles mkdir, move, copy, grouping
 * - discoverFiles() - handles readdir, find, search
 * - removeFiles() - handles unlink, rmdir, deletion by criteria
 */
export abstract class SemanticFileSystemInterface {
  protected config: SemanticConfig;

  constructor(config: Partial<SemanticConfig> = {}) {
    this.config = {
      defaultMaxResults: 100,
      semanticThreshold: 0.7,
      enableNaturalLanguage: true,
      chunkingConfig: {
        maxChunkSize: 512,
        overlapSize: 64
      },
      ...config
    };
  }

  /**
   * Unified file access operation
   * Replaces: readFile(), stat(), exists(), open(), preview()
   * 
   * Examples:
   * - purpose: 'read' -> returns full content
   * - purpose: 'preview' -> returns summary/first chunk
   * - purpose: 'metadata' -> returns file info only
   * - purpose: 'verify_exists' -> returns existence check
   * - purpose: 'create_or_get' -> creates if missing, gets if exists
   */
  abstract accessFile(intent: FileAccessIntent): Promise<FileAccessResult>;

  /**
   * Unified content update operation  
   * Replaces: writeFile(), appendFile(), touch(), create()
   * 
   * Examples:
   * - purpose: 'create' -> creates new file
   * - purpose: 'overwrite' -> replaces existing content
   * - purpose: 'append' -> adds to existing content
   * - purpose: 'merge' -> intelligently combines content
   * - purpose: 'patch' -> applies specific changes
   */
  abstract updateContent(intent: ContentUpdateIntent): Promise<ContentUpdateResult>;

  /**
   * Unified file organization operation
   * Replaces: mkdir(), rename(), copy(), move()
   * 
   * Examples:
   * - purpose: 'create_directory' -> makes directories
   * - purpose: 'move' -> relocates files
   * - purpose: 'copy' -> duplicates files
   * - purpose: 'group_semantic' -> organizes by content similarity
   * - purpose: 'group_keywords' -> organizes by extracted keywords
   */
  abstract organizeFiles(intent: OrganizationIntent): Promise<OrganizationResult>;

  /**
   * Unified file discovery operation
   * Replaces: readdir(), find(), grep(), search()
   * 
   * Examples:
   * - purpose: 'list' -> directory contents
   * - purpose: 'find' -> files by criteria
   * - purpose: 'search_content' -> files containing text
   * - purpose: 'search_semantic' -> files by meaning
   * - purpose: 'search_integrated' -> combines multiple search types
   */
  abstract discoverFiles(intent: DiscoveryIntent): Promise<DiscoveryResult>;

  /**
   * Unified file removal operation
   * Replaces: unlink(), rmdir(), rm -rf
   * 
   * Examples:
   * - purpose: 'delete_file' -> removes single file
   * - purpose: 'delete_directory' -> removes directory
   * - purpose: 'delete_by_criteria' -> removes files matching conditions
   */
  abstract removeFiles(intent: RemovalIntent): Promise<RemovalResult>;

  /**
   * Advanced: Execute multi-step file operations atomically
   * Enables complex workflows with rollback capability
   */
  abstract executeWorkflow(workflow: WorkflowIntent): Promise<WorkflowResult>;

  /**
   * Advanced: Natural language to semantic intent translation
   * Enables "find files about machine learning from last week" style queries
   */
  abstract interpretNaturalLanguage(intent: NaturalLanguageIntent): Promise<NaturalLanguageResult>;

  /**
   * Get current semantic configuration
   */
  getConfig(): SemanticConfig {
    return { ...this.config };
  }

  /**
   * Update semantic configuration
   */
  updateConfig(updates: Partial<SemanticConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

/**
 * Validation utilities for semantic intents
 */
export class SemanticIntentValidator {
  static validateFileAccessIntent(intent: FileAccessIntent): string[] {
    const errors: string[] = [];

    if (!intent.purpose) {
      errors.push('FileAccessIntent must specify purpose');
    }

    if (!intent.target || (!intent.target.path && !intent.target.pattern && !intent.target.semanticQuery && !intent.target.criteria)) {
      errors.push('FileAccessIntent must specify target (path, pattern, semanticQuery, or criteria)');
    }

    if (intent.purpose === 'create_or_get' && !intent.target.path) {
      errors.push('create_or_get purpose requires specific path target');
    }

    return errors;
  }

  static validateContentUpdateIntent(intent: ContentUpdateIntent): string[] {
    const errors: string[] = [];

    if (!intent.purpose) {
      errors.push('ContentUpdateIntent must specify purpose');
    }

    if (!intent.target || !intent.target.path) {
      errors.push('ContentUpdateIntent requires specific path target');
    }

    if (!intent.content && intent.purpose !== 'create') {
      errors.push('ContentUpdateIntent must provide content for non-create operations');
    }

    return errors;
  }

  static validateOrganizationIntent(intent: OrganizationIntent): string[] {
    const errors: string[] = [];

    if (!intent.purpose) {
      errors.push('OrganizationIntent must specify purpose');
    }

    if (!intent.destination) {
      errors.push('OrganizationIntent must specify destination');
    }

    if ((intent.purpose === 'move' || intent.purpose === 'copy') && !intent.source) {
      errors.push('Move and copy operations require source target');
    }

    return errors;
  }

  static validateDiscoveryIntent(intent: DiscoveryIntent): string[] {
    const errors: string[] = [];

    if (!intent.purpose) {
      errors.push('DiscoveryIntent must specify purpose');
    }

    if (!intent.target) {
      errors.push('DiscoveryIntent must specify target');
    }

    if (intent.purpose === 'list' && !intent.target.path) {
      errors.push('List operation requires path target');
    }

    return errors;
  }

  static validateRemovalIntent(intent: RemovalIntent): string[] {
    const errors: string[] = [];

    if (!intent.purpose) {
      errors.push('RemovalIntent must specify purpose');
    }

    if (!intent.target) {
      errors.push('RemovalIntent must specify target');
    }

    return errors;
  }
}