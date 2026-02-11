import React, { useState, useRef, useEffect } from 'react';
import { TopBar } from '../Header/TopBar';
import { DrawingTools } from '../Sidebar/DrawingTools';
import { RightSidebar } from '../Sidebar/RightSidebar';
import { MarketOverview } from '../Panels/MarketOverview';
import { FinancialChart } from '../Chart/FinancialChart';
import { DataExplorerSidebar } from '../Sidebar/DataExplorerSidebar';
import { useChart } from '../../context/ChartContext';
import clsx from 'clsx';

export const MainLayout: React.FC = () => {
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [panelHeight, setPanelHeight] = useState(256); // Default 256px
  const [isDragging, setIsDragging] = useState(false);
  
  // Use ChartContext for Data Explorer State
  const { isDataExplorerOpen } = useChart();

  // Refs for Event Listeners (prevents stale closures/dependency trashing)
  const isPanelOpenRef = useRef(isPanelOpen);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  // Keep ref synced with state
  useEffect(() => {
    isPanelOpenRef.current = isPanelOpen;
  }, [isPanelOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); 
    setIsDragging(true);
    dragStartY.current = e.clientY;
    // Capture the starting visual height (40 if closed, actual height if open)
    dragStartHeight.current = isPanelOpenRef.current ? panelHeight : 40;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const delta = dragStartY.current - e.clientY;
      // Constraint: Min 40px (header), Max (Window - 150px)
      const newHeight = Math.max(40, Math.min(dragStartHeight.current + delta, window.innerHeight - 150));
      
      setPanelHeight(newHeight);
      
      // Auto-toggle logic using Ref to avoid re-binding listeners
      if (newHeight > 45) {
          if (!isPanelOpenRef.current) setIsPanelOpen(true);
      } else {
          if (isPanelOpenRef.current) setIsPanelOpen(false);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'row-resize';
    } else {
      document.body.style.cursor = 'default';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };
  }, [isDragging]); // Only depend on isDragging to mount/unmount listeners once

  const handleToggle = () => {
    setIsPanelOpen(prev => {
        const newState = !prev;
        // Mandate: If opening and height is collapsed/small, restore default
        if (newState && panelHeight < 100) {
            setPanelHeight(256);
        }
        return newState;
    });
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header - Mandate 3.0 */}
      <TopBar />
      
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Toolbar - Drawing Tools */}
        <div className="w-14 border-r border-border bg-surface flex flex-col items-center py-4 z-20 shrink-0">
          <DrawingTools />
        </div>

        {/* Lane 2: Data Explorer Panel (Slide-out or Fixed) */}
        {/* Mandate 0.11.3: Opens left side panel. We place it here to simulate sidebar logic */}
        {isDataExplorerOpen && (
            <div className="w-64 border-r border-border bg-surface z-10 shrink-0 animate-in slide-in-from-left duration-200">
                <DataExplorerSidebar />
            </div>
        )}

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col relative bg-background min-w-0">
          {/* Chart Area */}
          <div className="flex-1 relative z-0">
            <FinancialChart />
            
            {/* Mandate 0.24: Overlay mask during drag to prevent mouse events trapped in chart */}
            {isDragging && (
                <div className="absolute inset-0 z-50 bg-transparent cursor-row-resize" />
            )}
          </div>

          {/* Bottom Panel - Mandate 4.0 & 0.24 */}
          <div 
            style={{ height: isPanelOpen ? panelHeight : 40 }}
            className={clsx(
              "border-t border-border bg-surface z-30 overflow-hidden shrink-0 relative flex flex-col shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]",
              !isDragging && "transition-all duration-300 ease-in-out"
            )}
          >
            {/* Resizer Handle Area */}
            <div 
                className="absolute top-0 left-0 w-full h-4 cursor-row-resize z-50 flex justify-center group hover:bg-primary/5 transition-colors"
                onMouseDown={handleMouseDown}
            >
                {/* Visual Pill Handle */}
                <div className="w-12 h-1.5 bg-border group-hover:bg-primary/50 rounded-full mt-1.5 transition-colors" />
            </div>

            <MarketOverview isOpen={isPanelOpen} onToggle={handleToggle} />
          </div>
        </div>

        {/* Right Sidebar - Mandate 0.x: Implemented */}
        <div className="w-14 border-l border-border bg-surface flex flex-col items-center py-4 z-20 shrink-0">
          <RightSidebar />
        </div>
      </div>
    </div>
  );
};