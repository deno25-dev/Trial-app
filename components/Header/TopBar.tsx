import React from 'react';
import { useChart } from '../../context/ChartContext';
import { FAVORITE_TIMEFRAMES } from '../../constants';
import { Timeframe } from '../../types';
import { Settings, Search, LayoutGrid, Clock, Menu, Sun, Moon } from 'lucide-react';
import clsx from 'clsx';

export const TopBar: React.FC = () => {
  const { state, setInterval, setSymbol, toggleTheme } = useChart();

  return (
    <div className="h-12 bg-surface border-b border-border flex items-center px-4 justify-between select-none">
      
      {/* Left: Ticker & Search */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors group">
          <div className="w-8 h-8 bg-primary/20 rounded flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white">
            <Search size={16} />
          </div>
          <span className="font-bold text-lg tracking-wider text-text">{state.symbol}</span>
        </div>

        <div className="w-px h-6 bg-border mx-2" />

        {/* Timeframes */}
        <div className="flex items-center gap-1">
          {FAVORITE_TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setInterval(tf)}
              className={clsx(
                "px-2 py-1 rounded text-sm font-medium transition-colors",
                state.interval === tf 
                  ? "bg-primary/20 text-primary" 
                  : "text-muted hover:text-text hover:bg-text/5"
              )}
            >
              {tf}
            </button>
          ))}
          <button className="p-1 hover:bg-text/5 rounded text-muted">
            <Menu size={14} />
          </button>
        </div>
      </div>

      {/* Center: Tools (Simplified) */}
      <div className="hidden md:flex items-center gap-2 text-sm text-muted">
        <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Stream A: Active
        </span>
      </div>

      {/* Right: Settings & Layout */}
      <div className="flex items-center gap-2">
        <button 
            onClick={toggleTheme}
            className="p-2 hover:bg-text/5 rounded text-muted hover:text-text transition-colors"
            title="Toggle Theme"
        >
            {state.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button className="p-2 hover:bg-text/5 rounded text-muted hover:text-text transition-colors">
            <LayoutGrid size={18} />
        </button>
        <button className="p-2 hover:bg-text/5 rounded text-muted hover:text-text transition-colors">
            <Settings size={18} />
        </button>
        <button className="bg-primary hover:bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-bold ml-2">
            Connect Broker
        </button>
      </div>
    </div>
  );
};