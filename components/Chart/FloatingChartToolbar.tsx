
import React, { useState, useRef, useEffect } from 'react';
import { GripVertical, TrendingUp, Square, Settings, Check } from 'lucide-react';
import { useChart } from '../../context/ChartContext';
import clsx from 'clsx';

export const FloatingChartToolbar: React.FC = () => {
  const { state, setPriceScaleMode, toggleAutoScale, toggleInvertScale } = useChart();
  
  // State to track x/y offset from the default center position
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Refs for drag logic
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
          if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
              setIsMenuOpen(false);
          }
      };
      if (isMenuOpen) {
          document.addEventListener('mousedown', handleClickOutside);
      }
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault(); 
    isDragging.current = true;
    hasMoved.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY };
    initialPos.current = { ...position };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current) return;
    
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;

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

  const handleClickCapture = (e: React.MouseEvent) => {
      if (hasMoved.current) {
          e.stopPropagation();
          e.preventDefault();
      }
  };

  // Helper for menu items
  const MenuItem = ({ label, active, onClick, shortcut }: { label: string, active?: boolean, onClick: () => void, shortcut?: string }) => (
      <button 
          onClick={(e) => {
              e.stopPropagation();
              onClick();
              setIsMenuOpen(false);
          }}
          className="w-full flex items-center justify-between px-3 py-2 text-xs text-muted hover:bg-white/5 hover:text-text transition-colors group"
      >
          <span>{label}</span>
          {active ? <Check size={14} className="text-primary" /> : (shortcut && <span className="text-[10px] opacity-50">{shortcut}</span>)}
      </button>
  );

  return (
    <div 
        className="absolute bottom-6 left-1/2 z-40 select-none"
        style={{
            transform: `translate(calc(-50% + ${position.x}px), ${position.y}px)`
        }}
    >
        <div 
            onMouseDown={handleMouseDown}
            onClickCapture={handleClickCapture}
            className="flex items-center gap-1 bg-surface/60 backdrop-blur-md border border-white/10 rounded-full px-2 py-1 shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-colors duration-300 cursor-grab active:cursor-grabbing relative"
        >
            {/* Drag Handle */}
            <div className="p-2 text-muted hover:text-text transition-colors">
                <GripVertical size={18} />
            </div>

            <div className="w-px h-4 bg-white/10 mx-1" />

            {/* Tools */}
            <button className="p-2 text-primary hover:text-primary hover:bg-primary/10 rounded-full transition-colors">
                <TrendingUp size={18} />
            </button>
            <button className="p-2 text-muted hover:text-text hover:bg-white/10 rounded-full transition-colors">
                <Square size={18} />
            </button>

            <div className="w-px h-4 bg-white/10 mx-1" />

            {/* Settings Icon & Menu */}
            <div className="relative">
                <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className={clsx(
                        "p-2 rounded-full transition-colors",
                        isMenuOpen ? "text-primary bg-primary/10" : "text-muted hover:text-text hover:bg-white/10"
                    )}
                    title="Chart Settings"
                >
                     <Settings size={18} />
                </button>

                {isMenuOpen && (
                    <div 
                        ref={menuRef}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 bg-surface/60 backdrop-blur-md border border-white/10 shadow-2xl rounded-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-bottom flex flex-col py-1 cursor-default"
                        onMouseDown={(e) => e.stopPropagation()} // Prevent drag starting from menu
                    >
                        {/* Header */}
                        <div className="px-3 py-2 text-[10px] font-bold text-muted uppercase tracking-widest border-b border-white/5 mb-1">
                            Price Scale
                        </div>

                        {/* Options */}
                        <MenuItem 
                            label="Linear" 
                            active={state.priceScaleMode === 'Linear'} 
                            onClick={() => setPriceScaleMode('Linear')} 
                        />
                        <MenuItem 
                            label="Logarithmic" 
                            active={state.priceScaleMode === 'Logarithmic'} 
                            onClick={() => setPriceScaleMode('Logarithmic')} 
                        />
                        <MenuItem 
                            label="Percentage" 
                            active={state.priceScaleMode === 'Percentage'} 
                            onClick={() => setPriceScaleMode('Percentage')} 
                        />

                        <div className="h-px bg-white/5 mx-3 my-1" />

                        <MenuItem 
                            label="Auto Scale" 
                            active={state.isAutoScale} 
                            onClick={toggleAutoScale}
                        />
                        <MenuItem 
                            label="Invert Scale" 
                            active={state.isInverted} 
                            onClick={toggleInvertScale}
                            shortcut="Alt+I"
                        />
                    </div>
                )}
            </div>

        </div>
    </div>
  );
};
