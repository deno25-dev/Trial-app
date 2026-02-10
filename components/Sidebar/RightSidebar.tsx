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
  Monitor 
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
      "w-10 h-10 flex items-center justify-center rounded transition-colors relative group",
      active ? "text-primary bg-primary/10" : "text-muted hover:text-text hover:bg-text/5"
    )}
  >
    {icon}
    {/* Tooltip - Left side */}
    <span className="absolute right-12 bg-surface border border-border px-2 py-1 rounded text-xs text-text opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-lg font-medium">
        {label}
    </span>
  </button>
);

export const RightSidebar: React.FC = () => {
  const { state, toggleTheme } = useChart();
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
    <>
      <div className="flex flex-col gap-1 w-full items-center">
        {/* 1. Tools */}
        <SidebarButton icon={<Briefcase size={20} />} label="Tools" />
        
        {/* 2. Data Explorer */}
        <SidebarButton icon={<Database size={20} />} label="Data explorer" />
        
        {/* 3. Chart Layout */}
        <SidebarButton icon={<LayoutTemplate size={20} />} label="Chart layout" />
        
        {/* 4. Object Tree */}
        <SidebarButton icon={<Layers size={20} />} label="Object tree" />
        
        {/* 5. Trade */}
        <SidebarButton icon={<ArrowRightLeft size={20} />} label="Trade" />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom Actions */}
      <div className="flex flex-col gap-1 mb-2 w-full items-center">
        {/* 6. Reload */}
        <SidebarButton 
            icon={<RefreshCw size={20} />} 
            label="Reload" 
            onClick={() => window.location.reload()} 
        />
        
        {/* 7. Settings with Dropdown */}
        <div className="relative" ref={settingsRef}>
            <SidebarButton 
                icon={<Settings size={20} />} 
                label="Settings" 
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                active={isSettingsOpen}
            />

            {isSettingsOpen && (
                <div className="absolute right-full bottom-0 mr-2 w-56 bg-surface border border-border shadow-xl rounded-md overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-bottom-right z-50">
                  <div className="p-1.5 flex flex-col gap-1">
                    {/* Theme Toggle */}
                    <button 
                      onClick={() => {
                        toggleTheme();
                        // Optional: keep open for multiple changes or close immediately
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
    </>
  );
};