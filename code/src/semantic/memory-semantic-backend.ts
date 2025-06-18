/**
 * Memory-based semantic filesystem backend
 * Implements the semantic interface using in-memory storage with vector indexing simulation
 */

import { SemanticFileSystemInterface } from './interface';
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
  FileMetadata,
  SemanticConfig
} from './types';
import { FileTargetProcessor, NaturalLanguageProcessor } from './intent-processor';

interface SemanticMemoryFile {
  data: Buffer;
  metadata: FileMetadata;
  semanticSignature?: string;
  keywords: string[];
  contentPreview: string;
}

/**
 * In-memory implementation of semantic filesystem
 * Uses simulated vector indexing for semantic operations
 */
export class MemorySemanticBackend extends SemanticFileSystemInterface {
  private files = new Map<string, SemanticMemoryFile>();
  private semanticIndex = new Map<string, string[]>(); // keyword -> file paths

  constructor(config?: Partial<SemanticConfig>) {
    super(config);
  }

  async accessFile(intent: FileAccessIntent): Promise<FileAccessResult> {
    const targets = await FileTargetProcessor.resolveTarget(intent.target);
    
    // Handle single file operations
    if (targets.length === 1 && targets[0] && !targets[0].startsWith('__')) {
      const filePath = targets[0];
      return this.handleSingleFileAccess(filePath, intent);
    }

    // Handle semantic/criteria-based targeting
    const matchingFiles = await this.findFilesByTarget(intent.target);
    
    // For verify_exists, we always return success with exists status
    if (intent.purpose === 'verify_exists') {
      return {
        success: true,
        exists: matchingFiles.length > 0,
        message: matchingFiles.length > 0 ? `Found ${matchingFiles.length} matching files` : 'No files found'
      };
    }
    
    if (matchingFiles.length === 0) {
      return {
        success: false,
        message: 'No files found matching target criteria',
        exists: false
      };
    }

    // Return first match for read operations
    const firstMatch = matchingFiles[0];
    if (!firstMatch) {
      return {
        success: false,
        message: 'No files found matching target criteria',
        exists: false
      };
    }
    return this.handleSingleFileAccess(firstMatch, intent);
  }

  async updateContent(intent: ContentUpdateIntent): Promise<ContentUpdateResult> {
    const targets = await FileTargetProcessor.resolveTarget(intent.target);
    const filePath = targets[0];

    if (!filePath || filePath.startsWith('__')) {
      return {
        success: false,
        message: 'Content update requires specific file path',
        created: false
      };
    }

    const exists = this.files.has(filePath);
    
    // Handle different update purposes
    switch (intent.purpose) {
      case 'create':
        if (exists && !intent.options?.createPath) {
          return {
            success: false,
            message: 'File already exists',
            created: false
          };
        }
        break;
      
      case 'append':
        if (!exists) {
          return {
            success: false,
            message: 'Cannot append to non-existent file',
            created: false
          };
        }
        break;
      
      case 'overwrite':
      case 'merge':
      case 'patch':
        // These operations work with or without existing file
        break;
    }

    // Perform the update
    const result = await this.performContentUpdate(filePath, intent);
    return result;
  }

  async organizeFiles(intent: OrganizationIntent): Promise<OrganizationResult> {
    switch (intent.purpose) {
      case 'create_directory':
        // In memory backend, directories are implicit
        return {
          success: true,
          filesAffected: 0,
          message: 'Directory created (implicit in memory backend)'
        };

      case 'move':
        return await this.moveFiles(intent);

      case 'copy':
        return await this.copyFiles(intent);

      case 'group_semantic':
      case 'group_keywords':
        return await this.groupFiles(intent);

      default:
        return {
          success: false,
          filesAffected: 0,
          message: `Unsupported organization purpose: ${intent.purpose}`
        };
    }
  }

  async discoverFiles(intent: DiscoveryIntent): Promise<DiscoveryResult> {
    const startTime = Date.now();
    
    switch (intent.purpose) {
      case 'list':
        return await this.listFiles(intent);
      
      case 'find':
        return await this.findFiles(intent);
      
      case 'search_content':
        return await this.searchContent(intent);
      
      case 'search_semantic':
        return await this.searchSemantic(intent);
      
      case 'search_integrated':
        return await this.searchIntegrated(intent);
      
      default:
        return {
          success: false,
          files: [],
          totalFound: 0,
          searchTime: Date.now() - startTime,
          message: `Unsupported discovery purpose: ${intent.purpose}`
        };
    }
  }

  async removeFiles(intent: RemovalIntent): Promise<RemovalResult> {
    const matchingFiles = await this.findFilesByTarget(intent.target);
    
    if (matchingFiles.length === 0) {
      return {
        success: false,
        filesDeleted: 0,
        directoriesDeleted: 0,
        freedSpace: 0,
        deletedPaths: [],
        message: 'No files found matching removal criteria'
      };
    }

    // Handle dry run
    if (intent.options?.dryRun) {
      const totalSize = matchingFiles.reduce((sum, path) => {
        const file = this.files.get(path);
        return sum + (file?.metadata.size || 0);
      }, 0);

      return {
        success: true,
        filesDeleted: matchingFiles.length,
        directoriesDeleted: 0,
        freedSpace: totalSize,
        deletedPaths: matchingFiles,
        message: `Would delete ${matchingFiles.length} files (dry run)`
      };
    }

    // Perform actual deletion
    let freedSpace = 0;
    const deletedPaths: string[] = [];

    for (const filePath of matchingFiles) {
      const file = this.files.get(filePath);
      if (file) {
        freedSpace += file.metadata.size;
        this.files.delete(filePath);
        this.removeFromSemanticIndex(filePath);
        deletedPaths.push(filePath);
      }
    }

    return {
      success: true,
      filesDeleted: deletedPaths.length,
      directoriesDeleted: 0,
      freedSpace,
      deletedPaths
    };
  }

  async executeWorkflow(workflow: WorkflowIntent): Promise<WorkflowResult> {
    const startTime = Date.now();
    const stepResults: Array<{
      stepId: string;
      result: any;
      duration: number;
    }> = [];

    let rollbackRequired = false;

    for (const step of workflow.steps) {
      const stepStartTime = Date.now();
      
      try {
        let result;
        
        switch (step.operation) {
          case 'access':
            result = await this.accessFile(step.intent as FileAccessIntent);
            break;
          case 'update':
            result = await this.updateContent(step.intent as ContentUpdateIntent);
            break;
          case 'organize':
            result = await this.organizeFiles(step.intent as OrganizationIntent);
            break;
          case 'discover':
            result = await this.discoverFiles(step.intent as DiscoveryIntent);
            break;
          case 'remove':
            result = await this.removeFiles(step.intent as RemovalIntent);
            break;
          default:
            throw new Error(`Unknown operation: ${step.operation}`);
        }

        stepResults.push({
          stepId: step.id,
          result,
          duration: Date.now() - stepStartTime
        });

        // Check if step failed and workflow is atomic
        if (!result.success && workflow.options?.atomic) {
          rollbackRequired = true;
          break;
        }

      } catch (error) {
        stepResults.push({
          stepId: step.id,
          result: {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error'
          },
          duration: Date.now() - stepStartTime
        });

        if (workflow.options?.atomic || !workflow.options?.continueOnError) {
          rollbackRequired = true;
          break;
        }
      }
    }

    return {
      success: !rollbackRequired,
      stepResults,
      totalDuration: Date.now() - startTime,
      rollbackRequired
    };
  }

  async interpretNaturalLanguage(intent: NaturalLanguageIntent): Promise<NaturalLanguageResult> {
    const parsed = NaturalLanguageProcessor.parseQuery(intent.query);
    
    return {
      success: true,
      interpretedIntent: parsed.intent,
      confidence: parsed.confidence,
      message: `Interpreted query: "${intent.query}"`
    };
  }

  // Private helper methods

  private async handleSingleFileAccess(filePath: string, intent: FileAccessIntent): Promise<FileAccessResult> {
    const file = this.files.get(filePath);

    if (!file) {
      if (intent.purpose === 'create_or_get') {
        // Create empty file
        const newFile: SemanticMemoryFile = {
          data: Buffer.from(''),
          metadata: {
            path: filePath,
            size: 0,
            mtime: new Date(),
            isDirectory: false,
            permissions: 0o644
          },
          keywords: [],
          contentPreview: ''
        };
        this.files.set(filePath, newFile);
        
        return {
          success: true,
          content: '',
          metadata: newFile.metadata,
          exists: true
        };
      }

      // For verify_exists, success means the operation worked, exists indicates file presence
      if (intent.purpose === 'verify_exists') {
        return {
          success: true,
          exists: false,
          message: `File not found: ${filePath}`
        };
      }

      return {
        success: false,
        exists: false,
        message: `File not found: ${filePath}`
      };
    }

    // Handle different access purposes
    switch (intent.purpose) {
      case 'read':
        return {
          success: true,
          content: file.data.toString(intent.preferences?.encoding || 'utf8'),
          metadata: intent.preferences?.includeMetadata ? file.metadata : undefined,
          exists: true
        };

      case 'preview':
        return {
          success: true,
          preview: file.contentPreview || file.data.toString('utf8').substring(0, 200),
          metadata: file.metadata,
          exists: true
        };

      case 'metadata':
        return {
          success: true,
          metadata: file.metadata,
          exists: true
        };

      case 'verify_exists':
        return {
          success: true,
          exists: true
        };

      case 'create_or_get':
        return {
          success: true,
          content: file.data.toString(intent.preferences?.encoding || 'utf8'),
          metadata: file.metadata,
          exists: true
        };

      default:
        return {
          success: false,
          exists: true,
          message: `Unsupported access purpose: ${intent.purpose}`
        };
    }
  }

  private async performContentUpdate(filePath: string, intent: ContentUpdateIntent): Promise<ContentUpdateResult> {
    const existingFile = this.files.get(filePath);
    let newContent: Buffer;
    let created = false;

    const contentBuffer = typeof intent.content === 'string' 
      ? Buffer.from(intent.content, 'utf8')
      : intent.content;

    switch (intent.purpose) {
      case 'create':
      case 'overwrite':
        newContent = contentBuffer;
        created = !existingFile;
        break;

      case 'append':
        if (!existingFile) {
          throw new Error('Cannot append to non-existent file');
        }
        newContent = Buffer.concat([existingFile.data, contentBuffer]);
        break;

      case 'merge':
        if (existingFile) {
          // Simple merge - in real implementation would be more sophisticated
          const existingContent = existingFile.data.toString('utf8');
          const newContentStr = contentBuffer.toString('utf8');
          newContent = Buffer.from(`${existingContent}\n${newContentStr}`, 'utf8');
        } else {
          newContent = contentBuffer;
          created = true;
        }
        break;

      case 'patch':
        // Simplified patch - real implementation would handle diffs
        newContent = contentBuffer;
        break;

      default:
        throw new Error(`Unsupported update purpose: ${intent.purpose}`);
    }

    // Create the updated file
    const contentStr = newContent.toString('utf8');
    const keywords = this.extractKeywords(contentStr);
    const preview = contentStr.substring(0, 200);

    const updatedFile: SemanticMemoryFile = {
      data: newContent,
      metadata: {
        path: filePath,
        size: newContent.length,
        mtime: new Date(),
        isDirectory: false,
        permissions: intent.options?.mode || 0o644
      },
      keywords,
      contentPreview: preview
    };

    this.files.set(filePath, updatedFile);
    this.updateSemanticIndex(filePath, keywords);

    return {
      success: true,
      bytesWritten: newContent.length,
      created
    };
  }

  private async findFilesByTarget(target: any): Promise<string[]> {
    if (target.path) {
      return this.files.has(target.path) ? [target.path] : [];
    }

    if (target.semanticQuery) {
      return this.findBySemanticQuery(target.semanticQuery);
    }

    if (target.criteria) {
      return this.findByCriteria(target.criteria);
    }

    if (target.pattern) {
      return this.findByPattern(target.pattern);
    }

    return [];
  }

  private findBySemanticQuery(query: string): string[] {
    const queryWords = query.toLowerCase().split(/\s+/);
    const matches: { path: string; score: number }[] = [];

    for (const [path, file] of this.files) {
      let score = 0;
      
      // Score based on keyword matches
      for (const keyword of file.keywords) {
        for (const queryWord of queryWords) {
          if (keyword.toLowerCase().includes(queryWord)) {
            score += 1;
          }
        }
      }

      // Score based on content matches
      const content = file.data.toString('utf8').toLowerCase();
      for (const queryWord of queryWords) {
        const occurrences = (content.match(new RegExp(queryWord, 'g')) || []).length;
        score += occurrences * 0.5;
      }

      if (score > 0) {
        matches.push({ path, score });
      }
    }

    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, this.config.defaultMaxResults)
      .map(m => m.path);
  }

  private findByCriteria(criteria: any): string[] {
    const matches: string[] = [];

    for (const [path, file] of this.files) {
      let isMatch = true;

      if (criteria.name && !path.includes(criteria.name)) {
        isMatch = false;
      }

      if (criteria.content) {
        const content = file.data.toString('utf8');
        if (!content.includes(criteria.content)) {
          isMatch = false;
        }
      }

      if (criteria.size) {
        if (criteria.size.min && file.metadata.size < criteria.size.min) {
          isMatch = false;
        }
        if (criteria.size.max && file.metadata.size > criteria.size.max) {
          isMatch = false;
        }
      }

      if (criteria.modified) {
        if (criteria.modified.after && file.metadata.mtime < criteria.modified.after) {
          isMatch = false;
        }
        if (criteria.modified.before && file.metadata.mtime > criteria.modified.before) {
          isMatch = false;
        }
      }

      if (isMatch) {
        matches.push(path);
      }
    }

    return matches;
  }

  private findByPattern(pattern: string): string[] {
    // Simple pattern matching - real implementation would use glob
    const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
    return Array.from(this.files.keys()).filter(path => regex.test(path));
  }

  private async moveFiles(intent: OrganizationIntent): Promise<OrganizationResult> {
    if (!intent.source || !intent.destination?.path) {
      return {
        success: false,
        filesAffected: 0,
        message: 'Move operation requires source and destination paths'
      };
    }

    const sourceFiles = await this.findFilesByTarget(intent.source);
    const newPaths: string[] = [];

    for (const sourcePath of sourceFiles) {
      const file = this.files.get(sourcePath);
      if (file) {
        const newPath = intent.destination.path;
        this.files.delete(sourcePath);
        this.files.set(newPath, {
          ...file,
          metadata: { ...file.metadata, path: newPath }
        });
        this.removeFromSemanticIndex(sourcePath);
        this.updateSemanticIndex(newPath, file.keywords);
        newPaths.push(newPath);
      }
    }

    return {
      success: true,
      filesAffected: newPaths.length,
      newPaths
    };
  }

  private async copyFiles(intent: OrganizationIntent): Promise<OrganizationResult> {
    // Similar to moveFiles but doesn't delete source
    if (!intent.source || !intent.destination?.path) {
      return {
        success: false,
        filesAffected: 0,
        message: 'Copy operation requires source and destination paths'
      };
    }

    const sourceFiles = await this.findFilesByTarget(intent.source);
    const newPaths: string[] = [];

    for (const sourcePath of sourceFiles) {
      const file = this.files.get(sourcePath);
      if (file) {
        const newPath = intent.destination.path;
        this.files.set(newPath, {
          ...file,
          metadata: { ...file.metadata, path: newPath, mtime: new Date() }
        });
        this.updateSemanticIndex(newPath, file.keywords);
        newPaths.push(newPath);
      }
    }

    return {
      success: true,
      filesAffected: newPaths.length,
      newPaths
    };
  }

  private async groupFiles(intent: OrganizationIntent): Promise<OrganizationResult> {
    // Group files by semantic similarity or keywords
    const allFiles = Array.from(this.files.entries());
    const groups = new Map<string, string[]>();

    if (intent.purpose === 'group_keywords') {
      // Group by common keywords
      for (const [path, file] of allFiles) {
        for (const keyword of file.keywords) {
          if (!groups.has(keyword)) {
            groups.set(keyword, []);
          }
          groups.get(keyword)!.push(path);
        }
      }
    } else {
      // Simplified semantic grouping
      groups.set('default', allFiles.map(([path]) => path));
    }

    const groupedFiles = Array.from(groups.entries()).map(([group, files]) => ({
      group,
      files
    }));

    return {
      success: true,
      filesAffected: allFiles.length,
      groupedFiles
    };
  }

  private async listFiles(intent: DiscoveryIntent): Promise<DiscoveryResult> {
    const targetPath = intent.target.path || '/';
    const matchingFiles = Array.from(this.files.entries())
      .filter(([path]) => path.startsWith(targetPath))
      .map(([path, file]) => ({
        path,
        metadata: file.metadata,
        content: intent.options?.includeContent ? file.data.toString('utf8') : undefined
      }));

    return {
      success: true,
      files: matchingFiles,
      totalFound: matchingFiles.length,
      searchTime: 0
    };
  }

  private async findFiles(intent: DiscoveryIntent): Promise<DiscoveryResult> {
    const matchingFiles = await this.findFilesByTarget(intent.target);
    
    const files = matchingFiles.map(path => {
      const file = this.files.get(path)!;
      return {
        path,
        metadata: file.metadata,
        content: intent.options?.includeContent ? file.data.toString('utf8') : undefined
      };
    });

    return {
      success: true,
      files,
      totalFound: files.length,
      searchTime: 0
    };
  }

  private async searchContent(intent: DiscoveryIntent): Promise<DiscoveryResult> {
    const query = intent.target.semanticQuery || '';
    const matches: Array<{ path: string; metadata: FileMetadata; content?: string }> = [];

    for (const [path, file] of this.files) {
      const content = file.data.toString('utf8');
      if (content.toLowerCase().includes(query.toLowerCase())) {
        matches.push({
          path,
          metadata: file.metadata,
          content: intent.options?.includeContent ? content : undefined
        });
      }
    }

    return {
      success: true,
      files: matches,
      totalFound: matches.length,
      searchTime: 0
    };
  }

  private async searchSemantic(intent: DiscoveryIntent): Promise<DiscoveryResult> {
    const matchingPaths = this.findBySemanticQuery(intent.target.semanticQuery || '');
    
    const files = matchingPaths.map(path => {
      const file = this.files.get(path)!;
      return {
        path,
        metadata: file.metadata,
        content: intent.options?.includeContent ? file.data.toString('utf8') : undefined,
        relevanceScore: 0.8 // Simplified relevance
      };
    });

    return {
      success: true,
      files,
      totalFound: files.length,
      searchTime: 0
    };
  }

  private async searchIntegrated(intent: DiscoveryIntent): Promise<DiscoveryResult> {
    // Combine content and semantic search
    const contentResult = await this.searchContent(intent);
    const semanticResult = await this.searchSemantic(intent);
    
    // Merge and deduplicate results
    const allFiles = new Map<string, any>();
    
    for (const file of contentResult.files) {
      allFiles.set(file.path, { ...file, relevanceScore: 0.6 });
    }
    
    for (const file of semanticResult.files) {
      if (allFiles.has(file.path)) {
        // Boost relevance for files found in both searches
        const existing = allFiles.get(file.path);
        allFiles.set(file.path, { ...existing, relevanceScore: 0.9 });
      } else {
        allFiles.set(file.path, file);
      }
    }

    return {
      success: true,
      files: Array.from(allFiles.values()).sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0)),
      totalFound: allFiles.size,
      searchTime: 0
    };
  }

  private extractKeywords(content: string): string[] {
    // Simplified keyword extraction - real implementation would be more sophisticated
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'].includes(word));
    
    // Return unique words, limit to top 10
    return [...new Set(words)].slice(0, 10);
  }

  private updateSemanticIndex(filePath: string, keywords: string[]): void {
    // Remove existing entries
    this.removeFromSemanticIndex(filePath);
    
    // Add new entries
    for (const keyword of keywords) {
      if (!this.semanticIndex.has(keyword)) {
        this.semanticIndex.set(keyword, []);
      }
      this.semanticIndex.get(keyword)!.push(filePath);
    }
  }

  private removeFromSemanticIndex(filePath: string): void {
    for (const [keyword, paths] of this.semanticIndex) {
      const index = paths.indexOf(filePath);
      if (index > -1) {
        paths.splice(index, 1);
        if (paths.length === 0) {
          this.semanticIndex.delete(keyword);
        }
      }
    }
  }
}