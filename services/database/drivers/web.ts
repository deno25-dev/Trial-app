import { TradeLog } from '../../../types';

/**
 * WEB DRIVER (WASM/In-Memory)
 * 
 * In a real scenario, this would import `sql.js` (WASM) to run SQLite in the browser.
 * For this scaffold, we implement a High-Performance In-Memory Store to simulate
 * the WASM database behavior for web testing.
 */
class InMemoryDb {
  private store: TradeLog[] = [];
  private autoIncrementId = 1;

  async connect(): Promise<boolean> {
    console.log("[DB:WEB] Initializing WASM SQLite Simulation...");
    // Simulate WASM load time
    await new Promise(r => setTimeout(r, 500));
    console.log("[DB:WEB] Connected to In-Memory DB.");
    return true;
  }

  async insertTrade(trade: Omit<TradeLog, 'id'>): Promise<number> {
    const newTrade = { ...trade, id: this.autoIncrementId++ };
    this.store.push(newTrade);
    console.log("[DB:WEB] Inserted Trade:", newTrade);
    return newTrade.id;
  }

  async getTrades(symbol: string): Promise<TradeLog[]> {
    return this.store
        .filter(t => t.symbol === symbol)
        .sort((a, b) => b.timestamp - a.timestamp);
  }
}

export const WebDatabase = new InMemoryDb();
