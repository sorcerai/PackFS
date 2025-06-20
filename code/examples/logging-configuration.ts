/**
 * Logging Configuration Examples for PackFS
 * 
 * This example demonstrates various ways to configure logging in PackFS.
 * The logging system is flexible and supports multiple output targets,
 * log levels, and custom formatters.
 */

import { 
  Logger, 
  LogLevel, 
  ConsoleTransport, 
  FileTransport, 
  MemoryTransport,
  CustomTransport,
  type LogEntry 
} from '../src/core/logger.js';
import { createFileSystem } from '../src/index.js';

// Example 1: Basic Console Logging
function configureBasicLogging() {
  const logger = Logger.getInstance();
  
  // Set log level to INFO (default)
  logger.configure({
    level: LogLevel.INFO,
    transports: [new ConsoleTransport()]
  });
  
  console.log('✓ Basic console logging configured');
}

// Example 2: File-based Logging
function configureFileLogging() {
  const logger = Logger.getInstance();
  
  // Log to a file with INFO level
  logger.configure({
    level: LogLevel.INFO,
    transports: [
      new ConsoleTransport(),
      new FileTransport('./logs/packfs.log', true) // append mode
    ]
  });
  
  console.log('✓ File logging configured (logs/packfs.log)');
}

// Example 3: Debug Mode with Verbose Logging
function configureDebugLogging() {
  const logger = Logger.getInstance();
  
  // Enable DEBUG level for detailed logging
  logger.configure({
    level: LogLevel.DEBUG,
    transports: [
      new ConsoleTransport(),
      new FileTransport('./logs/packfs-debug.log', false) // overwrite mode
    ]
  });
  
  console.log('✓ Debug logging configured');
}

// Example 4: Production Logging with Error-Only Console
function configureProductionLogging() {
  const logger = Logger.getInstance();
  
  // Custom transport that only logs errors to console
  const errorOnlyConsole = new CustomTransport((entry: LogEntry) => {
    if (entry.level >= LogLevel.ERROR) {
      console.error(`[${entry.timestamp.toISOString()}] ERROR: ${entry.message}`, entry.data);
    }
  });
  
  // Log everything to file, only errors to console
  logger.configure({
    level: LogLevel.INFO,
    transports: [
      errorOnlyConsole,
      new FileTransport('./logs/packfs.log', true)
    ]
  });
  
  console.log('✓ Production logging configured');
}

// Example 5: Memory Transport for Testing
function configureTestLogging() {
  const logger = Logger.getInstance();
  const memoryTransport = new MemoryTransport(100); // Keep last 100 logs
  
  logger.configure({
    level: LogLevel.DEBUG,
    transports: [memoryTransport]
  });
  
  // Later, you can retrieve logs for assertions
  // const logs = memoryTransport.getLogs();
  
  console.log('✓ Test logging configured with memory transport');
  return memoryTransport;
}

// Example 6: Custom JSON Formatter
function configureJsonLogging() {
  const logger = Logger.getInstance();
  
  // Custom transport with JSON output
  const jsonTransport = new CustomTransport((entry: LogEntry) => {
    const logLine = JSON.stringify({
      timestamp: entry.timestamp.toISOString(),
      level: LogLevel[entry.level],
      category: entry.category,
      message: entry.message,
      data: entry.data
    });
    console.log(logLine);
  });
  
  logger.configure({
    level: LogLevel.INFO,
    transports: [jsonTransport]
  });
  
  console.log('✓ JSON logging configured');
}

// Example 7: Environment-based Configuration
function configureEnvironmentLogging() {
  const logger = Logger.getInstance();
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  if (isDevelopment) {
    // Development: verbose console logging
    logger.configure({
      level: LogLevel.DEBUG,
      transports: [new ConsoleTransport()]
    });
  } else {
    // Production: file logging with error-only console
    const errorOnlyConsole = new CustomTransport((entry: LogEntry) => {
      if (entry.level >= LogLevel.ERROR) {
        console.error(`[ERROR] ${entry.message}`, entry.data);
      }
    });
    
    logger.configure({
      level: LogLevel.INFO,
      transports: [
        errorOnlyConsole,
        new FileTransport('/var/log/packfs/app.log', true)
      ]
    });
  }
  
  console.log(`✓ Environment-based logging configured (${isDevelopment ? 'development' : 'production'})`);
}

// Example 8: Disable Logging
function disableLogging() {
  const logger = Logger.getInstance();
  
  // Set level to NONE to disable all logging
  logger.configure({
    level: LogLevel.NONE,
    transports: []
  });
  
  console.log('✓ Logging disabled');
}

// Example 9: Using PackFS with Logging
async function demonstratePackFSLogging() {
  // Configure logging before creating filesystem
  configureDebugLogging();
  
  // Create filesystem - all operations will be logged
  const fs = await createFileSystem({
    backend: 'disk',
    basePath: './test-files'
  });
  
  // These operations will generate log entries
  await fs.writeFile('test.txt', 'Hello, World!');
  const content = await fs.readFile('test.txt', { encoding: 'utf8' });
  const exists = await fs.exists('test.txt');
  const stats = await fs.stat('test.txt');
  
  console.log('✓ PackFS operations completed with logging');
}

// Example 10: Structured Logging with Context
function demonstrateStructuredLogging() {
  const logger = Logger.getInstance();
  
  // Configure with console transport
  logger.configure({
    level: LogLevel.INFO,
    transports: [new ConsoleTransport()]
  });
  
  // Create a child logger for a specific component
  const fsLogger = logger.createChildLogger('FileOperations');
  
  // Log with structured data
  fsLogger.info('File operation started', {
    operation: 'read',
    path: '/data/users.json',
    userId: '12345'
  });
  
  fsLogger.debug('Reading file contents', {
    path: '/data/users.json',
    size: 1024
  });
  
  fsLogger.info('File operation completed', {
    operation: 'read',
    path: '/data/users.json',
    duration: 45,
    bytesRead: 1024
  });
  
  console.log('✓ Structured logging demonstrated');
}

// Main demonstration
async function main() {
  console.log('PackFS Logging Configuration Examples\n');
  
  // Demonstrate different configurations
  console.log('1. Basic Console Logging:');
  configureBasicLogging();
  console.log();
  
  console.log('2. File-based Logging:');
  configureFileLogging();
  console.log();
  
  console.log('3. Debug Mode:');
  configureDebugLogging();
  console.log();
  
  console.log('4. Production Mode:');
  configureProductionLogging();
  console.log();
  
  console.log('5. Test Mode with Memory Transport:');
  const memoryTransport = configureTestLogging();
  console.log();
  
  console.log('6. JSON Logging:');
  configureJsonLogging();
  console.log();
  
  console.log('7. Environment-based Configuration:');
  configureEnvironmentLogging();
  console.log();
  
  console.log('8. Disable Logging:');
  disableLogging();
  console.log();
  
  console.log('9. Re-enable and demonstrate PackFS logging:');
  await demonstratePackFSLogging();
  console.log();
  
  console.log('10. Structured Logging:');
  demonstrateStructuredLogging();
}

// Run the demonstration
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

// Export configurations for use in other modules
export {
  configureBasicLogging,
  configureFileLogging,
  configureDebugLogging,  
  configureProductionLogging,
  configureTestLogging,
  configureJsonLogging,
  configureEnvironmentLogging,
  disableLogging
};