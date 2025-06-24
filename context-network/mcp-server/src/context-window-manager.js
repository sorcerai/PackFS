// PackFS integration enabled for enhanced semantic operations
import { createFileSystem } from 'packfs-core';
import { promisify } from 'util';
import zlib from 'zlib';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { ContextNetworkManager } from './context-manager.js';

// Promisify compression functions
const brotliCompress = promisify(zlib.brotliCompress);
const brotliDecompress = promisify(zlib.brotliDecompress);
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export class ContextWindowManager extends ContextNetworkManager {
  constructor() {
    super();
    
    // Initialize context window storage directories
    this.contextWindowRoot = path.join(this.dataDir, 'context-windows');
    
    // Ensure parent class dataDir is initialized
    if (!this.dataDir) {
      this.dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../data');
    }
    
    // Compression settings for maximum efficiency
    this.brotliOptions = {
      params: {
        [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
        [zlib.constants.BROTLI_PARAM_QUALITY]: 11, // Maximum compression
        [zlib.constants.BROTLI_PARAM_SIZE_HINT]: 0
      }
    };
    
    this.gzipOptions = {
      level: 6 // Balanced speed/compression
    };
    
    // Window management settings
    this.settings = {
      maxActiveWindows: 10,
      compressionThresholdTokens: 5000,
      gzipAgeThresholdDays: 2,
      brotliAgeThresholdDays: 7,
      maxWindowSizeBytes: 10 * 1024 * 1024 // 10MB
    };
    
    // Note: PackFS will be initialized on first use to avoid async constructor
  }

  async initializeStorage() {
    const dirs = ['active', 'packed', 'indices'];
    for (const dir of dirs) {
      await fs.mkdir(path.join(this.contextWindowRoot, dir), { recursive: true });
    }
    
    // Initialize PackFS after directories are created
    try {
      this.packfs = createFileSystem(this.contextWindowRoot);
      console.log('[INFO] PackFS initialized successfully for context windows');
      this.usePackFS = true;
    } catch (error) {
      console.error('[WARN] PackFS initialization failed, falling back to native fs:', error.message);
      this.packfs = null;
      this.usePackFS = false;
    }
  }

  async ensureInitialized() {
    if (this.packfs === undefined) {
      await this.initializeStorage();
    }
  }

  // Hybrid file operations - PackFS with native fs fallback
  async writeFileHybrid(filePath, content) {
    await this.ensureInitialized();
    
    if (this.usePackFS && this.packfs) {
      try {
        await this.packfs.writeFile(filePath, content);
        return;
      } catch (error) {
        console.warn(`[WARN] PackFS write failed for ${filePath}, falling back to native fs:`, error.message);
      }
    }
    
    // Fallback to native fs
    const fullPath = path.join(this.contextWindowRoot, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);
  }

  async readFileHybrid(filePath) {
    await this.ensureInitialized();
    
    if (this.usePackFS && this.packfs) {
      try {
        return await this.packfs.readFile(filePath);
      } catch (error) {
        console.warn(`[WARN] PackFS read failed for ${filePath}, falling back to native fs:`, error.message);
      }
    }
    
    // Fallback to native fs
    const fullPath = path.join(this.contextWindowRoot, filePath);
    return await fs.readFile(fullPath, 'utf8');
  }

  async executeNaturalLanguageHybrid(instruction) {
    await this.ensureInitialized();
    
    if (this.usePackFS && this.packfs) {
      try {
        await this.packfs.executeNaturalLanguage(instruction);
        return;
      } catch (error) {
        console.warn(`[WARN] PackFS natural language failed, skipping:`, error.message);
      }
    }
    // Native fs has no equivalent - just skip
  }

  async findFilesHybrid(query, options = {}) {
    await this.ensureInitialized();
    
    if (this.usePackFS && this.packfs) {
      try {
        return await this.packfs.findFiles(query, options);
      } catch (error) {
        console.warn(`[WARN] PackFS search failed, falling back to native search:`, error.message);
      }
    }
    
    // Fallback to basic file listing
    const activeDir = path.join(this.contextWindowRoot, 'active');
    try {
      const files = await fs.readdir(activeDir);
      return files.filter(f => f.includes(query) || f.endsWith('.json')).map(f => ({ path: f }));
    } catch (error) {
      return [];
    }
  }

  // Token counting approximation (4 chars ≈ 1 token)
  countTokens(content) {
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    return Math.ceil(text.length / 4);
  }

  // Record a new context window with automatic compression
  async recordContextWindow(content, metadata = {}) {
    const windowId = metadata.id || randomUUID();
    const timestamp = new Date().toISOString();
    const tokens = this.countTokens(content);
    
    const windowData = {
      id: windowId,
      content,
      metadata: {
        ...metadata,
        timestamp,
        tokens,
        compressed: false,
        conversationId: metadata.conversationId,
        summary: metadata.summary || this.generateSummary(content),
        tags: metadata.tags || [],
        accessCount: 0,
        lastAccessed: timestamp
      }
    };

    // Save uncompressed for immediate access
    const activePath = path.join('active', `window-${windowId}.json`);
    await this.writeFileHybrid(activePath, JSON.stringify(windowData, null, 2));
    
    // Use PackFS semantic indexing
    await this.executeNaturalLanguageHybrid(
      `Index new context window ${windowId} with ${tokens} tokens about: ${windowData.metadata.summary}`
    );
    
    // Schedule compression if needed
    if (tokens > this.settings.compressionThresholdTokens) {
      await this.scheduleCompression(windowId, 'immediate');
    }
    
    // Update window index
    await this.updateWindowIndex(windowId, windowData.metadata);
    
    return { id: windowId, tokens, compressed: false };
  }

  // Compress a window using specified method
  async compressWindow(windowId, method = 'gzip') {
    try {
      const activePath = path.join(this.contextWindowRoot, 'active', `window-${windowId}.json`);
      const windowData = this.safeJSONParse(await fs.readFile(activePath, 'utf8'), `window compression ${windowId}`);
      const jsonBuffer = Buffer.from(JSON.stringify(windowData));
      
      let compressed;
      let extension;
      let compressionRatio;
      
      const startTime = Date.now();
      
      if (method === 'brotli') {
        compressed = await brotliCompress(jsonBuffer, this.brotliOptions);
        extension = 'br';
      } else {
        compressed = await gzip(jsonBuffer, this.gzipOptions);
        extension = 'gz';
      }
      
      const compressionTime = Date.now() - startTime;
      compressionRatio = 1 - (compressed.length / jsonBuffer.length);
      
      // Save compressed file
      const packedPath = path.join(this.contextWindowRoot, 'packed', `window-${windowId}.${extension}`);
      await fs.writeFile(packedPath, compressed);
      
      // Update metadata
      windowData.metadata.compressed = method;
      windowData.metadata.compressionRatio = compressionRatio;
      windowData.metadata.compressionTime = compressionTime;
      windowData.metadata.compressedSize = compressed.length;
      windowData.metadata.originalSize = jsonBuffer.length;
      
      // Update semantic index with compression info
      await this.executeNaturalLanguageHybrid(
        `Update index: window ${windowId} compressed with ${method}, saved ${Math.round(compressionRatio * 100)}% space (${this.formatBytes(jsonBuffer.length)} → ${this.formatBytes(compressed.length)})`
      );
      
      // Remove uncompressed version
      await fs.unlink(activePath);
      
      // Update window index
      await this.updateWindowIndex(windowId, windowData.metadata);
      
      return {
        windowId,
        method,
        compressionRatio,
        compressionTime,
        originalSize: jsonBuffer.length,
        compressedSize: compressed.length
      };
    } catch (error) {
      console.error(`Failed to compress window ${windowId}:`, error);
      throw error;
    }
  }

  // Decompress a window
  async decompressWindow(filePath) {
    try {
      const fullPath = path.join(this.contextWindowRoot, filePath);
      const compressed = await fs.readFile(fullPath);
      
      let decompressed;
      const startTime = Date.now();
      
      if (filePath.endsWith('.br')) {
        decompressed = await brotliDecompress(compressed);
      } else if (filePath.endsWith('.gz')) {
        decompressed = await gunzip(compressed);
      } else {
        // Already uncompressed
        return this.safeJSONParse(compressed.toString(), `window decompression ${filePath}`);
      }
      
      const decompressionTime = Date.now() - startTime;
      const data = this.safeJSONParse(decompressed.toString(), `window decompression ${filePath}`);
      
      // Update access metadata
      data.metadata.lastAccessed = new Date().toISOString();
      data.metadata.accessCount = (data.metadata.accessCount || 0) + 1;
      data.metadata.lastDecompressionTime = decompressionTime;
      
      return data;
    } catch (error) {
      console.error(`Failed to decompress ${filePath}:`, error);
      throw error;
    }
  }

  // Query context windows using semantic search
  async queryContextSemantic(query, options = {}) {
    const {
      maxResults = 10,
      includeCompressed = true,
      minRelevance = 0.5,
      conversationId = null,
      timeRange = null
    } = options;
    
    // Use hybrid semantic search
    const searchPattern = includeCompressed ? 'window-*.{json,gz,br}' : 'window-*.json';
    let results;
    try {
      results = await this.findFilesHybrid(query, {
        searchType: 'semantic',
        includePattern: searchPattern,
        maxResults: maxResults * 2 // Get extra results for filtering
      });
    } catch (error) {
      console.error('PackFS findFiles error:', error);
      // Fallback to simple file listing if PackFS semantic search fails
      try {
        const activeFiles = await fs.readdir(path.join(this.contextWindowRoot, 'active'));
        const packedFiles = includeCompressed ? await fs.readdir(path.join(this.contextWindowRoot, 'packed')) : [];
        
        results = {
          files: [
            ...activeFiles.filter(f => f.startsWith('window-')).map(f => ({
              path: path.join(this.contextWindowRoot, 'active', f),
              relevance: 0.5 // Default relevance
            })),
            ...packedFiles.filter(f => f.startsWith('window-')).map(f => ({
              path: path.join(this.contextWindowRoot, 'packed', f),
              relevance: 0.5
            }))
          ]
        };
      } catch (fallbackError) {
        console.error('Fallback search also failed:', fallbackError);
        return [];
      }
    }
    
    // Handle PackFS format (it returns an array directly, not {files: []})
    let files = [];
    if (Array.isArray(results)) {
      files = results;
    } else if (results && results.files) {
      files = results.files;
    } else {
      console.error('PackFS returned unexpected format:', results);
      return [];
    }
    
    // Load and filter results
    const contexts = [];
    for (const result of files) {
      // Handle both relevance and relevanceScore from PackFS
      const relevance = result.relevance || result.relevanceScore || 0.5;
      if (relevance < minRelevance) continue;
      
      try {
        const relativePath = result.path.replace(this.contextWindowRoot + '/', '');
        const windowData = await this.decompressWindow(relativePath);
        
        // Apply filters
        if (conversationId && windowData.metadata.conversationId !== conversationId) continue;
        if (timeRange && !this.isInTimeRange(windowData.metadata.timestamp, timeRange)) continue;
        
        // Filter out non-window files
        if (!result.path.includes('window-')) continue;
        
        contexts.push({
          ...windowData,
          relevance: relevance,
          compressed: windowData.metadata.compressed || false,
          path: result.path
        });
        
        if (contexts.length >= maxResults) break;
      } catch (error) {
        console.error(`Failed to load window from ${result.path}:`, error);
      }
    }
    
    // Sort by relevance and recency
    contexts.sort((a, b) => {
      const relevanceDiff = b.relevance - a.relevance;
      if (Math.abs(relevanceDiff) > 0.1) return relevanceDiff;
      return new Date(b.metadata.timestamp) - new Date(a.metadata.timestamp);
    });
    
    return contexts;
  }

  // Run compression maintenance
  async runCompressionMaintenance() {
    const stats = {
      processed: 0,
      compressed: 0,
      upgraded: 0,
      errors: 0,
      spaceSaved: 0
    };
    
    try {
      // Get all windows from index instead of using PackFS natural language
      const indexPath = path.join(this.contextWindowRoot, 'indices', 'windows.json');
      let index = {};
      
      try {
        const indexData = await fs.readFile(indexPath, 'utf8');
        index = this.safeJSONParse(indexData, 'compression maintenance index');
      } catch (error) {
        console.log('No window index found, skipping maintenance');
        return stats;
      }
      
      const windows = Object.values(index);
      
      for (const window of windows) {
        stats.processed++;
        
        try {
          const ageInDays = this.getAgeInDays(window.timestamp);
          const isCompressed = window.compressed;
          
          if (!isCompressed && ageInDays > this.settings.gzipAgeThresholdDays) {
            // Compress with gzip for recent windows
            const result = await this.compressWindow(window.id, 'gzip');
            stats.compressed++;
            stats.spaceSaved += result.originalSize - result.compressedSize;
          } else if (isCompressed === 'gzip' && ageInDays > this.settings.brotliAgeThresholdDays) {
            // Upgrade to brotli for old windows
            const result = await this.recompressWindow(window.id, 'brotli');
            stats.upgraded++;
            stats.spaceSaved += result.spaceSaved;
          }
        } catch (error) {
          console.error(`Failed to process window ${window.id}:`, error);
          stats.errors++;
        }
      }
      
      // Clean up old windows beyond retention
      await this.cleanupOldWindows();
      
    } catch (error) {
      console.error('Compression maintenance failed:', error);
    }
    
    return stats;
  }

  // Recompress a window with a different method
  async recompressWindow(windowId, newMethod) {
    // First decompress
    const packedFiles = await fs.readdir(path.join(this.contextWindowRoot, 'packed'));
    const currentFile = packedFiles.find(f => f.startsWith(`window-${windowId}.`));
    
    if (!currentFile) {
      throw new Error(`Compressed window ${windowId} not found`);
    }
    
    const windowData = await this.decompressWindow(path.join('packed', currentFile));
    const originalCompressedSize = (await fs.stat(path.join(this.contextWindowRoot, 'packed', currentFile))).size;
    
    // Save temporarily as uncompressed
    const tempPath = path.join(this.contextWindowRoot, 'active', `window-${windowId}.json`);
    await fs.writeFile(tempPath, JSON.stringify(windowData));
    
    // Delete old compressed file
    await fs.unlink(path.join(this.contextWindowRoot, 'packed', currentFile));
    
    // Recompress with new method
    const result = await this.compressWindow(windowId, newMethod);
    result.spaceSaved = originalCompressedSize - result.compressedSize;
    
    return result;
  }

  // Update window index
  async updateWindowIndex(windowId, metadata) {
    const indexPath = path.join(this.contextWindowRoot, 'indices', 'windows.json');
    let index = {};
    
    try {
      const indexData = await fs.readFile(indexPath, 'utf8');
      index = this.safeJSONParse(indexData, 'window index update');
    } catch (error) {
      // Index doesn't exist yet
    }
    
    index[windowId] = {
      id: windowId,
      timestamp: metadata.timestamp,
      tokens: metadata.tokens,
      compressed: metadata.compressed,
      compressionRatio: metadata.compressionRatio,
      summary: metadata.summary,
      tags: metadata.tags,
      conversationId: metadata.conversationId,
      lastAccessed: metadata.lastAccessed,
      accessCount: metadata.accessCount
    };
    
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  }

  // Get storage statistics
  async getStorageStats() {
    const stats = {
      totalWindows: 0,
      activeWindows: 0,
      compressedWindows: 0,
      totalTokens: 0,
      totalSizeBytes: 0,
      compressedSizeBytes: 0,
      averageCompressionRatio: 0,
      oldestWindow: null,
      newestWindow: null
    };
    
    try {
      const indexPath = path.join(this.contextWindowRoot, 'indices', 'windows.json');
      const index = this.safeJSONParse(await fs.readFile(indexPath, 'utf8'), 'storage stats');
      
      const windows = Object.values(index);
      stats.totalWindows = windows.length;
      
      for (const window of windows) {
        stats.totalTokens += window.tokens || 0;
        
        if (window.compressed) {
          stats.compressedWindows++;
          if (window.compressionRatio) {
            stats.averageCompressionRatio += window.compressionRatio;
          }
        } else {
          stats.activeWindows++;
        }
        
        if (!stats.oldestWindow || window.timestamp < stats.oldestWindow) {
          stats.oldestWindow = window.timestamp;
        }
        if (!stats.newestWindow || window.timestamp > stats.newestWindow) {
          stats.newestWindow = window.timestamp;
        }
      }
      
      if (stats.compressedWindows > 0) {
        stats.averageCompressionRatio /= stats.compressedWindows;
      }
      
      // Calculate actual disk usage
      const activeFiles = await fs.readdir(path.join(this.contextWindowRoot, 'active'));
      const packedFiles = await fs.readdir(path.join(this.contextWindowRoot, 'packed'));
      
      for (const file of activeFiles) {
        if (file.startsWith('window-')) {
          const fileStat = await fs.stat(path.join(this.contextWindowRoot, 'active', file));
          stats.totalSizeBytes += fileStat.size;
        }
      }
      
      for (const file of packedFiles) {
        if (file.startsWith('window-')) {
          const fileStat = await fs.stat(path.join(this.contextWindowRoot, 'packed', file));
          stats.compressedSizeBytes += fileStat.size;
        }
      }
      
    } catch (error) {
      console.error('Failed to get storage stats:', error);
    }
    
    return stats;
  }

  // Helper methods
  generateSummary(content) {
    const text = typeof content === 'string' ? content : JSON.stringify(content);
    const words = text.split(/\s+/).slice(0, 20);
    const summary = words.join(' ');
    // Use safeTruncate to ensure emoji-safety (inherit from parent class)
    return this.safeTruncate(summary + (words.length >= 20 ? '...' : ''), 200);
  }

  // Helper function to safely truncate text with emojis (override parent method if needed)
  safeTruncate(text, maxLength = 100) {
    if (!text || text.length <= maxLength) {
      return text || '';
    }
    
    // Use Array.from to handle multi-byte characters properly
    const characters = Array.from(text);
    if (characters.length <= maxLength) {
      return text;
    }
    
    return characters.slice(0, maxLength).join('') + '...';
  }

  // Helper function for safe JSON parsing with better error messages (override parent method)
  safeJSONParse(jsonString, context = 'unknown') {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.error(`JSON parsing error in ${context}:`, error.message);
      console.error('Problematic JSON content preview:', jsonString.substring(0, 200) + '...');
      
      // Try to identify problematic characters
      const problematicChars = jsonString.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu);
      if (problematicChars) {
        console.error('Found emojis that might cause issues:', problematicChars.slice(0, 10));
      }
      
      throw new Error(`JSON parsing failed in ${context}: ${error.message}`);
    }
  }

  getAgeInDays(timestamp) {
    const age = Date.now() - new Date(timestamp).getTime();
    return age / (1000 * 60 * 60 * 24);
  }

  isInTimeRange(timestamp, range) {
    const date = new Date(timestamp);
    const now = new Date();
    
    switch (range) {
      case 'today':
        return date.toDateString() === now.toDateString();
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return date >= weekAgo;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return date >= monthAgo;
      default:
        return true;
    }
  }

  formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  async scheduleCompression(windowId, priority = 'normal') {
    // For now, immediate compression
    // In production, this could use a job queue
    if (priority === 'immediate') {
      setTimeout(() => {
        this.compressWindow(windowId, 'gzip').catch(console.error);
      }, 1000);
    }
  }

  async cleanupOldWindows(retentionDays = 90) {
    // Clean up windows older than retention period
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    
    const indexPath = path.join(this.contextWindowRoot, 'indices', 'windows.json');
    const index = this.safeJSONParse(await fs.readFile(indexPath, 'utf8'), 'cleanup old windows');
    
    let cleaned = 0;
    for (const [windowId, metadata] of Object.entries(index)) {
      if (new Date(metadata.timestamp) < cutoffDate) {
        // Remove files
        try {
          await this.executeNaturalLanguageHybrid(
            `Delete context window ${windowId} and all associated files`
          );
          delete index[windowId];
          cleaned++;
        } catch (error) {
          console.error(`Failed to clean up window ${windowId}:`, error);
        }
      }
    }
    
    if (cleaned > 0) {
      await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
    }
    
    return cleaned;
  }
}