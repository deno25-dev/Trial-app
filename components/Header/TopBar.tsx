import React, { useState, useRef, useEffect } from 'react';
import { useChart } from '../../context/ChartContext';
import { FAVORITE_TIMEFRAMES, ALL_TIMEFRAMES, SKIN_CONFIG } from '../../constants';
import { Timeframe, AppSkin } from '../../types';
import { 
  Search, 
  LayoutGrid, 
  Rewind,
  Undo2,
  Redo2,
  ChevronDown,
  Clock,
  CandlestickChart,
  LineChart,
  Palette,
  Check,
  StepBack
} from 'lucide-react';
import clsx from 'clsx';

export const TopBar: React.FC = () => {
  const { state, setInterval, toggleChartType, setSkin, toggleSearch, isSearchOpen } = useChart();
  
  // Timeframe Dropdown State
  const [isTimeframeOpen, setIsTimeframeOpen] = useState(false);
  const timeframeRef = useRef<HTMLDivElement>(null);

  // Skins Dropdown State
  const [isSkinMenuOpen, setIsSkinMenuOpen] = useState(false);
  const skinMenuRef = useRef<HTMLDivElement>(null);

  // Handle click outside for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (timeframeRef.current && !timeframeRef.current.contains(event.target as Node)) {
        setIsTimeframeOpen(false);
      }
      if (skinMenuRef.current && !skinMenuRef.current.contains(event.target as Node)) {
        setIsSkinMenuOpen(false);
      }
    };

    if (isTimeframeOpen || isSkinMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTimeframeOpen, isSkinMenuOpen]);

  const Separator = () => <div className="h-5 w-px bg-white/10 mx-1" />;

  // Interactive Button Style (Matches Sidebar/DrawingTools)
  const getBtnClass = (active: boolean) => clsx(
    "w-9 h-9 flex items-center justify-center rounded-lg transition-all relative group border",
    active 
        ? "text-primary bg-primary/10 shadow-[0_0_12px_rgba(34,211,238,0.2)] border-primary/20" 
        : "text-muted hover:text-text hover:bg-white/5 border-transparent"
  );

  const getTimeframeBtnClass = (active: boolean) => clsx(
    "px-3 h-7 text-xs font-bold rounded-md transition-all border flex items-center justify-center",
    active 
        ? "text-primary bg-primary/10 shadow-[0_0_12px_rgba(34,211,238,0.2)] border-primary/20" 
        : "text-muted hover:text-text hover:bg-white/5 border-transparent"
  );

  return (
    <div className="h-12 border-b border-border bg-background flex items-center px-3 select-none relative z-40 gap-1 text-muted shadow-sm transition-colors duration-300">
      
      {/* 1. Search */}
      <button 
        onClick={toggleSearch}
        className={getBtnClass(isSearchOpen)}
        title="Search Symbol (Cmd+K)"
      >
        <Search size={18} strokeWidth={2} />
      </button>

      <Separator />

      {/* 2. Chart Types */}
      <button 
        onClick={() => state.chartType !== 'candle' && toggleChartType()}
        className={getBtnClass(state.chartType === 'candle')}
        title="Candles"
      >
        <CandlestickChart size={18} strokeWidth={2} />
      </button>
      <button 
        onClick={() => state.chartType !== 'line' && toggleChartType()}
        className={getBtnClass(state.chartType === 'line')}
        title="Line"
      >
        <LineChart size={18} strokeWidth={2} />
      </button>

      <Separator />

      {/* 3. History & Replay (Visual Only) */}
      <button className={getBtnClass(false)}>
        <Undo2 size={18} strokeWidth={2} />
      </button>
      <button className={getBtnClass(false)}>
        <Redo2 size={18} strokeWidth={2} />
      </button>
      
      <button className={clsx(getBtnClass(false), "ml-1")}>
         <Rewind size={18} strokeWidth={2} />
      </button>
       <button className={getBtnClass(false)}>
         <StepBack size={18} strokeWidth={2} />
      </button>

      <Separator />

      {/* 4. Timeframes */}
      <div className="flex items-center gap-0.5 relative" ref={timeframeRef}>
         {/* Dropdown Trigger */}
         <button 
            onClick={() => setIsTimeframeOpen(!isTimeframeOpen)}
            className={clsx(
                "flex items-center gap-1 px-2 h-9 rounded-lg transition-all border",
                isTimeframeOpen
                ? "text-primary bg-primary/10 shadow-[0_0_12px_rgba(34,211,238,0.2)] border-primary/20"
                : "text-muted hover:text-text hover:bg-white/5 border-transparent"
            )}
         >
            <Clock size={18} />
            <ChevronDown size={12} />
         </button>

         {/* Favorites List - Grouped in Soft Edge Container */}
         <div className="hidden lg:flex items-center gap-1 ml-2 p-1 bg-surface/50 border border-white/5 rounded-xl backdrop-blur-sm shadow-sm transition-colors duration-300">
            {FAVORITE_TIMEFRAMES.map((tf) => (
                <button
                    key={tf}
                    onClick={() => setInterval(tf)}
                    className={getTimeframeBtnClass(state.interval === tf)}
                >
                    {tf}
                </button>
            ))}
         </div>

         {/* Dropdown Menu */}
         {isTimeframeOpen && (
             <div className="absolute top-full left-0 mt-1 w-32 bg-surface/60 backdrop-blur-md border border-border/50 shadow-xl rounded-md overflow-hidden z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
                {ALL_TIMEFRAMES.map(tf => (
                    <button
                        key={tf}
                        onClick={() => { setInterval(tf); setIsTimeframeOpen(false); }}
                        className={clsx(
                            "w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 transition-colors flex items-center justify-between",
                            state.interval === tf ? "text-primary font-bold" : "text-text"
                        )}
                    >
                        {tf}
                        {state.interval === tf && <Check size={12} />}
                    </button>
                ))}
             </div>
         )}
      </div>

      <div className="flex-1" />

      {/* 5. Right Side Tools */}
      <div className="flex items-center gap-1">
        {/* Skins Selector */}
        <div className="relative" ref={skinMenuRef}>
            <button
                onClick={() => setIsSkinMenuOpen(!isSkinMenuOpen)}
                className={getBtnClass(isSkinMenuOpen)}
                title="Themes / Skins"
            >
                <Palette size={18} strokeWidth={2} />
            </button>
            
            {isSkinMenuOpen && (
                <div className="absolute top-full right-0 mt-1 w-48 bg-surface/60 backdrop-blur-md border border-border/50 shadow-xl rounded-md overflow-hidden z-50 py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-muted uppercase tracking-widest border-b border-white/5 mb-1">
                        Skins
                    </div>
                    {Object.keys(SKIN_CONFIG).map((skinKey) => (
                        <button
                            key={skinKey}
                            onClick={() => {
                                setSkin(skinKey as AppSkin);
                                setIsSkinMenuOpen(false);
                            }}
                            className={clsx(
                                "w-full flex items-center justify-between px-3 py-2 text-xs transition-colors",
                                state.skin === skinKey 
                                    ? "bg-primary/10 text-primary font-medium" 
                                    : "text-text hover:bg-white/10"
                            )}
                        >
                            <span>{SKIN_CONFIG[skinKey].name}</span>
                            {state.skin === skinKey && <Check size={12} />}
                        </button>
                    ))}
                </div>
            )}
        </div>

        <button className={getBtnClass(false)}>
            <LayoutGrid size={18} strokeWidth={2} />
        </button>
      </div>

    </div>
  );
};