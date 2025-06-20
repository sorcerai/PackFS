import { createFileSystem } from '../src/index.js';
import { Logger, LogLevel, MemoryTransport } from '../src/core/logger.js';
import { MemoryBackend } from '../src/backends/memory.js';
import * as fs from 'fs';

describe('Logger Integration Tests', () => {
  let memoryTransport: MemoryTransport;
  const testDir = './test-logger-integration';
  
  beforeEach(() => {
    // Set up memory transport to capture logs
    memoryTransport = new MemoryTransport(100);
    const logger = Logger.getInstance();
    logger.configure({
      level: LogLevel.DEBUG,
      transports: [memoryTransport]
    });
    
    // Clean up any existing test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });
  
  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });
  
  describe('Disk Backend Logging', () => {
    it('should log all disk operations', async () => {
      const fs = await createFileSystem(testDir);
      
      // Clear initialization logs
      memoryTransport.clear();
      
      // Perform various operations
      await fs.writeFile('test.txt', 'Hello, World!');
      await fs.readFile('test.txt');
      await fs.exists('test.txt');
      await fs.stat('test.txt');
      await fs.mkdir('subdir');
      await fs.readdir('.');
      await fs.copy('test.txt', 'test-copy.txt');
      await fs.move('test-copy.txt', 'test-moved.txt');
      await fs.remove('test-moved.txt');
      
      const logs = memoryTransport.getLogs();
      
      // Check that operations were logged
      const logMessages = logs.map(l => l.message);
      
      expect(logMessages).toContain('Writing file: test.txt');
      expect(logMessages).toContain('Successfully wrote file: test.txt');
      expect(logMessages).toContain('Reading file: test.txt');
      expect(logMessages).toContain('Successfully read file: test.txt');
      expect(logMessages).toContain('Checking existence: test.txt');
      expect(logMessages).toContain('File exists: test.txt');
      expect(logMessages).toContain('Getting file stats: test.txt');
      expect(logMessages).toContain('Listing directory: .');
      expect(logMessages).toContain('Deleted file: test-moved.txt');
      
      // Check log levels
      const debugLogs = logs.filter(l => l.level === LogLevel.DEBUG);
      const infoLogs = logs.filter(l => l.level === LogLevel.INFO);
      
      expect(debugLogs.length).toBeGreaterThan(0);
      expect(infoLogs.length).toBeGreaterThan(0);
      
      // Check that data is included in logs
      const writeLog = logs.find(l => l.message === 'Successfully wrote file: test.txt');
      expect(writeLog?.data).toHaveProperty('size', 13); // "Hello, World!" is 13 bytes
    });
    
    it('should log errors with context', async () => {
      const fs = await createFileSystem(testDir);
      
      memoryTransport.clear();
      
      // Try to read non-existent file
      try {
        await fs.readFile('non-existent.txt');
      } catch (e) {
        // Expected error
      }
      
      const logs = memoryTransport.getLogs();
      const errorLog = logs.find(l => l.level === LogLevel.ERROR);
      
      expect(errorLog).toBeDefined();
      expect(errorLog?.message).toContain('Failed to read file');
      expect(errorLog?.data).toHaveProperty('error');
    });
  });
  
  describe('Memory Backend Logging', () => {
    it('should log memory backend operations', async () => {
      const backend = new MemoryBackend();
      await backend.initialize();
      
      memoryTransport.clear();
      
      // Perform operations
      await backend.write('test.txt', Buffer.from('Hello'));
      await backend.read('test.txt');
      await backend.exists('test.txt');
      await backend.stat('test.txt');
      await backend.list('.');
      await backend.delete('test.txt');
      await backend.cleanup();
      
      const logs = memoryTransport.getLogs();
      const logMessages = logs.map(l => l.message);
      
      expect(logMessages).toContain('Writing file: test.txt');
      expect(logMessages).toContain('Successfully wrote file: test.txt');
      expect(logMessages).toContain('Reading file: test.txt');
      expect(logMessages).toContain('Successfully read file: test.txt');
      expect(logMessages).toContain('File exists: test.txt');
      expect(logMessages).toContain('Deleted file: test.txt');
      expect(logMessages).toContain('Cleaning up memory backend');
    });
  });
  
  
  describe('Log Level Filtering in Real Operations', () => {
    it('should respect log level during filesystem operations', async () => {
      const logger = Logger.getInstance();
      
      // Set to WARN level
      logger.configure({
        level: LogLevel.WARN,
        transports: [memoryTransport]
      });
      
      memoryTransport.clear();
      
      // Use memory backend for this test
      const backend = new MemoryBackend();
      await backend.initialize();
      
      // Perform operations
      await backend.write('test.txt', Buffer.from('content'));
      await backend.read('test.txt');
      
      const logs = memoryTransport.getLogs();
      
      // Should not have INFO or DEBUG logs
      expect(logs.filter(l => l.level === LogLevel.INFO)).toHaveLength(0);
      expect(logs.filter(l => l.level === LogLevel.DEBUG)).toHaveLength(0);
      
      // Now trigger an error to see if WARN/ERROR logs appear
      try {
        await backend.read('non-existent.txt');
      } catch (e) {
        // Expected
      }
      
      const errorLogs = logs.filter(l => l.level >= LogLevel.WARN);
      expect(errorLogs.length).toBeGreaterThan(0);
    });
  });
  
  describe('Performance Impact', () => {
    it('should have minimal performance impact when logging is disabled', async () => {
      const logger = Logger.getInstance();
      
      // First, measure with logging enabled
      logger.configure({
        level: LogLevel.DEBUG,
        transports: [memoryTransport]
      });
      
      const backend1 = new MemoryBackend();
      await backend1.initialize();
      const startEnabled = Date.now();
      
      for (let i = 0; i < 100; i++) {
        await backend1.write(`test${i}.txt`, Buffer.from(`content${i}`));
        await backend1.read(`test${i}.txt`);
      }
      
      const timeWithLogging = Date.now() - startEnabled;
      
      // Now measure with logging disabled
      logger.configure({
        level: LogLevel.NONE,
        transports: []
      });
      
      const backend2 = new MemoryBackend();
      await backend2.initialize();
      const startDisabled = Date.now();
      
      for (let i = 0; i < 100; i++) {
        await backend2.write(`test${i}.txt`, Buffer.from(`content${i}`));
        await backend2.read(`test${i}.txt`);
      }
      
      const timeWithoutLogging = Date.now() - startDisabled;
      
      // Logging should add minimal overhead (less than 50% in this synthetic test)
      const overhead = (timeWithLogging - timeWithoutLogging) / timeWithoutLogging;
      expect(overhead).toBeLessThan(0.5);
    });
  });
});