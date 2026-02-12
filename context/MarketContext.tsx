import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TauriService } from '../services/tauriService';
import { MiniTicker } from '../types';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { Telemetry } from '../utils/telemetry';

interface MarketContextType {
  prices: Record<string, MiniTicker>;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  isOnline: boolean;
  isMarketSearchOpen: boolean;
  toggleMarketSearch: () => void;
  addSymbol: (symbol: string) => void;
  removeSymbol: (symbol: string) => void;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

export const MarketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [prices, setPrices] = useState<Record<string, MiniTicker>>({});
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [isMarketSearchOpen, setIsMarketSearchOpen] = useState(false);
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

  const toggleMarketSearch = () => setIsMarketSearchOpen(prev => !prev);
  
  const addSymbol = (symbol: string) => {
      TauriService.addMarketSymbol(symbol);
  };

  const removeSymbol = (symbol: string) => {
      TauriService.removeMarketSymbol(symbol);
      // Immediate state update for responsiveness
      setPrices(prev => {
          const next = { ...prev };
          delete next[symbol];
          return next;
      });
  };

  return (
    <MarketContext.Provider value={{ 
        prices, 
        status, 
        isOnline, 
        isMarketSearchOpen, 
        toggleMarketSearch, 
        addSymbol,
        removeSymbol
    }}>
      {children}
    </MarketContext.Provider>
  );
};

export const useMarket = () => {
  const context = useContext(MarketContext);
  if (!context) throw new Error("useMarket must be used within a MarketProvider");
  return context;
};