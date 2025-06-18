/**
 * Basic smoke tests for PackFS exports
 */

import {
  SecurityEngine,
  PathValidator,
  MemoryBackend,
  DiskBackend,
  TextProcessor,
  SemanticChunker,
} from '../index';

import { FileSystemInterface } from '../core/filesystem';

describe('PackFS Core Exports', () => {
  test('should export core classes', () => {
    expect(SecurityEngine).toBeDefined();
    expect(PathValidator).toBeDefined();
    expect(FileSystemInterface).toBeDefined();
  });

  test('should export backend classes', () => {
    expect(MemoryBackend).toBeDefined();
    expect(DiskBackend).toBeDefined();
  });

  test('should export processor classes', () => {
    expect(TextProcessor).toBeDefined();
    expect(SemanticChunker).toBeDefined();
  });

  test('should create SecurityEngine instance', () => {
    const config = {
      maxFileSize: 1024 * 1024,
      allowedExtensions: ['txt', 'md'],
      blockedPaths: ['/etc', '/root'],
      validatePaths: true,
    };
    const security = new SecurityEngine(config);
    expect(security).toBeInstanceOf(SecurityEngine);
  });

  test('should create PathValidator instance', () => {
    const validator = new PathValidator('/sandbox');
    expect(validator).toBeInstanceOf(PathValidator);
  });

  test('should create MemoryBackend instance', () => {
    const backend = new MemoryBackend();
    expect(backend).toBeInstanceOf(MemoryBackend);
  });

  test('should create TextProcessor instance', () => {
    const processor = new TextProcessor();
    expect(processor).toBeInstanceOf(TextProcessor);
  });

  test('should create SemanticChunker instance', () => {
    const chunker = new SemanticChunker();
    expect(chunker).toBeInstanceOf(SemanticChunker);
  });
});