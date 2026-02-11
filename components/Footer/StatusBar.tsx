import React from 'react';
import { useMarket } from '../../context/MarketContext';
import { useChart } from '../../context/ChartContext';
import { Wifi, WifiOff } from 'lucide-react';
import { APP_NAME, VERSION } from '../../constants';

export const StatusBar: React.FC = () => {
  const { isOnline, prices } = useMarket();
  const { state } = useChart();

  // Get current ticker data for OHLC display in footer
  const ticker = prices[state.symbol];
  
  // Format Date: YYYY-MM-DD HH:mm:ss
  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = currentTime.toISOString().replace('T', ' ').substring(0, 19);

  return (
    <div className="h-7 bg-[#09090b] border-t border-border flex items-center justify-between px-3 text-[10px] font-mono text-muted select-none z-50">
      
      {/* Left: Connection & OHLC */}
      <div className="flex items-center gap-4">
        {/* Connection Status */}
        <div className={`flex items-center gap-1.5 ${isOnline ? 'text-emerald-500' : 'text-rose-500'}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-rose-500'}`} />
          <span className="font-semibold tracking-wide">{isOnline ? 'Connected' : 'Offline'}</span>
        </div>

        {/* OHLC Display (from Stream) */}
        {ticker && (
             <div className="hidden md:flex items-center gap-3 text-zinc-400">
                <div className="flex gap-1"><span className="text-zinc-600">O:</span> <span className="text-zinc-300">{ticker.o}</span></div>
                <div className="flex gap-1"><span className="text-zinc-600">H:</span> <span className="text-zinc-300">{ticker.h}</span></div>
                <div className="flex gap-1"><span className="text-zinc-600">L:</span> <span className="text-zinc-300">{ticker.l}</span></div>
                <div className="flex gap-1"><span className="text-zinc-600">C:</span> <span className="text-zinc-300">{ticker.c}</span></div>
             </div>
        )}
      </div>

      {/* Right: System Info */}
      <div className="flex items-center gap-4">
         <span className="hidden sm:inline text-zinc-600">{APP_NAME} v{VERSION} • Offline-First</span>
         <span className="w-px h-3 bg-zinc-800" />
         <span className="text-zinc-400">{timeStr}</span>
         <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300 font-semibold">AFRICA/NAIROBI</span>
      </div>

    </div>
  );
};