import { TauriService } from '../../tauriService';
import { TradeLog } from '../../../types';

/**
 * NATIVE DRIVER (Rust/SQLite)
 * 
 * This driver pipes commands directly to the Rust backend via Tauri IPC.
 * The Rust backend handles the actual SQLite file connection on disk.
 */
export const NativeDatabase = {
  async connect(): Promise<boolean> {
    // Rust manages the connection lifecycle, we just verify it's alive
    return TauriService.invoke<boolean>('db_health_check');
  },

  async insertTrade(trade: Omit<TradeLog, 'id'>): Promise<number> {
    // Maps to Rust command: #[tauri::command] fn db_insert_trade(...)
    return TauriService.invoke<number>('db_insert_trade', { trade });
  },

  async getTrades(symbol: string): Promise<TradeLog[]> {
    // Maps to Rust command: #[tauri::command] fn db_get_trades(...)
    return TauriService.invoke<TradeLog[]>('db_get_trades', { symbol });
  }
};
