

import React, { useState, useRef, useEffect } from 'react';
import { TopBar } from '../Header/TopBar';
import { TabStrip } from '../Header/TabStrip';
import { DrawingTools } from '../Sidebar/DrawingTools';
import { RightSidebar } from '../Sidebar/RightSidebar';
import { BottomPanel } from '../Panels/BottomPanel';
import { StatusBar } from '../Footer/StatusBar';
import { FinancialChart } from '../Chart/FinancialChart';
import { FloatingChartToolbar } from '../Chart/FloatingChartToolbar';
import { DataExplorerSidebar } from '../Sidebar/DataExplorerSidebar';
import { TradePanel } from '../Panels/TradePanel';
import { StickyNoteManager } from '../Overlays/StickyNoteManager'; // The Renderer
import { StickyNoteListOverlay } from '../Overlays/StickyNoteListOverlay'; // The Manager UI
import { ReplayControls } from '../Chart/ReplayControls'; // Replay UI
import { useChart } from '../../context/ChartContext';
import clsx from 'clsx';

export const MainLayout: React.FC = () => {
  const [panelHeight, setPanelHeight] = useState(256); // Default 256px
  const [lastOpenHeight, setLastOpenHeight] = useState(256);
  const [isDragging, setIsDragging] = useState(false);
  
  // Use ChartContext for Data Explorer & Trade Panel State
  const { isDataExplorerOpen, isTradePanelOpen, state, chartRevision } = useChart();

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
      // Constraint: Min 40px, Max 80% of Screen Height
      const maxHeight = window.innerHeight * 0.8;
      const newHeight = Math.max(40, Math.min(dragStartHeight.current + delta, maxHeight));
      
      setPanelHeight(newHeight);
      
      // Only update memory if we are effectively "open" (above 60px)
      // This prevents remembering "41px" as the open state
      if (newHeight > 60) {
          setLastOpenHeight(newHeight);
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
  }, [isDragging]);

  const togglePanel = () => {
    if (panelHeight > 40) {
      // Closing
      setLastOpenHeight(panelHeight);
      setPanelHeight(40);
    } else {
      // Opening
      // Restore to last known height, or default to 256 if memory is too small/invalid
      const targetHeight = lastOpenHeight < 100 ? 256 : lastOpenHeight;
      setPanelHeight(targetHeight);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-background relative">
        {/* Sticky Note Renderer - Root Level Overlay */}
        <StickyNoteManager />
        
        {/* Sticky Note Manager UI - Root Level Overlay */}
        <StickyNoteListOverlay />

      {/* 1. Header Group */}
      <div className="flex flex-col shrink-0 z-50">
        <TabStrip />
        <TopBar />
      </div>
      
      <div className="flex flex-1 overflow-hidden relative">
        {/* 2. Left Toolbar */}
        <div className="w-14 border-r border-border bg-surface flex flex-col items-center py-4 z-20 shrink-0 overflow-y-auto overflow-x-hidden">
          <DrawingTools />
        </div>

        {/* 3. Data Explorer (Slide-out Left) */}
        {isDataExplorerOpen && (
            <div className="w-64 border-r border-border bg-surface z-10 shrink-0 animate-in slide-in-from-left duration-200">
                <DataExplorerSidebar />
            </div>
        )}

        {/* 4. Main Workspace */}
        <div className="flex-1 flex flex-col relative bg-background min-w-0">
          
          {/* Chart Area */}
          <div className="flex-1 relative z-0">
            <FinancialChart key={chartRevision} />
            
            {/* Floating Toolbar (The pill shape) */}
            {state.showFavoritesBar && <FloatingChartToolbar />}
            
            {/* Replay Controls (Bottom Center) */}
            <ReplayControls />
            
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

            <BottomPanel 
              height={panelHeight} 
              onToggle={togglePanel} 
              isExpanded={panelHeight > 40}
            />
          </div>
        </div>

        {/* 5. Trade Panel (Slide-out Right) */}
        {isTradePanelOpen && (
             <div className="z-40 shrink-0 h-full animate-in slide-in-from-right duration-200 shadow-xl">
                 <TradePanel />
             </div>
        )}

        {/* 6. Right Sidebar - Increased Z-Index to 50 to float above BottomPanel (z-30) */}
        <div className="w-14 border-l border-border bg-surface flex flex-col items-center py-4 z-50 shrink-0">
          <RightSidebar />
        </div>
      </div>

      {/* 7. Footer Status Bar */}
      <StatusBar />
    </div>
  );
};