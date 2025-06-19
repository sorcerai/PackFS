/**
 * Core filesystem interface for PackFS
 */

import type { FileMetadata, ReadOptions, WriteOptions } from './types.js';

export abstract class FileSystemInterface {
  /**
   * Read file contents
   */
  abstract readFile(path: string, options?: ReadOptions): Promise<string | Buffer>;

  /**
   * Write file contents
   */
  abstract writeFile(path: string, data: string | Buffer, options?: WriteOptions): Promise<void>;

  /**
   * Check if file or directory exists
   */
  abstract exists(path: string): Promise<boolean>;

  /**
   * Get file metadata
   */
  abstract stat(path: string): Promise<FileMetadata>;

  /**
   * List directory contents
   */
  abstract readdir(path: string): Promise<string[]>;

  /**
   * Create directory
   */
  abstract mkdir(path: string, recursive?: boolean): Promise<void>;

  /**
   * Remove file or directory
   */
  abstract remove(path: string, recursive?: boolean): Promise<void>;

  /**
   * Copy file or directory
   */
  abstract copy(source: string, destination: string): Promise<void>;

  /**
   * Move/rename file or directory
   */
  abstract move(source: string, destination: string): Promise<void>;
}