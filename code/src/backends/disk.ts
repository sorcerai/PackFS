/**
 * Disk-based storage backend
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import type { FileMetadata } from '../core/types.js';
import type { BackendInterface } from './types.js';
import { Logger, CategoryLogger } from '../core/logger.js';

export class DiskBackend implements BackendInterface {
  private readonly basePath: string;
  private readonly logger: CategoryLogger;

  constructor(basePath: string) {
    this.basePath = basePath;
    this.logger = Logger.getInstance().createChildLogger('DiskBackend');
  }

  async initialize(): Promise<void> {
    this.logger.info(`Initializing disk backend at ${this.basePath}`);
    try {
      await fs.mkdir(this.basePath, { recursive: true });
      this.logger.debug(`Successfully created base directory: ${this.basePath}`);
    } catch (error) {
      this.logger.error(`Failed to initialize disk backend`, { error: error instanceof Error ? error.message : error });
      throw new Error(`Failed to initialize disk backend: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async read(path: string): Promise<Buffer> {
    const fullPath = join(this.basePath, path);
    this.logger.debug(`Reading file: ${path}`, { fullPath });
    try {
      const data = await fs.readFile(fullPath);
      this.logger.info(`Successfully read file: ${path}`, { size: data.length });
      return data;
    } catch (error) {
      this.logger.error(`Failed to read file: ${path}`, { error: error instanceof Error ? error.message : error });
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async write(path: string, data: Buffer): Promise<void> {
    const fullPath = join(this.basePath, path);
    const dir = dirname(fullPath);
    this.logger.debug(`Writing file: ${path}`, { fullPath, size: data.length });
    
    try {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(fullPath, data);
      this.logger.info(`Successfully wrote file: ${path}`, { size: data.length });
    } catch (error) {
      this.logger.error(`Failed to write file: ${path}`, { error: error instanceof Error ? error.message : error });
      throw new Error(`Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async exists(path: string): Promise<boolean> {
    const fullPath = join(this.basePath, path);
    this.logger.debug(`Checking existence: ${path}`, { fullPath });
    try {
      await fs.access(fullPath);
      this.logger.debug(`File exists: ${path}`);
      return true;
    } catch {
      this.logger.debug(`File does not exist: ${path}`);
      return false;
    }
  }

  async stat(path: string): Promise<FileMetadata> {
    const fullPath = join(this.basePath, path);
    this.logger.debug(`Getting file stats: ${path}`, { fullPath });
    try {
      const stats = await fs.stat(fullPath);
      const metadata = {
        path,
        size: stats.size,
        mtime: stats.mtime,
        isDirectory: stats.isDirectory(),
        permissions: stats.mode
      };
      this.logger.debug(`Got file stats: ${path}`, metadata);
      return metadata;
    } catch (error) {
      this.logger.error(`Failed to stat file: ${path}`, { error: error instanceof Error ? error.message : error });
      throw new Error(`Failed to stat file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async list(path: string): Promise<string[]> {
    const fullPath = join(this.basePath, path);
    this.logger.debug(`Listing directory: ${path}`, { fullPath });
    try {
      const items = await fs.readdir(fullPath);
      this.logger.info(`Listed directory: ${path}`, { count: items.length });
      return items;
    } catch (error) {
      this.logger.error(`Failed to list directory: ${path}`, { error: error instanceof Error ? error.message : error });
      throw new Error(`Failed to list directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(path: string): Promise<void> {
    const fullPath = join(this.basePath, path);
    this.logger.debug(`Deleting: ${path}`, { fullPath });
    try {
      const stats = await fs.stat(fullPath);
      if (stats.isDirectory()) {
        await fs.rmdir(fullPath, { recursive: true });
        this.logger.info(`Deleted directory: ${path}`);
      } else {
        await fs.unlink(fullPath);
        this.logger.info(`Deleted file: ${path}`);
      }
    } catch (error) {
      this.logger.error(`Failed to delete: ${path}`, { error: error instanceof Error ? error.message : error });
      throw new Error(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async cleanup(): Promise<void> {
    // No cleanup needed for disk backend
  }
}