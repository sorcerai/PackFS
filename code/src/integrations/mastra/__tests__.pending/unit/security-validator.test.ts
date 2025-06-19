/**
 * Unit tests for MastraSecurityValidator
 * Tests path validation, operation validation, and rate limiting
 */

import { MastraSecurityValidator } from '../../security/validator';
import type { SecurityConfig } from '../../security/config';
import type { AccessIntent, DiscoverIntent, UpdateIntent } from '../../intents';

describe('MastraSecurityValidator', () => {
  let validator: MastraSecurityValidator;
  let defaultConfig: SecurityConfig;

  beforeEach(() => {
    defaultConfig = {
      rootPath: '/test',
      maxFileSize: 1024 * 1024, // 1MB
      allowedExtensions: ['.txt', '.md', '.json'],
      blockedPaths: ['.git', 'node_modules', '.env'],
      rateLimiting: {
        maxRequests: 10,
        windowMs: 60000 // 1 minute
      }
    };
    validator = new MastraSecurityValidator(defaultConfig);
  });

  describe('Path Validation', () => {
    it('should validate allowed paths within root', () => {
      const result = validator.validatePath('/test/file.txt');
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject paths outside root (path traversal)', () => {
      const result = validator.validatePath('/test/../../../etc/passwd');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Path outside allowed root');
    });

    it('should reject blocked paths', () => {
      const result = validator.validatePath('/test/.git/config');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Path contains blocked segment: .git');
    });

    it('should validate file extensions when configured', () => {
      const result = validator.validatePath('/test/script.exe');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('File extension not allowed: .exe');
    });

    it('should allow directories regardless of extension rules', () => {
      const result = validator.validatePath('/test/mydir');
      expect(result.valid).toBe(true);
    });

    it('should handle paths with special characters', () => {
      const result = validator.validatePath('/test/file with spaces.txt');
      expect(result.valid).toBe(true);
    });

    it('should normalize paths before validation', () => {
      const result = validator.validatePath('/test/./subdir/../file.txt');
      expect(result.valid).toBe(true);
    });
  });

  describe('Operation Validation', () => {
    it('should validate access intent with valid path', () => {
      const intent: AccessIntent = {
        purpose: 'read',
        target: {
          path: '/test/file.txt'
        }
      };
      const result = validator.validateOperation(intent);
      expect(result.valid).toBe(true);
    });

    it('should validate file size limits for read operations', () => {
      const intent: AccessIntent = {
        purpose: 'read',
        target: {
          path: '/test/file.txt'
        },
        preferences: {
          maxSize: 2 * 1024 * 1024 // 2MB (exceeds limit)
        }
      };
      const result = validator.validateOperation(intent);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Requested size exceeds maximum');
    });

    it('should validate discover intent with search criteria', () => {
      const intent: DiscoverIntent = {
        purpose: 'search_content',
        target: {
          path: '/test',
          query: 'test query'
        }
      };
      const result = validator.validateOperation(intent);
      expect(result.valid).toBe(true);
    });

    it('should validate update intent with content', () => {
      const intent: UpdateIntent = {
        purpose: 'create',
        target: {
          path: '/test/newfile.txt'
        },
        content: 'File content'
      };
      const result = validator.validateOperation(intent);
      expect(result.valid).toBe(true);
    });

    it('should reject operations on invalid paths', () => {
      const intent: AccessIntent = {
        purpose: 'read',
        target: {
          path: '/test/.git/config'
        }
      };
      const result = validator.validateOperation(intent);
      expect(result.valid).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      for (let i = 0; i < 10; i++) {
        const intent: AccessIntent = {
          purpose: 'read',
          target: { path: '/test/file.txt' }
        };
        const result = validator.validateOperation(intent);
        expect(result.valid).toBe(true);
      }
    });

    it('should reject requests exceeding rate limit', async () => {
      // Make 10 requests (the limit)
      for (let i = 0; i < 10; i++) {
        const intent: AccessIntent = {
          purpose: 'read',
          target: { path: '/test/file.txt' }
        };
        validator.validateOperation(intent);
      }

      // 11th request should fail
      const intent: AccessIntent = {
        purpose: 'read',
        target: { path: '/test/file.txt' }
      };
      const result = validator.validateOperation(intent);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Rate limit exceeded');
    });

    it('should track rate limits per path', () => {
      // Make 10 requests to file1
      for (let i = 0; i < 10; i++) {
        const intent: AccessIntent = {
          purpose: 'read',
          target: { path: '/test/file1.txt' }
        };
        validator.validateOperation(intent);
      }

      // Request to file2 should still work
      const intent: AccessIntent = {
        purpose: 'read',
        target: { path: '/test/file2.txt' }
      };
      const result = validator.validateOperation(intent);
      expect(result.valid).toBe(true);
    });

    it('should reset rate limits after time window', () => {
      jest.useFakeTimers();
      
      // Make 10 requests
      for (let i = 0; i < 10; i++) {
        const intent: AccessIntent = {
          purpose: 'read',
          target: { path: '/test/file.txt' }
        };
        validator.validateOperation(intent);
      }

      // Advance time past the window
      jest.advanceTimersByTime(60001); // 1 minute + 1ms

      // Next request should work
      const intent: AccessIntent = {
        purpose: 'read',
        target: { path: '/test/file.txt' }
      };
      const result = validator.validateOperation(intent);
      expect(result.valid).toBe(true);

      jest.useRealTimers();
    });
  });

  describe('Configuration Options', () => {
    it('should work without rate limiting config', () => {
      const configWithoutRateLimit: SecurityConfig = {
        rootPath: '/test',
        maxFileSize: 1024 * 1024,
        allowedExtensions: ['.txt']
      };
      const validatorNoLimit = new MastraSecurityValidator(configWithoutRateLimit);

      // Should validate without rate limit checks
      for (let i = 0; i < 20; i++) {
        const intent: AccessIntent = {
          purpose: 'read',
          target: { path: '/test/file.txt' }
        };
        const result = validatorNoLimit.validateOperation(intent);
        expect(result.valid).toBe(true);
      }
    });

    it('should work without extension restrictions', () => {
      const configNoExtensions: SecurityConfig = {
        rootPath: '/test'
      };
      const validatorNoExt = new MastraSecurityValidator(configNoExtensions);

      const result = validatorNoExt.validatePath('/test/script.exe');
      expect(result.valid).toBe(true);
    });

    it('should apply custom blocked paths', () => {
      const configCustomBlocked: SecurityConfig = {
        rootPath: '/test',
        blockedPaths: ['secret', 'private']
      };
      const validatorCustom = new MastraSecurityValidator(configCustomBlocked);

      const result1 = validatorCustom.validatePath('/test/secret/file.txt');
      expect(result1.valid).toBe(false);

      const result2 = validatorCustom.validatePath('/test/private/data.json');
      expect(result2.valid).toBe(false);

      const result3 = validatorCustom.validatePath('/test/public/file.txt');
      expect(result3.valid).toBe(true);
    });
  });
});