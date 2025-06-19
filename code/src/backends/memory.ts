/**
 * In-memory storage backend for testing and caching
 */

import type { FileMetadata } from '../core/types.js';
import type { BackendInterface } from './types.js';

interface MemoryFile {
  data: Buffer;
  metadata: FileMetadata;
}

export class MemoryBackend implements BackendInterface {
  private files = new Map<string, MemoryFile>();

  async initialize(): Promise<void> {
    // No initialization needed for memory backend
  }

  async read(path: string): Promise<Buffer> {
    const file = this.files.get(path);
    if (!file) {
      throw new Error(`File not found: ${path}`);
    }
    return file.data;
  }

  async write(path: string, data: Buffer): Promise<void> {
    const metadata: FileMetadata = {
      path,
      size: data.length,
      mtime: new Date(),
      isDirectory: false,
      permissions: 0o644
    };

    this.files.set(path, { data, metadata });
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  async stat(path: string): Promise<FileMetadata> {
    const file = this.files.get(path);
    if (!file) {
      throw new Error(`File not found: ${path}`);
    }
    return file.metadata;
  }

  async list(path: string): Promise<string[]> {
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
    return [...new Set(entries)];
  }

  async delete(path: string): Promise<void> {
    if (!this.files.has(path)) {
      throw new Error(`File not found: ${path}`);
    }
    this.files.delete(path);
  }

  async cleanup(): Promise<void> {
    this.files.clear();
  }
}