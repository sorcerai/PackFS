/**
 * Disk-based storage backend
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import type { FileMetadata } from '../core/types';
import type { BackendInterface } from './types';

export class DiskBackend implements BackendInterface {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to initialize disk backend: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async read(path: string): Promise<Buffer> {
    const fullPath = join(this.basePath, path);
    try {
      return await fs.readFile(fullPath);
    } catch (error) {
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async write(path: string, data: Buffer): Promise<void> {
    const fullPath = join(this.basePath, path);
    const dir = dirname(fullPath);
    
    try {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(fullPath, data);
    } catch (error) {
      throw new Error(`Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async exists(path: string): Promise<boolean> {
    const fullPath = join(this.basePath, path);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async stat(path: string): Promise<FileMetadata> {
    const fullPath = join(this.basePath, path);
    try {
      const stats = await fs.stat(fullPath);
      return {
        path,
        size: stats.size,
        mtime: stats.mtime,
        isDirectory: stats.isDirectory(),
        permissions: stats.mode
      };
    } catch (error) {
      throw new Error(`Failed to stat file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async list(path: string): Promise<string[]> {
    const fullPath = join(this.basePath, path);
    try {
      return await fs.readdir(fullPath);
    } catch (error) {
      throw new Error(`Failed to list directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(path: string): Promise<void> {
    const fullPath = join(this.basePath, path);
    try {
      const stats = await fs.stat(fullPath);
      if (stats.isDirectory()) {
        await fs.rmdir(fullPath, { recursive: true });
      } else {
        await fs.unlink(fullPath);
      }
    } catch (error) {
      throw new Error(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async cleanup(): Promise<void> {
    // No cleanup needed for disk backend
  }
}