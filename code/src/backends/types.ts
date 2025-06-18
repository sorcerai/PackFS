/**
 * Backend interface definitions
 */

import type { FileMetadata } from '../core/types';

export interface BackendInterface {
  /**
   * Initialize the backend
   */
  initialize(): Promise<void>;

  /**
   * Read file contents
   */
  read(path: string): Promise<Buffer>;

  /**
   * Write file contents
   */
  write(path: string, data: Buffer): Promise<void>;

  /**
   * Check if file exists
   */
  exists(path: string): Promise<boolean>;

  /**
   * Get file metadata
   */
  stat(path: string): Promise<FileMetadata>;

  /**
   * List directory contents
   */
  list(path: string): Promise<string[]>;

  /**
   * Delete file or directory
   */
  delete(path: string): Promise<void>;

  /**
   * Cleanup resources
   */
  cleanup(): Promise<void>;
}