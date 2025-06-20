/**
 * In-memory storage backend for testing and caching
 */

import type { FileMetadata } from '../core/types.js';
import type { BackendInterface } from './types.js';
import { Logger, CategoryLogger } from '../core/logger.js';

interface MemoryFile {
  data: Buffer;
  metadata: FileMetadata;
}

export class MemoryBackend implements BackendInterface {
  private files = new Map<string, MemoryFile>();
  private readonly logger: CategoryLogger;

  constructor() {
    this.logger = Logger.getInstance().createChildLogger('MemoryBackend');
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing memory backend');
    // No initialization needed for memory backend
  }

  async read(path: string): Promise<Buffer> {
    this.logger.debug(`Reading file: ${path}`);
    const file = this.files.get(path);
    if (!file) {
      this.logger.error(`File not found: ${path}`);
      throw new Error(`File not found: ${path}`);
    }
    this.logger.info(`Successfully read file: ${path}`, { size: file.data.length });
    return file.data;
  }

  async write(path: string, data: Buffer): Promise<void> {
    this.logger.debug(`Writing file: ${path}`, { size: data.length });
    const metadata: FileMetadata = {
      path,
      size: data.length,
      mtime: new Date(),
      isDirectory: false,
      permissions: 0o644
    };

    this.files.set(path, { data, metadata });
    this.logger.info(`Successfully wrote file: ${path}`, { size: data.length });
  }

  async exists(path: string): Promise<boolean> {
    this.logger.debug(`Checking existence: ${path}`);
    const exists = this.files.has(path);
    this.logger.debug(`File ${exists ? 'exists' : 'does not exist'}: ${path}`);
    return exists;
  }

  async stat(path: string): Promise<FileMetadata> {
    this.logger.debug(`Getting file stats: ${path}`);
    const file = this.files.get(path);
    if (!file) {
      this.logger.error(`File not found: ${path}`);
      throw new Error(`File not found: ${path}`);
    }
    this.logger.debug(`Got file stats: ${path}`, file.metadata);
    return file.metadata;
  }

  async list(path: string): Promise<string[]> {
    this.logger.debug(`Listing directory: ${path}`);
    // Simple implementation - return all files that start with the path
    const entries: string[] = [];
    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(path) && filePath !== path) {
        const relativePath = filePath.substring(path.length + 1);
        const parts = relativePath.split('/');
        if (parts.length === 1) {
          entries.push(parts[0]!);
        }
      }
    }
    const uniqueEntries = [...new Set(entries)];
    this.logger.info(`Listed directory: ${path}`, { count: uniqueEntries.length });
    return uniqueEntries;
  }

  async delete(path: string): Promise<void> {
    this.logger.debug(`Deleting: ${path}`);
    if (!this.files.has(path)) {
      this.logger.error(`File not found: ${path}`);
      throw new Error(`File not found: ${path}`);
    }
    this.files.delete(path);
    this.logger.info(`Deleted file: ${path}`);
  }

  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up memory backend');
    const fileCount = this.files.size;
    this.files.clear();
    this.logger.debug(`Cleared ${fileCount} files from memory`);
  }
}