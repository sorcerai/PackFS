/**
 * Tests for SecurityEngine
 */

import { SecurityEngine } from '../core/security';

describe('SecurityEngine', () => {
  const defaultConfig = {
    maxFileSize: 1024 * 1024,
    allowedExtensions: ['txt', 'md', 'js'],
    blockedPaths: ['/etc', '/root', '.env'],
    validatePaths: true,
  };

  let security: SecurityEngine;

  beforeEach(() => {
    security = new SecurityEngine(defaultConfig);
  });

  describe('validateOperation', () => {
    test('should allow valid operations', () => {
      expect(security.validateOperation('/home/user/file.txt', 'read')).toBe(true);
      expect(security.validateOperation('/tmp/data.md', 'write')).toBe(true);
    });

    test('should block operations on blocked paths', () => {
      expect(security.validateOperation('/etc/passwd', 'read')).toBe(false);
      expect(security.validateOperation('/root/secret', 'write')).toBe(false);
      expect(security.validateOperation('/home/.env', 'read')).toBe(false);
    });

    test('should block path traversal attempts', () => {
      expect(security.validateOperation('../../../etc/passwd', 'read')).toBe(false);
      expect(security.validateOperation('/home/user/~/secret', 'read')).toBe(false);
    });
  });

  describe('isAllowedExtension', () => {
    test('should allow configured extensions', () => {
      expect(security.isAllowedExtension('file.txt')).toBe(true);
      expect(security.isAllowedExtension('README.md')).toBe(true);
      expect(security.isAllowedExtension('script.js')).toBe(true);
    });

    test('should block non-allowed extensions', () => {
      expect(security.isAllowedExtension('binary.exe')).toBe(false);
      expect(security.isAllowedExtension('script.py')).toBe(false);
    });

    test('should handle files without extensions', () => {
      expect(security.isAllowedExtension('Dockerfile')).toBe(false);
    });
  });

  describe('isValidFileSize', () => {
    test('should allow files within size limit', () => {
      expect(security.isValidFileSize(1024)).toBe(true);
      expect(security.isValidFileSize(1024 * 1024)).toBe(true);
    });

    test('should block files exceeding size limit', () => {
      expect(security.isValidFileSize(1024 * 1024 + 1)).toBe(false);
      expect(security.isValidFileSize(10 * 1024 * 1024)).toBe(false);
    });
  });
});