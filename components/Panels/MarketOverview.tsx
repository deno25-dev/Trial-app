import React, { useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, MoreHorizontal, ChevronUp, ChevronDown, WifiOff, Wifi } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { TauriService } from '../../services/tauriService';
import { Telemetry } from '../../utils/telemetry';

// Define the shape of market items based on the mock backend
interface MarketData {
    symbol: string;
    price: string;
    change: number;
}

const MarketItem: React.FC<MarketData> = ({ symbol, price, change }) => (
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
  // Stream B: Polled Data via React Query
  const { data, isError, isLoading, isFetching } = useQuery({
    queryKey: ['marketOverview'],
    queryFn: TauriService.getMarketOverview,
    refetchInterval: 5000, // Poll every 5s
  });

  // Log connection state changes
  useEffect(() => {
    if (isError) {
        Telemetry.error('Network', 'Stream B: Connection Lost');
    } else if (data) {
        // Only log once periodically in real app, but here implies success
    }
  }, [isError, data]);

  return (
    <div className="h-full flex flex-col">
      {/* Panel Header */}
      <div 
        className="h-10 border-b border-border flex items-center justify-between px-4 bg-surface select-none cursor-pointer hover:bg-text/5 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2 pointer-events-none">
            <div className="text-muted">
                {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </div>
            <span className="font-bold text-sm tracking-wide text-muted uppercase">Market Overview (Stream B)</span>
            {isFetching && <span className="w-2 h-2 rounded-full bg-primary animate-pulse ml-2" title="Updating..." />}
        </div>
        <button 
            className="text-muted hover:text-text p-1 rounded hover:bg-text/5 pointer-events-auto"
            onClick={(e) => {
                e.stopPropagation();
            }}
        >
            <MoreHorizontal size={16} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {isLoading && <div className="p-4 text-xs text-muted text-center">Initializing Feed...</div>}
        
        {isError && (
             <div className="p-4 flex flex-col items-center text-danger text-xs">
                <WifiOff size={24} className="mb-2" />
                <span>Stream Disconnected</span>
             </div>
        )}

        {data && data.map((item: MarketData) => (
            <MarketItem key={item.symbol} {...item} />
        ))}
      </div>
      
      {/* Status Bar */}
      <div className="h-6 bg-background border-t border-border flex items-center px-4 justify-between text-[10px] text-muted font-mono shrink-0">
        <div className="flex items-center gap-2">
            {isError ? <WifiOff size={10} className="text-danger" /> : <Wifi size={10} className="text-success" />}
            <span>Connection: {isError ? 'Offline' : 'Stable (IPC)'}</span>
        </div>
        <span className="text-muted">v1.2.5</span>
      </div>
    </div>
  );
};