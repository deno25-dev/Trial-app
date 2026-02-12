import React from 'react';
import { ArrowUpRight, ArrowDownRight, MoreHorizontal, ChevronUp, ChevronDown, WifiOff, Wifi, Activity } from 'lucide-react';
import { useMarket } from '../../context/MarketContext';
import { MarketOfflineFallback } from '../Fallbacks/MarketOfflineFallback';
import { MiniTicker } from '../../types';

const MarketItem: React.FC<{ ticker: MiniTicker }> = ({ ticker }) => {
  const price = parseFloat(ticker.c);
  const open = parseFloat(ticker.o);
  const change = ((price - open) / open) * 100;
  const isUp = change >= 0;

  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 hover:bg-surface-highlight px-2 cursor-pointer transition-colors group">
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
    </div>
  );
};

interface MarketOverviewProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const MarketOverview: React.FC<MarketOverviewProps> = ({ isOpen, onToggle }) => {
  // Consuming Lane 4 Data
  const { prices, status, isOnline } = useMarket();
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
            className="text-muted hover:text-text p-1 rounded hover:bg-surface-highlight pointer-events-auto"
            onClick={(e) => {
                e.stopPropagation();
            }}
        >
            <MoreHorizontal size={16} />
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
                    <MarketItem key={ticker.s} ticker={ticker} />
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