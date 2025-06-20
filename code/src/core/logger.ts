import * as fs from 'fs';
import * as path from 'path';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
}

export interface LogTransport {
  log(entry: LogEntry): void | Promise<void>;
}

export class ConsoleTransport implements LogTransport {
  private formatLevel(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return 'DEBUG';
      case LogLevel.INFO: return 'INFO';
      case LogLevel.WARN: return 'WARN';
      case LogLevel.ERROR: return 'ERROR';
      default: return 'UNKNOWN';
    }
  }

  log(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const level = this.formatLevel(entry.level);
    const message = `[${timestamp}] [${level}] [${entry.category}] ${entry.message}`;
    
    if (entry.data) {
      console.log(message, entry.data);
    } else {
      console.log(message);
    }
  }
}

export class FileTransport implements LogTransport {
  private stream: fs.WriteStream | null = null;
  
  constructor(private filePath: string, private append: boolean = true) {
    this.initializeStream();
  }
  
  private initializeStream(): void {
    this.ensureDirectory();
    this.stream = fs.createWriteStream(this.filePath, { 
      flags: this.append ? 'a' : 'w',
      encoding: 'utf8'
    });
  }

  private ensureDirectory(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private formatLevel(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return 'DEBUG';
      case LogLevel.INFO: return 'INFO';
      case LogLevel.WARN: return 'WARN';
      case LogLevel.ERROR: return 'ERROR';
      default: return 'UNKNOWN';
    }
  }

  log(entry: LogEntry): void {
    if (!this.stream) return;
    
    const timestamp = entry.timestamp.toISOString();
    const level = this.formatLevel(entry.level);
    const message = `[${timestamp}] [${level}] [${entry.category}] ${entry.message}`;
    
    if (entry.data) {
      this.stream.write(`${message} ${JSON.stringify(entry.data)}\n`);
    } else {
      this.stream.write(`${message}\n`);
    }
  }

  close(): void {
    if (this.stream) {
      this.stream.end();
      this.stream = null;
    }
  }
}

export interface LoggerConfig {
  level: LogLevel;
  transports: LogTransport[];
}

export class Logger {
  private static instance: Logger | null = null;
  private config: LoggerConfig = {
    level: LogLevel.INFO,
    transports: [new ConsoleTransport()]
  };
  
  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  configure(config: Partial<LoggerConfig>): void {
    if (config.level !== undefined) {
      this.config.level = config.level;
    }
    if (config.transports !== undefined) {
      this.config.transports = config.transports;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private log(level: LogLevel, category: string, message: string, data?: any): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      category,
      message,
      data
    };

    for (const transport of this.config.transports) {
      try {
        const result = transport.log(entry);
        if (result instanceof Promise) {
          result.catch(err => console.error('Logging transport error:', err));
        }
      } catch (err) {
        console.error('Logging transport error:', err);
      }
    }
  }

  debug(category: string, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, category, message, data);
  }

  info(category: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, category, message, data);
  }

  warn(category: string, message: string, data?: any): void {
    this.log(LogLevel.WARN, category, message, data);
  }

  error(category: string, message: string, data?: any): void {
    this.log(LogLevel.ERROR, category, message, data);
  }

  createChildLogger(category: string): CategoryLogger {
    return new CategoryLogger(this, category);
  }
}

export class CategoryLogger {
  constructor(
    private logger: Logger,
    private category: string
  ) {}

  debug(message: string, data?: any): void {
    this.logger.debug(this.category, message, data);
  }

  info(message: string, data?: any): void {
    this.logger.info(this.category, message, data);
  }

  warn(message: string, data?: any): void {
    this.logger.warn(this.category, message, data);
  }

  error(message: string, data?: any): void {
    this.logger.error(this.category, message, data);
  }
}

export class MemoryTransport implements LogTransport {
  private logs: LogEntry[] = [];
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  log(entry: LogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > this.maxSize) {
      this.logs.shift();
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }
}

export class CustomTransport implements LogTransport {
  constructor(private logFunction: (entry: LogEntry) => void | Promise<void>) {}

  log(entry: LogEntry): void | Promise<void> {
    return this.logFunction(entry);
  }
}