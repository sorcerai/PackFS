/**
 * Production-ready disk-based semantic filesystem backend
 * Implements persistent semantic indexing and full LSFS operations
 */

import { promises as fs } from 'fs';
import { join, dirname, basename, extname, relative } from 'path';
import { SemanticFileSystemInterface } from './interface.js';
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
  SemanticConfig,
} from './types.js';
import { FileTargetProcessor, NaturalLanguageProcessor } from './intent-processor.js';
import { Logger, CategoryLogger } from '../core/logger.js';
import { ErrorRecoveryEngine } from './error-recovery.js';

interface SemanticIndexEntry {
  path: string;
  keywords: string[];
  contentHash: string;
  lastIndexed: string;
  mtime: string;
  size: number;
  mimeType?: string;
  preview: string;
  semanticSignature?: string;
}

interface SemanticIndex {
  version: string;
  created: string;
  lastUpdated: string;
  entries: Record<string, SemanticIndexEntry>;
  keywordMap: Record<string, string[]>; // keyword -> file paths
}

/**
 * Production disk-based semantic filesystem with persistent indexing
 */
export class DiskSemanticBackend extends SemanticFileSystemInterface {
  private readonly basePath: string;
  private readonly indexPath: string;
  private index: SemanticIndex;
  private indexLoaded = false;
  private readonly maxFileSize: number;
  private readonly indexVersion = '1.0.0';
  private readonly logger: CategoryLogger;
  private readonly errorRecovery: ErrorRecoveryEngine;

  private readonly excludedDirectories = new Set([
    'node_modules',
    '.git',
    '.svn',
    '.hg',
    '.DS_Store',
    'dist',
    'build',
    'coverage',
    '.next',
    '.nuxt',
    '.cache',
    'vendor',
    'bower_components',
    '__pycache__',
    '.pytest_cache',
    '.mypy_cache',
    '.tox',
    '.packfs' // Exclude our own directory
  ]);
  private readonly maxIndexingDepth = 10; // Maximum directory depth to prevent stack overflow
  private visitedPaths = new Set<string>(); // Track visited paths to prevent cycles

  constructor(basePath: string, config?: Partial<SemanticConfig>) {
    super(config);
    this.basePath = basePath;
    this.indexPath = join(basePath, '.packfs', 'semantic-index.json');
    this.maxFileSize = 50 * 1024 * 1024; // 50MB max file size for indexing
    this.logger = Logger.getInstance().createChildLogger('DiskSemanticBackend');
    this.errorRecovery = new ErrorRecoveryEngine(basePath);

    this.index = {
      version: this.indexVersion,
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      entries: {},
      keywordMap: {},
    };

    this.logger.info(`Initialized semantic backend at ${basePath}`);
  }

  /**
   * Initialize the semantic backend and load/create index
   */
  async initialize(): Promise<void> {
    this.logger.info('Starting semantic backend initialization');
    try {
      // Ensure base directory exists
      await fs.mkdir(this.basePath, { recursive: true });
      await fs.mkdir(dirname(this.indexPath), { recursive: true });
      this.logger.debug('Created directories');

      // Load or create semantic index
      await this.loadIndex();

      // Perform incremental index update
      await this.updateIndexIfNeeded();

      this.indexLoaded = true;
      this.logger.info('Semantic backend initialization complete');
    } catch (error) {
      this.logger.error('Failed to initialize semantic disk backend', { error });
      throw new Error(
        `Failed to initialize semantic disk backend: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async accessFile(intent: FileAccessIntent): Promise<FileAccessResult> {
    this.logger.debug('Processing file access intent', intent);
    await this.ensureIndexLoaded();

    // Extract working directory from intent if provided
    const workingDirectory = intent.options?.workingDirectory;
    const effectiveBasePath = workingDirectory || this.basePath;

    // Handle direct path access first
    if (intent.target.path) {
      const relativePath = this.normalizePath(intent.target.path);
      
      // If working directory is provided, use it for file operations
      if (workingDirectory) {
        return this.handleSingleFileAccessWithBasePath(relativePath, intent, effectiveBasePath);
      }
      
      return this.handleSingleFileAccess(relativePath, intent);
    }

    const targets = await FileTargetProcessor.resolveTarget(intent.target, this.basePath);

    // Handle single file operations
    if (targets.length === 1 && targets[0] && !targets[0].startsWith('__')) {
      const filePath = this.normalizePath(targets[0]);
      return this.handleSingleFileAccess(filePath, intent);
    }

    // Handle semantic/criteria-based targeting
    const matchingFiles = await this.findFilesByTarget(intent.target);

    // For verify_exists, we always return success with exists status
    if (intent.purpose === 'verify_exists') {
      return {
        success: true,
        exists: matchingFiles.length > 0,
        message:
          matchingFiles.length > 0
            ? `Found ${matchingFiles.length} matching files`
            : 'No files found',
      };
    }

    if (matchingFiles.length === 0) {
      // Generate suggestions based on the target criteria
      const searchQuery = intent.target.semanticQuery || intent.target.criteria?.content || intent.target.pattern || '';
      const suggestions = await this.errorRecovery.suggestForEmptySearchResults(searchQuery, 'semantic');
      
      return {
        success: false,
        message: 'No files found matching target criteria',
        exists: false,
        suggestions,
      };
    }

    // Return first match for read operations
    const firstMatch = matchingFiles[0];
    if (!firstMatch) {
      return {
        success: false,
        message: 'No files found matching target criteria',
        exists: false,
      };
    }
    return this.handleSingleFileAccess(firstMatch, intent);
  }

  async updateContent(intent: ContentUpdateIntent): Promise<ContentUpdateResult> {
    this.logger.debug('Processing content update intent', intent);
    await this.ensureIndexLoaded();

    // Extract working directory from intent if provided
    const workingDirectory = intent.options?.workingDirectory;
    const effectiveBasePath = workingDirectory || this.basePath;

    // Handle direct path access first
    if (intent.target.path) {
      const relativePath = this.normalizePath(intent.target.path);
      const fullPath = workingDirectory ? join(effectiveBasePath, relativePath) : this.getFullPath(relativePath);
      const exists = await this.fileExists(fullPath);

      // Handle different update purposes
      switch (intent.purpose) {
        case 'create':
          if (exists && !intent.options?.createPath) {
            return {
              success: false,
              message: 'File already exists',
              created: false,
            };
          }
          break;

        case 'append':
          if (!exists) {
            return {
              success: false,
              message: 'Cannot append to non-existent file',
              created: false,
            };
          }
          break;
      }

      // Perform the update
      const result = await this.performContentUpdate(relativePath, fullPath, intent, exists);

      // Update semantic index only if using default base path
      if (result.success && !workingDirectory) {
        this.logger.debug('Updating semantic index for file', { path: relativePath });
        await this.updateFileIndex(relativePath);
        await this.saveIndex();
      }

      this.logger.info('Content update completed', { path: relativePath, success: result.success, created: result.created });
      return result;
    }

    const targets = await FileTargetProcessor.resolveTarget(intent.target, this.basePath);
    const filePath = targets[0];

    if (!filePath || filePath.startsWith('__')) {
      return {
        success: false,
        message: 'Content update requires specific file path',
        created: false,
      };
    }

    const normalizedPath = this.normalizePath(filePath);
    const fullPath = this.getFullPath(normalizedPath);
    const exists = await this.fileExists(fullPath);

    // Handle different update purposes
    switch (intent.purpose) {
      case 'create':
        if (exists && !intent.options?.createPath) {
          return {
            success: false,
            message: 'File already exists',
            created: false,
          };
        }
        break;

      case 'append':
        if (!exists) {
          return {
            success: false,
            message: 'Cannot append to non-existent file',
            created: false,
          };
        }
        break;
    }

    // Perform the update
    const result = await this.performContentUpdate(normalizedPath, fullPath, intent, exists);

    // Update semantic index
    if (result.success) {
      await this.updateFileIndex(normalizedPath);
      await this.saveIndex();
    }

    return result;
  }

  async organizeFiles(intent: OrganizationIntent): Promise<OrganizationResult> {
    await this.ensureIndexLoaded();

    switch (intent.purpose) {
      case 'create_directory':
        return await this.createDirectory(intent);
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
          message: `Unsupported organization purpose: ${intent.purpose}`,
        };
    }
  }

  async discoverFiles(intent: DiscoveryIntent): Promise<DiscoveryResult> {
    await this.ensureIndexLoaded();

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
          message: `Unsupported discovery purpose: ${intent.purpose}`,
        };
    }
  }

  async removeFiles(intent: RemovalIntent): Promise<RemovalResult> {
    await this.ensureIndexLoaded();

    const matchingFiles = await this.findFilesByTarget(intent.target);

    if (matchingFiles.length === 0) {
      return {
        success: false,
        filesDeleted: 0,
        directoriesDeleted: 0,
        freedSpace: 0,
        deletedPaths: [],
        message: 'No files found matching removal criteria',
      };
    }

    // Handle dry run
    if (intent.options?.dryRun) {
      let totalSize = 0;
      for (const path of matchingFiles) {
        const indexEntry = this.index.entries[path];
        totalSize += indexEntry?.size || 0;
      }

      return {
        success: true,
        filesDeleted: matchingFiles.length,
        directoriesDeleted: 0,
        freedSpace: totalSize,
        deletedPaths: matchingFiles,
        message: `Would delete ${matchingFiles.length} files (dry run)`,
      };
    }

    // Perform actual deletion
    return await this.performDeletion(matchingFiles, intent.options?.moveToTrash);
  }

  async executeWorkflow(workflow: WorkflowIntent): Promise<WorkflowResult> {
    const startTime = Date.now();
    const stepResults: Array<{
      stepId: string;
      result: any;
      duration: number;
    }> = [];

    let rollbackRequired = false;
    const completedSteps: string[] = [];

    try {
      for (const step of workflow.steps) {
        const stepStartTime = Date.now();

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
          duration: Date.now() - stepStartTime,
        });

        if (result.success) {
          completedSteps.push(step.id);
        } else if (workflow.options?.atomic) {
          rollbackRequired = true;
          break;
        } else if (!workflow.options?.continueOnError) {
          rollbackRequired = true;
          break;
        }
      }

      // Perform rollback if needed
      if (rollbackRequired && workflow.options?.atomic) {
        await this.rollbackSteps(completedSteps);
      }
    } catch (error) {
      rollbackRequired = true;
      if (workflow.options?.atomic) {
        await this.rollbackSteps(completedSteps);
      }
    }

    return {
      success: !rollbackRequired,
      stepResults,
      totalDuration: Date.now() - startTime,
      rollbackRequired,
    };
  }

  async interpretNaturalLanguage(intent: NaturalLanguageIntent): Promise<NaturalLanguageResult> {
    const parsed = NaturalLanguageProcessor.parseQuery(intent.query);

    return {
      success: true,
      interpretedIntent: parsed.intent,
      confidence: parsed.confidence,
      message: `Interpreted query: "${intent.query}"`,
    };
  }

  // Private implementation methods

  private async ensureIndexLoaded(): Promise<void> {
    if (!this.indexLoaded) {
      await this.initialize();
    }
  }

  private async loadIndex(): Promise<void> {
    try {
      const indexData = await fs.readFile(this.indexPath, 'utf8');
      const loadedIndex = JSON.parse(indexData) as SemanticIndex;

      // Validate index version
      if (loadedIndex.version !== this.indexVersion) {
        console.warn('Semantic index version mismatch, rebuilding...');
        await this.rebuildIndex();
        return;
      }

      // Validate and fix keywordMap structure
      if (loadedIndex.keywordMap) {
        for (const keyword in loadedIndex.keywordMap) {
          if (!Array.isArray(loadedIndex.keywordMap[keyword])) {
            this.logger.warn(`Fixing non-array keywordMap entry for keyword: ${keyword}`);
            loadedIndex.keywordMap[keyword] = [];
          }
        }
      }
      
      this.index = loadedIndex;
    } catch (error) {
      // Index doesn't exist or is corrupted, create new one
      console.log('Creating new semantic index...');
      await this.rebuildIndex();
    }
  }

  private async saveIndex(): Promise<void> {
    this.index.lastUpdated = new Date().toISOString();
    await fs.writeFile(this.indexPath, JSON.stringify(this.index, null, 2));
  }

  private async rebuildIndex(): Promise<void> {
    this.index = {
      version: this.indexVersion,
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      entries: {},
      keywordMap: {},
    };

    // Reset visited paths before indexing
    this.visitedPaths.clear();

    // Recursively index all files with depth tracking
    await this.indexDirectory(this.basePath, 0);
    await this.saveIndex();
  }

  private async indexDirectory(dirPath: string, depth: number = 0): Promise<void> {
    try {
      // Check depth limit
      if (depth >= this.maxIndexingDepth) {
        this.logger.warn(`Skipping directory due to depth limit: ${dirPath}`);
        return;
      }

      // Get real path to handle symlinks
      const realPath = await fs.realpath(dirPath);
      
      // Check if we've already visited this path (handles circular symlinks)
      if (this.visitedPaths.has(realPath)) {
        this.logger.debug(`Skipping already visited directory: ${dirPath}`);
        return;
      }
      
      // Mark as visited
      this.visitedPaths.add(realPath);

      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);
        const relativePath = relative(this.basePath, fullPath);

        // Skip excluded directories
        if (entry.isDirectory() && this.excludedDirectories.has(entry.name)) {
          this.logger.debug(`Skipping excluded directory: ${entry.name}`);
          continue;
        }

        // Skip .packfs directory
        if (relativePath.startsWith('.packfs')) {
          continue;
        }

        if (entry.isDirectory()) {
          await this.indexDirectory(fullPath, depth + 1);
        } else if (entry.isFile()) {
          await this.updateFileIndex(relativePath);
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to index directory ${dirPath}:`, error);
    }
  }

  private async updateIndexIfNeeded(): Promise<void> {
    // Check for new or modified files since last index update
    const lastUpdate = new Date(this.index.lastUpdated);
    const needsUpdate = await this.hasModificationsSince(this.basePath, lastUpdate);

    if (needsUpdate) {
      this.logger.info('Updating semantic index...');
      // Reset visited paths before re-indexing
      this.visitedPaths.clear();
      await this.indexDirectory(this.basePath, 0);
      await this.saveIndex();
    }
  }

  private async hasModificationsSince(dirPath: string, since: Date, depth: number = 0): Promise<boolean> {
    try {
      // Prevent deep recursion
      if (depth >= this.maxIndexingDepth) {
        return false;
      }

      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);
        const relativePath = relative(this.basePath, fullPath);

        // Skip excluded directories
        if (entry.isDirectory() && this.excludedDirectories.has(entry.name)) {
          continue;
        }

        if (relativePath.startsWith('.packfs')) continue;

        const stats = await fs.stat(fullPath);

        if (stats.mtime > since) {
          return true;
        }

        if (entry.isDirectory()) {
          if (await this.hasModificationsSince(fullPath, since, depth + 1)) {
            return true;
          }
        }
      }

      return false;
    } catch {
      return true; // Assume needs update if we can't check
    }
  }

  private async updateFileIndex(relativePath: string): Promise<void> {
    const fullPath = this.getFullPath(relativePath);

    try {
      const stats = await fs.stat(fullPath);

      // Skip files that are too large
      if (stats.size > this.maxFileSize) {
        return;
      }

      // Skip binary files for content indexing
      if (this.isBinaryFile(relativePath)) {
        return;
      }

      const content = await fs.readFile(fullPath, 'utf8');
      const contentHash = this.calculateHash(content);

      // Check if file has changed
      const existingEntry = this.index.entries[relativePath];
      if (existingEntry && existingEntry.contentHash === contentHash) {
        return; // No changes, skip
      }

      // Remove old keyword mappings
      if (existingEntry) {
        this.removeFromKeywordMap(relativePath, existingEntry.keywords);
      }

      // Extract keywords and create preview
      const keywords = this.extractKeywords(content);
      const preview = this.generatePreview(content);

      // Create index entry
      const indexEntry: SemanticIndexEntry = {
        path: relativePath,
        keywords,
        contentHash,
        lastIndexed: new Date().toISOString(),
        mtime: stats.mtime.toISOString(),
        size: stats.size,
        mimeType: this.getMimeType(relativePath),
        preview,
        semanticSignature: this.generateSemanticSignature(content, keywords),
      };

      // Update index
      this.index.entries[relativePath] = indexEntry;
      this.addToKeywordMap(relativePath, keywords);
    } catch (error) {
      console.warn(`Failed to index file ${relativePath}:`, error);
    }
  }

  private normalizePath(path: string): string {
    // Remove leading slash and normalize
    return path.startsWith('/') ? path.substring(1) : path;
  }

  private getFullPath(relativePath: string): string {
    return join(this.basePath, relativePath);
  }

  private async fileExists(fullPath: string): Promise<boolean> {
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  private isBinaryFile(filePath: string): boolean {
    const ext = extname(filePath).toLowerCase();
    const binaryExts = [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.pdf',
      '.zip',
      '.tar',
      '.gz',
      '.exe',
      '.bin',
    ];
    return binaryExts.includes(ext);
  }

  private calculateHash(content: string): string {
    // Simple hash function - in production, use crypto.createHash
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private extractKeywords(content: string): string[] {
    // Enhanced keyword extraction
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .filter((word) => !this.isStopWord(word));

    // Get word frequency
    const frequency: Record<string, number> = {};
    for (const word of words) {
      frequency[word] = (frequency[word] || 0) + 1;
    }

    // Return top keywords by frequency
    return Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([word]) => word);
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'is',
      'are',
      'was',
      'were',
      'will',
      'would',
      'could',
      'should',
      'have',
      'has',
      'had',
      'this',
      'that',
      'these',
      'those',
      'not',
      'from',
      'into',
      'through',
      'during',
      'before',
      'after',
      'above',
      'below',
      'between',
      'among',
    ]);
    return stopWords.has(word);
  }

  private generatePreview(content: string): string {
    // Generate intelligent preview
    const lines = content.split('\n');
    const meaningfulLines = lines.filter((line) => line.trim().length > 10);
    return meaningfulLines.slice(0, 3).join('\n').substring(0, 300);
  }

  private getMimeType(filePath: string): string {
    const ext = extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.js': 'application/javascript',
      '.ts': 'application/typescript',
      '.json': 'application/json',
      '.html': 'text/html',
      '.css': 'text/css',
      '.py': 'text/x-python',
      '.java': 'text/x-java-source',
      '.cpp': 'text/x-c++src',
      '.c': 'text/x-csrc',
    };
    return mimeTypes[ext] || 'text/plain';
  }

  private generateSemanticSignature(_content: string, keywords: string[]): string {
    // Generate a semantic signature for similarity comparison
    // This is a simplified version - production would use embeddings
    return keywords.slice(0, 5).sort().join('|');
  }

  private addToKeywordMap(filePath: string, keywords: string[]): void {
    for (const keyword of keywords) {
      if (!this.index.keywordMap[keyword]) {
        this.index.keywordMap[keyword] = [];
      }
      // Defensive check to ensure it's an array
      if (!Array.isArray(this.index.keywordMap[keyword])) {
        this.logger.warn(`Converting non-array keywordMap entry to array for keyword: ${keyword}`);
        this.index.keywordMap[keyword] = [];
      }
      if (!this.index.keywordMap[keyword].includes(filePath)) {
        this.index.keywordMap[keyword].push(filePath);
      }
    }
  }

  private removeFromKeywordMap(filePath: string, keywords: string[]): void {
    for (const keyword of keywords) {
      if (this.index.keywordMap[keyword]) {
        // Defensive check to ensure it's an array
        if (!Array.isArray(this.index.keywordMap[keyword])) {
          this.logger.warn(`Skipping removal from non-array keywordMap entry for keyword: ${keyword}`);
          delete this.index.keywordMap[keyword];
          continue;
        }
        const index = this.index.keywordMap[keyword].indexOf(filePath);
        if (index > -1) {
          this.index.keywordMap[keyword].splice(index, 1);
          if (this.index.keywordMap[keyword].length === 0) {
            delete this.index.keywordMap[keyword];
          }
        }
      }
    }
  }

  private async handleSingleFileAccessWithBasePath(
    relativePath: string,
    intent: FileAccessIntent,
    basePath: string
  ): Promise<FileAccessResult> {
    const fullPath = join(basePath, relativePath);
    const exists = await this.fileExists(fullPath);

    if (!exists) {
      if (intent.purpose === 'create_or_get') {
        // Create empty file
        const dir = dirname(fullPath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(fullPath, '');

        // Note: Skip index update for runtime base path operations
        const metadata = await this.getFileMetadataWithBasePath(relativePath, basePath);
        return {
          success: true,
          content: '',
          metadata,
          exists: true,
        };
      }

      // For verify_exists, success means the operation worked, exists indicates file presence
      if (intent.purpose === 'verify_exists') {
        const suggestions = await this.errorRecovery.suggestForFileNotFound(relativePath);
        return {
          success: true,
          exists: false,
          message: `File not found: ${relativePath}`,
          suggestions,
        };
      }

      // Generate helpful suggestions for file not found
      const suggestions = await this.errorRecovery.suggestForFileNotFound(relativePath);
      const context = {
        operation: 'accessFile',
        requestedPath: relativePath,
        error: `File not found: ${relativePath}`,
        suggestions,
      };

      return {
        success: false,
        exists: false,
        message: this.errorRecovery.formatSuggestions(context),
        suggestions,
      };
    }

    // Handle different access purposes
    switch (intent.purpose) {
      case 'read':
        const content = await fs.readFile(fullPath, intent.preferences?.encoding || 'utf8');
        return {
          success: true,
          content,
          metadata: intent.preferences?.includeMetadata
            ? await this.getFileMetadataWithBasePath(relativePath, basePath)
            : undefined,
          exists: true,
        };

      case 'preview':
        return {
          success: true,
          preview: await this.generateFilePreview(fullPath),
          metadata: await this.getFileMetadataWithBasePath(relativePath, basePath),
          exists: true,
        };

      case 'metadata':
        return {
          success: true,
          metadata: await this.getFileMetadataWithBasePath(relativePath, basePath),
          exists: true,
        };

      case 'verify_exists':
        return {
          success: true,
          exists: true,
        };

      case 'create_or_get':
        const existingContent = await fs.readFile(fullPath, intent.preferences?.encoding || 'utf8');
        return {
          success: true,
          content: existingContent,
          metadata: await this.getFileMetadataWithBasePath(relativePath, basePath),
          exists: true,
        };

      default:
        return {
          success: false,
          exists: true,
          message: `Unsupported access purpose: ${intent.purpose}`,
        };
    }
  }

  private async handleSingleFileAccess(
    relativePath: string,
    intent: FileAccessIntent
  ): Promise<FileAccessResult> {
    const fullPath = this.getFullPath(relativePath);
    const exists = await this.fileExists(fullPath);

    if (!exists) {
      if (intent.purpose === 'create_or_get') {
        // Create empty file
        const dir = dirname(fullPath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(fullPath, '');

        await this.updateFileIndex(relativePath);
        await this.saveIndex();

        const metadata = await this.getFileMetadata(relativePath);
        return {
          success: true,
          content: '',
          metadata,
          exists: true,
        };
      }

      // For verify_exists, success means the operation worked, exists indicates file presence
      if (intent.purpose === 'verify_exists') {
        const suggestions = await this.errorRecovery.suggestForFileNotFound(relativePath);
        return {
          success: true,
          exists: false,
          message: `File not found: ${relativePath}`,
          suggestions,
        };
      }

      // Generate helpful suggestions for file not found
      const suggestions = await this.errorRecovery.suggestForFileNotFound(relativePath);
      const context = {
        operation: 'accessFile',
        requestedPath: relativePath,
        error: `File not found: ${relativePath}`,
        suggestions,
      };

      return {
        success: false,
        exists: false,
        message: this.errorRecovery.formatSuggestions(context),
        suggestions,
      };
    }

    // Handle different access purposes
    switch (intent.purpose) {
      case 'read':
        const content = await fs.readFile(fullPath, intent.preferences?.encoding || 'utf8');
        return {
          success: true,
          content,
          metadata: intent.preferences?.includeMetadata
            ? await this.getFileMetadata(relativePath)
            : undefined,
          exists: true,
        };

      case 'preview':
        const indexEntry = this.index.entries[relativePath];
        return {
          success: true,
          preview: indexEntry?.preview || (await this.generateFilePreview(fullPath)),
          metadata: await this.getFileMetadata(relativePath),
          exists: true,
        };

      case 'metadata':
        return {
          success: true,
          metadata: await this.getFileMetadata(relativePath),
          exists: true,
        };

      case 'verify_exists':
        return {
          success: true,
          exists: true,
        };

      case 'create_or_get':
        const existingContent = await fs.readFile(fullPath, intent.preferences?.encoding || 'utf8');
        return {
          success: true,
          content: existingContent,
          metadata: await this.getFileMetadata(relativePath),
          exists: true,
        };

      default:
        return {
          success: false,
          exists: true,
          message: `Unsupported access purpose: ${intent.purpose}`,
        };
    }
  }

  private async getFileMetadata(relativePath: string): Promise<FileMetadata> {
    const fullPath = this.getFullPath(relativePath);
    const stats = await fs.stat(fullPath);
    const indexEntry = this.index.entries[relativePath];

    return {
      path: relativePath,
      size: stats.size,
      mtime: stats.mtime,
      isDirectory: stats.isDirectory(),
      permissions: stats.mode,
      mimeType: indexEntry?.mimeType || this.getMimeType(relativePath),
      tags: indexEntry?.keywords,
      semanticSignature: indexEntry?.semanticSignature,
    };
  }

  private async getFileMetadataWithBasePath(relativePath: string, basePath: string): Promise<FileMetadata> {
    const fullPath = join(basePath, relativePath);
    const stats = await fs.stat(fullPath);

    return {
      path: relativePath,
      size: stats.size,
      mtime: stats.mtime,
      isDirectory: stats.isDirectory(),
      permissions: stats.mode,
      mimeType: this.getMimeType(relativePath),
      tags: undefined, // No index lookup for runtime base path
      semanticSignature: undefined, // No index lookup for runtime base path
    };
  }

  private async generateFilePreview(fullPath: string): Promise<string> {
    try {
      const content = await fs.readFile(fullPath, 'utf8');
      return this.generatePreview(content);
    } catch {
      return 'Preview unavailable';
    }
  }

  private async performContentUpdate(
    _relativePath: string,
    fullPath: string,
    intent: ContentUpdateIntent,
    exists: boolean
  ): Promise<ContentUpdateResult> {
    const contentBuffer =
      typeof intent.content === 'string' ? Buffer.from(intent.content, 'utf8') : intent.content;

    let newContent: Buffer;
    let created = false;

    try {
      switch (intent.purpose) {
        case 'create':
        case 'overwrite':
          newContent = contentBuffer;
          created = !exists;
          break;

        case 'append':
          if (!exists) {
            throw new Error('Cannot append to non-existent file');
          }
          const existingContent = await fs.readFile(fullPath);
          newContent = Buffer.concat([existingContent, contentBuffer]);
          break;

        case 'merge':
          if (exists) {
            const existingContent = await fs.readFile(fullPath, 'utf8');
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

      // Ensure directory exists
      const dir = dirname(fullPath);
      await fs.mkdir(dir, { recursive: true });

      // Write the file
      await fs.writeFile(fullPath, newContent);

      return {
        success: true,
        bytesWritten: newContent.length,
        created,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        created: false,
      };
    }
  }

  private async findFilesByTarget(target: any): Promise<string[]> {
    if (target.path) {
      const relativePath = this.normalizePath(target.path);
      return (await this.fileExists(this.getFullPath(relativePath))) ? [relativePath] : [];
    }

    let results: string[] = [];

    if (target.pattern) {
      results = results.concat(this.findByPattern(target.pattern));
    }

    if (target.semanticQuery) {
      results = results.concat(this.findBySemanticQuery(target.semanticQuery));
    }

    if (target.criteria) {
      results = results.concat(this.findByCriteria(target.criteria));
    }

    // Remove duplicates and return
    return [...new Set(results)];
  }

  private findBySemanticQuery(query: string): string[] {
    const queryWords = query.toLowerCase().split(/\s+/);
    const matches: { path: string; score: number }[] = [];

    for (const [path, entry] of Object.entries(this.index.entries)) {
      let score = 0;

      // Score based on keyword matches
      for (const keyword of entry.keywords) {
        for (const queryWord of queryWords) {
          if (keyword.includes(queryWord)) {
            score += 2;
          }
        }
      }

      // Score based on filename matches (higher weight)
      const filename = basename(path).toLowerCase();
      for (const queryWord of queryWords) {
        if (filename.includes(queryWord)) {
          score += 3;
        }
      }

      // Handle common file types with special scoring
      if (query.toLowerCase().includes('readme') && filename.includes('readme')) {
        score += 10;
      }
      if (query.toLowerCase().includes('config') && filename.includes('config')) {
        score += 10;
      }

      // Score based on content matches (if available)
      if (entry.preview) {
        for (const queryWord of queryWords) {
          if (entry.preview.toLowerCase().includes(queryWord)) {
            score += 1;
          }
        }
      }

      if (score > 0) {
        matches.push({ path, score });
      }
    }

    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, this.config.defaultMaxResults)
      .map((m) => m.path);
  }

  private findByCriteria(criteria: any): string[] {
    const matches: string[] = [];

    for (const [path, entry] of Object.entries(this.index.entries)) {
      let isMatch = true;

      if (criteria.name && !path.includes(criteria.name)) {
        isMatch = false;
      }

      if (criteria.content) {
        // Search in keywords and preview
        const searchTerm = criteria.content.toLowerCase();
        const hasKeywordMatch = entry.keywords.some((k) => k.includes(searchTerm));
        const hasPreviewMatch = entry.preview.toLowerCase().includes(searchTerm);
        if (!hasKeywordMatch && !hasPreviewMatch) {
          isMatch = false;
        }
      }

      if (criteria.size) {
        if (criteria.size.min && entry.size < criteria.size.min) {
          isMatch = false;
        }
        if (criteria.size.max && entry.size > criteria.size.max) {
          isMatch = false;
        }
      }

      if (criteria.modified) {
        const mtime = new Date(entry.mtime);
        if (criteria.modified.after && mtime < criteria.modified.after) {
          isMatch = false;
        }
        if (criteria.modified.before && mtime > criteria.modified.before) {
          isMatch = false;
        }
      }

      if (criteria.type) {
        const ext = extname(path).substring(1);
        if (!criteria.type.includes(ext)) {
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
    try {
      // Handle common patterns
      if (pattern === '*' || pattern === '**' || pattern === '*.*') {
        return Object.keys(this.index.entries);
      }

      // Simple glob pattern matching with safety checks
      let regexPattern = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.');

      // Ensure pattern is valid
      if (regexPattern === '.*') {
        return Object.keys(this.index.entries);
      }

      const regex = new RegExp(regexPattern, 'i');
      return Object.keys(this.index.entries).filter((path) => regex.test(path));
    } catch (error) {
      console.warn(`Invalid pattern '${pattern}':`, error);
      // Fallback to simple contains match
      return Object.keys(this.index.entries).filter((path) =>
        path.toLowerCase().includes(pattern.toLowerCase().replace(/\*/g, ''))
      );
    }
  }

  // Additional implementation methods continue...
  // (createDirectory, moveFiles, copyFiles, groupFiles, listFiles, findFiles,
  //  searchContent, searchSemantic, searchIntegrated, performDeletion, rollbackSteps)

  private async createDirectory(intent: OrganizationIntent): Promise<OrganizationResult> {
    if (!intent.destination?.path) {
      return {
        success: false,
        filesAffected: 0,
        message: 'Create directory requires destination path',
      };
    }

    const relativePath = this.normalizePath(intent.destination.path);
    const fullPath = this.getFullPath(relativePath);

    try {
      await fs.mkdir(fullPath, { recursive: intent.options?.recursive });
      return {
        success: true,
        filesAffected: 1,
        message: `Directory created: ${relativePath}`,
      };
    } catch (error) {
      return {
        success: false,
        filesAffected: 0,
        message: `Failed to create directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async moveFiles(intent: OrganizationIntent): Promise<OrganizationResult> {
    if (!intent.source || !intent.destination?.path) {
      return {
        success: false,
        filesAffected: 0,
        message: 'Move operation requires source and destination paths',
      };
    }

    const sourceFiles = await this.findFilesByTarget(intent.source);
    const newPaths: string[] = [];

    try {
      for (const sourcePath of sourceFiles) {
        const sourceFullPath = this.getFullPath(sourcePath);
        const destPath = this.normalizePath(intent.destination.path);
        const destFullPath = this.getFullPath(destPath);

        // Ensure destination directory exists
        await fs.mkdir(dirname(destFullPath), { recursive: true });

        // Move the file
        await fs.rename(sourceFullPath, destFullPath);

        // Update index
        const indexEntry = this.index.entries[sourcePath];
        if (indexEntry) {
          delete this.index.entries[sourcePath];
          this.removeFromKeywordMap(sourcePath, indexEntry.keywords);

          indexEntry.path = destPath;
          this.index.entries[destPath] = indexEntry;
          this.addToKeywordMap(destPath, indexEntry.keywords);
        }

        newPaths.push(destPath);
      }

      await this.saveIndex();

      return {
        success: true,
        filesAffected: newPaths.length,
        newPaths,
      };
    } catch (error) {
      return {
        success: false,
        filesAffected: 0,
        message: `Failed to move files: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async copyFiles(intent: OrganizationIntent): Promise<OrganizationResult> {
    if (!intent.source || !intent.destination?.path) {
      return {
        success: false,
        filesAffected: 0,
        message: 'Copy operation requires source and destination paths',
      };
    }

    const sourceFiles = await this.findFilesByTarget(intent.source);
    const newPaths: string[] = [];

    try {
      for (const sourcePath of sourceFiles) {
        const sourceFullPath = this.getFullPath(sourcePath);
        const destPath = this.normalizePath(intent.destination.path);
        const destFullPath = this.getFullPath(destPath);

        // Ensure destination directory exists
        await fs.mkdir(dirname(destFullPath), { recursive: true });

        // Copy the file
        await fs.copyFile(sourceFullPath, destFullPath);

        // Update index for new file
        await this.updateFileIndex(destPath);
        newPaths.push(destPath);
      }

      await this.saveIndex();

      return {
        success: true,
        filesAffected: newPaths.length,
        newPaths,
      };
    } catch (error) {
      return {
        success: false,
        filesAffected: 0,
        message: `Failed to copy files: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async groupFiles(intent: OrganizationIntent): Promise<OrganizationResult> {
    const allFiles = Object.keys(this.index.entries);
    const groups = new Map<string, string[]>();

    if (intent.purpose === 'group_keywords') {
      // Group by common keywords
      for (const path of allFiles) {
        const entry = this.index.entries[path];
        if (!entry) continue;
        for (const keyword of entry.keywords) {
          if (!groups.has(keyword)) {
            groups.set(keyword, []);
          }
          groups.get(keyword)!.push(path);
        }
      }
    } else {
      // Simplified semantic grouping by semantic signature
      const signatureGroups = new Map<string, string[]>();
      for (const path of allFiles) {
        const entry = this.index.entries[path];
        if (!entry) continue;
        const signature = entry.semanticSignature || 'unknown';
        if (!signatureGroups.has(signature)) {
          signatureGroups.set(signature, []);
        }
        signatureGroups.get(signature)!.push(path);
      }

      // Convert to groups map
      for (const [signature, files] of signatureGroups) {
        groups.set(signature, files);
      }
    }

    const groupedFiles = Array.from(groups.entries()).map(([group, files]) => ({
      group,
      files,
    }));

    return {
      success: true,
      filesAffected: allFiles.length,
      groupedFiles,
    };
  }

  private async listFiles(intent: DiscoveryIntent): Promise<DiscoveryResult> {
    const targetPath = intent.target.path ? this.normalizePath(intent.target.path) : '';
    const fullPath = this.getFullPath(targetPath);

    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      const files: Array<{
        path: string;
        metadata: FileMetadata;
        content?: string;
      }> = [];

      for (const entry of entries) {
        if (entry.name.startsWith('.packfs')) continue;

        const entryPath = targetPath ? `${targetPath}/${entry.name}` : entry.name;

        // Include both files and directories
        const metadata = await this.getFileMetadata(entryPath);
        files.push({
          path: entryPath,
          metadata,
          content:
            intent.options?.includeContent && entry.isFile()
              ? await fs.readFile(this.getFullPath(entryPath), 'utf8').catch(() => undefined)
              : undefined,
        });
      }

      return {
        success: true,
        files,
        totalFound: files.length,
        searchTime: 0,
      };
    } catch (error) {
      return {
        success: false,
        files: [],
        totalFound: 0,
        searchTime: 0,
        message: `Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async findFiles(intent: DiscoveryIntent): Promise<DiscoveryResult> {
    const matchingFiles = await this.findFilesByTarget(intent.target);

    // If no matches found, provide suggestions
    if (matchingFiles.length === 0) {
      const searchQuery = intent.target.pattern || intent.target.criteria?.name || '';
      const suggestions = await this.errorRecovery.suggestForEmptySearchResults(searchQuery, 'filename');
      return {
        success: true,
        files: [],
        totalFound: 0,
        searchTime: 0,
        suggestions,
      };
    }

    const files = await Promise.all(
      matchingFiles.map(async (path) => {
        const metadata = await this.getFileMetadata(path);
        return {
          path,
          metadata,
          content: intent.options?.includeContent
            ? await fs.readFile(this.getFullPath(path), 'utf8').catch(() => undefined)
            : undefined,
        };
      })
    );

    return {
      success: true,
      files,
      totalFound: files.length,
      searchTime: 0,
    };
  }

  private async searchContent(intent: DiscoveryIntent): Promise<DiscoveryResult> {
    const query = intent.target.semanticQuery || '';
    const queryLower = query.toLowerCase();
    const matches: Array<{ path: string; metadata: FileMetadata; content?: string }> = [];

    for (const [path, entry] of Object.entries(this.index.entries)) {
      // Search in keywords and preview
      const hasKeywordMatch = entry.keywords.some((k) => k.includes(queryLower));
      const hasPreviewMatch = entry.preview.toLowerCase().includes(queryLower);

      if (hasKeywordMatch || hasPreviewMatch) {
        const metadata = await this.getFileMetadata(path);
        matches.push({
          path,
          metadata,
          content: intent.options?.includeContent
            ? await fs.readFile(this.getFullPath(path), 'utf8').catch(() => undefined)
            : undefined,
        });
      }
    }

    // If no matches found, provide suggestions
    if (matches.length === 0) {
      const suggestions = await this.errorRecovery.suggestForEmptySearchResults(query, 'content');
      return {
        success: true,
        files: [],
        totalFound: 0,
        searchTime: 0,
        suggestions,
      };
    }

    return {
      success: true,
      files: matches.slice(0, intent.options?.maxResults || this.config.defaultMaxResults),
      totalFound: matches.length,
      searchTime: 0,
    };
  }

  private async searchSemantic(intent: DiscoveryIntent): Promise<DiscoveryResult> {
    const matchingPaths = this.findBySemanticQuery(intent.target.semanticQuery || '');

    // If no matches found, provide suggestions
    if (matchingPaths.length === 0) {
      const suggestions = await this.errorRecovery.suggestForEmptySearchResults(
        intent.target.semanticQuery || '',
        'semantic'
      );
      return {
        success: true,
        files: [],
        totalFound: 0,
        searchTime: 0,
        suggestions,
      };
    }

    const files = await Promise.all(
      matchingPaths.map(async (path, index) => {
        const metadata = await this.getFileMetadata(path);
        return {
          path,
          metadata,
          content: intent.options?.includeContent
            ? await fs.readFile(this.getFullPath(path), 'utf8').catch(() => undefined)
            : undefined,
          relevanceScore: 1 - index / matchingPaths.length, // Simple relevance scoring
        };
      })
    );

    return {
      success: true,
      files,
      totalFound: files.length,
      searchTime: 0,
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

    const sortedFiles = Array.from(allFiles.values())
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, intent.options?.maxResults || this.config.defaultMaxResults);

    return {
      success: true,
      files: sortedFiles,
      totalFound: allFiles.size,
      searchTime: 0,
    };
  }

  private async performDeletion(filePaths: string[], moveToTrash = false): Promise<RemovalResult> {
    let freedSpace = 0;
    const deletedPaths: string[] = [];
    let directoriesDeleted = 0;

    try {
      for (const filePath of filePaths) {
        const fullPath = this.getFullPath(filePath);
        const indexEntry = this.index.entries[filePath];

        if (indexEntry) {
          freedSpace += indexEntry.size;
        }

        if (moveToTrash) {
          // In a real implementation, this would move to a trash folder
          // For now, we'll just rename with .deleted suffix
          const trashPath = `${fullPath}.deleted.${Date.now()}`;
          await fs.rename(fullPath, trashPath);
        } else {
          const stats = await fs.stat(fullPath);
          if (stats.isDirectory()) {
            await fs.rmdir(fullPath, { recursive: true });
            directoriesDeleted++;
          } else {
            await fs.unlink(fullPath);
          }
        }

        // Remove from index
        if (indexEntry) {
          delete this.index.entries[filePath];
          this.removeFromKeywordMap(filePath, indexEntry.keywords);
        }

        deletedPaths.push(filePath);
      }

      await this.saveIndex();

      return {
        success: true,
        filesDeleted: deletedPaths.length - directoriesDeleted,
        directoriesDeleted,
        freedSpace,
        deletedPaths,
      };
    } catch (error) {
      return {
        success: false,
        filesDeleted: 0,
        directoriesDeleted: 0,
        freedSpace: 0,
        deletedPaths: [],
        message: `Failed to delete files: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private async rollbackSteps(completedSteps: string[]): Promise<void> {
    // Simplified rollback - in production, this would maintain operation logs
    console.warn(`Rollback requested for steps: ${completedSteps.join(', ')}`);
    // Implementation would depend on the specific operations performed
  }

  /**
   * Cleanup method for the disk backend
   */
  async cleanup(): Promise<void> {
    // Save index one final time
    if (this.indexLoaded) {
      await this.saveIndex();
    }
  }
}
