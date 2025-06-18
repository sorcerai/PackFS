/**
 * Backward compatibility adapter for traditional filesystem operations
 * Translates traditional POSIX-style calls to semantic operations
 */

import { FileSystemInterface } from '../core/filesystem';
import { SemanticFileSystemInterface } from './interface';
import { TraditionalToSemanticConverter } from './intent-processor';
import type { FileMetadata, ReadOptions, WriteOptions } from '../core/types';

/**
 * Adapter that makes semantic filesystem work with traditional interface
 * Enables existing code to work with semantic backend without changes
 * 
 * This is the bridge between:
 * - Old approach: readFile(), writeFile(), stat(), exists(), etc.
 * - New approach: accessFile(), updateContent(), organizeFiles(), etc.
 */
export class SemanticCompatibilityAdapter extends FileSystemInterface {
  constructor(private semanticBackend: SemanticFileSystemInterface) {
    super();
  }

  /**
   * Traditional readFile() -> semantic accessFile()
   */
  async readFile(path: string, options?: ReadOptions): Promise<string | Buffer> {
    const intent = TraditionalToSemanticConverter.readFileToIntent(path, options);
    const result = await this.semanticBackend.accessFile(intent);
    
    if (!result.success) {
      throw new Error(result.message || `Failed to read file: ${path}`);
    }

    if (result.content === undefined) {
      throw new Error(`No content returned for file: ${path}`);
    }

    return result.content;
  }

  /**
   * Traditional writeFile() -> semantic updateContent()
   */
  async writeFile(path: string, data: string | Buffer, options?: WriteOptions): Promise<void> {
    const intent = TraditionalToSemanticConverter.writeFileToIntent(path, data, {
      createDirs: options?.createDirs,
      mode: options?.mode
    });
    
    const result = await this.semanticBackend.updateContent(intent);
    
    if (!result.success) {
      throw new Error(result.message || `Failed to write file: ${path}`);
    }
  }

  /**
   * Traditional exists() -> semantic accessFile()
   */
  async exists(path: string): Promise<boolean> {
    const intent = TraditionalToSemanticConverter.existsToIntent(path);
    const result = await this.semanticBackend.accessFile(intent);
    
    return result.exists;
  }

  /**
   * Traditional stat() -> semantic accessFile()
   */
  async stat(path: string): Promise<FileMetadata> {
    const intent = TraditionalToSemanticConverter.statToIntent(path);
    const result = await this.semanticBackend.accessFile(intent);
    
    if (!result.success) {
      throw new Error(result.message || `Failed to stat file: ${path}`);
    }

    if (!result.metadata) {
      throw new Error(`No metadata returned for file: ${path}`);
    }

    return result.metadata;
  }

  /**
   * Traditional readdir() -> semantic discoverFiles()
   */
  async readdir(path: string): Promise<string[]> {
    const intent = TraditionalToSemanticConverter.readdirToIntent(path);
    const result = await this.semanticBackend.discoverFiles(intent);
    
    if (!result.success) {
      throw new Error(result.message || `Failed to read directory: ${path}`);
    }

    // Extract just the filenames from the full file objects
    return result.files.map(file => {
      const fullPath = file.path;
      const basePath = path.endsWith('/') ? path : path + '/';
      
      if (fullPath.startsWith(basePath)) {
        const relativePath = fullPath.substring(basePath.length);
        // Return just the immediate child name (no nested paths)
        const parts = relativePath.split('/');
        return parts[0] || fullPath;
      }
      
      return fullPath;
    }).filter(Boolean);
  }

  /**
   * Traditional mkdir() -> semantic organizeFiles()
   */
  async mkdir(path: string, recursive?: boolean): Promise<void> {
    const intent = TraditionalToSemanticConverter.mkdirToIntent(path, { recursive });
    const result = await this.semanticBackend.organizeFiles(intent);
    
    if (!result.success) {
      throw new Error(result.message || `Failed to create directory: ${path}`);
    }
  }

  /**
   * Traditional remove() -> semantic removeFiles()
   */
  async remove(path: string, _recursive?: boolean): Promise<void> {
    const intent = TraditionalToSemanticConverter.unlinkToIntent(path);
    const result = await this.semanticBackend.removeFiles(intent);
    
    if (!result.success) {
      throw new Error(result.message || `Failed to remove: ${path}`);
    }
  }

  /**
   * Traditional copy() -> semantic organizeFiles()
   */
  async copy(source: string, destination: string): Promise<void> {
    const intent = {
      purpose: 'copy' as const,
      source: { path: source },
      destination: { path: destination }
    };
    
    const result = await this.semanticBackend.organizeFiles(intent);
    
    if (!result.success) {
      throw new Error(result.message || `Failed to copy from ${source} to ${destination}`);
    }
  }

  /**
   * Traditional move() -> semantic organizeFiles()
   */
  async move(source: string, destination: string): Promise<void> {
    const intent = {
      purpose: 'move' as const,
      source: { path: source },
      destination: { path: destination }
    };
    
    const result = await this.semanticBackend.organizeFiles(intent);
    
    if (!result.success) {
      throw new Error(result.message || `Failed to move from ${source} to ${destination}`);
    }
  }

  /**
   * Enhanced methods that expose semantic capabilities while maintaining compatibility
   */

  /**
   * Extended readFile with semantic features
   */
  async readFileEnhanced(path: string, options?: ReadOptions & {
    purpose?: 'read' | 'preview' | 'metadata';
    chunkingStrategy?: 'none' | 'semantic' | 'fixed';
  }): Promise<{
    content: string | Buffer;
    metadata?: FileMetadata;
    preview?: string;
    chunks?: string[];
  }> {
    const intent = {
      purpose: options?.purpose || 'read',
      target: { path },
      preferences: {
        encoding: options?.encoding,
        chunkingStrategy: options?.chunkingStrategy,
        includeMetadata: true
      }
    };
    
    const result = await this.semanticBackend.accessFile(intent);
    
    if (!result.success) {
      throw new Error(result.message || `Failed to read file: ${path}`);
    }

    return {
      content: result.content || '',
      metadata: result.metadata,
      preview: result.preview,
      chunks: result.chunks
    };
  }

  /**
   * Semantic file search through traditional interface
   */
  async findFiles(query: string, options?: {
    searchType?: 'content' | 'semantic' | 'integrated';
    maxResults?: number;
    includeContent?: boolean;
  }): Promise<Array<{
    path: string;
    metadata: FileMetadata;
    content?: string;
    relevanceScore?: number;
  }>> {
    const purpose = options?.searchType === 'content' ? 'search_content' :
                    options?.searchType === 'semantic' ? 'search_semantic' :
                    'search_integrated';
    
    const intent = {
      purpose: purpose as 'search_content' | 'search_semantic' | 'search_integrated',
      target: { semanticQuery: query },
      options: {
        maxResults: options?.maxResults,
        includeContent: options?.includeContent
      }
    };
    
    const result = await this.semanticBackend.discoverFiles(intent);
    
    if (!result.success) {
      throw new Error(result.message || `Failed to search files: ${query}`);
    }

    return result.files;
  }

  /**
   * Natural language file operations
   */
  async executeNaturalLanguage(query: string): Promise<{
    success: boolean;
    result: any;
    interpretedIntent: any;
    confidence: number;
  }> {
    // First, interpret the natural language
    const nlResult = await this.semanticBackend.interpretNaturalLanguage({
      query,
      context: {
        workingDirectory: process.cwd()
      }
    });

    if (!nlResult.success) {
      return {
        success: false,
        result: null,
        interpretedIntent: null,
        confidence: 0
      };
    }

    // Execute the interpreted intent
    const intent = nlResult.interpretedIntent;
    let result: any;

    try {
      if ('purpose' in intent) {
        switch (intent.purpose) {
          case 'read':
          case 'preview':
          case 'metadata':
          case 'verify_exists':
          case 'create_or_get':
            result = await this.semanticBackend.accessFile(intent as any);
            break;
          
          case 'create':
          case 'append':
          case 'overwrite':
          case 'merge':
          case 'patch':
            result = await this.semanticBackend.updateContent(intent as any);
            break;
          
          case 'create_directory':
          case 'move':
          case 'copy':
          case 'group_semantic':
          case 'group_keywords':
            result = await this.semanticBackend.organizeFiles(intent as any);
            break;
          
          case 'list':
          case 'find':
          case 'search_content':
          case 'search_semantic':
          case 'search_integrated':
            result = await this.semanticBackend.discoverFiles(intent as any);
            break;
          
          case 'delete_file':
          case 'delete_directory':
          case 'delete_by_criteria':
            result = await this.semanticBackend.removeFiles(intent as any);
            break;
          
          default:
            throw new Error(`Unknown intent purpose: ${(intent as any).purpose}`);
        }
      } else {
        // Handle workflow intents
        result = await this.semanticBackend.executeWorkflow(intent as any);
      }

      return {
        success: result.success,
        result,
        interpretedIntent: intent,
        confidence: nlResult.confidence
      };

    } catch (error) {
      return {
        success: false,
        result: { error: error instanceof Error ? error.message : 'Unknown error' },
        interpretedIntent: intent,
        confidence: nlResult.confidence
      };
    }
  }

  /**
   * Get access to the underlying semantic backend for advanced operations
   */
  getSemanticBackend(): SemanticFileSystemInterface {
    return this.semanticBackend;
  }
}

/**
 * Factory function to create a semantic filesystem with traditional interface
 */
export function createSemanticFileSystem(semanticBackend: SemanticFileSystemInterface): FileSystemInterface {
  return new SemanticCompatibilityAdapter(semanticBackend);
}

/**
 * Factory function to create enhanced filesystem with both traditional and semantic methods
 */
export function createEnhancedFileSystem(semanticBackend: SemanticFileSystemInterface): SemanticCompatibilityAdapter {
  return new SemanticCompatibilityAdapter(semanticBackend);
}