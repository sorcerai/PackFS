/**
 * Security configuration types for Mastra integration
 */

/**
 * Security configuration for Mastra tools
 */
export interface SecurityConfig {
  /** Root path that all operations must stay within */
  rootPath: string;
  
  /** Maximum file size that can be processed (bytes) */
  maxFileSize?: number;
  
  /** List of allowed file extensions (with dots, e.g., ['.txt', '.md']) */
  allowedExtensions?: string[];
  
  /** List of path segments that are blocked (e.g., ['.git', 'node_modules']) */
  blockedPaths?: string[];
  
  /** Rate limiting configuration */
  rateLimiting?: {
    /** Maximum number of requests allowed in the time window */
    maxRequests: number;
    /** Time window in milliseconds */
    windowMs: number;
  };
}

/**
 * Validation result structure
 */
export interface ValidationResult {
  /** Whether the validation passed */
  valid: boolean;
  /** Reason for validation failure (if any) */
  reason?: string;
}

/**
 * Default security configuration values
 */
export const DEFAULT_SECURITY_CONFIG: Partial<SecurityConfig> = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedExtensions: ['.txt', '.md', '.json', '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.h'],
  blockedPaths: ['.git', 'node_modules', '.env', '.npmrc', '.ssh', 'secrets'],
  rateLimiting: {
    maxRequests: 100,
    windowMs: 60 * 1000 // 1 minute
  }
};