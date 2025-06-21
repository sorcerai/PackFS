# PackFS Test Reference

Generated: 2025-06-20T18:53:59.095Z

## Test Statistics
- Total test files: 8
- Total test suites: 52
- Total test cases: 89

## Test Files by Category

### Semantic Tests

#### semantic/error-recovery.test.ts
**Test Suites:**
- Error Recovery Suggestions
- File Not Found Suggestions
- Empty Search Results Suggestions
- Suggestion Formatting
- Memory Backend Suggestions
- Fuzzy Filename Matching

**Test Cases:**
- should suggest directory listing when file not found
- should suggest similar filenames
- should suggest alternative paths with different extensions
- should suggest parent directory when deep path not found
- should search for filename in other locations
- should suggest alternative search terms for content search
- should suggest broader search for multi-word queries
- should format suggestions into helpful messages
- should provide directory listing for memory backend
- should find files with similar names
- should use Levenshtein distance for fuzzy matching


### Other Tests

#### compression/BrotliStrategy.test.ts
**Test Suites:**
- BrotliStrategy
- compress and decompress
- shouldUse
- estimateRatio
- createDecompressor

**Test Cases:**
- should compress and decompress text data correctly
- should compress JavaScript files with high ratio
- should use lower quality for hot files
- should return true for text files
- should return true for large non-hot files
- should return false for small binary hot files
- should estimate good ratio for text files
- should estimate lower ratio for binary files
- should create a readable stream for decompression

#### compression/CompressionEngine.test.ts
**Test Suites:**
- CompressionEngine
- strategy analysis
- compression and decompression
- performance profiles
- compression statistics
- edge cases
- streaming decompression

**Test Cases:**
- should analyze optimal strategies for different file types
- should compress and decompress with automatic strategy selection
- should handle compression based on file characteristics
- should throw error for unknown algorithm during decompression
- should use development profile
- should use production profile
- should use CI profile
- should track compression statistics
- should track strategy-specific statistics
- should handle empty data
- should handle very small data
- should handle binary data
- should create streaming decompressor

#### compression/LZ4Strategy.test.ts
**Test Suites:**
- LZ4Strategy
- compress and decompress
- shouldUse
- estimateRatio
- createDecompressor
- block size optimization

**Test Cases:**
- should compress and decompress data correctly
- should handle data with repeating patterns efficiently
- should be very fast for hot files
- should return true for hot files
- should return true for frequently accessed files
- should return true for small to medium files
- should return false for large cold files
- should estimate ratio based on data patterns
- should estimate better ratio for text files
- should create a readable stream for decompression
- should select optimal block size based on data size

#### compression/ZstdStrategy.test.ts
**Test Suites:**
- ZstdStrategy
- compress and decompress
- shouldUse
- estimateRatio
- createDecompressor
- custom compression level

**Test Cases:**
- should compress and decompress data correctly
- should compress structured data very efficiently
- should adjust compression level based on access patterns
- should use ecosystem-specific dictionaries
- should return true for structured data
- should return true for medium access frequency files
- should return true for medium-sized files
- should return false for very hot or very cold files
- should estimate excellent ratio for structured data
- should estimate good ratio for code files
- should estimate moderate ratio for other files
- should create a readable stream for decompression
- should use custom compression level when provided

#### compression/compression-ratios.test.ts
**Test Suites:**
- Compression Ratio Validation
- JavaScript Files
- JSON Files
- Text Files
- HTML/CSS Files
- Binary Files
- Mixed Workload

**Test Cases:**
- should compress minified JavaScript efficiently
- should compress regular JavaScript very efficiently
- should compress repetitive JSON extremely well
- should compress varied JSON data well
- should compress plain text efficiently
- should compress markdown files well
- should compress HTML efficiently
- should compress CSS very well
- should handle random binary data
- should compress structured binary data
- should handle mixed file types efficiently

#### logger-integration.test.ts
**Test Suites:**
- Logger Integration Tests
- Disk Backend Logging
- Memory Backend Logging
- Log Level Filtering in Real Operations
- Performance Impact

**Test Cases:**
- should log all disk operations
- should log errors with context
- should log memory backend operations
- should respect log level during filesystem operations
- should have minimal performance impact when logging is disabled

#### logger.test.ts
**Test Suites:**
- Logger
- Singleton Pattern
- Log Levels
- Log Entry Format
- Memory Transport
- Custom Transport
- File Transport
- CategoryLogger
- Multiple Transports
- Error Handling

**Test Cases:**
- should return the same instance
- should respect log level filtering
- should log all levels when set to DEBUG
- should not log anything when level is NONE
- should create properly formatted log entries
- should store logs in memory
- should respect max size limit
- should clear logs
- should call custom log function
- should handle async custom transport
- should create log file and directory
- should append to existing file
- should overwrite existing file when append is false
- should create child logger with category
- should log to multiple transports
- should handle transport errors gracefully


## Running Tests

### All tests
```bash
npm test
```

### Specific test file
```bash
npm test -- tests/semantic/error-recovery.test.ts
```

### With coverage
```bash
npm test -- --coverage
```

### Watch mode
```bash
npm test -- --watch
```
