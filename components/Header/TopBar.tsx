import React, { useState, useRef, useEffect } from 'react';
import { useChart } from '../../context/ChartContext';
import { FAVORITE_TIMEFRAMES, ALL_TIMEFRAMES } from '../../constants';
import { Timeframe } from '../../types';
import { 
  Settings, 
  Search, 
  LayoutGrid, 
  Menu, 
  Sun, 
  Moon, 
  Monitor,
  Undo2,
  Redo2,
  Rewind,
  SkipBack,
  ChevronDown,
  Star,
  Clock
} from 'lucide-react';
import clsx from 'clsx';

export const TopBar: React.FC = () => {
  const { state, setInterval, toggleTheme } = useChart();
  
  // Settings Dropdown State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Timeframe Dropdown & Favorites State
  const [isTimeframeOpen, setIsTimeframeOpen] = useState(false);
  const [favoriteIntervals, setFavoriteIntervals] = useState<Timeframe[]>(FAVORITE_TIMEFRAMES);
  const timeframeRef = useRef<HTMLDivElement>(null);

  // Handle click outside for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
      if (timeframeRef.current && !timeframeRef.current.contains(event.target as Node)) {
        setIsTimeframeOpen(false);
      }
    };

    if (isSettingsOpen || isTimeframeOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsOpen, isTimeframeOpen]);

  const toggleFavorite = (tf: Timeframe) => {
    setFavoriteIntervals(prev => {
      if (prev.includes(tf)) {
        return prev.filter(t => t !== tf);
      } else {
        // Sort based on the order in ALL_TIMEFRAMES to keep them consistent
        const newFavs = [...prev, tf];
        return newFavs.sort((a, b) => ALL_TIMEFRAMES.indexOf(a) - ALL_TIMEFRAMES.indexOf(b));
      }
    });
  };

  return (
    <div className="h-12 bg-surface border-b border-border flex items-center px-2 justify-between select-none relative z-40">
      
      {/* --- Left Section: Tools --- */}
      <div className="flex items-center gap-1 md:gap-2">
        
        {/* 1. Search */}
        <div className="w-10 h-10 flex items-center justify-center rounded hover:bg-text/5 cursor-pointer text-muted hover:text-text transition-colors">
            <Search size={20} />
        </div>

        <div className="w-px h-5 bg-border mx-1" />

        {/* 2. Undo / Redo */}
        <div className="flex items-center gap-1">
            <button className="p-2 text-muted hover:text-text hover:bg-text/5 rounded transition-colors" title="Undo">
                <Undo2 size={18} strokeWidth={1.5} />
            </button>
            <button className="p-2 text-muted hover:text-text hover:bg-text/5 rounded transition-colors" title="Redo">
                <Redo2 size={18} strokeWidth={1.5} />
            </button>
        </div>

        {/* 3. Replay Controls */}
        <div className="flex items-center gap-1 ml-1">
            <button className="p-2 text-muted hover:text-text hover:bg-text/5 rounded transition-colors" title="Standard Replay">
                <Rewind size={20} strokeWidth={1.5} />
            </button>
            <button className="p-2 text-primary hover:text-primary/80 bg-primary/10 rounded transition-colors" title="Advanced Replay">
                <SkipBack size={20} strokeWidth={1.5} />
            </button>
        </div>

        <div className="w-px h-5 bg-border mx-2" />

        {/* 4. Timeframes Selector & Favorites */}
        <div className="flex items-center relative" ref={timeframeRef}>
             {/* Dropdown Trigger with Clock Icon */}
             <button 
                onClick={() => setIsTimeframeOpen(!isTimeframeOpen)}
                className={clsx(
                    "flex items-center gap-1 px-2 py-1.5 rounded transition-colors mr-2",
                    isTimeframeOpen ? "text-primary bg-primary/10" : "text-muted hover:text-text hover:bg-text/5"
                )}
                title="Select Interval"
             >
                <Clock size={18} strokeWidth={1.5} />
                <ChevronDown size={12} />
             </button>

             {/* Dynamic Favorites Bar */}
             <div className="hidden lg:flex items-center gap-0.5">
                {favoriteIntervals.map((tf) => (
                    <button
                        key={tf}
                        onClick={() => setInterval(tf)}
                        className={clsx(
                            "px-2.5 py-1 text-sm font-bold rounded transition-colors",
                            state.interval === tf 
                            ? "text-primary bg-primary/5" 
                            : "text-muted hover:text-text hover:bg-text/5"
                        )}
                    >
                        {tf}
                    </button>
                ))}
             </div>

             {/* Timeframe Dropdown Menu */}
             {isTimeframeOpen && (
                 <div className="absolute top-full left-0 mt-1 w-32 bg-surface border border-border shadow-xl rounded-md overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-left flex flex-col py-1 z-50">
                    <div className="px-3 py-1 text-[10px] font-bold text-muted/50 uppercase tracking-widest">Minutes</div>
                    {ALL_TIMEFRAMES.filter(t => t.endsWith('m')).map(tf => (
                        <TimeframeMenuItem 
                            key={tf} 
                            tf={tf} 
                            active={state.interval === tf} 
                            isFavorite={favoriteIntervals.includes(tf)}
                            onSelect={() => { setInterval(tf); setIsTimeframeOpen(false); }}
                            onToggleFav={() => toggleFavorite(tf)}
                        />
                    ))}
                    
                    <div className="h-px bg-border/50 my-1 mx-2" />
                    <div className="px-3 py-1 text-[10px] font-bold text-muted/50 uppercase tracking-widest">Hours</div>
                    {ALL_TIMEFRAMES.filter(t => t.endsWith('h')).map(tf => (
                        <TimeframeMenuItem 
                            key={tf} 
                            tf={tf} 
                            active={state.interval === tf} 
                            isFavorite={favoriteIntervals.includes(tf)}
                            onSelect={() => { setInterval(tf); setIsTimeframeOpen(false); }}
                            onToggleFav={() => toggleFavorite(tf)}
                        />
                    ))}

                    <div className="h-px bg-border/50 my-1 mx-2" />
                    <div className="px-3 py-1 text-[10px] font-bold text-muted/50 uppercase tracking-widest">Days</div>
                    {ALL_TIMEFRAMES.filter(t => !t.endsWith('m') && !t.endsWith('h')).map(tf => (
                        <TimeframeMenuItem 
                            key={tf} 
                            tf={tf} 
                            active={state.interval === tf} 
                            isFavorite={favoriteIntervals.includes(tf)}
                            onSelect={() => { setInterval(tf); setIsTimeframeOpen(false); }}
                            onToggleFav={() => toggleFavorite(tf)}
                        />
                    ))}
                 </div>
             )}
        </div>
      </div>

      {/* --- Right Section: Layout & Settings --- */}
      <div className="flex items-center gap-2">
        <button className="p-2 hover:bg-text/5 rounded text-muted hover:text-text transition-colors">
            <LayoutGrid size={18} strokeWidth={1.5} />
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
              <Settings size={18} strokeWidth={1.5} />
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

// Helper Component for Dropdown Items
const TimeframeMenuItem: React.FC<{ 
    tf: string; 
    active: boolean; 
    isFavorite: boolean; 
    onSelect: () => void;
    onToggleFav: () => void;
}> = ({ tf, active, isFavorite, onSelect, onToggleFav }) => (
    <div className={clsx(
        "flex items-center justify-between px-3 py-1.5 cursor-pointer text-sm group transition-colors",
        active ? "bg-primary/10 text-primary" : "hover:bg-text/5 text-text"
    )}>
        <span onClick={onSelect} className="flex-1 font-medium">{tf}</span>
        <button 
            onClick={(e) => {
                e.stopPropagation();
                onToggleFav();
            }}
            className={clsx(
                "p-0.5 rounded transition-colors hover:bg-text/10",
                isFavorite ? "text-yellow-500 fill-current" : "text-border hover:text-muted"
            )}
        >
            <Star size={12} fill={isFavorite ? "currentColor" : "none"} />
        </button>
    </div>
);