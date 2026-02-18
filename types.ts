

export type Timeframe = '1m' | '3m' | '5m' | '15m' | '30m' | '45m' | '1h' | '2h' | '4h' | '12h' | '1d' | '1w' | '1M';

export interface OhlcData {
  time: number; // Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type AppSkin = 'default' | 'oled' | 'titanium' | 'polar' | 'forbidden-velvet' | 'chocolate-dream' | 'fairies-nest' | 'goldrush-planet' | 'rare-earth';

export interface ChartTab {
  id: string;
  symbol: string;
  interval: Timeframe;
}

export interface ReplayState {
  isActive: boolean;    // Is the Replay Toolbar open?
  isPlaying: boolean;   // Is the animation loop running?
  speed: number;        // Speed multiplier (e.g., 1000ms per real second, or ticks per frame)
  isWaitingForCut: boolean; // True when user needs to click the chart to set start point
  currentTimestamp: number | null;
}

export interface ChartState {
  symbol: string;
  interval: Timeframe;
  chartType: 'candle' | 'line';
  isMagnetMode: boolean;
  activeTool: DrawingToolType;
  showGrid: boolean;
  showFavoritesBar: boolean;
  theme: 'dark' | 'light'; // Mandate 0.7: Theme support
  skin: AppSkin;
  favorites: Timeframe[]; // Mandate 2.5: User-defined favorites
  tabs: ChartTab[];
  activeTabId: string;
  replay: ReplayState; // Added Replay State
  // Price Scale Settings
  priceScaleMode: 'Linear' | 'Logarithmic' | 'Percentage';
  isAutoScale: boolean;
  isInverted: boolean;
}

export type DrawingToolType = 'cursor' | 'crosshair' | 'trendline' | 'ray' | 'arrow_line' | 'horizontal_line' | 'vertical_line' | 'horizontal_ray' | 'rectangle' | 'triangle' | 'rotated_rectangle' | 'fib_retracement' | 'brush' | 'text' | 'pencil' | 'measure';

// --- DRAWING SYSTEM TYPES ---
export interface Point {
    time: number;
    price: number;
}

export interface Drawing {
    id: string;
    sourceId: string;
    type: 'trendline' | 'ray' | 'arrow_line' | 'text' | 'brush' | 'rectangle' | 'triangle' | 'rotated_rectangle' | 'horizontal_line' | 'vertical_line' | 'horizontal_ray';
    points: Point[]; // [Start, End] or Array of points for brush/shapes
    properties: {
        color: string;
        lineWidth: number;
        lineStyle: 0 | 1 | 2 | 3 | 4; // Lightweight Charts LineStyle
        axisLabelVisible?: boolean;
        text?: string;
        fontSize?: number;
        showBackground?: boolean;
        backgroundColor?: string;
        filled?: boolean; // For shapes
    };
    selected?: boolean;
    hovered?: boolean;
}

// Lane 4: Market Stream Data (Binance MiniTicker Format)
export interface MiniTicker {
  s: string; // Symbol
  c: string; // Close Price
  o: string; // Open Price
  h: string; // High Price
  l: string; // Low Price
  v: string; // Volume
  q: string; // Quote Volume
}

// Mandate 0.31: Database metadata structure
export interface StickyNote {
  id: string;
  title?: string; // New field for renaming
  content: string;
  inkData?: string; // Data URL for canvas drawings
  position: { x: number; y: number };
  size: { w: number; h: number };
  color: string;
  lastModified: number;
  isPinned?: boolean;
  isMinimized?: boolean;
}

// Lane 3: Persistence Objects
export interface ChartLayout {
  id: string;
  name: string;
  symbol: string;
  interval: Timeframe;
  drawings: any[]; // Serialized drawings
  lastModified: number;
}

// Mandate 0.11.2: Asset Library Metadata
export interface AssetMetadata {
  id: number;
  symbol: string;
  path: string;
  size: string;
  lastModified: number;
  type: 'csv' | 'folder';
}

// Mandate 0.11.3: Data Explorer File System Item
export interface FileSystemItem {
  name: string;
  type: 'dir' | 'file';
  path: string;
  extension?: string;
  size?: string;
  lastModified?: number;
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

// --- TRADING PANEL TYPES ---
export interface Position {
  id: string;
  symbol: string;
  leverage: number;
  side: 'Long' | 'Short';
  size: number;
  sizeCurrency: string;
  entryPrice: number;
  markPrice: number;
  liqPrice: number;
  margin: number;
  pnl: number;
  roe: number;
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