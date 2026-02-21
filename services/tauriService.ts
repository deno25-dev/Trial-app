

import { OhlcData, TradeLog, AssetMetadata, FileSystemItem, StickyNote, ChartLayout, MiniTicker, Drawing } from '../types';
import { BinaryParser } from '../utils/binaryParser';
import { Telemetry } from '../utils/telemetry';

// Type definition for Tauri Invoke
type InvokeArgs = Record<string, unknown>;

// --- MOCK DATABASE STATE (For "Native" Simulation inside Browser) ---
// Initial seed data if LocalStorage is empty
const MOCK_SQLITE_DB: TradeLog[] = [
    { id: 1, timestamp: Date.now() - 100000, symbol: "BTCUSDT", price: 64100, volume: 0.5, side: 'buy', indicators: { rsi: 30 } },
    { id: 2, timestamp: Date.now() - 50000, symbol: "BTCUSDT", price: 64200, volume: 0.1, side: 'sell', indicators: { rsi: 70 } }
];

// --- MOCK DRAWINGS TABLE ---
const MOCK_DRAWINGS: Drawing[] = [];

// --- MOCK ASSET LIBRARY (Mandate 0.11.2) ---
const MOCK_ASSETS: AssetMetadata[] = [
  { id: 1, symbol: "BTCUSDT", path: "/Assets/Crypto/BTCUSDT.csv", size: "128 MB", lastModified: Date.now() - 1000000, type: 'csv' },
  { id: 2, symbol: "ETHUSDT", path: "/Assets/Crypto/ETHUSDT.csv", size: "85 MB", lastModified: Date.now() - 2000000, type: 'csv' },
  { id: 3, symbol: "SOLUSDT", path: "/Assets/Crypto/SOLUSDT.csv", size: "45 MB", lastModified: Date.now() - 500000, type: 'csv' },
  { id: 4, symbol: "EURUSD", path: "/Assets/Forex/EURUSD.csv", size: "2.1 GB", lastModified: Date.now() - 86400000, type: 'csv' },
  { id: 5, symbol: "GBPUSD", path: "/Assets/Forex/GBPUSD.csv", size: "1.8 GB", lastModified: Date.now() - 86400000, type: 'csv' },
  { id: 6, symbol: "AAPL", path: "/Assets/Stocks/AAPL.csv", size: "400 MB", lastModified: Date.now() - 3600000, type: 'csv' },
  { id: 7, symbol: "NVDA", path: "/Assets/Stocks/NVDA.csv", size: "520 MB", lastModified: Date.now() - 3600000, type: 'csv' },
  { id: 8, symbol: "TSLA", path: "/Assets/Stocks/TSLA.csv", size: "380 MB", lastModified: Date.now() - 3600000, type: 'csv' },
  { id: 9, symbol: "SPX", path: "/Assets/Indices/SPX.csv", size: "12 GB", lastModified: Date.now() - 100000, type: 'csv' },
  { id: 10, symbol: "NDX", path: "/Assets/Indices/NDX.csv", size: "8 GB", lastModified: Date.now() - 100000, type: 'csv' },
];

// --- MOCK FILE SYSTEM FOR DATA EXPLORER (Mandate 0.11.3) ---
const MOCK_FS: Record<string, FileSystemItem[]> = {
    '/mnt/external': [
        { name: 'Backtests', type: 'dir', path: '/mnt/external/Backtests' },
        { name: 'Raw_Data', type: 'dir', path: '/mnt/external/Raw_Data' },
        { name: 'Exported_Trades.json', type: 'file', path: '/mnt/external/Exported_Trades.json', size: '2 KB', extension: 'json' },
    ],
    '/mnt/external/Backtests': [
        { name: '2024', type: 'dir', path: '/mnt/external/Backtests/2024' },
        { name: '2023', type: 'dir', path: '/mnt/external/Backtests/2023' },
    ],
    '/mnt/external/Backtests/2024': [
        { name: 'Strategy_A_Optimized.csv', type: 'file', path: '/mnt/external/Backtests/2024/Strategy_A_Optimized.csv', size: '45 MB', extension: 'csv' },
        { name: 'Strategy_B_Fail.csv', type: 'file', path: '/mnt/external/Backtests/2024/Strategy_B_Fail.csv', size: '120 MB', extension: 'csv' },
    ],
    '/mnt/external/Raw_Data': [
        { name: 'BTC_Ticks_2024.csv', type: 'file', path: '/mnt/external/Raw_Data/BTC_Ticks_2024.csv', size: '12 GB', extension: 'csv' },
    ]
};

// --- STATE MANAGEMENT FOR SINGLETON/BACKOFF (Mandate 0.9) ---
let marketOverviewPromise: Promise<any[]> | null = null;
let marketFailureCount = 0;
let marketNextRetryTime = 0;

/**
 * THE BRIDGE
 * 
 * This service acts as the strict boundary between the React Frontend
 * and the Rust/Polars Backend.
 */
export const TauriService = {
  /**
   * Mock Implementation of Tauri's `invoke` function.
   */
  async invoke<T>(command: string, args?: InvokeArgs): Promise<T> {
    const start = performance.now();
    
    // Log outgoing IPC request
    Telemetry.debug('Bridge', `IPC Call: ${command}`, args);

    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 50)); // Faster response for drawings

    // Measure Latency
    const latency = performance.now() - start;
    if (latency > 300) {
        Telemetry.warn('Performance', `Slow IPC Response: ${command}`, { latency: `${latency.toFixed(2)}ms` });
    }

    // --- CHARTING COMMANDS (Lane 2 - Read Only) ---
    if (command === 'plugin:polars|load_history') {
        const result = MockBackend.generateBinaryCandles(args?.symbol as string, args?.interval as string);
        Telemetry.success('Bridge', `Loaded History for ${args?.symbol}`, { bytes: result.length });
        return result as unknown as T;
    }
    
    // --- ASSET LIBRARY COMMANDS (Lane 1 - Read Only) ---
    if (command === 'plugin:assets|scan') {
        Telemetry.info('System', 'Scanning ./Assets directory...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        Telemetry.success('Database', `Asset Scan Complete. Found ${MOCK_ASSETS.length} items.`);
        return MOCK_ASSETS as unknown as T;
    }

    if (command === 'plugin:assets|get_all') {
        return MOCK_ASSETS as unknown as T;
    }

    // --- DATA EXPLORER COMMANDS (Lane 2 - Read Only) ---
    if (command === 'plugin:fs|open_directory_dialog') {
        Telemetry.info('System', 'Opening System File Dialog...');
        await new Promise(resolve => setTimeout(resolve, 800));
        const mockPath = '/mnt/external';
        Telemetry.success('System', `User selected: ${mockPath}`);
        return mockPath as unknown as T;
    }

    if (command === 'plugin:fs|list_directory') {
        const path = args?.path as string;
        const items = MOCK_FS[path] || [];
        Telemetry.debug('System', `Listing Directory: ${path}`, { count: items.length });
        return items as unknown as T;
    }

    // --- LANE 3: PERSISTENCE (Atomic JSON + SQLite) ---

    // Drawing Persistence
    if (command === 'plugin:db|save_drawing') {
        const drawing = args?.drawing as Drawing;
        const existingIdx = MOCK_DRAWINGS.findIndex(d => d.id === drawing.id);
        if (existingIdx >= 0) {
            MOCK_DRAWINGS[existingIdx] = drawing;
        } else {
            MOCK_DRAWINGS.push(drawing);
        }
        Telemetry.success('Persistence', `Drawing Saved`, { id: drawing.id });
        return true as unknown as T;
    }

    if (command === 'plugin:db|load_drawings') {
        const sourceId = args?.sourceId as string;
        const result = MOCK_DRAWINGS.filter(d => d.sourceId === sourceId);
        return result as unknown as T;
    }
    
    if (command === 'plugin:db|delete_drawing') {
        const id = args?.id as string;
        const idx = MOCK_DRAWINGS.findIndex(d => d.id === id);
        if (idx >= 0) MOCK_DRAWINGS.splice(idx, 1);
        Telemetry.info('Persistence', `Drawing Deleted`, { id });
        return true as unknown as T;
    }

    if (command === 'plugin:db|clear_drawings') {
        const sourceId = args?.sourceId as string;
        const initialLen = MOCK_DRAWINGS.length;
        // Bulk delete via filtering
        const filtered = MOCK_DRAWINGS.filter(d => d.sourceId !== sourceId);
        MOCK_DRAWINGS.length = 0;
        MOCK_DRAWINGS.push(...filtered);
        const count = initialLen - MOCK_DRAWINGS.length;
        Telemetry.info('Persistence', `Cleared ${count} drawings for ${sourceId}`);
        return true as unknown as T;
    }

    // Atomic Save Command
    if (command === 'plugin:persistence|save_atomic_json') {
        const { folder, filename, data } = args as { folder: string, filename: string, data: string };
        const path = `DB/${folder}/${filename}`;
        
        // Simulating Rust's Atomic Write (write .tmp -> sync -> rename)
        Telemetry.debug('Persistence', `Atomic Write Initiated: ${path}`);
        
        try {
            // In Web Mode, we use LocalStorage as the "Disk"
            localStorage.setItem(path, data);
            Telemetry.success('Persistence', `Atomic Write Committed: ${path}`, { size: data.length });
            return true as unknown as T;
        } catch (e) {
            Telemetry.error('Persistence', `Write Failed: ${path}`, { error: e });
            throw new Error(`Disk Write Failed: ${e}`);
        }
    }

    // Delete JSON Command
    if (command === 'plugin:persistence|delete_json') {
        const { folder, filename } = args as { folder: string, filename: string };
        const path = `DB/${folder}/${filename}`;
        
        Telemetry.debug('Persistence', `Deleting File: ${path}`);
        try {
            localStorage.removeItem(path);
            Telemetry.info('Persistence', `File Deleted: ${path}`);
            return true as unknown as T;
        } catch (e) {
            Telemetry.error('Persistence', `Delete Failed: ${path}`, { error: e });
            throw new Error(`Disk Delete Failed: ${e}`);
        }
    }

    // Read JSON Command (For loading Sticky Notes / Layouts)
    if (command === 'plugin:persistence|read_json') {
        const { folder, filename } = args as { folder: string, filename: string };
        const path = `DB/${folder}/${filename}`;
        const data = localStorage.getItem(path);
        
        if (!data) {
            // Telemetry.warn('Persistence', `File Not Found: ${path}`);
            return null as unknown as T;
        }
        return JSON.parse(data) as T;
    }

    // List JSON Files in Folder
    if (command === 'plugin:persistence|list_folder') {
        const { folder } = args as { folder: string };
        const prefix = `DB/${folder}/`;
        const items: string[] = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
                items.push(key.replace(prefix, ''));
            }
        }
        return items as unknown as T;
    }

    // --- DATABASE COMMANDS (Native SQLite Simulation) ---
    if (command === 'db_health_check') {
        return true as unknown as T;
    }
    
    // Simulating SQL Insert via LocalStorage "Table"
    if (command === 'db_insert_trade') {
        const trade = args?.trade as TradeLog;
        
        // Load current "Table"
        const tableJson = localStorage.getItem('DB/Trades/ledger.json');
        const ledger: TradeLog[] = tableJson ? JSON.parse(tableJson) : [...MOCK_SQLITE_DB];
        
        const newId = ledger.length + 1;
        const newEntry = { ...trade, id: newId };
        ledger.push(newEntry);
        
        // Save back
        localStorage.setItem('DB/Trades/ledger.json', JSON.stringify(ledger));
        
        Telemetry.info('Database', 'Trade Inserted (WAL Mode Simulated)', { id: newId, symbol: trade.symbol });
        return newId as unknown as T;
    }
    
    if (command === 'db_get_trades') {
        const symbol = args?.symbol as string;
        const tableJson = localStorage.getItem('DB/Trades/ledger.json');
        const ledger: TradeLog[] = tableJson ? JSON.parse(tableJson) : [...MOCK_SQLITE_DB];
        
        const results = ledger.filter(t => t.symbol === symbol);
        return results as unknown as T;
    }

    const err = `Unknown IPC Command: ${command}`;
    Telemetry.error('Bridge', err);
    throw new Error(err);
  },

  // --- API METHODS ---

  async loadChartData(symbol: string, timeframe: string): Promise<OhlcData[]> {
    try {
        const binaryBuffer = await TauriService.invoke<Uint8Array>('plugin:polars|load_history', { symbol, timeframe });
        return BinaryParser.parseOhlc(binaryBuffer);
    } catch (e: any) {
        Telemetry.error('System', 'Failed to load chart data', { message: e.message });
        throw e;
    }
  },

  async getAssets(): Promise<AssetMetadata[]> {
    try {
        const assets = await TauriService.invoke<AssetMetadata[]>('plugin:assets|get_all');
        return assets;
    } catch (e: any) {
        Telemetry.error('System', 'Failed to fetch assets', { message: e.message });
        throw e;
    }
  },

  async scanAssets(): Promise<AssetMetadata[]> {
    return TauriService.invoke<AssetMetadata[]>('plugin:assets|scan');
  },

  async openDirectoryDialog(): Promise<string> {
      return TauriService.invoke<string>('plugin:fs|open_directory_dialog');
  },

  async listDirectory(path: string): Promise<FileSystemItem[]> {
      return TauriService.invoke<FileSystemItem[]>('plugin:fs|list_directory', { path });
  },

  // --- LANE 3: PERSISTENCE METHODS ---

  async saveAtomicJson(folder: string, filename: string, data: object): Promise<void> {
      const jsonString = JSON.stringify(data);
      await TauriService.invoke('plugin:persistence|save_atomic_json', { folder, filename, data: jsonString });
  },
  
  async deleteJson(folder: string, filename: string): Promise<void> {
      await TauriService.invoke('plugin:persistence|delete_json', { folder, filename });
  },

  async readJson<T>(folder: string, filename: string): Promise<T | null> {
      return TauriService.invoke<T>('plugin:persistence|read_json', { folder, filename });
  },

  async listFolder(folder: string): Promise<string[]> {
      return TauriService.invoke<string[]>('plugin:persistence|list_folder', { folder });
  },

  async logTrade(trade: Omit<TradeLog, 'id'>): Promise<number> {
      return TauriService.invoke<number>('db_insert_trade', { trade });
  },

  // --- DRAWING SYSTEM API ---
  async saveDrawing(drawing: Drawing): Promise<void> {
      return TauriService.invoke('plugin:db|save_drawing', { drawing });
  },

  async loadDrawings(sourceId: string): Promise<Drawing[]> {
      return TauriService.invoke<Drawing[]>('plugin:db|load_drawings', { sourceId });
  },

  async deleteDrawing(id: string): Promise<void> {
      return TauriService.invoke('plugin:db|delete_drawing', { id });
  },

  async clearAllDrawings(sourceId: string): Promise<void> {
      return TauriService.invoke('plugin:db|clear_drawings', { sourceId });
  },

  // --- LANE 4: MARKET STREAM (Binance WebSocket Abstraction) ---
  
  /**
   * Subscribes to the live market stream.
   * In Native Mode: Listens to Tauri Event 'market-update' emitted by Rust.
   * In Web Mode: Simulates a WebSocket connection with random price walks.
   */
  subscribeToMarketStream(onUpdate: (data: MiniTicker[]) => void): () => void {
      // Check for Tauri environment (Abstraction Rule)
      // @ts-ignore
      const isTauri = typeof window !== 'undefined' && window.__TAURI__ !== undefined;

      if (isTauri) {
          Telemetry.info('Network', 'Subscribing to Native Binance Stream (Lane 4)');
          return MockBackend.startMockStream(onUpdate);
      } else {
          // WEB: Simulate WebSocket
          Telemetry.info('Network', 'Starting Mock Market Stream (Web Mode)');
          return MockBackend.startMockStream(onUpdate);
      }
  },

  addMarketSymbol(symbol: string) {
      MockBackend.addSymbol(symbol);
  },

  removeMarketSymbol(symbol: string) {
      MockBackend.removeSymbol(symbol);
  }
};

/**
 * Mock Rust Backend Logic
 */
const MockBackend = {
    // Mutable active symbols for the stream
    activeSymbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT', 'XRPUSDT', 'DOGEUSDT', 'DOTUSDT'],
    
    // Store price memory to avoid sudden jumps when adding new symbols
    priceMemory: {
        'BTCUSDT': 64000,
        'ETHUSDT': 3400,
        'SOLUSDT': 145,
        'BNBUSDT': 590,
        'ADAUSDT': 0.45,
        'XRPUSDT': 0.60,
        'DOGEUSDT': 0.16,
        'DOTUSDT': 7.20
    } as Record<string, number>,

    generateBinaryCandles: (symbol: string, timeframe: string): Uint8Array => {
        const data: OhlcData[] = [];
        let price = 50000;
        if(symbol.includes('ETH')) price = 3000;
        
        const now = Math.floor(Date.now() / 1000);
        const candleCount = 1000;
        const intervalSeconds = timeframe === '1h' ? 3600 : 900;
    
        for (let i = candleCount; i > 0; i--) {
          const time = now - (i * intervalSeconds);
          const volatility = price * 0.002;
          const open = price;
          const close = price + (Math.random() - 0.5) * volatility * 2;
          const high = Math.max(open, close) + Math.random() * volatility;
          const low = Math.min(open, close) - Math.random() * volatility;
          
          data.push({
            time: time as any, 
            open,
            high,
            low,
            close,
            volume: Math.random() * 1000,
          });
          price = close;
        }

        const textEncoder = new TextEncoder();
        return textEncoder.encode(JSON.stringify(data));
    },

    // --- LANE 4 MOCK GENERATOR ---
    startMockStream: (callback: (data: MiniTicker[]) => void) => {
        const interval = setInterval(() => {
            const updates: MiniTicker[] = MockBackend.activeSymbols.map(s => {
                // Initialize price if new
                if (!MockBackend.priceMemory[s]) {
                    MockBackend.priceMemory[s] = Math.random() * 100 + 10;
                }

                const prev = MockBackend.priceMemory[s];
                const change = (Math.random() - 0.5) * (prev * 0.002); // 0.2% volatility
                const newPrice = prev + change;
                MockBackend.priceMemory[s] = newPrice;

                return {
                    s: s,
                    c: newPrice.toFixed(2),
                    o: (newPrice * (1 - (Math.random() * 0.01 - 0.005))).toFixed(2), // Mock open
                    h: (newPrice * 1.001).toFixed(2),
                    l: (newPrice * 0.999).toFixed(2),
                    v: (Math.random() * 1000).toFixed(2),
                    q: (Math.random() * 50000).toFixed(2)
                };
            });
            callback(updates);
        }, 1000); 

        return () => clearInterval(interval);
    },

    addSymbol: (symbol: string) => {
        if (!MockBackend.activeSymbols.includes(symbol)) {
            MockBackend.activeSymbols.push(symbol);
            Telemetry.info('Bridge', `Subscribed to new symbol: ${symbol}`);
        }
    },

    removeSymbol: (symbol: string) => {
        MockBackend.activeSymbols = MockBackend.activeSymbols.filter(s => s !== symbol);
        delete MockBackend.priceMemory[symbol];
        Telemetry.info('Bridge', `Unsubscribed from symbol: ${symbol}`);
    }
};