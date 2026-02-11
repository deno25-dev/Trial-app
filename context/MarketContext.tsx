import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TauriService } from '../services/tauriService';
import { MiniTicker } from '../types';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { Telemetry } from '../utils/telemetry';

interface MarketContextType {
  prices: Record<string, MiniTicker>;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  isOnline: boolean;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

export const MarketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [prices, setPrices] = useState<Record<string, MiniTicker>>({});
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const isOnline = useOnlineStatus();

  useEffect(() => {
    // Mandate 0.12: If offline, disconnect immediately.
    if (!isOnline) {
        setStatus('disconnected');
        return;
    }

    setStatus('connecting');
    Telemetry.info('Network', 'Initializing Lane 4 (Market Stream)...');

    // Subscribe to Service (which handles Abstraction Rule for Web vs Native)
    const unsubscribe = TauriService.subscribeToMarketStream((data) => {
        setStatus('connected');
        
        // Update State (High Frequency)
        // Note: In a real high-perf app, we might use a Ref or specific React Optimization
        // to avoid re-rendering the whole tree, but for this scaffolding, State is fine.
        setPrices(prev => {
            const next = { ...prev };
            data.forEach(ticker => {
                next[ticker.s] = ticker;
            });
            return next;
        });
    });

    return () => {
        unsubscribe();
        setStatus('disconnected');
        Telemetry.info('Network', 'Lane 4 Stream Closed');
    };
  }, [isOnline]);

  return (
    <MarketContext.Provider value={{ prices, status, isOnline }}>
      {children}
    </MarketContext.Provider>
  );
};

export const useMarket = () => {
  const context = useContext(MarketContext);
  if (!context) throw new Error("useMarket must be used within a MarketProvider");
  return context;
};