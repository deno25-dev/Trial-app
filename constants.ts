import { Timeframe } from './types';

export const APP_NAME = "Red Pill Charting";
export const VERSION = "1.2.6";

export const DEFAULT_SYMBOL = "BTCUSDT";
export const DEFAULT_TIMEFRAME: Timeframe = "1h";

// Mandate 0.4: Base Theme Colors & Skins
// Each skin defines the CSS variables (for DOM) and Canvas colors (for Chart)
export const SKIN_CONFIG = {
    'default': {
        name: 'Midnight River',
        type: 'dark',
        css: {
            '--bg-background': '#131722',
            '--bg-surface': '#1E222D',
            '--border-color': '#2A2E39',
            '--text-primary': '#D1D4DC',
            '--text-muted': '#787B86',
            '--color-primary': '#2962FF', // Vivid Blue (TradingView)
            '--color-success': '#089981', // TV Green
            '--color-danger': '#F23645',  // TV Red
        },
        chart: {
            background: '#131722',
            surface: '#1E222D',
            grid: '#1E222D', // Subtle grid
            text: '#D1D4DC',
            candleUp: '#089981',
            candleDown: '#F23645',
            wickUp: '#089981',
            wickDown: '#F23645',
            crosshair: '#787B86',
        }
    },
    'oled': {
        name: 'Exquisite Darkness',
        type: 'dark',
        css: {
            '--bg-background': '#000000',
            '--bg-surface': '#09090b',
            '--border-color': '#27272a',
            '--text-primary': '#e4e4e7',
            '--text-muted': '#52525b',
            '--color-primary': '#22d3ee',
        },
        chart: {
            background: '#000000',
            surface: '#09090b',
            grid: '#18181b',
            text: '#a1a1aa',
            candleUp: '#22c55e',
            candleDown: '#ef4444',
            wickUp: '#22c55e',
            wickDown: '#ef4444',
            crosshair: '#52525b',
        }
    },
    'titanium': {
        name: 'Cumulus Ambience',
        type: 'dark',
        css: {
            '--bg-background': '#18181b', // Zinc-900
            '--bg-surface': '#27272a',    // Zinc-800
            '--border-color': '#3f3f46',  // Zinc-700
            '--text-primary': '#f4f4f5',
            '--text-muted': '#a1a1aa',
            '--color-primary': '#3b82f6', // Standard Blue
        },
        chart: {
            background: '#18181b',
            surface: '#27272a',
            grid: '#27272a',
            text: '#a1a1aa',
            candleUp: '#10b981',
            candleDown: '#f43f5e',
            wickUp: '#10b981',
            wickDown: '#f43f5e',
            crosshair: '#71717a',
        }
    },
    'forbidden-velvet': {
        name: 'Forbidden Velvet',
        type: 'dark',
        css: {
            '--bg-background': '#161321', // Deep Violet Black
            '--bg-surface': '#1E1B2E',    // Dark Plum
            '--border-color': '#362C4C',  // Muted Purple Border
            '--text-primary': '#E9D5FF',  // Lavender Mist
            '--text-muted': '#8B7F9F',    // Dusty Purple
            '--color-primary': '#C084FC', // Electric Violet
            '--color-success': '#34D399', // Mint
            '--color-danger': '#FB7185',  // Rose
        },
        chart: {
            background: '#161321',
            surface: '#1E1B2E',
            grid: '#241e33',
            text: '#8B7F9F',
            candleUp: '#34D399',
            candleDown: '#FB7185',
            wickUp: '#34D399',
            wickDown: '#FB7185',
            crosshair: '#C084FC',
        }
    },
    'chocolate-dream': {
        name: 'Chocolate Dream',
        type: 'dark',
        css: {
            '--bg-background': '#1E1A17', // Espresso
            '--bg-surface': '#2C241F',    // Dark Roast
            '--border-color': '#453831',  // Cocoa
            '--text-primary': '#E6D7C3',  // Latte Foam
            '--text-muted': '#967E70',    // Dusty Cinnamon
            '--color-primary': '#E08E5F', // Terracotta/Caramel
            '--color-success': '#68A357', // Matcha Green
            '--color-danger': '#D45D55',  // Red Bean
        },
        chart: {
            background: '#1E1A17',
            surface: '#2C241F',
            grid: '#362B25',
            text: '#967E70',
            candleUp: '#68A357',
            candleDown: '#D45D55',
            wickUp: '#68A357',
            wickDown: '#D45D55',
            crosshair: '#E08E5F',
        }
    },
    'fairies-nest': {
        name: 'Fairies Nest',
        type: 'dark',
        css: {
            '--bg-background': '#151912', // Deep moss/swamp
            '--bg-surface': '#1F241A',    // Dark olive
            '--border-color': '#323829',  // Organic border
            '--text-primary': '#E7F5DC',  // Pale leaf white
            '--text-muted': '#7A8C6E',    // Dried sage
            '--color-primary': '#A3E635', // Poison/Fairy Lime (Matches active tab)
            '--color-success': '#A3E635', // Up candles match accent
            '--color-danger': '#F87171',  // Muted Berry Red
        },
        chart: {
            background: '#151912',
            surface: '#1F241A',
            grid: '#283020',
            text: '#7A8C6E',
            candleUp: '#A3E635',
            candleDown: '#F87171',
            wickUp: '#A3E635',
            wickDown: '#F87171',
            crosshair: '#D9F99D',
        }
    },
    'goldrush-planet': {
        name: 'GoldRush Planet',
        type: 'dark',
        css: {
            '--bg-background': '#211a12', // Deep Bronze/Black
            '--bg-surface': '#382c1e',    // Dark Leather Brown
            '--border-color': '#54422d',  // Copper
            '--text-primary': '#eaddcf',  // Parchment
            '--text-muted': '#96836e',    // Sand
            '--color-primary': '#dca853', // Bullion Gold
            '--color-success': '#66bb6a', // Emerald
            '--color-danger': '#ef5350',  // Jasper Red
        },
        chart: {
            background: '#211a12',
            surface: '#382c1e',
            grid: '#463729',
            text: '#96836e',
            candleUp: '#66bb6a',
            candleDown: '#ef5350',
            wickUp: '#66bb6a',
            wickDown: '#ef5350',
            crosshair: '#dca853',
        }
    },
    'rare-earth': {
        name: 'Rare Earth',
        type: 'dark',
        css: {
            '--bg-background': '#2a231a', // Dark Loam
            '--bg-surface': '#403629',    // Raw Umber/Oxide
            '--border-color': '#594c3a',  // Clay
            '--text-primary': '#e3d5c3',  // Bone/Mineral White
            '--text-muted': '#96836e',    // Sandstone
            '--color-primary': '#fbbf24', // Vein Gold / Amber
            '--color-success': '#84cc16', // Moss/Lime
            '--color-danger': '#f87171',  // Iron Oxide Red
        },
        chart: {
            background: '#2a231a',
            surface: '#403629',
            grid: '#362d22',
            text: '#96836e',
            candleUp: '#84cc16',
            candleDown: '#f87171',
            wickUp: '#84cc16',
            wickDown: '#f87171',
            crosshair: '#fbbf24',
        }
    },
    'polar': {
        name: 'Yakutsk Playground',
        type: 'light',
        css: {
            '--bg-background': '#ffffff',
            '--bg-surface': '#f4f4f5',    // Zinc-100
            '--border-color': '#e4e4e7',  // Zinc-200
            '--text-primary': '#18181b',  // Zinc-900
            '--text-muted': '#71717a',    // Zinc-500
            '--color-primary': '#2962ff', // TradingView Blue
        },
        chart: {
            background: '#ffffff',
            surface: '#f4f4f5',
            grid: '#e4e4e7',
            text: '#18181b',
            candleUp: '#089981', // TV Green
            candleDown: '#f23645', // TV Red
            wickUp: '#089981',
            wickDown: '#f23645',
            crosshair: '#71717a',
        }
    }
};

// Helper for Legacy Light Mode support (Fallback)
export const LIGHT_THEME_CHART = SKIN_CONFIG.polar.chart;

// Legacy support (points to dark by default) for components not yet updated
export const THEME_CONFIG = {
  dark: SKIN_CONFIG.default.chart,
  light: LIGHT_THEME_CHART
};
export const THEME_COLORS = THEME_CONFIG.dark;

// Mandate 2.5: Favorite Timeframes
export const ALL_TIMEFRAMES: Timeframe[] = ['1m', '3m', '5m', '15m', '30m', '45m', '1h', '2h', '4h', '12h', '1d', '1w', '1M'];
export const FAVORITE_TIMEFRAMES: Timeframe[] = ['1m', '3m', '5m', '15m', '1h', '4h', '12h', '1d', '1w'];

// Mandate 0.10.1: API Throttling
export const API_POLL_INTERVAL = 30000; // 30s
export const RECONNECT_DELAY = 2000; // 2s