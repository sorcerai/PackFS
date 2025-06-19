/**
 * Security engine for filesystem operations
 */

import type { SecurityConfig } from './types.js';

export class SecurityEngine {
  private readonly config: SecurityConfig;

  constructor(config: SecurityConfig) {
    this.config = config;
  }

  /**
   * Validate if a file operation is allowed
   */
  validateOperation(path: string, _operation: 'read' | 'write' | 'delete'): boolean {
    // Stub implementation - will be expanded
    if (this.isBlockedPath(path)) {
      return false;
    }

    if (this.config.validatePaths && !this.isValidPath(path)) {
      return false;
    }

    return true;
  }

  /**
   * Check if path is in blocked list
   */
  private isBlockedPath(path: string): boolean {
    return this.config.blockedPaths.some(blocked => 
      path.startsWith(blocked) || path.includes(blocked)
    );
  }

  /**
   * Validate path format and security
   */
  private isValidPath(path: string): boolean {
    // Basic validation - prevent path traversal
    if (path.includes('..') || path.includes('~')) {
      return false;
    }

    // Ensure path is within sandbox if configured
    if (this.config.sandboxPath && !path.startsWith(this.config.sandboxPath)) {
      return false;
    }

    return true;
  }

  /**
   * Check if file extension is allowed
   */
  isAllowedExtension(filename: string): boolean {
    if (this.config.allowedExtensions.length === 0) {
      return true; // No restrictions
    }

    const ext = filename.split('.').pop()?.toLowerCase();
    return ext ? this.config.allowedExtensions.includes(ext) : false;
  }

  /**
   * Validate file size
   */
  isValidFileSize(size: number): boolean {
    return size <= this.config.maxFileSize;
  }
}