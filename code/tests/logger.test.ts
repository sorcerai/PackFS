import { 
  Logger, 
  LogLevel, 
  FileTransport, 
  MemoryTransport,
  CustomTransport,
  type LogEntry 
} from '../src/core/logger.js';
import * as fs from 'fs';

describe('Logger', () => {
  let logger: Logger;
  
  beforeEach(() => {
    logger = Logger.getInstance();
    // Reset to default configuration
    logger.configure({
      level: LogLevel.INFO,
      transports: []
    });
  });
  
  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const logger1 = Logger.getInstance();
      const logger2 = Logger.getInstance();
      expect(logger1).toBe(logger2);
    });
  });
  
  describe('Log Levels', () => {
    it('should respect log level filtering', () => {
      const memoryTransport = new MemoryTransport();
      logger.configure({
        level: LogLevel.WARN,
        transports: [memoryTransport]
      });
      
      logger.debug('test', 'debug message');
      logger.info('test', 'info message');
      logger.warn('test', 'warn message');
      logger.error('test', 'error message');
      
      const logs = memoryTransport.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0]!.level).toBe(LogLevel.WARN);
      expect(logs[1]!.level).toBe(LogLevel.ERROR);
    });
    
    it('should log all levels when set to DEBUG', () => {
      const memoryTransport = new MemoryTransport();
      logger.configure({
        level: LogLevel.DEBUG,
        transports: [memoryTransport]
      });
      
      logger.debug('test', 'debug message');
      logger.info('test', 'info message');
      logger.warn('test', 'warn message');
      logger.error('test', 'error message');
      
      const logs = memoryTransport.getLogs();
      expect(logs).toHaveLength(4);
    });
    
    it('should not log anything when level is NONE', () => {
      const memoryTransport = new MemoryTransport();
      logger.configure({
        level: LogLevel.NONE,
        transports: [memoryTransport]
      });
      
      logger.debug('test', 'debug message');
      logger.info('test', 'info message');
      logger.warn('test', 'warn message');
      logger.error('test', 'error message');
      
      const logs = memoryTransport.getLogs();
      expect(logs).toHaveLength(0);
    });
  });
  
  describe('Log Entry Format', () => {
    it('should create properly formatted log entries', () => {
      const memoryTransport = new MemoryTransport();
      logger.configure({
        level: LogLevel.INFO,
        transports: [memoryTransport]
      });
      
      const testData = { userId: 123, action: 'login' };
      logger.info('auth', 'User logged in', testData);
      
      const logs = memoryTransport.getLogs();
      expect(logs).toHaveLength(1);
      
      const entry = logs[0]!;
      expect(entry.category).toBe('auth');
      expect(entry.message).toBe('User logged in');
      expect(entry.level).toBe(LogLevel.INFO);
      expect(entry.data).toEqual(testData);
      expect(entry.timestamp).toBeInstanceOf(Date);
    });
  });
  
  describe('Memory Transport', () => {
    it('should store logs in memory', () => {
      const memoryTransport = new MemoryTransport();
      logger.configure({
        level: LogLevel.INFO,
        transports: [memoryTransport]
      });
      
      logger.info('test', 'message 1');
      logger.info('test', 'message 2');
      logger.info('test', 'message 3');
      
      const logs = memoryTransport.getLogs();
      expect(logs).toHaveLength(3);
      expect(logs[0]!.message).toBe('message 1');
      expect(logs[1]!.message).toBe('message 2');
      expect(logs[2]!.message).toBe('message 3');
    });
    
    it('should respect max size limit', () => {
      const memoryTransport = new MemoryTransport(2);
      logger.configure({
        level: LogLevel.INFO,
        transports: [memoryTransport]
      });
      
      logger.info('test', 'message 1');
      logger.info('test', 'message 2');
      logger.info('test', 'message 3');
      
      const logs = memoryTransport.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0]!.message).toBe('message 2');
      expect(logs[1]!.message).toBe('message 3');
    });
    
    it('should clear logs', () => {
      const memoryTransport = new MemoryTransport();
      logger.configure({
        level: LogLevel.INFO,
        transports: [memoryTransport]
      });
      
      logger.info('test', 'message');
      expect(memoryTransport.getLogs()).toHaveLength(1);
      
      memoryTransport.clear();
      expect(memoryTransport.getLogs()).toHaveLength(0);
    });
  });
  
  describe('Custom Transport', () => {
    it('should call custom log function', () => {
      const loggedEntries: LogEntry[] = [];
      const customTransport = new CustomTransport((entry) => {
        loggedEntries.push(entry);
      });
      
      logger.configure({
        level: LogLevel.INFO,
        transports: [customTransport]
      });
      
      logger.info('test', 'custom message');
      
      expect(loggedEntries).toHaveLength(1);
      expect(loggedEntries[0]!.message).toBe('custom message');
    });
    
    it('should handle async custom transport', async () => {
      const loggedEntries: LogEntry[] = [];
      const customTransport = new CustomTransport(async (entry) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        loggedEntries.push(entry);
      });
      
      logger.configure({
        level: LogLevel.INFO,
        transports: [customTransport]
      });
      
      logger.info('test', 'async message');
      
      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(loggedEntries).toHaveLength(1);
      expect(loggedEntries[0]!.message).toBe('async message');
    });
  });
  
  describe('File Transport', () => {
    const testLogPath = './test-logs/test.log';
    
    afterEach(() => {
      // Clean up test log files
      try {
        if (fs.existsSync(testLogPath)) {
          fs.unlinkSync(testLogPath);
        }
        if (fs.existsSync('./test-logs')) {
          fs.rmdirSync('./test-logs');
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    });
    
    it('should create log file and directory', (done) => {
      const fileTransport = new FileTransport(testLogPath);
      logger.configure({
        level: LogLevel.INFO,
        transports: [fileTransport]
      });
      
      logger.info('test', 'file message');
      
      // Give the stream time to flush
      setTimeout(() => {
        fileTransport.close();
        
        expect(fs.existsSync(testLogPath)).toBe(true);
        const content = fs.readFileSync(testLogPath, 'utf8');
        expect(content).toContain('file message');
        expect(content).toContain('[INFO]');
        expect(content).toContain('[test]');
        done();
      }, 100);
    });
    
    it('should append to existing file', (done) => {
      // Create file with initial content
      fs.mkdirSync('./test-logs', { recursive: true });
      fs.writeFileSync(testLogPath, 'Initial content\n');
      
      const fileTransport = new FileTransport(testLogPath, true);
      logger.configure({
        level: LogLevel.INFO,
        transports: [fileTransport]
      });
      
      logger.info('test', 'appended message');
      
      // Give the stream time to flush
      setTimeout(() => {
        fileTransport.close();
        
        const content = fs.readFileSync(testLogPath, 'utf8');
        expect(content).toContain('Initial content');
        expect(content).toContain('appended message');
        done();
      }, 100);
    });
    
    it('should overwrite existing file when append is false', (done) => {
      // Create file with initial content
      fs.mkdirSync('./test-logs', { recursive: true });
      fs.writeFileSync(testLogPath, 'Initial content that should be overwritten\n');
      
      const fileTransport = new FileTransport(testLogPath, false);
      logger.configure({
        level: LogLevel.INFO,
        transports: [fileTransport]
      });
      
      logger.info('test', 'new message');
      
      // Give the stream time to flush
      setTimeout(() => {
        fileTransport.close();
        
        const content = fs.readFileSync(testLogPath, 'utf8');
        expect(content).not.toContain('Initial content');
        expect(content).toContain('new message');
        done();
      }, 100);
    });
  });
  
  describe('CategoryLogger', () => {
    it('should create child logger with category', () => {
      const memoryTransport = new MemoryTransport();
      logger.configure({
        level: LogLevel.INFO,
        transports: [memoryTransport]
      });
      
      const childLogger = logger.createChildLogger('MyComponent');
      childLogger.info('test message');
      childLogger.error('error message', { code: 500 });
      
      const logs = memoryTransport.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0]!.category).toBe('MyComponent');
      expect(logs[0]!.message).toBe('test message');
      expect(logs[1]!.category).toBe('MyComponent');
      expect(logs[1]!.message).toBe('error message');
      expect(logs[1]!.data).toEqual({ code: 500 });
    });
  });
  
  describe('Multiple Transports', () => {
    it('should log to multiple transports', () => {
      const memory1 = new MemoryTransport();
      const memory2 = new MemoryTransport();
      const customLogs: LogEntry[] = [];
      const custom = new CustomTransport((entry) => {
        customLogs.push(entry);
      });
      
      logger.configure({
        level: LogLevel.INFO,
        transports: [memory1, memory2, custom]
      });
      
      logger.info('test', 'multi-transport message');
      
      expect(memory1.getLogs()).toHaveLength(1);
      expect(memory2.getLogs()).toHaveLength(1);
      expect(customLogs).toHaveLength(1);
      
      // All should have the same message
      expect(memory1.getLogs()[0]!.message).toBe('multi-transport message');
      expect(memory2.getLogs()[0]!.message).toBe('multi-transport message');
      expect(customLogs[0]!.message).toBe('multi-transport message');
    });
  });
  
  describe('Error Handling', () => {
    it('should handle transport errors gracefully', () => {
      const errorTransport = new CustomTransport(() => {
        throw new Error('Transport error');
      });
      
      const memoryTransport = new MemoryTransport();
      
      logger.configure({
        level: LogLevel.INFO,
        transports: [errorTransport, memoryTransport]
      });
      
      // Should not throw, but continue to other transports
      expect(() => {
        logger.info('test', 'message despite error');
      }).not.toThrow();
      
      // Memory transport should still receive the log
      expect(memoryTransport.getLogs()).toHaveLength(1);
    });
  });
});