

export type Timeframe = '1m' | '3m' | '5m' | '15m' | '30m' | '45m' | '1h' | '2h' | '4h' | '12h' | '1d' | '1w' | '1M';

export interface OhlcData {
  time: number; // Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartState {
  symbol: string;
  interval: Timeframe;
  chartType: 'candle' | 'line';
  isMagnetMode: boolean;
  activeTool: DrawingToolType;
  showGrid: boolean;
  theme: 'dark' | 'light'; // Mandate 0.7: Theme support
}

export type DrawingToolType = 'cursor' | 'crosshair' | 'trendline' | 'ray' | 'horizontal_line' | 'vertical_line' | 'rectangle' | 'fib_retracement' | 'brush' | 'text' | 'pencil' | 'measure';

export interface MarketTicker {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
}

// Mandate 0.31: Database metadata structure
export interface StickyNote {
  id: string;
  content: string;
  position: { x: number; y: number };
  size: { w: number; h: number };
  color: string;
}

// --- DATABASE SCHEMA (Drift/SQL Equivalent) ---
export interface TradeLog {
  id?: number; // Auto-increment in SQL
  timestamp: number;
  symbol: string;
  price: number;
  volume: number;
  side: 'buy' | 'sell';
  indicators: Record<string, any>; // JSON Column
}

// --- TELEMETRY / LOGGING SYSTEM ---
export type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'success';
export type LogCategory = 'UI' | 'Network' | 'Performance' | 'Persistence' | 'Bridge' | 'Database' | 'System';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  category: LogCategory;
  message: string;
  details?: any; // Optional JSON object for inspection
}