/**
 * Simple Enhanced PackFS - A wrapper that adds logging and enhanced features
 * without the complexity of extending FakeFS
 */

import { Logger, CategoryLogger } from '../core/logger.js';
import { FileSystemInterface } from '../core/filesystem.js';
import { DiskBackend } from '../backends/disk.js';
import { MemoryBackend } from '../backends/memory.js';

export interface SimpleEnhancedConfig {
  enableLogging?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export class SimpleEnhancedPackFS extends FileSystemInterface {
  private backend: DiskBackend | MemoryBackend;
  private config: SimpleEnhancedConfig;
  protected override logger: CategoryLogger;

  constructor(backend: DiskBackend | MemoryBackend, config: SimpleEnhancedConfig = {}) {
    super();
    this.backend = backend;
    this.config = {
      enableLogging: true,
      logLevel: 'info',
      ...config
    };
    this.logger = Logger.getInstance().createChildLogger('SimpleEnhancedPackFS');
    
    if (this.config.enableLogging) {
      this.logger.info('Initialized enhanced filesystem', { config: this.config });
    }
  }

  async readFile(path: string, options?: any): Promise<string | Buffer> {
    this.logger.debug(`Reading file: ${path}`, { options });
    try {
      const data = await this.backend.read(path);
      this.logger.info(`Successfully read file: ${path}`, { size: data.length });
      return options?.encoding ? data.toString(options.encoding) : data;
    } catch (error) {
      this.logger.error(`Failed to read file: ${path}`, { error });
      throw error;
    }
  }

  async writeFile(path: string, data: string | Buffer, options?: any): Promise<void> {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, options?.encoding || 'utf8');
    this.logger.debug(`Writing file: ${path}`, { size: buffer.length, options });
    try {
      await this.backend.write(path, buffer);
      this.logger.info(`Successfully wrote file: ${path}`, { size: buffer.length });
    } catch (error) {
      this.logger.error(`Failed to write file: ${path}`, { error });
      throw error;
    }
  }

  async exists(path: string): Promise<boolean> {
    this.logger.debug(`Checking existence: ${path}`);
    const exists = await this.backend.exists(path);
    this.logger.debug(`File ${exists ? 'exists' : 'does not exist'}: ${path}`);
    return exists;
  }

  async stat(path: string): Promise<any> {
    this.logger.debug(`Getting file stats: ${path}`);
    try {
      const stats = await this.backend.stat(path);
      this.logger.debug(`Got file stats: ${path}`, stats);
      return stats;
    } catch (error) {
      this.logger.error(`Failed to stat file: ${path}`, { error });
      throw error;
    }
  }

  async readdir(path: string): Promise<string[]> {
    this.logger.debug(`Listing directory: ${path}`);
    try {
      const items = await this.backend.list(path);
      this.logger.info(`Listed directory: ${path}`, { count: items.length });
      return items;
    } catch (error) {
      this.logger.error(`Failed to list directory: ${path}`, { error });
      throw error;
    }
  }

  async mkdir(path: string, recursive?: boolean): Promise<void> {
    this.logger.debug(`Creating directory: ${path}`, { recursive });
    try {
      // Backend doesn't have mkdir, so we simulate it
      await this.backend.write(`${path}/.gitkeep`, Buffer.from(''));
      this.logger.info(`Created directory: ${path}`);
    } catch (error) {
      this.logger.error(`Failed to create directory: ${path}`, { error });
      throw error;
    }
  }

  async remove(path: string, recursive?: boolean): Promise<void> {
    this.logger.debug(`Removing: ${path}`, { recursive });
    try {
      await this.backend.delete(path);
      this.logger.info(`Removed: ${path}`);
    } catch (error) {
      this.logger.error(`Failed to remove: ${path}`, { error });
      throw error;
    }
  }

  async copy(source: string, destination: string): Promise<void> {
    this.logger.debug(`Copying from ${source} to ${destination}`);
    try {
      const data = await this.backend.read(source);
      await this.backend.write(destination, data);
      this.logger.info(`Copied ${source} to ${destination}`);
    } catch (error) {
      this.logger.error(`Failed to copy from ${source} to ${destination}`, { error });
      throw error;
    }
  }

  async move(source: string, destination: string): Promise<void> {
    this.logger.debug(`Moving from ${source} to ${destination}`);
    try {
      const data = await this.backend.read(source);
      await this.backend.write(destination, data);
      await this.backend.delete(source);
      this.logger.info(`Moved ${source} to ${destination}`);
    } catch (error) {
      this.logger.error(`Failed to move from ${source} to ${destination}`, { error });
      throw error;
    }
  }
}

export function createSimpleEnhancedFileSystem(basePath: string, config?: SimpleEnhancedConfig): SimpleEnhancedPackFS {
  const backend = new DiskBackend(basePath);
  return new SimpleEnhancedPackFS(backend, config);
}