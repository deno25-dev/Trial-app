import { OhlcData, TradeLog } from '../types';
import { BinaryParser } from '../utils/binaryParser';

// Type definition for Tauri Invoke
type InvokeArgs = Record<string, unknown>;

// --- MOCK DATABASE STATE (For "Native" Simulation inside Browser) ---
const MOCK_SQLITE_DB: TradeLog[] = [
    { id: 1, timestamp: Date.now() - 100000, symbol: "BTCUSDT", price: 64100, volume: 0.5, side: 'buy', indicators: { rsi: 30 } },
    { id: 2, timestamp: Date.now() - 50000, symbol: "BTCUSDT", price: 64200, volume: 0.1, side: 'sell', indicators: { rsi: 70 } }
];

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
    console.debug(`[IPC-OUT] Command: ${command}`, args);
    
    await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 200));

    // --- CHARTING COMMANDS ---
    if (command === 'plugin:polars|load_history') {
        return MockBackend.generateBinaryCandles(args?.symbol as string, args?.interval as string) as unknown as T;
    }
    if (command === 'get_market_overview') {
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
        return newId as unknown as T;
    }
    if (command === 'db_get_trades') {
        const symbol = args?.symbol as string;
        return MOCK_SQLITE_DB.filter(t => t.symbol === symbol) as unknown as T;
    }

    throw new Error(`Unknown IPC Command: ${command}`);
  },

  // --- API METHODS ---

  async loadChartData(symbol: string, timeframe: string): Promise<OhlcData[]> {
    const binaryBuffer = await TauriService.invoke<Uint8Array>('plugin:polars|load_history', { symbol, timeframe });
    return BinaryParser.parseOhlc(binaryBuffer);
  },

  async getMarketOverview(): Promise<any[]> {
    return TauriService.invoke('get_market_overview');
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
