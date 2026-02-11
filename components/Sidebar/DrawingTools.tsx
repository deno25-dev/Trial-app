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
      "w-10 h-10 flex items-center justify-center rounded-xl transition-all relative group mb-1",
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
    <div className="w-6 h-px bg-white/10 my-2" />
);

export const DrawingTools: React.FC = () => {
  const { state, setTool, toggleMagnet, toggleGrid } = useChart();

  return (
    <div className="flex flex-col w-full items-center pt-2">
      {/* 1. Cursor Mode */}
      <ToolButton 
        active={state.activeTool === 'crosshair'} 
        onClick={() => setTool('crosshair')} 
        icon={<Crosshair size={20} strokeWidth={1.5} />} 
        label="Cursor" 
      />
      
      <Separator />

      {/* 2. Drawing Tools Group */}
      <ToolButton 
          active={state.activeTool === 'trendline'} 
          onClick={() => setTool('trendline')} 
          icon={<TrendingUp size={20} strokeWidth={1.5} />} 
          label="Line Tools" 
          hasArrow
      />
      <ToolButton 
          active={state.activeTool === 'rectangle'} 
          onClick={() => setTool('rectangle')} 
          icon={<Square size={20} strokeWidth={1.5} />} 
          label="Shapes" 
          hasArrow
      />
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

      {/* Spacer to push bottom tools down */}
      <div className="flex-1 min-h-[20px]" />

      {/* 4. Utility Group (Lock, Favorites, Hide) */}
      <ToolButton 
          active={false}
          onClick={() => {}} 
          icon={<Lock size={20} strokeWidth={1.5} />} 
          label="Lock All Drawings" 
      />
      <ToolButton 
          active={true} 
          onClick={() => {}} 
          icon={<Star size={20} className="fill-current text-yellow-500" strokeWidth={1.5} />} 
          label="Favorites Bar" 
      />
      <ToolButton 
          active={!state.showGrid}
          onClick={toggleGrid} 
          icon={<Eye size={20} strokeWidth={1.5} />} 
          label="Hide All Drawings" 
      />

      {/* 5. Delete */}
      <div className="mt-2 mb-2">
        <ToolButton 
            active={false}
            onClick={() => console.log('Delete All')} 
            icon={<Trash2 size={20} strokeWidth={1.5} />} 
            label="Remove Objects" 
        />
      </div>
    </div>
  );
};