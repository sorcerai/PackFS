# PackFS Logging System

PackFS includes a comprehensive, configurable logging system that allows you to monitor all filesystem operations. This is particularly useful for debugging, auditing, and understanding how your application interacts with the filesystem.

## Features

- **Multiple Log Levels**: DEBUG, INFO, WARN, ERROR, and NONE
- **Multiple Transports**: Console, File, Memory, and Custom transports
- **Configurable**: Easy to configure for different environments
- **Performance**: Minimal overhead when disabled
- **Structured Logging**: Support for structured data alongside messages
- **Category-based Logging**: Organize logs by component/category

## Quick Start

```typescript
import { Logger, LogLevel, ConsoleTransport } from 'packfs-core/core';

// Get the logger instance
const logger = Logger.getInstance();

// Configure with console output
logger.configure({
  level: LogLevel.INFO,
  transports: [new ConsoleTransport()]
});

// Now all PackFS operations will be logged
const fs = await createFileSystem({
  backend: 'disk',
  basePath: './data'
});

await fs.writeFile('test.txt', 'Hello World');
// Logs: [2024-01-20T10:30:45.123Z] [INFO] [DiskBackend] Successfully wrote file: test.txt { size: 11 }
```

## Configuration Examples

### Development Environment

```typescript
logger.configure({
  level: LogLevel.DEBUG,
  transports: [new ConsoleTransport()]
});
```

### Production Environment

```typescript
// Only log errors to console, everything to file
const errorOnlyConsole = new CustomTransport((entry) => {
  if (entry.level >= LogLevel.ERROR) {
    console.error(`[ERROR] ${entry.message}`, entry.data);
  }
});

logger.configure({
  level: LogLevel.INFO,
  transports: [
    errorOnlyConsole,
    new FileTransport('/var/log/packfs.log', true)
  ]
});
```

### Testing Environment

```typescript
// Use memory transport for assertions
const memoryTransport = new MemoryTransport();
logger.configure({
  level: LogLevel.DEBUG,
  transports: [memoryTransport]
});

// Later in tests
const logs = memoryTransport.getLogs();
expect(logs).toContainEqual(
  expect.objectContaining({
    message: 'Successfully wrote file: test.txt'
  })
);
```

## Log Levels

- **DEBUG**: Detailed information for debugging (file paths, operation details)
- **INFO**: General information about successful operations
- **WARN**: Warning messages (fallbacks, non-critical issues)
- **ERROR**: Error messages with context
- **NONE**: Disable all logging

## Transports

### ConsoleTransport

Outputs logs to the console with formatted timestamps and levels.

```typescript
new ConsoleTransport()
```

### FileTransport

Writes logs to a file with automatic directory creation.

```typescript
new FileTransport('./logs/app.log', true) // append mode
new FileTransport('./logs/app.log', false) // overwrite mode
```

### MemoryTransport

Stores logs in memory, useful for testing.

```typescript
const transport = new MemoryTransport(100); // Keep last 100 logs
// ...
const logs = transport.getLogs();
transport.clear();
```

### CustomTransport

Create your own transport for custom logging needs.

```typescript
const jsonTransport = new CustomTransport((entry) => {
  const json = JSON.stringify({
    timestamp: entry.timestamp.toISOString(),
    level: LogLevel[entry.level],
    category: entry.category,
    message: entry.message,
    data: entry.data
  });
  console.log(json);
});
```

## Structured Logging

Include additional data with your logs:

```typescript
const childLogger = logger.createChildLogger('MyComponent');

childLogger.info('File operation completed', {
  operation: 'read',
  path: '/data/users.json',
  duration: 45,
  bytesRead: 1024
});
```

## What Gets Logged

PackFS logs the following operations:

### Disk Backend
- File reads/writes with sizes
- Directory creation and listing
- File existence checks
- File stats retrieval
- Delete operations
- Errors with context

### Memory Backend
- All operations similar to disk backend
- Memory cleanup operations

### Enhanced PackFS
- Semantic search operations
- Storage optimization
- Natural language query processing
- Cross-format searches

### Semantic Operations
- Intent processing
- File discovery
- Content updates
- File organization

## Performance Considerations

- Logging adds minimal overhead (typically <5% in production scenarios)
- Use `LogLevel.NONE` to completely disable logging
- File transports are asynchronous to minimize blocking
- Memory transports automatically limit size to prevent memory leaks

## Integration with Monitoring

The structured logging format makes it easy to integrate with monitoring services:

```typescript
const monitoringTransport = new CustomTransport(async (entry) => {
  if (entry.level >= LogLevel.WARN) {
    await myMonitoringService.logEvent({
      severity: LogLevel[entry.level],
      component: entry.category,
      message: entry.message,
      metadata: entry.data,
      timestamp: entry.timestamp
    });
  }
});
```

## Best Practices

1. **Use appropriate log levels**: Don't log everything at INFO level
2. **Include context**: Use the data parameter to include relevant information
3. **Use child loggers**: Create category-specific loggers for different components
4. **Configure per environment**: Use different configurations for dev/staging/production
5. **Don't log sensitive data**: Be careful not to log passwords, tokens, or PII
6. **Monitor log size**: Use log rotation for file transports in production

## Examples

See the [logging configuration examples](../examples/logging-configuration.ts) for comprehensive examples of different logging setups.