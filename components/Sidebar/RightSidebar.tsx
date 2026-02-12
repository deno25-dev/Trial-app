import React, { useState, useRef, useEffect } from 'react';
import { 
  Briefcase, 
  Database, 
  LayoutTemplate, 
  Layers, 
  ArrowRightLeft, 
  RefreshCw, 
  Settings,
  Grid3X3,
  Crosshair,
  CandlestickChart,
  PaintBucket,
  Sparkles,
  Check,
  FolderPlus,
  Trash2,
  X,
  Maximize,
  Columns,
  Grid2x2,
  Save,
  FolderOpen,
  FileDown,
  FileUp,
  Download,
  Upload,
  Plus,
  LineChart,
  StickyNote,
  ChevronRight
} from 'lucide-react';
import clsx from 'clsx';
import { useChart } from '../../context/ChartContext';

interface SidebarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
}

const SidebarButton: React.FC<SidebarButtonProps> = ({ icon, label, onClick, active }) => (
  <button
    onClick={onClick}
    className={clsx(
      "w-10 h-10 flex items-center justify-center rounded-xl transition-all relative group",
      active 
        ? "text-primary bg-primary/15 shadow-[0_0_20px_rgba(34,211,238,0.45)] border border-white/20" 
        : "text-muted hover:text-text hover:bg-white/5 border border-transparent"
    )}
  >
    {icon}
    {/* Tooltip - Left side */}
    <span className="absolute right-14 bg-[#1e293b]/90 backdrop-blur border border-border px-3 py-1.5 rounded-lg text-xs font-medium text-text opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-xl -translate-x-1 group-hover:translate-x-0 duration-200">
        {label}
        {/* Triangle Pointer */}
        <div className="absolute top-1/2 -right-1 -mt-1 w-2 h-2 bg-[#1e293b]/90 border-r border-t border-border transform rotate-45" />
    </span>
  </button>
);

export const RightSidebar: React.FC = () => {
  const { 
    state, 
    toggleGrid, 
    toggleDataExplorer, 
    isDataExplorerOpen, 
    setTool, 
    toggleChartType,
    toggleTradePanel,
    isTradePanelOpen
  } = useChart();
  
  // Settings Dropdown State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Object Tree Dropdown State
  const [isObjectTreeOpen, setIsObjectTreeOpen] = useState(false);
  const objectTreeRef = useRef<HTMLDivElement>(null);

  // Layout Dropdown State
  const [isLayoutOpen, setIsLayoutOpen] = useState(false);
  const layoutRef = useRef<HTMLDivElement>(null);

  // Tools Dropdown State
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close Settings
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
      // Close Object Tree
      if (objectTreeRef.current && !objectTreeRef.current.contains(event.target as Node)) {
        setIsObjectTreeOpen(false);
      }
      // Close Layout
      if (layoutRef.current && !layoutRef.current.contains(event.target as Node)) {
        setIsLayoutOpen(false);
      }
      // Close Tools
      if (toolsRef.current && !toolsRef.current.contains(event.target as Node)) {
        setIsToolsOpen(false);
      }
    };

    if (isSettingsOpen || isObjectTreeOpen || isLayoutOpen || isToolsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsOpen, isObjectTreeOpen, isLayoutOpen, isToolsOpen]);

  return (
    <div className="flex flex-col w-full items-center h-full py-2 gap-1.5">
        {/* 1. Tools */}
        <div className="relative" ref={toolsRef}>
            <SidebarButton 
                icon={<Briefcase size={20} strokeWidth={1.5} />} 
                label="Tools" 
                onClick={() => setIsToolsOpen(!isToolsOpen)}
                active={isToolsOpen}
            />

            {isToolsOpen && (
                <div className="absolute right-full top-0 mr-4 w-60 bg-surface/60 backdrop-blur-md border border-border/50 shadow-2xl rounded-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right z-50 py-1">
                    
                    {/* Indicators */}
                    <button className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-text hover:bg-white/10 transition-colors group">
                        <div className="flex items-center gap-3">
                            <LineChart size={16} className="text-blue-400" />
                            <span>Indicators</span>
                        </div>
                        <ChevronRight size={14} className="text-muted group-hover:text-text" />
                    </button>

                    <div className="h-px bg-white/10 mx-3 my-1" />

                    {/* Section: UTILITIES */}
                    <div className="px-4 py-2 text-[10px] font-bold text-muted uppercase tracking-widest">
                        Utilities
                    </div>

                    {/* Add Sticky Note */}
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-text hover:bg-white/10 transition-colors text-left group">
                        <StickyNote size={16} className="text-yellow-500" />
                        <span>Add Sticky Note</span>
                    </button>

                    {/* Open Sticky Note Manager */}
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-text hover:bg-white/10 transition-colors text-left group">
                        <FolderOpen size={16} className="text-muted group-hover:text-text" />
                        <span>Open Sticky Note Manager</span>
                    </button>

                </div>
            )}
        </div>
        
        {/* 2. Data Explorer (Wired to Context) */}
        <SidebarButton 
            icon={<Database size={20} strokeWidth={1.5} />} 
            label="Data Explorer" 
            onClick={toggleDataExplorer}
            active={isDataExplorerOpen}
        />
        
        {/* 3. Chart Layout */}
        <div className="relative" ref={layoutRef}>
            <SidebarButton 
                icon={<LayoutTemplate size={20} strokeWidth={1.5} />} 
                label="Chart layout" 
                onClick={() => setIsLayoutOpen(!isLayoutOpen)}
                active={isLayoutOpen}
            />

            {isLayoutOpen && (
                <div className="absolute right-full top-0 mr-4 w-60 bg-surface/60 backdrop-blur-md border border-border/50 shadow-2xl rounded-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right z-50 flex flex-col py-1">
                    
                    {/* Header */}
                    <div className="px-3 py-2 border-b border-white/5 bg-white/5 flex items-center justify-between">
                         <div className="flex items-center gap-2 text-text font-bold text-xs">
                            <LayoutTemplate size={14} />
                            <span>Layout</span>
                        </div>
                        <button 
                            onClick={() => setIsLayoutOpen(false)} 
                            className="text-muted hover:text-text"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    {/* Section: GRID LAYOUTS */}
                    <div className="px-4 py-2 text-[10px] font-bold text-muted uppercase tracking-widest mt-1">
                        Grid Layouts
                    </div>
                    
                    <button className="w-full flex items-center gap-3 px-4 py-2 text-xs text-text hover:bg-white/10 transition-colors text-left group">
                        <Maximize size={16} className="text-muted group-hover:text-text transition-colors" />
                        <span>Full Chart</span>
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-2 text-xs text-text hover:bg-white/10 transition-colors text-left group">
                        <Columns size={16} className="text-muted group-hover:text-text transition-colors" />
                        <span>Split Chart 2x</span>
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-2 text-xs text-text hover:bg-white/10 transition-colors text-left group">
                        <Grid2x2 size={16} className="text-muted group-hover:text-text transition-colors" />
                        <span>Split Chart 4x</span>
                    </button>
                    
                    <div className="h-px bg-white/10 mx-3 my-1" />

                    {/* Section: STORAGE */}
                    <div className="px-4 py-2 text-[10px] font-bold text-muted uppercase tracking-widest">
                        Storage
                    </div>
                    
                    <button className="w-full flex items-center gap-3 px-4 py-2 text-xs text-text hover:bg-white/10 transition-colors text-left group">
                        <Save size={16} className="text-emerald-500" />
                        <span>Save Layout to DB</span>
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-2 text-xs text-text hover:bg-white/10 transition-colors text-left group">
                        <FolderOpen size={16} className="text-blue-500" />
                        <span>Open Layout Manager</span>
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-2 text-xs text-text hover:bg-white/10 transition-colors text-left group">
                        <FileDown size={16} className="text-blue-400" />
                        <span>Export Layout (.json)</span>
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-2 text-xs text-text hover:bg-white/10 transition-colors text-left group">
                        <FileUp size={16} className="text-amber-500" />
                        <span>Import Layout (.json)</span>
                    </button>

                    <div className="h-px bg-white/10 mx-3 my-1" />

                    {/* Data Actions */}
                    <button className="w-full flex items-center gap-3 px-4 py-2 text-xs text-text hover:bg-white/10 transition-colors text-left group">
                        <Download size={16} className="text-muted group-hover:text-text" />
                        <span>Save Chart Data as CSV</span>
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-2 text-xs text-text hover:bg-white/10 transition-colors text-left group">
                        <Upload size={16} className="text-muted group-hover:text-text" />
                        <span>Load CSV into Tab</span>
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-2 text-xs text-text hover:bg-white/10 transition-colors text-left group">
                        <Plus size={16} className="text-muted group-hover:text-text" />
                        <span>New Chart Tab</span>
                    </button>

                </div>
            )}
        </div>
        
        {/* 4. Object Tree */}
        <div className="relative" ref={objectTreeRef}>
            <SidebarButton 
                icon={<Layers size={20} strokeWidth={1.5} />} 
                label="Object tree" 
                onClick={() => setIsObjectTreeOpen(!isObjectTreeOpen)}
                active={isObjectTreeOpen}
            />

            {isObjectTreeOpen && (
                <div className="absolute right-full top-0 mr-4 w-64 bg-surface/60 backdrop-blur-md border border-border/50 shadow-2xl rounded-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right z-50 flex flex-col">
                    {/* Popup Header */}
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/5 bg-white/5">
                        <div className="flex items-center gap-2 text-text font-bold text-xs">
                            <Layers size={14} />
                            <span>Object Tree</span>
                        </div>
                        <div className="flex items-center gap-1">
                             <button className="p-1 hover:bg-white/10 rounded text-muted hover:text-text transition-colors" title="Create Folder">
                                 <FolderPlus size={14} />
                             </button>
                             <button className="p-1 hover:bg-white/10 rounded text-muted hover:text-text transition-colors" title="Delete Selected">
                                 <Trash2 size={14} />
                             </button>
                             <button 
                                onClick={() => setIsObjectTreeOpen(false)}
                                className="p-1 hover:bg-white/10 rounded text-muted hover:text-text transition-colors"
                             >
                                 <X size={14} />
                             </button>
                        </div>
                    </div>
                    
                    {/* Popup Body */}
                    <div className="h-32 flex flex-col items-center justify-center text-muted">
                        <span className="text-xs opacity-60">No drawings on chart.</span>
                    </div>
                </div>
            )}
        </div>
        
        {/* 5. Trade Panel Toggle */}
        <SidebarButton 
            icon={<ArrowRightLeft size={20} strokeWidth={1.5} />} 
            label="Trade Panel" 
            onClick={toggleTradePanel}
            active={isTradePanelOpen}
        />

        {/* 6. Grid Toggle */}
        <SidebarButton 
            icon={<Grid3X3 size={20} strokeWidth={1.5} />} 
            label="Toggle Grid" 
            onClick={toggleGrid}
            active={state.showGrid}
        />

      {/* Spacer pushes the bottom actions to the end, but they are internally spaced consistently */}
      <div className="mt-auto" />

      {/* Bottom Actions */}
      <div className="flex flex-col w-full items-center gap-1.5 pb-2">
        {/* 7. Reload */}
        <SidebarButton 
            icon={<RefreshCw size={20} strokeWidth={1.5} />} 
            label="Reload" 
            onClick={() => window.location.reload()} 
        />
        
        {/* 8. Settings with Dropdown */}
        <div className="relative" ref={settingsRef}>
            <SidebarButton 
                icon={<Settings size={20} strokeWidth={1.5} />} 
                label="Settings" 
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                active={isSettingsOpen}
            />

            {isSettingsOpen && (
                <div className="absolute right-full bottom-0 mr-4 w-48 bg-surface/60 backdrop-blur-md border border-border/50 shadow-2xl rounded-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-bottom-right z-50 py-1">
                  
                  {/* Crosshair */}
                  <button 
                      onClick={() => {
                          setTool('crosshair');
                          setIsSettingsOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-text hover:bg-white/10 transition-colors group"
                  >
                      <div className="flex items-center gap-3">
                          <Crosshair size={16} className="text-muted group-hover:text-text transition-colors" />
                          <span>Crosshair</span>
                      </div>
                      {state.activeTool === 'crosshair' && <Check size={14} className="text-emerald-500" />}
                  </button>

                  {/* Candles */}
                  <button 
                      onClick={() => {
                           if (state.chartType !== 'candle') toggleChartType();
                           setIsSettingsOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-text hover:bg-white/10 transition-colors group"
                  >
                      <div className="flex items-center gap-3">
                          <CandlestickChart size={16} className="text-muted group-hover:text-text transition-colors" />
                          <span>Candles</span>
                      </div>
                      {state.chartType === 'candle' && <Check size={14} className="text-emerald-500" />}
                  </button>

                  {/* Background */}
                  <button 
                      className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-text hover:bg-white/10 transition-colors group"
                  >
                      <div className="flex items-center gap-3">
                          <PaintBucket size={16} className="text-yellow-500 group-hover:text-yellow-400 transition-colors" />
                          <span>Background</span>
                      </div>
                  </button>

                  {/* Latest Add */}
                  <button 
                      className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-text hover:bg-white/10 transition-colors group"
                  >
                      <div className="flex items-center gap-3">
                          <Sparkles size={16} className="text-purple-400 group-hover:text-purple-300 transition-colors" />
                          <span>Latest Add</span>
                      </div>
                  </button>

                </div>
            )}
        </div>
      </div>
    </div>
  );
};