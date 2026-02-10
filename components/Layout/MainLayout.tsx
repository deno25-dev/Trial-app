import React, { useState } from 'react';
import { TopBar } from '../Header/TopBar';
import { DrawingTools } from '../Sidebar/DrawingTools';
import { MarketOverview } from '../Panels/MarketOverview';
import { FinancialChart } from '../Chart/FinancialChart';
import clsx from 'clsx';

export const MainLayout: React.FC = () => {
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header - Mandate 3.0 */}
      <TopBar />
      
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Toolbar - Drawing Tools */}
        <div className="w-14 border-r border-border bg-surface flex flex-col items-center py-4 z-20">
          <DrawingTools />
        </div>

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col relative bg-background">
          {/* Chart Area */}
          <div className="flex-1 relative">
            <FinancialChart />
            
            {/* Mandate 3.1: Persistent Drawing Settings Bar could go here as overlay */}
          </div>

          {/* Bottom Panel - Mandate 4.0 */}
          <div 
            className={clsx(
              "border-t border-border bg-surface z-20 transition-all duration-300 ease-in-out overflow-hidden",
              isPanelOpen ? "h-64" : "h-10"
            )}
          >
            <MarketOverview isOpen={isPanelOpen} onToggle={() => setIsPanelOpen(!isPanelOpen)} />
          </div>
        </div>
      </div>
    </div>
  );
};