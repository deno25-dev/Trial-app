export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';

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

export type DrawingToolType = 'cursor' | 'crosshair' | 'trendline' | 'ray' | 'horizontal_line' | 'vertical_line' | 'rectangle' | 'fib_retracement' | 'brush' | 'text';

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
