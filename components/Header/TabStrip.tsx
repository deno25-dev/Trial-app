
import React from 'react';
import { useChart } from '../../context/ChartContext';
import { Plus, X, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import { Telemetry } from '../../utils/telemetry';

export const TabStrip: React.FC = () => {
  const { state, addTab, removeTab, selectTab } = useChart();

  const handleUndock = (e: React.MouseEvent, tabId: string) => {
      e.stopPropagation();
      Telemetry.info('UI', `Undocking Tab ${tabId} (Feature not implemented in mock)`);
      alert("Undock functionality would open a new window in Electron/Tauri build.");
  };

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
      e.stopPropagation();
      removeTab(tabId);
  };

  return (
    <div className="w-full h-9 flex items-end bg-background border-b border-border select-none px-2 gap-1 pt-1 z-50">
        {state.tabs.map(tab => {
            const isActive = tab.id === state.activeTabId;
            return (
                <div 
                  key={tab.id} 
                  onClick={() => selectTab(tab.id)}
                  className={clsx(
                      "group relative flex items-center gap-2 px-3 h-full rounded-t-lg border-t border-l border-r transition-all cursor-pointer min-w-[120px] max-w-[180px] justify-between text-xs font-bold",
                      isActive 
                          ? "border-border bg-surface text-primary -mb-px pb-px z-10" 
                          : "border-transparent bg-transparent text-muted hover:bg-surface/50 hover:text-text mb-0.5"
                  )}
                >
                   <span className="truncate">{tab.symbol}</span>
                   
                   <div className={clsx("flex items-center gap-1", isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100 transition-opacity")}>
                       <button 
                          title="Undock Tab" 
                          onClick={(e) => handleUndock(e, tab.id)}
                          className="p-1 hover:bg-primary/20 hover:text-primary rounded-md transition-colors"
                       >
                           <ExternalLink size={10} />
                       </button>
                       <button 
                          title="Close Tab" 
                          onClick={(e) => handleCloseTab(e, tab.id)}
                          className="p-1 hover:bg-danger/20 hover:text-danger rounded-md transition-colors"
                       >
                           <X size={10} />
                       </button>
                   </div>
                   
                   {isActive && <div className="absolute top-0 left-0 w-full h-[2px] bg-primary rounded-t-lg" />}
                </div>
            );
        })}
        
        <button 
          onClick={addTab}
          className="w-8 h-7 mb-0.5 flex items-center justify-center rounded-lg text-muted hover:text-text hover:bg-surface/50 transition-colors"
          title="Add New Chart Tab"
        >
            <Plus size={16} />
        </button>
    </div>
  );
};
