import React, { useState, useRef, useEffect } from 'react';
import { 
  Briefcase, 
  Database, 
  LayoutTemplate, 
  Layers, 
  ArrowRightLeft, 
  RefreshCw, 
  Settings,
  Sun,
  Moon,
  Monitor,
  Palette,
  ChevronRight,
  Check,
  Grid3X3
} from 'lucide-react';
import clsx from 'clsx';
import { useChart } from '../../context/ChartContext';
import { SKIN_CONFIG } from '../../constants';
import { AppSkin } from '../../types';

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
      "w-10 h-10 flex items-center justify-center rounded-xl transition-all relative group mb-1",
      active 
        ? "text-primary bg-primary/10 shadow-[0_0_12px_rgba(34,211,238,0.2)] border border-primary/20" 
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
  const { state, toggleTheme, setSkin, toggleGrid, toggleDataExplorer, isDataExplorerOpen } = useChart();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

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
    <div className="flex flex-col w-full items-center h-full pt-2">
        {/* 1. Tools */}
        <SidebarButton icon={<Briefcase size={20} strokeWidth={1.5} />} label="Tools" />
        
        {/* 2. Data Explorer (Wired to Context) */}
        <SidebarButton 
            icon={<Database size={20} strokeWidth={1.5} />} 
            label="Data Explorer" 
            onClick={toggleDataExplorer}
            active={isDataExplorerOpen}
        />
        
        {/* 3. Chart Layout */}
        <SidebarButton icon={<LayoutTemplate size={20} strokeWidth={1.5} />} label="Chart layout" />
        
        {/* 4. Object Tree */}
        <SidebarButton icon={<Layers size={20} strokeWidth={1.5} />} label="Object tree" />
        
        {/* 5. Trade */}
        <SidebarButton icon={<ArrowRightLeft size={20} strokeWidth={1.5} />} label="Trade" />

        {/* 6. Grid Toggle */}
        <SidebarButton 
            icon={<Grid3X3 size={20} strokeWidth={1.5} />} 
            label="Toggle Grid" 
            onClick={toggleGrid}
            active={state.showGrid}
        />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom Actions */}
      <div className="flex flex-col mb-4 w-full items-center">
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
                <div className="absolute right-full bottom-0 mr-4 w-64 glass border border-border/50 shadow-2xl rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-bottom-right z-50">
                  <div className="p-2 flex flex-col gap-1">
                    
                    {/* Theme Toggle */}
                    <button 
                      onClick={() => toggleTheme()}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-text hover:bg-white/5 border border-transparent hover:border-white/10 rounded-lg transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        {state.theme === 'dark' ? <Moon size={16} className="text-primary" /> : <Sun size={16} className="text-orange-500" />}
                        <span>Theme Mode</span>
                      </div>
                      <span className="text-xs text-muted group-hover:text-text transition-colors font-medium bg-white/5 px-2 py-0.5 rounded">
                        {state.theme === 'dark' ? 'Dark' : 'Light'}
                      </span>
                    </button>

                    <div className="h-px bg-white/5 my-1" />

                    {/* Skins Submenu */}
                    <div className="relative group/skin">
                        <button className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-text hover:bg-white/5 border border-transparent hover:border-white/10 rounded-lg transition-colors">
                            <div className="flex items-center gap-3">
                                <Palette size={16} className="text-muted" />
                                <span>Interface Skin</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-xs text-primary font-medium">{SKIN_CONFIG[state.skin].name}</span>
                                <ChevronRight size={14} className="text-muted" />
                            </div>
                        </button>
                        
                        {/* Flyout Menu */}
                        <div className="absolute right-full bottom-0 mr-2 w-48 glass border border-border/50 shadow-2xl rounded-xl overflow-hidden hidden group-hover/skin:block">
                            <div className="p-1 flex flex-col gap-0.5">
                                {(Object.keys(SKIN_CONFIG) as AppSkin[]).map((skinKey) => (
                                    <button
                                        key={skinKey}
                                        onClick={() => setSkin(skinKey)}
                                        className={clsx(
                                            "w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors border-l-2",
                                            state.skin === skinKey 
                                                ? "bg-primary/10 text-primary border-primary font-medium" 
                                                : "text-muted hover:text-text hover:bg-white/5 border-transparent"
                                        )}
                                    >
                                        <span>{SKIN_CONFIG[skinKey].name}</span>
                                        {state.skin === skinKey && <Check size={12} />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-white/5 my-1" />

                    {/* System Monitor */}
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-muted hover:text-text hover:bg-white/5 border border-transparent hover:border-white/10 rounded-lg transition-colors">
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