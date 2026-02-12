import React, { useState, useRef } from 'react';
import { GripVertical, TrendingUp, Square, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

export const FloatingChartToolbar: React.FC = () => {
  // State to track x/y offset from the default center position
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  // Refs for drag logic to avoid stale closures in event listeners
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent text selection
    isDragging.current = true;
    hasMoved.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY };
    initialPos.current = { ...position };

    // Attach global listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return;
    
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;

    // Detect if meaningful movement occurred to block clicks later
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMoved.current = true;
    }
    
    setPosition({
        x: initialPos.current.x + dx,
        y: initialPos.current.y + dy
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'default';
  };

  // Capture click events during the bubble phase to stop them if we were dragging
  const handleClickCapture = (e: React.MouseEvent) => {
      if (hasMoved.current) {
          e.stopPropagation();
          e.preventDefault();
      }
  };

  return (
    <div 
        className="absolute bottom-6 left-1/2 z-40 select-none"
        style={{
            // Maintain the CSS centering (-50%) while adding the user's drag offset
            transform: `translate(calc(-50% + ${position.x}px), ${position.y}px)`
        }}
    >
        <div 
            onMouseDown={handleMouseDown}
            onClickCapture={handleClickCapture}
            className="flex items-center gap-1 bg-surface/90 backdrop-blur-md border border-border rounded-full px-2 py-1 shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-colors duration-300 cursor-grab active:cursor-grabbing"
        >
            
            {/* Drag Handle */}
            <div className="p-2 text-muted hover:text-text transition-colors">
                <GripVertical size={18} />
            </div>

            <div className="w-px h-4 bg-border mx-1" />

            {/* Tools */}
            <button className="p-2 text-primary hover:text-primary hover:bg-primary/10 rounded-full transition-colors">
                <TrendingUp size={18} />
            </button>
            <button className="p-2 text-muted hover:text-text hover:bg-surface-highlight rounded-full transition-colors">
                <Square size={18} />
            </button>

            <div className="w-px h-4 bg-border mx-1" />

            {/* Dropdown */}
            <button className="pl-2 pr-1 py-1 text-muted hover:text-text hover:bg-surface-highlight rounded-full transition-colors flex items-center gap-1">
                 <span className="text-xs font-medium">Auto</span>
                 <ChevronDown size={14} />
            </button>

        </div>
    </div>
  );
};