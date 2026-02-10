import { Timeframe } from './types';

export const APP_NAME = "Red Pill Charting";
export const VERSION = "1.2.5";

export const DEFAULT_SYMBOL = "BTCUSDT";
export const DEFAULT_TIMEFRAME: Timeframe = "1h";

// Mandate 0.4: Base Theme Colors
export const THEME_CONFIG = {
  dark: {
    background: '#0a0a0c',
    surface: '#131316',
    grid: '#1f1f24',
    text: '#e4e4e7',
    candleUp: '#22c55e',
    candleDown: '#ef4444',
    wickUp: '#22c55e',
    wickDown: '#ef4444',
    crosshair: '#71717a',
    border: '#2a2a2f',
  },
  light: {
    background: '#ffffff',
    surface: '#f4f4f5',
    grid: '#e4e4e7',
    text: '#18181b',
    candleUp: '#16a34a',
    candleDown: '#dc2626',
    wickUp: '#16a34a',
    wickDown: '#dc2626',
    crosshair: '#71717a',
    border: '#e4e4e7',
  }
};

// Legacy support (points to dark by default)
export const THEME_COLORS = THEME_CONFIG.dark;

// Mandate 2.5: Favorite Timeframes
export const ALL_TIMEFRAMES: Timeframe[] = ['1m', '3m', '5m', '15m', '30m', '45m', '1h', '2h', '4h', '12h', '1d', '1w', '1M'];
export const FAVORITE_TIMEFRAMES: Timeframe[] = ['15m', '1h', '4h', '1d', '1w'];

// Mandate 0.10.1: API Throttling
export const API_POLL_INTERVAL = 30000; // 30s
export const RECONNECT_DELAY = 2000; // 2s