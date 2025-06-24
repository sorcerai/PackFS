/**
 * Factory Pattern Example for PackFS
 * 
 * This example shows how to create non-singleton instances of PackFS
 * for different projects, avoiding the initialization-time path binding.
 */

import { DiskSemanticBackend } from '@packfs/core';
import { createEnhancedFileSystem } from '@packfs/core';
import type { SemanticFileSystemInterface } from '@packfs/core';

/**
 * Factory for creating project-specific filesystem instances
 */
export class PackFSFactory {
  private instances: Map<string, SemanticFileSystemInterface> = new Map();

  /**
   * Get or create a filesystem instance for a specific project
   */
  async getFileSystem(projectPath: string): Promise<SemanticFileSystemInterface> {
    // Return existing instance if available
    if (this.instances.has(projectPath)) {
      return this.instances.get(projectPath)!;
    }

    // Create new instance for this project
    const backend = new DiskSemanticBackend(projectPath);
    const filesystem = createEnhancedFileSystem(backend);
    
    // Initialize the filesystem
    await filesystem.initialize();
    
    // Cache the instance
    this.instances.set(projectPath, filesystem);
    
    return filesystem;
  }

  /**
   * Create a temporary filesystem instance without caching
   */
  async createTemporaryFileSystem(projectPath: string): Promise<SemanticFileSystemInterface> {
    const backend = new DiskSemanticBackend(projectPath);
    const filesystem = createEnhancedFileSystem(backend);
    await filesystem.initialize();
    return filesystem;
  }

  /**
   * Clear cached instances
   */
  clearCache(projectPath?: string): void {
    if (projectPath) {
      this.instances.delete(projectPath);
    } else {
      this.instances.clear();
    }
  }

  /**
   * Get number of cached instances
   */
  getCacheSize(): number {
    return this.instances.size;
  }
}

/**
 * Example usage with multiple projects
 */
export async function multiProjectExample() {
  const factory = new PackFSFactory();

  // Work with Project A
  const projectA = await factory.getFileSystem('/projects/project-a');
  await projectA.updateContent({
    path: 'notes.md',
    content: 'Project A notes',
    purpose: 'create'
  });

  // Work with Project B
  const projectB = await factory.getFileSystem('/projects/project-b');
  await projectB.updateContent({
    path: 'notes.md',
    content: 'Project B notes',
    purpose: 'create'
  });

  // Both projects have separate filesystem instances
  const notesA = await projectA.accessFile({
    path: 'notes.md',
    purpose: 'read'
  });
  
  const notesB = await projectB.accessFile({
    path: 'notes.md',
    purpose: 'read'
  });

  console.log('Project A notes:', notesA.content);
  console.log('Project B notes:', notesB.content);
}

/**
 * Example with resource management
 */
export class ManagedPackFSFactory extends PackFSFactory {
  private maxInstances: number;

  constructor(maxInstances: number = 100) {
    super();
    this.maxInstances = maxInstances;
  }

  async getFileSystem(projectPath: string): Promise<SemanticFileSystemInterface> {
    // Implement LRU eviction if cache is full
    if (this.getCacheSize() >= this.maxInstances && !this.instances.has(projectPath)) {
      // Simple eviction: remove first entry (could be improved to LRU)
      const firstKey = this.instances.keys().next().value;
      if (firstKey) {
        this.instances.delete(firstKey);
      }
    }

    return super.getFileSystem(projectPath);
  }
}

/**
 * Example integration with Mastra using factory pattern
 */
export function createProjectSpecificMastraTool(projectPath: string) {
  const backend = new DiskSemanticBackend(projectPath);
  
  return {
    name: 'project_filesystem',
    description: `Filesystem operations for project: ${projectPath}`,
    parameters: {
      type: 'object',
      properties: {
        operation: { type: 'string' },
        target: { type: 'object' },
        content: { type: 'string' }
      }
    },
    execute: async (params: any) => {
      const filesystem = createEnhancedFileSystem(backend);
      await filesystem.initialize();
      
      // Execute operation based on params
      switch (params.operation) {
        case 'read':
          return await filesystem.accessFile({
            path: params.target.path,
            purpose: 'read'
          });
        case 'write':
          return await filesystem.updateContent({
            path: params.target.path,
            content: params.content,
            purpose: 'create'
          });
        default:
          throw new Error(`Unknown operation: ${params.operation}`);
      }
    }
  };
}

/**
 * Thread-safe factory with connection pooling
 */
export class ThreadSafePackFSFactory {
  private pools: Map<string, SemanticFileSystemInterface[]> = new Map();
  private poolSize: number;
  private createLock: Map<string, Promise<void>> = new Map();

  constructor(poolSize: number = 5) {
    this.poolSize = poolSize;
  }

  async getConnection(projectPath: string): Promise<{
    filesystem: SemanticFileSystemInterface;
    release: () => void;
  }> {
    // Initialize pool if needed
    if (!this.pools.has(projectPath)) {
      await this.initializePool(projectPath);
    }

    const pool = this.pools.get(projectPath)!;
    
    // Wait for available connection
    while (pool.length === 0) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const filesystem = pool.pop()!;

    return {
      filesystem,
      release: () => {
        // Return connection to pool
        pool.push(filesystem);
      }
    };
  }

  private async initializePool(projectPath: string): Promise<void> {
    // Prevent concurrent initialization
    if (this.createLock.has(projectPath)) {
      await this.createLock.get(projectPath);
      return;
    }

    const lockPromise = this.createPoolInstances(projectPath);
    this.createLock.set(projectPath, lockPromise);
    
    try {
      await lockPromise;
    } finally {
      this.createLock.delete(projectPath);
    }
  }

  private async createPoolInstances(projectPath: string): Promise<void> {
    const instances: SemanticFileSystemInterface[] = [];
    
    for (let i = 0; i < this.poolSize; i++) {
      const backend = new DiskSemanticBackend(projectPath);
      const filesystem = createEnhancedFileSystem(backend);
      await filesystem.initialize();
      instances.push(filesystem);
    }
    
    this.pools.set(projectPath, instances);
  }
}

// Usage example with connection pooling
export async function connectionPoolExample() {
  const factory = new ThreadSafePackFSFactory(3);

  // Simulate concurrent operations
  const operations = Array.from({ length: 10 }, async (_, i) => {
    const { filesystem, release } = await factory.getConnection('/projects/shared');
    
    try {
      await filesystem.updateContent({
        path: `file-${i}.txt`,
        content: `Content ${i}`,
        purpose: 'create'
      });
    } finally {
      release();
    }
  });

  await Promise.all(operations);
}