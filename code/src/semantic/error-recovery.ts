/**
 * Error recovery suggestion system for semantic filesystem operations
 * Provides intelligent suggestions when operations fail
 */

import { join, dirname, basename, extname } from 'path';
import { promises as fs } from 'fs';

export interface ErrorSuggestion {
  type: 'directory_listing' | 'similar_files' | 'parent_directory' | 'alternative_path' | 'search_results';
  description: string;
  data: any;
  confidence: number; // 0-1 score of how likely this suggestion is helpful
}

export interface ErrorRecoveryContext {
  operation: string;
  requestedPath?: string;
  searchQuery?: string;
  error: string;
  suggestions: ErrorSuggestion[];
}

export class ErrorRecoveryEngine {
  private readonly basePath: string;
  private readonly maxSuggestions = 5;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  /**
   * Generate suggestions for file not found errors
   */
  async suggestForFileNotFound(requestedPath: string): Promise<ErrorSuggestion[]> {
    const suggestions: ErrorSuggestion[] = [];

    // 1. Check if parent directory exists and list contents
    const parentDir = dirname(requestedPath);
    const fileName = basename(requestedPath);
    
    try {
      const parentExists = await this.pathExists(parentDir);
      if (parentExists) {
        const files = await this.listDirectory(parentDir);
        
        suggestions.push({
          type: 'directory_listing',
          description: `Directory listing of '${parentDir}'`,
          data: {
            directory: parentDir,
            files: files.slice(0, 20), // Limit to 20 files
            totalFiles: files.length,
            hasMore: files.length > 20
          },
          confidence: 0.9
        });

        // 2. Find similar filenames in the parent directory
        const fileNames = files.map(f => f.name);
        const similarFiles = this.findSimilarFilenames(fileName, fileNames);
        if (similarFiles.length > 0) {
          suggestions.push({
            type: 'similar_files',
            description: `Similar files in '${parentDir}'`,
            data: {
              requestedFile: fileName,
              similarFiles: similarFiles.slice(0, 5),
              directory: parentDir
            },
            confidence: 0.8
          });
        }
      }
    } catch (error) {
      // Parent directory doesn't exist or can't be read
    }

    // 3. Search for the filename in other locations
    const searchResults = await this.searchForFilename(fileName);
    if (searchResults.length > 0) {
      suggestions.push({
        type: 'search_results',
        description: `Found '${fileName}' in other locations`,
        data: {
          requestedFile: fileName,
          foundLocations: searchResults.slice(0, 5)
        },
        confidence: 0.7
      });
    }

    // 4. Suggest checking parent directories
    const parentPaths = this.getParentPaths(requestedPath);
    const existingParents: string[] = [];
    
    for (const parent of parentPaths) {
      if (await this.pathExists(parent)) {
        existingParents.push(parent);
      }
    }

    if (existingParents.length > 0) {
      suggestions.push({
        type: 'parent_directory',
        description: 'Existing parent directories',
        data: {
          requestedPath,
          existingParents: existingParents.slice(0, 3)
        },
        confidence: 0.6
      });
    }

    // 5. Common path corrections
    const alternativePaths = this.generateAlternativePaths(requestedPath);
    const validAlternatives: string[] = [];
    
    for (const altPath of alternativePaths) {
      if (await this.pathExists(altPath)) {
        validAlternatives.push(altPath);
      }
    }

    if (validAlternatives.length > 0) {
      suggestions.push({
        type: 'alternative_path',
        description: 'Alternative paths that exist',
        data: {
          requestedPath,
          alternatives: validAlternatives
        },
        confidence: 0.85
      });
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, this.maxSuggestions);
  }

  /**
   * Generate suggestions for directory not found errors
   */
  async suggestForDirectoryNotFound(requestedPath: string): Promise<ErrorSuggestion[]> {
    const suggestions: ErrorSuggestion[] = [];

    // Similar to file not found, but focus on directories
    const parentDir = dirname(requestedPath);
    const dirName = basename(requestedPath);

    try {
      const parentExists = await this.pathExists(parentDir);
      if (parentExists) {
        const entries = await this.listDirectory(parentDir);
        const directories = entries.filter(entry => entry.isDirectory);

        suggestions.push({
          type: 'directory_listing',
          description: `Subdirectories in '${parentDir}'`,
          data: {
            directory: parentDir,
            subdirectories: directories.map(d => d.name),
            totalDirectories: directories.length
          },
          confidence: 0.9
        });

        // Find similar directory names
        const similarDirs = this.findSimilarFilenames(dirName, directories.map(d => d.name));
        if (similarDirs.length > 0) {
          suggestions.push({
            type: 'similar_files',
            description: `Similar directories in '${parentDir}'`,
            data: {
              requestedDirectory: dirName,
              similarDirectories: similarDirs,
              parentDirectory: parentDir
            },
            confidence: 0.8
          });
        }
      }
    } catch (error) {
      // Parent directory doesn't exist
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, this.maxSuggestions);
  }

  /**
   * Generate suggestions for search operations that found no results
   */
  async suggestForEmptySearchResults(query: string, searchType: 'content' | 'semantic' | 'filename'): Promise<ErrorSuggestion[]> {
    const suggestions: ErrorSuggestion[] = [];

    // 1. Suggest alternative search terms
    const alternativeTerms = this.generateAlternativeSearchTerms(query);
    if (alternativeTerms.length > 0) {
      suggestions.push({
        type: 'search_results',
        description: 'Alternative search terms',
        data: {
          originalQuery: query,
          suggestions: alternativeTerms,
          searchType
        },
        confidence: 0.7
      });
    }

    // 2. Suggest broader search
    if (query.includes(' ')) {
      const broadTerms = query.split(' ').filter(term => term.length > 2);
      suggestions.push({
        type: 'search_results',
        description: 'Try searching for individual terms',
        data: {
          originalQuery: query,
          broadTerms,
          searchType
        },
        confidence: 0.6
      });
    }

    return suggestions;
  }

  /**
   * Format error recovery context into a helpful message
   */
  formatSuggestions(context: ErrorRecoveryContext): string {
    if (context.suggestions.length === 0) {
      return context.error;
    }

    let message = `${context.error}\n\nSuggestions:\n`;

    for (const suggestion of context.suggestions) {
      message += `\n• ${suggestion.description}`;
      
      switch (suggestion.type) {
        case 'directory_listing':
          if (suggestion.data.files && suggestion.data.files.length > 0) {
            message += `\n  Files: ${suggestion.data.files.slice(0, 5).map((f: any) => f.name || f).join(', ')}`;
            if (suggestion.data.hasMore) {
              message += ` ... and ${suggestion.data.totalFiles - 5} more`;
            }
          }
          break;
        
        case 'similar_files':
          if (suggestion.data.similarFiles && suggestion.data.similarFiles.length > 0) {
            message += `\n  Did you mean: ${suggestion.data.similarFiles.join(', ')}?`;
          }
          break;
        
        case 'search_results':
          if (suggestion.data.foundLocations && suggestion.data.foundLocations.length > 0) {
            message += `\n  Found in: ${suggestion.data.foundLocations.join(', ')}`;
          }
          break;
        
        case 'alternative_path':
          if (suggestion.data.alternatives && suggestion.data.alternatives.length > 0) {
            message += `\n  Try: ${suggestion.data.alternatives[0]}`;
          }
          break;
      }
    }

    return message;
  }

  // Private helper methods

  private async pathExists(path: string): Promise<boolean> {
    try {
      await fs.access(join(this.basePath, path));
      return true;
    } catch {
      return false;
    }
  }

  private async listDirectory(path: string): Promise<Array<{name: string, isDirectory: boolean}>> {
    try {
      const fullPath = join(this.basePath, path);
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      return entries.map(entry => ({
        name: entry.name,
        isDirectory: entry.isDirectory()
      }));
    } catch {
      return [];
    }
  }

  private findSimilarFilenames(target: string, candidates: string[]): string[] {
    const targetLower = target.toLowerCase();
    const targetBase = basename(target, extname(target)).toLowerCase();
    
    const scored = candidates.map(candidate => {
      const candidateLower = candidate.toLowerCase();
      const candidateBase = basename(candidate, extname(candidate)).toLowerCase();
      
      let score = 0;
      
      // Exact match (case insensitive)
      if (candidateLower === targetLower) {
        score = 100;
      }
      // Starts with target
      else if (candidateLower.startsWith(targetLower) || candidateBase.startsWith(targetBase)) {
        score = 80;
      }
      // Contains target
      else if (candidateLower.includes(targetLower) || candidateBase.includes(targetBase)) {
        score = 60;
      }
      // Levenshtein distance for fuzzy matching
      else {
        const distance = this.levenshteinDistance(targetBase, candidateBase);
        const maxLen = Math.max(targetBase.length, candidateBase.length);
        score = Math.max(0, 40 - (distance / maxLen) * 40);
      }
      
      return { name: candidate, score };
    });

    return scored
      .filter(item => item.score > 30)
      .sort((a, b) => b.score - a.score)
      .map(item => item.name);
  }

  private async searchForFilename(filename: string, maxDepth: number = 3): Promise<string[]> {
    const results: string[] = [];
    const visited = new Set<string>();

    const search = async (dir: string, depth: number) => {
      if (depth > maxDepth || visited.has(dir)) return;
      visited.add(dir);

      try {
        const entries = await fs.readdir(join(this.basePath, dir), { withFileTypes: true });
        
        for (const entry of entries) {
          const entryPath = join(dir, entry.name);
          
          if (entry.name.toLowerCase() === filename.toLowerCase()) {
            results.push(entryPath);
          }
          
          if (entry.isDirectory() && !this.isExcludedDirectory(entry.name)) {
            await search(entryPath, depth + 1);
          }
        }
      } catch {
        // Skip directories we can't read
      }
    };

    await search('.', 0);
    return results;
  }

  private isExcludedDirectory(name: string): boolean {
    const excluded = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'];
    return excluded.includes(name);
  }

  private getParentPaths(path: string): string[] {
    const parts = path.split('/').filter(p => p);
    const parents: string[] = [];
    
    for (let i = parts.length - 1; i >= 0; i--) {
      parents.push(parts.slice(0, i).join('/') || '.');
    }
    
    return parents;
  }

  private generateAlternativePaths(path: string): string[] {
    const alternatives: string[] = [];
    const parts = path.split('/').filter(p => p);
    const filename = parts[parts.length - 1];
    const dir = parts.slice(0, -1).join('/');

    if (!filename) return alternatives;

    // Try different extensions
    const extensions = ['.md', '.ts', '.js', '.txt', '.json', '.yaml', '.yml'];
    const baseWithoutExt = basename(filename, extname(filename));
    
    for (const ext of extensions) {
      if (!filename.endsWith(ext)) {
        alternatives.push(join(dir, baseWithoutExt + ext));
      }
    }

    // Try index files
    if (filename !== 'index.md' && filename !== 'README.md') {
      alternatives.push(join(path, 'index.md'));
      alternatives.push(join(path, 'README.md'));
    }

    // Try without extension
    if (extname(filename)) {
      alternatives.push(join(dir, baseWithoutExt));
    }

    return alternatives;
  }

  private generateAlternativeSearchTerms(query: string): string[] {
    const terms: string[] = [];
    
    // Split camelCase and snake_case
    const words = query
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .split(' ')
      .filter(w => w.length > 2);

    // Try individual words
    if (words.length > 1) {
      terms.push(...words);
    }

    // Try without common prefixes/suffixes
    const prefixes = ['get', 'set', 'is', 'has', 'can', 'should'];
    const suffixes = ['er', 'or', 'ing', 'ed', 's'];
    
    for (const word of words) {
      for (const prefix of prefixes) {
        if (word.toLowerCase().startsWith(prefix)) {
          terms.push(word.substring(prefix.length));
        }
      }
      for (const suffix of suffixes) {
        if (word.toLowerCase().endsWith(suffix)) {
          terms.push(word.substring(0, word.length - suffix.length));
        }
      }
    }

    return [...new Set(terms)].filter(t => t.length > 2);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0]![j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i]![j] = matrix[i - 1]![j - 1]!;
        } else {
          matrix[i]![j] = Math.min(
            matrix[i - 1]![j - 1]! + 1,
            matrix[i]![j - 1]! + 1,
            matrix[i - 1]![j]! + 1
          );
        }
      }
    }
    
    return matrix[str2.length]![str1.length]!;
  }
}