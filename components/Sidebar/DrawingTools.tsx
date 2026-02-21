import React, { useState, useRef, useEffect } from 'react';
import { useChart } from '../../context/ChartContext';
import { 
  Crosshair, 
  TrendingUp, 
  Square,
  Brush, 
  Type, 
  Magnet,
  Pencil,
  Ruler,
  Lock,
  Eye,
  Star,
  Trash2,
  Slash,
  ArrowUpRight,
  ArrowRight,
  Minus,
  MoveVertical,
  Triangle
} from 'lucide-react';
import clsx from 'clsx';

interface ToolButtonProps {
  active?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hasArrow?: boolean;
}

const ToolButton: React.FC<ToolButtonProps> = ({ active, onClick, icon, label, hasArrow }) => (
  <button
    onClick={onClick}
    title={label}
    className={clsx(
      "w-10 h-10 flex items-center justify-center rounded-xl transition-all relative group",
      active 
        ? "text-primary bg-primary/15 shadow-[0_0_20px_rgba(34,211,238,0.45)] border border-white/20" 
        : "text-muted hover:text-text hover:bg-surface-highlight border border-transparent"
    )}
  >
    {icon}
    {hasArrow && (
        <div className="absolute bottom-1 right-1 opacity-50">
            <div className="w-0 h-0 border-l-[3px] border-l-transparent border-t-[3px] border-t-muted/70 border-r-[3px] border-r-transparent" />
        </div>
    )}
    
    {/* Tooltip */}
    <span className="absolute left-14 bg-surface backdrop-blur border border-border px-3 py-1.5 rounded-lg text-xs font-medium text-text opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-xl translate-x-1 group-hover:translate-x-0 duration-200">
        {label}
        {/* Triangle Pointer */}
        <div className="absolute top-1/2 -left-1 -mt-1 w-2 h-2 bg-surface border-l border-b border-border transform rotate-45" />
    </span>
  </button>
);

const Separator = () => (
    <div className="w-6 h-px bg-white/5" />
);

export const DrawingTools: React.FC = () => {
  const { state, setTool, toggleMagnet, toggleGrid, toggleFavoritesBar, clearDrawings } = useChart();

  // State for Line Tools Popup
  const [isLineToolsOpen, setIsLineToolsOpen] = useState(false);
  const lineToolsRef = useRef<HTMLDivElement>(null);

  // State for Shapes Popup
  const [isShapesOpen, setIsShapesOpen] = useState(false);
  const shapesRef = useRef<HTMLDivElement>(null);

  // Close popup on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close Line Tools
      if (lineToolsRef.current && !lineToolsRef.current.contains(event.target as Node)) {
        setIsLineToolsOpen(false);
      }
      // Close Shapes
      if (shapesRef.current && !shapesRef.current.contains(event.target as Node)) {
        setIsShapesOpen(false);
      }
    };

    if (isLineToolsOpen || isShapesOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLineToolsOpen, isShapesOpen]);

  // Line Tools Data
  const lineTools = [
    { id: 'trendline', label: 'Trend Line', icon: <Slash size={16} />, favored: true },
    { id: 'ray', label: 'Ray', icon: <ArrowUpRight size={16} />, favored: false },
    { id: 'horizontal_ray', label: 'Horizontal Ray', icon: <ArrowRight size={16} />, favored: false },
    { id: 'arrow_line', label: 'Arrow Line', icon: <ArrowUpRight size={16} className="rotate-45" />, favored: false },
    { id: 'vertical_line', label: 'Vertical Line', icon: <MoveVertical size={16} />, favored: false },
    { id: 'horizontal_line', label: 'Horizontal Line', icon: <Minus size={16} />, favored: false },
  ];

  // Shape Tools Data
  const shapeTools = [
    { id: 'rectangle', label: 'Rectangle', icon: <Square size={16} />, favored: true },
    { id: 'triangle', label: 'Triangle', icon: <Triangle size={16} />, favored: false },
    { id: 'rotated_rectangle', label: 'Rotated Rectangle', icon: <Square size={16} className="rotate-45" />, favored: false },
  ];

  const isLineToolActive = ['trendline', 'ray', 'horizontal_line', 'vertical_line', 'arrow_line', 'horizontal_ray'].includes(state.activeTool);
  const isShapeToolActive = ['rectangle', 'triangle', 'rotated_rectangle'].includes(state.activeTool as string);

  return (
    <div className="flex flex-col h-full w-full max-h-screen overflow-hidden">
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center py-2 gap-1.5">
        {/* 1. Cursor Mode */}
        <ToolButton 
          active={state.activeTool === 'crosshair'} 
          onClick={() => setTool('crosshair')} 
          icon={<Crosshair size={20} strokeWidth={1.5} />} 
          label="Cursor" 
        />
        
        <Separator />

        {/* 2. Drawing Tools Group */}
        
        {/* Line Tools with Popup */}
        <div className="relative" ref={lineToolsRef}>
            <ToolButton 
                active={isLineToolActive}
                onClick={() => setIsLineToolsOpen(!isLineToolsOpen)} 
                icon={<TrendingUp size={20} strokeWidth={1.5} />} 
                label="Line Tools" 
                hasArrow
            />

            {isLineToolsOpen && (
               <div className="absolute left-full top-0 ml-3 w-56 bg-surface/60 backdrop-blur-md border border-border/50 shadow-2xl rounded-lg overflow-hidden z-50 py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-left">
                    <div className="px-3 py-2 text-[10px] font-bold text-muted uppercase tracking-widest border-b border-white/5 mb-1">
                        Line Tools
                    </div>
                    
                    {lineTools.map((tool) => {
                        const isActive = state.activeTool === tool.id;
                        return (
                            <button
                              key={tool.id}
                              onClick={() => {
                                  setTool(tool.id as any);
                                  setIsLineToolsOpen(false);
                              }}
                              className={clsx(
                                  "w-full flex items-center justify-between px-3 py-2 text-xs transition-colors group",
                                  isActive ? "bg-primary/10 text-primary" : "text-text hover:bg-surface-highlight/50"
                              )}
                            >
                                <div className="flex items-center gap-3">
                                    <span className={isActive ? "text-primary" : "text-muted group-hover:text-text"}>
                                      {tool.icon}
                                    </span>
                                    <span className="font-medium">{tool.label}</span>
                                </div>
                                
                                {/* Star Icon */}
                                <div 
                                  className={clsx(
                                      "p-1 rounded hover:bg-surface transition-colors",
                                      tool.favored ? "text-yellow-500" : "text-muted opacity-0 group-hover:opacity-100"
                                  )}
                                  onClick={(e) => {
                                      e.stopPropagation();
                                  }}
                                >
                                    <Star size={12} fill={tool.favored ? "currentColor" : "none"} />
                                </div>
                            </button>
                        );
                    })}
               </div>
            )}
        </div>

        {/* Geometric Shapes with Popup */}
        <div className="relative" ref={shapesRef}>
            <ToolButton 
                active={isShapeToolActive} 
                onClick={() => setIsShapesOpen(!isShapesOpen)} 
                icon={<Square size={20} strokeWidth={1.5} />} 
                label="Geometric Shapes" 
                hasArrow
            />

            {isShapesOpen && (
               <div className="absolute left-full top-0 ml-3 w-56 bg-surface/60 backdrop-blur-md border border-border/50 shadow-2xl rounded-lg overflow-hidden z-50 py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-left">
                    <div className="px-3 py-2 text-[10px] font-bold text-muted uppercase tracking-widest border-b border-white/5 mb-1">
                        Geometric Shapes
                    </div>
                    
                    {shapeTools.map((tool) => {
                        const isActive = state.activeTool === tool.id;
                        return (
                            <button
                              key={tool.id}
                              onClick={() => {
                                  setTool(tool.id as any);
                                  setIsShapesOpen(false);
                              }}
                              className={clsx(
                                  "w-full flex items-center justify-between px-3 py-2 text-xs transition-colors group",
                                  isActive ? "bg-primary/10 text-primary" : "text-text hover:bg-surface-highlight/50"
                              )}
                            >
                                <div className="flex items-center gap-3">
                                    <span className={isActive ? "text-primary" : "text-muted group-hover:text-text"}>
                                      {tool.icon}
                                    </span>
                                    <span className="font-medium">{tool.label}</span>
                                </div>
                                
                                {/* Star Icon */}
                                <div 
                                  className={clsx(
                                      "p-1 rounded hover:bg-surface transition-colors",
                                      tool.favored ? "text-yellow-500" : "text-muted opacity-0 group-hover:opacity-100"
                                  )}
                                  onClick={(e) => {
                                      e.stopPropagation();
                                  }}
                                >
                                    <Star size={12} fill={tool.favored ? "currentColor" : "none"} />
                                </div>
                            </button>
                        );
                    })}
               </div>
            )}
        </div>

        <ToolButton 
            active={state.activeTool === 'brush'} 
            onClick={() => setTool('brush')} 
            icon={<Brush size={20} strokeWidth={1.5} />} 
            label="Brush" 
        />
        <ToolButton 
            active={state.activeTool === 'text'} 
            onClick={() => setTool('text')} 
            icon={<Type size={20} strokeWidth={1.5} />} 
            label="Text" 
        />

        <Separator />

        {/* 3. Advanced/Measurement Group */}
        <ToolButton 
            active={state.isMagnetMode} 
            onClick={toggleMagnet} 
            icon={<Magnet size={20} strokeWidth={1.5} className={state.isMagnetMode ? "fill-current" : ""} />} 
            label="Magnet Mode" 
        />
        <ToolButton 
            active={state.activeTool === 'pencil'} 
            onClick={() => setTool('pencil')} 
            icon={<Pencil size={20} strokeWidth={1.5} />} 
            label="Continuous Drawing" 
        />
        <ToolButton 
            active={state.activeTool === 'measure'} 
            onClick={() => setTool('measure')} 
            icon={<Ruler size={20} strokeWidth={1.5} />} 
            label="Measure" 
        />

        <Separator />

        {/* 4. Utility Group */}
        <ToolButton 
            active={false}
            onClick={() => {}} 
            icon={<Lock size={20} strokeWidth={1.5} />} 
            label="Lock All Drawings" 
        />
        <ToolButton 
            active={state.showFavoritesBar} 
            onClick={toggleFavoritesBar} 
            icon={<Star size={20} className={state.showFavoritesBar ? "fill-current text-yellow-500" : ""} strokeWidth={1.5} />} 
            label="Favorites Bar" 
        />
        <ToolButton 
            active={!state.showGrid}
            onClick={toggleGrid} 
            icon={<Eye size={20} strokeWidth={1.5} />} 
            label="Hide All Drawings" 
        />

        <Separator />

        {/* 5. Delete */}
        <ToolButton 
            active={false}
            onClick={clearDrawings} 
            icon={<Trash2 size={20} strokeWidth={1.5} />} 
            label="Remove Objects" 
        />
      </div>
    </div>
  );
};