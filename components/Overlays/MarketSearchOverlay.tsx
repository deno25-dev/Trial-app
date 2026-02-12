import React, { useState, useEffect, useRef } from 'react';
import { Search, Globe, X, Wifi, Plus } from 'lucide-react';
import { useMarket } from '../../context/MarketContext';
import clsx from 'clsx';
import { Telemetry } from '../../utils/telemetry';

// Mock Web API Results
const MOCK_WEB_RESULTS = [
    { symbol: 'AVAXUSDT', name: 'Avalanche', network: 'Binance' },
    { symbol: 'MATICUSDT', name: 'Polygon', network: 'Binance' },
    { symbol: 'LINKUSDT', name: 'Chainlink', network: 'Binance' },
    { symbol: 'UNIUSDT', name: 'Uniswap', network: 'Binance' },
    { symbol: 'LTCUSDT', name: 'Litecoin', network: 'Binance' },
    { symbol: 'ATOMUSDT', name: 'Cosmos', network: 'Binance' },
    { symbol: 'ETCUSDT', name: 'Ethereum Classic', network: 'Binance' },
    { symbol: 'FILUSDT', name: 'Filecoin', network: 'Binance' },
    { symbol: 'AAVEUSDT', name: 'Aave', network: 'Binance' },
    { symbol: 'NEARUSDT', name: 'Near Protocol', network: 'Binance' },
];

export const MarketSearchOverlay: React.FC = () => {
  const { isMarketSearchOpen, toggleMarketSearch, addSymbol, prices } = useMarket();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isMarketSearchOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSearchTerm('');
    }
  }, [isMarketSearchOpen]);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isMarketSearchOpen) return;
      if (e.key === 'Escape') toggleMarketSearch();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMarketSearchOpen, toggleMarketSearch]);

  if (!isMarketSearchOpen) return null;

  // Filter Logic
  const results = MOCK_WEB_RESULTS.filter(item => 
      item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = (symbol: string) => {
      addSymbol(symbol);
      Telemetry.info('UI', `Market Asset Added: ${symbol}`);
      toggleMarketSearch();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-32 px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-md"
        onClick={toggleMarketSearch}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-xl bg-surface border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface-highlight/20">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Globe size={18} />
            </div>
            <div className="flex-1">
                <h2 className="text-sm font-bold text-text flex items-center gap-2">
                    Web Market Search
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-mono">LANE 4</span>
                </h2>
                <p className="text-[10px] text-muted">Search available symbols from Binance API (Live Stream)</p>
            </div>
            <button 
                onClick={toggleMarketSearch}
                className="p-2 hover:bg-surface-highlight rounded-lg text-muted hover:text-text transition-colors"
            >
                <X size={18} />
            </button>
        </div>

        {/* Search Bar */}
        <div className="relative border-b border-border">
            <Search className="absolute left-4 top-3.5 text-emerald-500" size={20} />
            <input 
                ref={inputRef}
                type="text" 
                placeholder="Search web symbols (e.g. MATIC, AVAX)..." 
                className="w-full bg-transparent px-12 py-3.5 text-lg text-text placeholder-muted outline-none font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        {/* Results List */}
        <div className="max-h-[350px] overflow-y-auto bg-background p-2">
            {results.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted gap-2">
                    <Wifi size={24} className="opacity-50" />
                    <span className="text-xs">No web results found</span>
                </div>
            ) : (
                <div className="flex flex-col gap-1">
                    {results.map((item) => {
                        const isAlreadyAdded = !!prices[item.symbol];
                        return (
                            <button
                                key={item.symbol}
                                onClick={() => !isAlreadyAdded && handleAdd(item.symbol)}
                                disabled={isAlreadyAdded}
                                className={clsx(
                                    "flex items-center justify-between px-3 py-3 rounded-lg text-left transition-all border border-transparent",
                                    isAlreadyAdded 
                                        ? "opacity-50 cursor-default bg-surface" 
                                        : "hover:bg-surface-highlight hover:border-border cursor-pointer"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-[10px] font-bold">
                                        {item.symbol[0]}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-text">{item.symbol}</div>
                                        <div className="text-[10px] text-muted">{item.name} • {item.network}</div>
                                    </div>
                                </div>
                                
                                {isAlreadyAdded ? (
                                    <span className="text-[10px] text-emerald-500 font-medium px-2 py-1 bg-emerald-500/10 rounded">Added</span>
                                ) : (
                                    <div className="flex items-center gap-1 text-xs text-muted group-hover:text-primary">
                                        <Plus size={14} />
                                        <span>Add</span>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="bg-surface border-t border-border p-2 px-4 text-[10px] text-muted flex justify-between">
             <span>Data provided by Mock Binance API</span>
             <span>Press ESC to close</span>
        </div>

      </div>
    </div>
  );
};