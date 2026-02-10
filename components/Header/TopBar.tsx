import React, { useState, useRef, useEffect } from 'react';
import { useChart } from '../../context/ChartContext';
import { FAVORITE_TIMEFRAMES } from '../../constants';
import { Settings, Search, LayoutGrid, Menu, Sun, Moon, Monitor } from 'lucide-react';
import clsx from 'clsx';

export const TopBar: React.FC = () => {
  const { state, setInterval, toggleTheme } = useChart();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close settings menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };

    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsOpen]);

  return (
    <div className="h-12 bg-surface border-b border-border flex items-center px-4 justify-between select-none relative z-40">
      
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

      {/* Right: Layout & Settings */}
      <div className="flex items-center gap-2">
        <button className="p-2 hover:bg-text/5 rounded text-muted hover:text-text transition-colors">
            <LayoutGrid size={18} />
        </button>
        
        {/* Settings Dropdown */}
        <div className="relative" ref={settingsRef}>
          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={clsx(
                "p-2 rounded transition-colors",
                isSettingsOpen ? "bg-primary/10 text-primary" : "text-muted hover:text-text hover:bg-text/5"
            )}
            title="Settings"
          >
              <Settings size={18} />
          </button>

          {isSettingsOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-surface border border-border shadow-xl rounded-md overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
              <div className="p-1.5 flex flex-col gap-1">
                {/* Theme Toggle */}
                <button 
                  onClick={() => {
                    toggleTheme();
                    setIsSettingsOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-text hover:bg-text/5 rounded transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    {state.theme === 'dark' ? <Moon size={16} className="text-primary" /> : <Sun size={16} className="text-orange-500" />}
                    <span>Theme</span>
                  </div>
                  <span className="text-xs text-muted group-hover:text-text transition-colors">
                    {state.theme === 'dark' ? 'Dark' : 'Light'}
                  </span>
                </button>

                <div className="h-px bg-border my-1" />

                {/* Placeholder Settings */}
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted hover:text-text hover:bg-text/5 rounded transition-colors">
                  <Monitor size={16} />
                  <span>System Monitor</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};