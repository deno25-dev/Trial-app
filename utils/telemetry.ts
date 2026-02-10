import { LogEntry, LogLevel, LogCategory } from '../types';

type Listener = (logs: LogEntry[]) => void;

/**
 * Global Telemetry Service (Singleton)
 * 
 * Allows any part of the application (React components, Services, Utils)
 * to push logs to a central store without prop drilling.
 */
class TelemetryService {
  private logs: LogEntry[] = [];
  private listeners: Set<Listener> = new Set();
  private maxLogs: number = 200;

  constructor() {
    // Capture unhandled window errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.error('System', 'Unhandled Exception', { 
            message: event.message, 
            filename: event.filename, 
            lineno: event.lineno 
        });
      });
      
      window.addEventListener('unhandledrejection', (event) => {
        this.error('System', 'Unhandled Promise Rejection', { reason: event.reason });
      });
    }
    
    this.info('System', 'Telemetry Service Initialized');
  }

  private emit() {
    // Notify all subscribers
    this.listeners.forEach(listener => listener([...this.logs]));
  }

  private push(level: LogLevel, category: LogCategory, message: string, details?: any) {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      level,
      category,
      message,
      details
    };

    this.logs.push(entry);
    
    // Prune if too large
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(this.logs.length - this.maxLogs);
    }

    // Console mirror (optional, helps with standard debugging)
    if (level === 'error') console.error(`[${category}] ${message}`, details);
    else if (level === 'warn') console.warn(`[${category}] ${message}`, details);
    
    this.emit();
  }

  // --- Public API ---

  public log(level: LogLevel, category: LogCategory, message: string, details?: any) {
    this.push(level, category, message, details);
  }

  public info(category: LogCategory, message: string, details?: any) {
    this.push('info', category, message, details);
  }

  public warn(category: LogCategory, message: string, details?: any) {
    this.push('warn', category, message, details);
  }

  public error(category: LogCategory, message: string, details?: any) {
    this.push('error', category, message, details);
  }

  public debug(category: LogCategory, message: string, details?: any) {
    this.push('debug', category, message, details);
  }
  
  public success(category: LogCategory, message: string, details?: any) {
    this.push('success', category, message, details);
  }

  public clear() {
    this.logs = [];
    this.emit();
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener([...this.logs]); // Initial emit
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const Telemetry = new TelemetryService();