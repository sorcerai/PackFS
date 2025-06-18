/**
 * Core type definitions for PackFS
 */

export interface FileSystemOptions {
  readonly sandbox?: string;
  readonly maxFileSize?: number;
  readonly allowedExtensions?: string[];
  readonly blockedPaths?: string[];
  readonly enableVirtualFs?: boolean;
}

export interface FileMetadata {
  readonly path: string;
  readonly size: number;
  readonly mtime: Date;
  readonly isDirectory: boolean;
  readonly permissions: number;
  readonly mimeType?: string;
}

export interface SecurityConfig {
  readonly sandboxPath?: string;
  readonly maxFileSize: number;
  readonly allowedExtensions: string[];
  readonly blockedPaths: string[];
  readonly validatePaths: boolean;
}

export interface ValidationResult {
  readonly isValid: boolean;
  readonly error?: string;
  readonly normalizedPath?: string;
}

export interface ReadOptions {
  readonly encoding?: BufferEncoding;
  readonly maxSize?: number;
  readonly offset?: number;
  readonly length?: number;
}

export interface WriteOptions {
  readonly encoding?: BufferEncoding;
  readonly mode?: number;
  readonly flag?: string;
  readonly createDirs?: boolean;
}