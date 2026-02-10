import { OhlcData, TradeLog } from '../types';
import { BinaryParser } from '../utils/binaryParser';
import { Telemetry } from '../utils/telemetry';

// Type definition for Tauri Invoke
type InvokeArgs = Record<string, unknown>;

// --- MOCK DATABASE STATE (For "Native" Simulation inside Browser) ---
const MOCK_SQLITE_DB: TradeLog[] = [
    { id: 1, timestamp: Date.now() - 100000, symbol: "BTCUSDT", price: 64100, volume: 0.5, side: 'buy', indicators: { rsi: 30 } },
    { id: 2, timestamp: Date.now() - 50000, symbol: "BTCUSDT", price: 64200, volume: 0.1, side: 'sell', indicators: { rsi: 70 } }
];

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

    await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 200));

    // Measure Latency
    const latency = performance.now() - start;
    if (latency > 300) {
        Telemetry.warn('Performance', `Slow IPC Response: ${command}`, { latency: `${latency.toFixed(2)}ms` });
    }

    // --- CHARTING COMMANDS ---
    if (command === 'plugin:polars|load_history') {
        const result = MockBackend.generateBinaryCandles(args?.symbol as string, args?.interval as string);
        Telemetry.success('Bridge', `Loaded History for ${args?.symbol}`, { bytes: result.length });
        return result as unknown as T;
    }
    if (command === 'get_market_overview') {
        // Randomly simulate a network failure for telemetry testing (Increased rate for demo of backoff)
        if (Math.random() < 0.2) {
             const err = new Error("Connection Reset by Peer");
             // Log handled in wrapper
             throw err;
        }
        return MockBackend.getMarketData() as unknown as T;
    }

    // --- DATABASE COMMANDS (Native SQLite Simulation) ---
    if (command === 'db_health_check') {
        return true as unknown as T;
    }
    if (command === 'db_insert_trade') {
        const trade = args?.trade as TradeLog;
        const newId = MOCK_SQLITE_DB.length + 1;
        MOCK_SQLITE_DB.push({ ...trade, id: newId });
        Telemetry.info('Database', 'Trade Inserted', { id: newId, symbol: trade.symbol });
        return newId as unknown as T;
    }
    if (command === 'db_get_trades') {
        const symbol = args?.symbol as string;
        return MOCK_SQLITE_DB.filter(t => t.symbol === symbol) as unknown as T;
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

  /**
   * Fetches market overview with Singleton Request Pattern & Exponential Backoff.
   * Mandate 0.9.1 & 0.9.2
   */
  async getMarketOverview(): Promise<any[]> {
    const now = Date.now();

    // 1. Backoff Enforcement
    if (now < marketNextRetryTime) {
        const wait = Math.ceil((marketNextRetryTime - now) / 1000);
        const msg = `Market Stream throttled. Retrying in ${wait}s`;
        // We throw here so the UI knows not to expect data, but we don't log as error to avoid spam
        throw new Error(msg);
    }

    // 2. Singleton Deduplication
    if (marketOverviewPromise) {
        // Return existing promise to prevent duplicate IPC calls
        return marketOverviewPromise;
    }

    // 3. Execution Wrapper
    marketOverviewPromise = (async () => {
        try {
            const data = await TauriService.invoke<any[]>('get_market_overview');
            
            // Success: Reset Backoff
            if (marketFailureCount > 0) {
                Telemetry.success('Network', 'Market Stream Reconnected');
                marketFailureCount = 0;
                marketNextRetryTime = 0;
            }
            return data;
        } catch (e: any) {
            // Failure: Calculate Exponential Backoff (2, 4, 8, 16s)
            marketFailureCount++;
            const backoffSeconds = Math.min(16, Math.pow(2, marketFailureCount)); 
            marketNextRetryTime = Date.now() + (backoffSeconds * 1000);
            
            Telemetry.warn('Network', `Market Stream Failed. Backing off for ${backoffSeconds}s`, { 
                attempt: marketFailureCount, 
                error: e.message 
            });
            
            throw e;
        } finally {
            // Release lock
            marketOverviewPromise = null;
        }
    })();

    return marketOverviewPromise;
  }
};

/**
 * Mock Rust Backend Logic
 */
const MockBackend = {
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

    getMarketData: () => {
        return [
            { symbol: "BTCUSDT", price: "64,231.50", change: 2.4 },
            { symbol: "ETHUSDT", price: "3,450.20", change: -1.2 },
            { symbol: "SOLUSDT", price: "145.80", change: 5.7 },
        ];
    }
};