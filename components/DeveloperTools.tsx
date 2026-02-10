import React from 'react';
import { X, Activity, Wifi, Database } from 'lucide-react';

export const DeveloperTools: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-background border border-border shadow-2xl z-50 rounded-lg flex flex-col font-mono text-xs">
      {/* Header */}
      <div className="h-10 border-b border-border flex items-center justify-between px-4 bg-surface rounded-t-lg">
        <span className="font-bold text-primary">RED PILL DIAGNOSTICS</span>
        <button onClick={onClose} className="hover:text-danger"><X size={16} /></button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 grid grid-cols-2 gap-4">
        
        {/* Metric Card */}
        <div className="border border-border p-3 rounded bg-surface/50">
            <div className="flex items-center gap-2 text-muted mb-2">
                <Activity size={14} />
                <span>Render Performance</span>
            </div>
            <div className="text-2xl font-bold text-success">60 FPS</div>
            <div className="text-muted mt-1">Frame Time: 16.4ms</div>
        </div>

        {/* Metric Card */}
        <div className="border border-border p-3 rounded bg-surface/50">
            <div className="flex items-center gap-2 text-muted mb-2">
                <Wifi size={14} />
                <span>Stream B Latency</span>
            </div>
            <div className="text-2xl font-bold text-primary">24ms</div>
            <div className="text-muted mt-1">Packets/s: 45</div>
        </div>

        {/* Logs */}
        <div className="col-span-2 border border-border rounded bg-black p-2 overflow-y-auto font-mono text-[10px] h-40">
            <div className="text-muted border-b border-border/20 mb-1 pb-1">System Logs</div>
            <div className="text-success">[INIT] Core systems initialized</div>
            <div className="text-blue-400">[INFO] Loaded 'Midnight' theme</div>
            <div className="text-blue-400">[TAURI] File system permissions granted</div>
            <div className="text-yellow-500">[WARN] Stream A: Local file scan took 300ms</div>
            <div className="text-success">[READY] App ready for input</div>
        </div>
      </div>
    </div>
  );
};