import React from 'react';
import { Settings, TrendingUp, Square, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

export const FloatingChartToolbar: React.FC = () => {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40">
        <div className="flex items-center gap-1 bg-[#151E32]/80 backdrop-blur-md border border-white/10 rounded-full px-2 py-1 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            
            {/* Settings */}
            <button className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                <Settings size={18} />
            </button>

            <div className="w-px h-4 bg-white/10 mx-1" />

            {/* Tools */}
            <button className="p-2 text-blue-400 hover:text-blue-300 hover:bg-white/10 rounded-full transition-colors">
                <TrendingUp size={18} />
            </button>
            <button className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                <Square size={18} />
            </button>

            <div className="w-px h-4 bg-white/10 mx-1" />

            {/* Dropdown */}
            <button className="pl-2 pr-1 py-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors flex items-center gap-1">
                 <span className="text-xs font-medium">Auto</span>
                 <ChevronDown size={14} />
            </button>

        </div>
    </div>
  );
};