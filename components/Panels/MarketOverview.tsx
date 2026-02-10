import React from 'react';
import { ArrowUpRight, ArrowDownRight, MoreHorizontal, ChevronUp, ChevronDown } from 'lucide-react';

const MarketItem: React.FC<{ symbol: string; price: string; change: number }> = ({ symbol, price, change }) => (
  <div className="flex items-center justify-between py-2 border-b border-border/50 hover:bg-text/5 px-2 cursor-pointer transition-colors">
    <div className="flex flex-col">
        <span className="font-bold text-sm text-text">{symbol}</span>
        <span className="text-xs text-muted">Crypto</span>
    </div>
    <div className="flex flex-col items-end">
        <span className="text-sm font-mono text-text">{price}</span>
        <span className={`text-xs flex items-center ${change >= 0 ? 'text-success' : 'text-danger'}`}>
            {change >= 0 ? <ArrowUpRight size={12} className="mr-1" /> : <ArrowDownRight size={12} className="mr-1" />}
            {Math.abs(change)}%
        </span>
    </div>
  </div>
);

interface MarketOverviewProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const MarketOverview: React.FC<MarketOverviewProps> = ({ isOpen, onToggle }) => {
  return (
    <div className="h-full flex flex-col">
      {/* Panel Header */}
      <div 
        className="h-10 border-b border-border flex items-center justify-between px-4 bg-surface select-none cursor-pointer hover:bg-text/5 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
            <button className="text-muted hover:text-text focus:outline-none">
                {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
            <span className="font-bold text-sm tracking-wide text-muted uppercase">Market Overview (Stream B)</span>
        </div>
        <button 
            className="text-muted hover:text-text p-1 rounded hover:bg-text/5"
            onClick={(e) => {
                e.stopPropagation();
                // Menu logic here
            }}
        >
            <MoreHorizontal size={16} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        <MarketItem symbol="BTCUSDT" price="64,231.50" change={2.4} />
        <MarketItem symbol="ETHUSDT" price="3,450.20" change={-1.2} />
        <MarketItem symbol="SOLUSDT" price="145.80" change={5.7} />
        <MarketItem symbol="BNBUSDT" price="590.10" change={0.4} />
        <MarketItem symbol="ADAUSDT" price="0.45" change={-0.8} />
        <MarketItem symbol="XRPUSDT" price="0.62" change={1.1} />
        <MarketItem symbol="DOGEUSDT" price="0.12" change={-3.4} />
      </div>
      
      {/* Status Bar */}
      <div className="h-6 bg-background border-t border-border flex items-center px-4 justify-between text-[10px] text-muted font-mono shrink-0">
        <span className="text-muted">Connection: Stable (24ms)</span>
        <span className="text-muted">v1.2.5</span>
      </div>
    </div>
  );
};