/**
 * Intent processing utilities for semantic filesystem operations
 * Handles intent parsing, optimization, and traditional operation conversion
 */

import {
  FileAccessIntent,
  ContentUpdateIntent,
  OrganizationIntent,
  DiscoveryIntent,
  RemovalIntent,
  FileTarget,
  WorkflowStep
} from './types';

/**
 * Converts traditional filesystem method calls to semantic intents
 * Enables backward compatibility by translating old-style calls
 */
export class TraditionalToSemanticConverter {
  /**
   * Convert readFile() call to FileAccessIntent
   */
  static readFileToIntent(path: string, options?: { encoding?: BufferEncoding }): FileAccessIntent {
    return {
      purpose: 'read',
      target: { path },
      preferences: {
        encoding: options?.encoding,
        includeMetadata: false
      }
    };
  }

  /**
   * Convert writeFile() call to ContentUpdateIntent
   */
  static writeFileToIntent(
    path: string, 
    data: string | Buffer, 
    options?: { createDirs?: boolean; mode?: number }
  ): ContentUpdateIntent {
    return {
      purpose: 'overwrite',
      target: { path },
      content: data,
      options: {
        createPath: options?.createDirs ?? false,
        mode: options?.mode
      }
    };
  }

  /**
   * Convert stat() call to FileAccessIntent
   */
  static statToIntent(path: string): FileAccessIntent {
    return {
      purpose: 'metadata',
      target: { path },
      preferences: {
        includeMetadata: true
      }
    };
  }

  /**
   * Convert exists() call to FileAccessIntent
   */
  static existsToIntent(path: string): FileAccessIntent {
    return {
      purpose: 'verify_exists',
      target: { path }
    };
  }

  /**
   * Convert mkdir() call to OrganizationIntent
   */
  static mkdirToIntent(path: string, options?: { recursive?: boolean }): OrganizationIntent {
    return {
      purpose: 'create_directory',
      destination: { path },
      options: {
        recursive: options?.recursive ?? false
      }
    };
  }

  /**
   * Convert readdir() call to DiscoveryIntent
   */
  static readdirToIntent(path: string, options?: { recursive?: boolean }): DiscoveryIntent {
    return {
      purpose: 'list',
      target: { path },
      options: {
        recursive: options?.recursive ?? false,
        includeContent: false
      }
    };
  }

  /**
   * Convert unlink() call to RemovalIntent
   */
  static unlinkToIntent(path: string): RemovalIntent {
    return {
      purpose: 'delete_file',
      target: { path }
    };
  }
}

/**
 * Optimizes and enhances semantic intents based on context and patterns
 */
export class SemanticIntentOptimizer {
  /**
   * Optimize FileAccessIntent based on usage patterns
   */
  static optimizeAccessIntent(intent: FileAccessIntent, context?: {
    recentFiles?: string[];
    workingDirectory?: string;
  }): FileAccessIntent {
    const optimized = { ...intent };

    // If accessing a recently used file for reading, suggest including metadata
    if (intent.purpose === 'read' && context?.recentFiles?.includes(intent.target.path || '')) {
      optimized.preferences = {
        ...optimized.preferences,
        includeMetadata: true
      };
    }

    // For large file access, suggest chunking
    if (intent.purpose === 'read' && !intent.preferences?.chunkingStrategy) {
      optimized.preferences = {
        ...optimized.preferences,
        chunkingStrategy: 'semantic'
      };
    }

    return optimized;
  }

  /**
   * Optimize DiscoveryIntent to improve search efficiency
   */
  static optimizeDiscoveryIntent(intent: DiscoveryIntent): DiscoveryIntent {
    const optimized = { ...intent };

    // For semantic searches, limit results and sort by relevance
    if (intent.purpose === 'search_semantic' || intent.purpose === 'search_integrated') {
      optimized.options = {
        maxResults: 50,
        sortBy: 'relevance',
        ...optimized.options
      };
    }

    // For content searches, don't include full content by default
    if (intent.purpose === 'search_content') {
      optimized.options = {
        includeContent: false,
        ...optimized.options
      };
    }

    return optimized;
  }
}

/**
 * Analyzes and validates file targets for semantic operations
 */
export class FileTargetProcessor {
  /**
   * Resolve FileTarget to concrete file paths
   */
  static async resolveTarget(
    target: FileTarget,
    basePath: string = process.cwd()
  ): Promise<string[]> {
    const paths: string[] = [];

    // Direct path specification
    if (target.path) {
      paths.push(this.resolvePath(target.path, basePath));
    }

    // Pattern-based targeting (glob patterns)
    if (target.pattern) {
      // Note: In a real implementation, this would use glob library
      // For now, return pattern as-is for backend to handle
      paths.push(target.pattern);
    }

    // Semantic query targeting would require vector search
    if (target.semanticQuery) {
      // This would be handled by the semantic backend
      // Return special marker for semantic processing
      paths.push(`__semantic:${target.semanticQuery}`);
    }

    // Criteria-based targeting
    if (target.criteria) {
      // This would be converted to search parameters
      const criteriaStr = JSON.stringify(target.criteria);
      paths.push(`__criteria:${criteriaStr}`);
    }

    return paths.length > 0 ? paths : [basePath];
  }

  /**
   * Validate FileTarget has at least one targeting method
   */
  static validateTarget(target: FileTarget): boolean {
    return !!(target.path || target.pattern || target.semanticQuery || target.criteria);
  }

  /**
   * Get target type for optimization decisions
   */
  static getTargetType(target: FileTarget): 'path' | 'pattern' | 'semantic' | 'criteria' | 'mixed' {
    const types: string[] = [];
    
    if (target.path) types.push('path');
    if (target.pattern) types.push('pattern');
    if (target.semanticQuery) types.push('semantic');
    if (target.criteria) types.push('criteria');

    return types.length === 1 ? types[0] as any : 'mixed';
  }

  private static resolvePath(path: string, basePath: string): string {
    if (path.startsWith('/')) {
      return path; // Absolute path
    }
    return `${basePath}/${path}`.replace(/\/+/g, '/');
  }
}

/**
 * Natural language processing for intent extraction
 */
export class NaturalLanguageProcessor {
  /**
   * Parse natural language queries into structured intents
   * This is a simplified implementation - real version would use NLP models
   */
  static parseQuery(query: string): {
    intent: FileAccessIntent | ContentUpdateIntent | OrganizationIntent | DiscoveryIntent | RemovalIntent;
    confidence: number;
  } {
    const lowerQuery = query.toLowerCase();

    // File writing patterns (check first since create+content is more specific than just content)
    if (lowerQuery.includes('write') || lowerQuery.includes('create') || lowerQuery.includes('save')) {
      return {
        intent: {
          purpose: 'create',
          target: this.extractFileTarget(query),
          content: this.extractContent(query)
        } as ContentUpdateIntent,
        confidence: 0.7
      };
    }

    // File reading patterns
    if (lowerQuery.includes('read') || lowerQuery.includes('show') || (lowerQuery.includes('content') && !lowerQuery.includes('with'))) {
      return {
        intent: {
          purpose: 'read',
          target: this.extractFileTarget(query)
        } as FileAccessIntent,
        confidence: 0.8
      };
    }

    // File searching patterns
    if (lowerQuery.includes('find') || lowerQuery.includes('search') || lowerQuery.includes('look for')) {
      return {
        intent: {
          purpose: 'search_semantic',
          target: this.extractFileTarget(query)
        } as DiscoveryIntent,
        confidence: 0.75
      };
    }

    // File deletion patterns
    if (lowerQuery.includes('delete') || lowerQuery.includes('remove') || lowerQuery.includes('rm')) {
      return {
        intent: {
          purpose: 'delete_file',
          target: this.extractFileTarget(query)
        } as RemovalIntent,
        confidence: 0.9
      };
    }

    // Default to file access with low confidence
    return {
      intent: {
        purpose: 'read',
        target: this.extractFileTarget(query)
      } as FileAccessIntent,
      confidence: 0.3
    };
  }

  private static extractFileTarget(query: string): FileTarget {
    // Look for "file called X" or "file named X" patterns first
    const calledMatch = query.match(/file\s+(?:called|named)\s+([^\s]+)/i);
    if (calledMatch) {
      return { path: calledMatch[1] };
    }

    // Look for file extensions
    const extMatch = query.match(/\b\w+\.\w+\b/);
    if (extMatch) {
      return { path: extMatch[0] };
    }

    // Look for quoted filenames (but not content)
    const pathMatch = query.match(/["']([^"']*\.[^"']+)["']/);
    if (pathMatch) {
      return { path: pathMatch[1] };
    }

    // Fall back to semantic query
    return { semanticQuery: query };
  }

  private static extractContent(query: string): string {
    // Extract content between quotes or after "with" or "content"
    const contentMatch = query.match(/(?:with|containing?|content)\s+["']([^"']+)["']/i);
    if (contentMatch && contentMatch[1]) {
      return contentMatch[1];
    }

    // Try to extract any quoted content
    const quotedMatch = query.match(/["']([^"']+)["']/);
    if (quotedMatch && quotedMatch[1] && !quotedMatch[1].includes('.')) {
      // Don't match filenames (containing dots)
      return quotedMatch[1];
    }

    return '';
  }
}

/**
 * Workflow builder for complex multi-step operations
 */
export class WorkflowBuilder {
  private steps: WorkflowStep[] = [];
  private stepCounter = 0;

  /**
   * Add a file access step to the workflow
   */
  addAccess(intent: FileAccessIntent, dependencies?: string[]): string {
    const stepId = `access_${++this.stepCounter}`;
    this.steps.push({
      operation: 'access',
      intent,
      dependencies,
      id: stepId
    });
    return stepId;
  }

  /**
   * Add a content update step to the workflow
   */
  addUpdate(intent: ContentUpdateIntent, dependencies?: string[]): string {
    const stepId = `update_${++this.stepCounter}`;
    this.steps.push({
      operation: 'update',
      intent,
      dependencies,
      id: stepId
    });
    return stepId;
  }

  /**
   * Add an organization step to the workflow
   */
  addOrganize(intent: OrganizationIntent, dependencies?: string[]): string {
    const stepId = `organize_${++this.stepCounter}`;
    this.steps.push({
      operation: 'organize',
      intent,
      dependencies,
      id: stepId
    });
    return stepId;
  }

  /**
   * Add a discovery step to the workflow
   */
  addDiscover(intent: DiscoveryIntent, dependencies?: string[]): string {
    const stepId = `discover_${++this.stepCounter}`;
    this.steps.push({
      operation: 'discover',
      intent,
      dependencies,
      id: stepId
    });
    return stepId;
  }

  /**
   * Add a removal step to the workflow
   */
  addRemove(intent: RemovalIntent, dependencies?: string[]): string {
    const stepId = `remove_${++this.stepCounter}`;
    this.steps.push({
      operation: 'remove',
      intent,
      dependencies,
      id: stepId
    });
    return stepId;
  }

  /**
   * Build the final workflow intent
   */
  build(_options?: { atomic?: boolean; continueOnError?: boolean }): WorkflowStep[] {
    return [...this.steps];
  }

  /**
   * Clear all steps and start over
   */
  clear(): void {
    this.steps = [];
    this.stepCounter = 0;
  }
}