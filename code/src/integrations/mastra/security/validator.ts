/**
 * Security validator for Mastra filesystem operations
 */

import { resolve, normalize, extname, isAbsolute } from 'path';
import type { SecurityConfig, ValidationResult } from './config';
import { DEFAULT_SECURITY_CONFIG } from './config';
import type { AccessIntent, DiscoverIntent, UpdateIntent } from '../intents';

/**
 * Rate limiting record structure
 */
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

/**
 * Security validator that enforces path restrictions, file limits, and rate limiting
 */
export class MastraSecurityValidator {
  private config: Required<Omit<SecurityConfig, 'allowedExtensions'>> & { allowedExtensions?: string[] };
  private requestCounts = new Map<string, RateLimitRecord>();

  constructor(config: SecurityConfig) {
    // Merge with defaults
    this.config = {
      rootPath: config.rootPath,
      maxFileSize: config.maxFileSize ?? DEFAULT_SECURITY_CONFIG.maxFileSize!,
      // Only apply default extensions if user didn't explicitly set allowedExtensions to undefined
      allowedExtensions: config.allowedExtensions !== undefined ? config.allowedExtensions : undefined,
      blockedPaths: config.blockedPaths ?? DEFAULT_SECURITY_CONFIG.blockedPaths!,
      rateLimiting: config.rateLimiting ?? DEFAULT_SECURITY_CONFIG.rateLimiting!
    };

    // Validate root path
    if (!isAbsolute(this.config.rootPath)) {
      throw new Error('Root path must be absolute');
    }

    // Normalize root path
    this.config.rootPath = normalize(this.config.rootPath);
  }

  /**
   * Validate a file path for security compliance
   */
  validatePath(path: string): ValidationResult {
    try {
      // Normalize the path
      const normalizedPath = this.normalizePath(path);

      // Check if path is within root
      if (!this.isWithinRoot(normalizedPath)) {
        return {
          valid: false,
          reason: 'Path outside allowed root directory'
        };
      }

      // Check for blocked path segments
      const blockedSegment = this.getBlockedSegment(normalizedPath);
      if (blockedSegment) {
        return {
          valid: false,
          reason: `Path contains blocked segment: ${blockedSegment}`
        };
      }

      // Validate file extension if it appears to be a file and extensions are configured
      if (this.isFilePath(normalizedPath) && this.config.allowedExtensions && this.config.allowedExtensions.length > 0) {
        const ext = extname(normalizedPath);
        if (ext && !this.config.allowedExtensions.includes(ext)) {
          return {
            valid: false,
            reason: `File extension not allowed: ${ext}`
          };
        }
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        reason: `Path validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validate an intent operation for security compliance
   */
  validateOperation(intent: AccessIntent | DiscoverIntent | UpdateIntent): ValidationResult {
    // Validate the target path
    const pathValidation = this.validatePath(intent.target.path);
    if (!pathValidation.valid) {
      return pathValidation;
    }

    // Check rate limiting if configured
    if (this.config.rateLimiting) {
      const rateLimitCheck = this.checkRateLimit(intent.target.path);
      if (!rateLimitCheck.valid) {
        return rateLimitCheck;
      }
    }

    // Validate file size limits for read operations
    if ('preferences' in intent && intent.preferences?.maxSize) {
      if (intent.preferences.maxSize > this.config.maxFileSize) {
        return {
          valid: false,
          reason: `Requested size exceeds maximum allowed: ${this.config.maxFileSize} bytes`
        };
      }
    }

    // Additional validation for update operations
    if (intent.purpose === 'delete') {
      // Could add additional checks for delete operations
      // For now, path validation is sufficient
    }

    return { valid: true };
  }

  /**
   * Check rate limiting for a specific path
   */
  private checkRateLimit(path: string): ValidationResult {
    if (!this.config.rateLimiting) {
      return { valid: true };
    }

    const now = Date.now();
    const key = path;
    const limits = this.config.rateLimiting;

    let record = this.requestCounts.get(key);
    
    // Reset or initialize record if needed
    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + limits.windowMs
      };
      this.requestCounts.set(key, record);
      return { valid: true };
    }

    // Increment count
    record.count++;

    // Check if limit exceeded
    if (record.count > limits.maxRequests) {
      return {
        valid: false,
        reason: `Rate limit exceeded: ${record.count}/${limits.maxRequests} requests in ${limits.windowMs}ms window`
      };
    }

    return { valid: true };
  }

  /**
   * Normalize a path for consistent validation
   */
  private normalizePath(path: string): string {
    // Handle absolute paths by making them relative to root
    if (isAbsolute(path)) {
      return normalize(path);
    }

    // Resolve relative paths against root
    return resolve(this.config.rootPath, path);
  }

  /**
   * Check if a path is within the allowed root directory
   */
  private isWithinRoot(normalizedPath: string): boolean {
    return normalizedPath.startsWith(this.config.rootPath);
  }

  /**
   * Check if path contains any blocked segments
   */
  private getBlockedSegment(normalizedPath: string): string | null {
    for (const blocked of this.config.blockedPaths) {
      if (normalizedPath.includes(blocked)) {
        return blocked;
      }
    }
    return null;
  }

  /**
   * Determine if a path appears to be a file (has extension)
   */
  private isFilePath(path: string): boolean {
    const ext = extname(path);
    return ext.length > 0;
  }

  /**
   * Get current configuration (for debugging/testing)
   */
  getConfig(): Required<Omit<SecurityConfig, 'allowedExtensions'>> & { allowedExtensions?: string[] } {
    return { ...this.config };
  }

  /**
   * Clear rate limit records (for testing)
   */
  clearRateLimits(): void {
    this.requestCounts.clear();
  }
}