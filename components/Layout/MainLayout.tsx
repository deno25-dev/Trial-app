import React, { useState, useRef, useEffect } from 'react';
import { TopBar } from '../Header/TopBar';
import { DrawingTools } from '../Sidebar/DrawingTools';
import { RightSidebar } from '../Sidebar/RightSidebar';
import { BottomPanel } from '../Panels/BottomPanel';
import { StatusBar } from '../Footer/StatusBar';
import { FinancialChart } from '../Chart/FinancialChart';
import { FloatingChartToolbar } from '../Chart/FloatingChartToolbar';
import { DataExplorerSidebar } from '../Sidebar/DataExplorerSidebar';
import { useChart } from '../../context/ChartContext';
import clsx from 'clsx';

export const MainLayout: React.FC = () => {
  const [panelHeight, setPanelHeight] = useState(256); // Default 256px
  const [isDragging, setIsDragging] = useState(false);
  
  // Use ChartContext for Data Explorer State
  const { isDataExplorerOpen } = useChart();

  // Refs for Dragging
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); 
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartHeight.current = panelHeight;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const delta = dragStartY.current - e.clientY;
      // Constraint: Min 40px, Max 500px
      const newHeight = Math.max(40, Math.min(dragStartHeight.current + delta, window.innerHeight - 200));
      setPanelHeight(newHeight);
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
  }, [isDragging]);

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* 1. Header */}
      <TopBar />
      
      <div className="flex flex-1 overflow-hidden relative">
        {/* 2. Left Toolbar */}
        <div className="w-14 border-r border-border bg-surface flex flex-col items-center py-4 z-20 shrink-0">
          <DrawingTools />
        </div>

        {/* 3. Data Explorer (Slide-out) */}
        {isDataExplorerOpen && (
            <div className="w-64 border-r border-border bg-surface z-10 shrink-0 animate-in slide-in-from-left duration-200">
                <DataExplorerSidebar />
            </div>
        )}

        {/* 4. Main Workspace */}
        <div className="flex-1 flex flex-col relative bg-background min-w-0">
          
          {/* Chart Area */}
          <div className="flex-1 relative z-0">
            <FinancialChart />
            
            {/* Floating Toolbar (The pill shape) */}
            <FloatingChartToolbar />
            
            {/* Overlay mask during drag */}
            {isDragging && (
                <div className="absolute inset-0 z-50 bg-transparent cursor-row-resize" />
            )}
          </div>

          {/* Bottom Panel (Positions/Orders) */}
          <div 
            style={{ height: panelHeight }}
            className={clsx(
              "border-t border-border bg-background z-30 overflow-hidden shrink-0 relative flex flex-col shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.2)]",
              !isDragging && "transition-all duration-200 ease-out"
            )}
          >
            {/* Resizer Handle */}
            <div 
                className="absolute top-0 left-0 w-full h-1 cursor-row-resize z-50 hover:bg-primary/50 transition-colors"
                onMouseDown={handleMouseDown}
            />

            <BottomPanel height={panelHeight} />
          </div>
        </div>

        {/* 5. Right Sidebar */}
        <div className="w-14 border-l border-border bg-surface flex flex-col items-center py-4 z-20 shrink-0">
          <RightSidebar />
        </div>
      </div>

      {/* 6. Footer Status Bar */}
      <StatusBar />
    </div>
  );
};