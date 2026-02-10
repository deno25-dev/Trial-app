import { OhlcData } from '../types';

// In a real Tauri app, we would use: import { invoke } from '@tauri-apps/api/tauri';
// For this scaffolding, we simulate the Rust backend.

export const TauriService = {
  // Mandate 0.2: Stream A (Local Data)
  async loadLocalData(symbol: string, timeframe: string): Promise<OhlcData[]> {
    console.log(`[Tauri] Loading local data for ${symbol} ${timeframe}`);
    
    // Simulate latency of file reading
    await new Promise(resolve => setTimeout(resolve, 300));

    // Generate mock candle data
    const data: OhlcData[] = [];
    let price = 50000;
    const now = Math.floor(Date.now() / 1000);
    const candleCount = 1000;
    const intervalSeconds = timeframe === '1h' ? 3600 : 900; // simplified

    for (let i = candleCount; i > 0; i--) {
      const time = now - (i * intervalSeconds);
      const volatility = price * 0.002;
      const open = price;
      const close = price + (Math.random() - 0.5) * volatility * 2;
      const high = Math.max(open, close) + Math.random() * volatility;
      const low = Math.min(open, close) - Math.random() * volatility;
      
      data.push({
        time: time as any, // Lightweight charts handles timestamps
        open,
        high,
        low,
        close,
        volume: Math.random() * 1000,
      });
      price = close;
    }
    return data;
  },

  // Mandate 0.11.2: Rust State Management
  async saveChartState(sourceId: string, state: any): Promise<boolean> {
    console.log(`[Tauri] Saving chart state for ${sourceId}`, state);
    return true;
  },

  async loadChartState(sourceId: string): Promise<any> {
    console.log(`[Tauri] Loading chart state for ${sourceId}`);
    return null;
  }
};
