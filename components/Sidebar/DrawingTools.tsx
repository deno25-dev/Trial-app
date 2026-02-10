import React from 'react';
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
  ChevronRight
} from 'lucide-react';
import clsx from 'clsx';
import { DrawingToolType } from '../../types';

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
      "w-10 h-10 flex items-center justify-center rounded transition-colors relative group",
      active ? "text-primary bg-primary/10" : "text-muted hover:text-text hover:bg-text/5"
    )}
  >
    {icon}
    {hasArrow && (
        <div className="absolute bottom-1 right-1 opacity-50">
            <div className="w-0 h-0 border-l-[3px] border-l-transparent border-t-[3px] border-t-muted/70 border-r-[3px] border-r-transparent" />
        </div>
    )}
    
    {/* Tooltip */}
    <span className="absolute left-12 bg-surface border border-border px-2 py-1 rounded text-xs text-text opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-lg">
        {label}
    </span>
  </button>
);

const Separator = () => (
    <div className="w-6 h-px bg-border my-2 opacity-50" />
);

export const DrawingTools: React.FC = () => {
  const { state, setTool, toggleMagnet, toggleGrid } = useChart();

  return (
    <>
      {/* 1. Cursor Mode */}
      <ToolButton 
        active={state.activeTool === 'crosshair'} 
        onClick={() => setTool('crosshair')} 
        icon={<Crosshair size={20} />} 
        label="Cursor" 
      />
      
      <Separator />

      {/* 2. Drawing Tools Group */}
      <div className="flex flex-col gap-1">
        <ToolButton 
            active={state.activeTool === 'trendline'} 
            onClick={() => setTool('trendline')} 
            icon={<TrendingUp size={20} />} 
            label="Line Tools" 
            hasArrow
        />
        <ToolButton 
            active={state.activeTool === 'rectangle'} 
            onClick={() => setTool('rectangle')} 
            icon={<Square size={20} />} 
            label="Shapes" 
            hasArrow
        />
        <ToolButton 
            active={state.activeTool === 'brush'} 
            onClick={() => setTool('brush')} 
            icon={<Brush size={20} />} 
            label="Brush" 
        />
        <ToolButton 
            active={state.activeTool === 'text'} 
            onClick={() => setTool('text')} 
            icon={<Type size={20} />} 
            label="Text" 
        />
      </div>

      <Separator />

      {/* 3. Advanced/Measurement Group */}
      <div className="flex flex-col gap-1">
        <ToolButton 
            active={state.isMagnetMode} 
            onClick={toggleMagnet} 
            icon={<Magnet size={20} className={state.isMagnetMode ? "fill-current" : ""} />} 
            label="Magnet Mode" 
        />
        <ToolButton 
            active={state.activeTool === 'pencil'} 
            onClick={() => setTool('pencil')} 
            icon={<Pencil size={20} />} 
            label="Continuous Drawing" 
        />
        <ToolButton 
            active={state.activeTool === 'measure'} 
            onClick={() => setTool('measure')} 
            icon={<Ruler size={20} />} 
            label="Measure" 
        />
      </div>

      {/* Spacer to push bottom tools down */}
      <div className="flex-1" />

      {/* 4. Utility Group (Lock, Favorites, Hide) */}
      <div className="flex flex-col gap-1 mb-2">
         <ToolButton 
            active={false}
            onClick={() => {}} 
            icon={<Lock size={20} />} 
            label="Lock All Drawings" 
        />
        <ToolButton 
            active={true} 
            onClick={() => {}} 
            icon={<Star size={20} className="fill-current text-yellow-500" />} 
            label="Favorites Bar" 
        />
        <ToolButton 
            active={!state.showGrid}
            onClick={toggleGrid} 
            icon={<Eye size={20} />} 
            label="Hide All Drawings" 
        />
      </div>

      {/* 5. Delete */}
      <div className="flex flex-col gap-2 mb-2">
        <ToolButton 
            active={false}
            onClick={() => console.log('Delete All')} 
            icon={<Trash2 size={20} />} 
            label="Remove Objects" 
        />
      </div>
    </>
  );
};