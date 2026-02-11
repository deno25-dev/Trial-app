import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export const MarketOfflineFallback: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center text-muted select-none">
      <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mb-3 text-danger animate-pulse">
        <WifiOff size={24} />
      </div>
      <h3 className="text-sm font-bold text-text mb-1">Stream Disconnected</h3>
      <p className="text-xs mb-4 max-w-[200px]">
        Real-time market data (Lane 4) is unavailable. Check your connection.
      </p>
      <button 
        onClick={() => window.location.reload()}
        className="flex items-center gap-2 px-3 py-1.5 bg-surface hover:bg-border rounded text-xs font-medium transition-colors border border-border"
      >
        <RefreshCw size={12} />
        <span>Reconnect</span>
      </button>
    </div>
  );
};