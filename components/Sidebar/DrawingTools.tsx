import React from 'react';
import { useChart } from '../../context/ChartContext';
import { DrawingToolType } from '../../types';
import { 
  Crosshair, 
  TrendingUp, 
  Minus, 
  MousePointer2, 
  Type, 
  Brush, 
  Grid3X3, 
  Trash2,
  Lock,
  EyeOff
} from 'lucide-react';
import clsx from 'clsx';

const ToolButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    title={label}
    className={clsx(
      "w-10 h-10 flex items-center justify-center rounded mb-1 transition-colors relative group",
      active ? "text-primary bg-primary/10" : "text-muted hover:text-text hover:bg-text/5"
    )}
  >
    {icon}
    {/* Tooltip */}
    <span className="absolute left-12 bg-surface border border-border px-2 py-1 rounded text-xs text-text opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
        {label}
    </span>
  </button>
);

export const DrawingTools: React.FC = () => {
  const { state, setTool, toggleMagnet, toggleGrid } = useChart();

  return (
    <>
      <ToolButton 
        active={state.activeTool === 'crosshair'} 
        onClick={() => setTool('crosshair')} 
        icon={<Crosshair size={20} />} 
        label="Crosshair" 
      />
      
      <div className="w-4 h-px bg-border my-2" />

      <ToolButton 
        active={state.activeTool === 'trendline'} 
        onClick={() => setTool('trendline')} 
        icon={<TrendingUp size={20} />} 
        label="Trendline" 
      />
      <ToolButton 
        active={state.activeTool === 'horizontal_line'} 
        onClick={() => setTool('horizontal_line')} 
        icon={<Minus size={20} />} 
        label="Horizontal Line" 
      />
      <ToolButton 
        active={state.activeTool === 'fib_retracement'} 
        onClick={() => setTool('fib_retracement')} 
        icon={<Grid3X3 size={20} />} 
        label="Fib Retracement" 
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

      <div className="flex-1" />

      {/* Utility Tools */}
      <ToolButton 
        active={state.isMagnetMode} 
        onClick={toggleMagnet} 
        icon={<div className="font-bold text-xs">U</div>} 
        label="Magnet Mode" 
      />
      <ToolButton 
        active={!state.showGrid} 
        onClick={toggleGrid} 
        icon={<EyeOff size={20} />} 
        label="Toggle Grid" 
      />
      <ToolButton 
        active={false} 
        onClick={() => console.log('Delete All')} 
        icon={<Trash2 size={20} />} 
        label="Clear Chart" 
      />
    </>
  );
};