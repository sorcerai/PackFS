/**
 * Path validation utilities
 */

import { resolve, normalize, relative } from 'path';
import type { ValidationResult } from './types.js';

export class PathValidator {
  private readonly sandboxPath?: string;

  constructor(sandboxPath?: string) {
    this.sandboxPath = sandboxPath;
  }

  /**
   * Validate and normalize a file path
   */
  validate(inputPath: string): ValidationResult {
    try {
      // Normalize the path
      const normalizedPath = normalize(inputPath);

      // Check for path traversal attempts
      if (normalizedPath.includes('..')) {
        return {
          isValid: false,
          error: 'Path traversal not allowed'
        };
      }

      // Check sandbox restrictions
      if (this.sandboxPath) {
        const resolvedPath = resolve(normalizedPath);
        const sandboxResolved = resolve(this.sandboxPath);
        const relativePath = relative(sandboxResolved, resolvedPath);

        if (relativePath.startsWith('..')) {
          return {
            isValid: false,
            error: 'Path outside sandbox not allowed'
          };
        }
      }

      return {
        isValid: true,
        normalizedPath
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Invalid path: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Check if path is within sandbox
   */
  isInSandbox(inputPath: string): boolean {
    if (!this.sandboxPath) {
      return true; // No sandbox configured
    }

    const validation = this.validate(inputPath);
    return validation.isValid;
  }
}