import { WebDatabase } from './drivers/web';
import { NativeDatabase } from './drivers/native';
import { TradeLog } from '../../types';

// Detect Environment
// @ts-ignore - window.__TAURI__ is injected by Tauri
const IS_TAURI = typeof window !== 'undefined' && window.__TAURI__ !== undefined;

/**
 * DUAL-BOOT DATABASE LAYER
 * 
 * Automatically selects the storage engine based on the runtime environment.
 * - Web/Dev -> In-Memory (WASM Sim)
 * - Desktop -> Native SQLite (via Rust)
 */
export const AppDatabase = {
  isNative: IS_TAURI,

  async openConnection() {
    const driver = IS_TAURI ? NativeDatabase : WebDatabase;
    await driver.connect();
    return driver;
  },

  // Facade Methods
  async logTrade(trade: Omit<TradeLog, 'id'>) {
    const driver = IS_TAURI ? NativeDatabase : WebDatabase;
    return driver.insertTrade(trade);
  },

  async getHistory(symbol: string) {
    const driver = IS_TAURI ? NativeDatabase : WebDatabase;
    return driver.getTrades(symbol);
  }
};
