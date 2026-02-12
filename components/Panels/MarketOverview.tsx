import React from 'react';
import { ArrowUpRight, ArrowDownRight, Plus, ChevronUp, ChevronDown, WifiOff, Wifi, Activity, Trash2 } from 'lucide-react';
import { useMarket } from '../../context/MarketContext';
import { MarketOfflineFallback } from '../Fallbacks/MarketOfflineFallback';
import { MiniTicker } from '../../types';

const MarketItem: React.FC<{ ticker: MiniTicker; onRemove: (s: string) => void }> = ({ ticker, onRemove }) => {
  const price = parseFloat(ticker.c);
  const open = parseFloat(ticker.o);
  const change = ((price - open) / open) * 100;
  const isUp = change >= 0;

  return (
    <div className="relative flex items-center justify-between py-2 border-b border-white/5 hover:bg-surface-highlight px-2 cursor-pointer transition-colors group pr-8">
      <div className="flex flex-col">
          <span className="font-bold text-sm text-text group-hover:text-primary transition-colors">{ticker.s}</span>
          <span className="text-[10px] text-muted font-mono">Vol: {parseFloat(ticker.v).toFixed(0)}</span>
      </div>
      <div className="flex flex-col items-end">
          <span className="text-sm font-mono text-text tracking-wide">{price.toFixed(2)}</span>
          <span className={`text-[11px] flex items-center font-medium ${isUp ? 'text-success' : 'text-danger'}`}>
              {isUp ? <ArrowUpRight size={10} className="mr-0.5" /> : <ArrowDownRight size={10} className="mr-0.5" />}
              {Math.abs(change).toFixed(2)}%
          </span>
      </div>
      
      {/* Delete Button (Appears on Hover) */}
      <button
        onClick={(e) => {
            e.stopPropagation();
            onRemove(ticker.s);
        }}
        className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 text-muted hover:text-danger hover:bg-surface rounded-md transition-all scale-90 hover:scale-100"
        title={`Remove ${ticker.s}`}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
};

interface MarketOverviewProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const MarketOverview: React.FC<MarketOverviewProps> = ({ isOpen, onToggle }) => {
  // Consuming Lane 4 Data
  const { prices, status, isOnline, toggleMarketSearch, removeSymbol } = useMarket();

  // Explicitly cast to MiniTicker[] to handle Object.values inference issues
  const tickerList = Object.values(prices) as MiniTicker[];

  return (
    <div className="h-full flex flex-col">
      {/* Panel Header */}
      <div 
        className="h-10 border-b border-border flex items-center justify-between px-4 bg-surface select-none cursor-pointer hover:bg-surface-highlight transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2 pointer-events-none">
            <div className="text-muted">
                {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </div>
            <span className="font-bold text-sm tracking-wide text-muted uppercase">Market Overview (Stream B)</span>
            {status === 'connecting' && <span className="w-2 h-2 rounded-full bg-primary animate-pulse ml-2" title="Connecting..." />}
        </div>
        <button 
            className="text-muted hover:text-emerald-400 hover:bg-emerald-400/10 p-1 rounded transition-colors pointer-events-auto"
            onClick={(e) => {
                e.stopPropagation();
                toggleMarketSearch();
            }}
            title="Search Web Assets (Lane 4)"
        >
            <Plus size={16} />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-0 bg-background/50">
        
        {/* State: Offline / Disconnected */}
        {!isOnline || status === 'disconnected' ? (
            <MarketOfflineFallback />
        ) : tickerList.length === 0 ? (
             /* State: Connected but Waiting for Data */
             <div className="h-full flex flex-col items-center justify-center text-muted gap-2">
                <Activity className="animate-pulse" size={24} />
                <span className="text-xs">Waiting for Tick...</span>
             </div>
        ) : (
            /* State: Active Data */
            <div className="p-2">
                {tickerList.map((ticker) => (
                    <MarketItem key={ticker.s} ticker={ticker} onRemove={removeSymbol} />
                ))}
            </div>
        )}

      </div>
      
      {/* Status Bar */}
      <div className="h-6 bg-surface border-t border-border flex items-center px-4 justify-between text-[10px] text-muted font-mono shrink-0">
        <div className="flex items-center gap-2">
            {!isOnline ? (
                <div className="flex items-center gap-1 text-danger">
                     <WifiOff size={10} />
                     <span>OFFLINE</span>
                </div>
            ) : (
                <div className="flex items-center gap-1 text-success">
                     <Wifi size={10} />
                     <span>WS: CONNECTED</span>
                </div>
            )}
            <span className="w-px h-3 bg-border" />
            <span>{tickerList.length} Symbols</span>
        </div>
        <span className="text-muted opacity-50">LANE 4 ACTIVE</span>
      </div>
    </div>
  );
};