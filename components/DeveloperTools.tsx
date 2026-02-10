import React, { useState, useEffect, useRef } from 'react';
import { X, Trash2, Copy, Filter, ChevronRight, ChevronDown, Terminal, Bug, Radio, Database, Activity, Globe, Layout, Server, AlertTriangle, CheckCircle, Info, Clock } from 'lucide-react';
import { Telemetry } from '../utils/telemetry';
import { LogEntry, LogCategory, LogLevel } from '../types';
import clsx from 'clsx';

// Category Configuration for Icons and Colors - Toned down with opacity
const CATEGORY_CONFIG: Record<LogCategory, { icon: React.ReactNode; color: string }> = {
  UI: { icon: <Layout size={12} />, color: 'text-blue-400/80' },
  Network: { icon: <Globe size={12} />, color: 'text-purple-400/80' },
  Performance: { icon: <Activity size={12} />, color: 'text-pink-400/80' },
  Persistence: { icon: <Database size={12} />, color: 'text-amber-500/80' },
  Bridge: { icon: <Server size={12} />, color: 'text-cyan-400/80' },
  Database: { icon: <Database size={12} />, color: 'text-orange-400/80' },
  System: { icon: <Terminal size={12} />, color: 'text-zinc-500' },
};

// Level Configuration - Removed bright whites, used Zinc-400 for Info
const LEVEL_CONFIG: Record<LogLevel, { icon: React.ReactNode; bg: string; text: string; border: string }> = {
  info: { icon: <Info size={12} />, bg: 'bg-transparent', text: 'text-zinc-400', border: 'border-transparent' },
  warn: { icon: <AlertTriangle size={12} />, bg: 'bg-yellow-500/5', text: 'text-yellow-600', border: 'border-yellow-500/10' },
  error: { icon: <Bug size={12} />, bg: 'bg-red-500/5', text: 'text-red-500/90', border: 'border-red-500/10' },
  debug: { icon: <Terminal size={12} />, bg: 'bg-transparent', text: 'text-zinc-600', border: 'border-transparent' },
  success: { icon: <CheckCircle size={12} />, bg: 'bg-emerald-500/5', text: 'text-emerald-500/90', border: 'border-emerald-500/10' },
};

export const DeveloperTools: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filterText, setFilterText] = useState('');
  const [activeCategories, setActiveCategories] = useState<Set<LogCategory>>(new Set(Object.keys(CATEGORY_CONFIG) as LogCategory[]));
  const scrollRef = useRef<HTMLDivElement>(null);

  // Subscribe to Telemetry stream
  useEffect(() => {
    const unsubscribe = Telemetry.subscribe((updatedLogs) => {
      setLogs(updatedLogs);
    });
    return unsubscribe;
  }, []);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs.length]);

  const toggleCategory = (cat: LogCategory) => {
    const next = new Set(activeCategories);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    setActiveCategories(next);
  };

  const copyToClipboard = () => {
    const json = JSON.stringify(logs, null, 2);
    navigator.clipboard.writeText(json);
    Telemetry.success('System', 'Logs copied to clipboard');
  };

  const filteredLogs = logs.filter(log => {
    const matchesCategory = activeCategories.has(log.category);
    const matchesSearch = log.message.toLowerCase().includes(filterText.toLowerCase()) || 
                          log.category.toLowerCase().includes(filterText.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-x-0 bottom-0 h-[360px] bg-[#09090b] border-t border-zinc-800 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-[100] flex flex-col font-mono text-xs">
      
      {/* --- Toolbar --- */}
      <div className="h-9 bg-[#09090b] border-b border-zinc-800 flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 mr-4 text-zinc-600 select-none">
                <Terminal size={14} />
                <span className="font-bold tracking-tight">CONSOLE</span>
            </div>

            {/* Filter Input */}
            <div className="relative group">
                <Filter size={12} className="absolute left-2 top-1.5 text-zinc-600 group-focus-within:text-zinc-400 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Filter logs..." 
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    className="bg-zinc-900/50 border border-zinc-800/50 rounded pl-6 pr-2 py-0.5 w-32 focus:w-48 transition-all outline-none focus:border-zinc-700 text-zinc-300 placeholder-zinc-700"
                />
            </div>

            <div className="w-px h-3 bg-zinc-800 mx-2" />

            {/* Category Toggles */}
            {(Object.keys(CATEGORY_CONFIG) as LogCategory[]).map(cat => (
                <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={clsx(
                        "px-2 py-0.5 rounded border transition-colors flex items-center gap-1.5 text-[10px]",
                        activeCategories.has(cat) 
                            ? "bg-zinc-800/50 border-zinc-700/50 text-zinc-300" 
                            : "bg-transparent border-transparent text-zinc-600 hover:text-zinc-400"
                    )}
                >
                    {CATEGORY_CONFIG[cat].icon}
                    <span>{cat}</span>
                </button>
            ))}
        </div>

        <div className="flex items-center gap-1">
            <button 
                onClick={copyToClipboard}
                title="Copy as JSON"
                className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 rounded transition-colors"
            >
                <Copy size={13} />
            </button>
            <button 
                onClick={() => Telemetry.clear()}
                title="Clear Console"
                className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800/50 rounded transition-colors"
            >
                <Trash2 size={13} />
            </button>
            <div className="w-px h-3 bg-zinc-800 mx-1" />
            <button 
                onClick={onClose}
                className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 rounded transition-colors"
            >
                <X size={14} />
            </button>
        </div>
      </div>

      {/* --- Log Stream --- */}
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto overflow-x-hidden bg-[#050505] scroll-smooth"
      >
        {filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-800 select-none">
                <Terminal size={24} strokeWidth={1} className="mb-2 opacity-50" />
                <p className="text-[10px]">Ready to capture events</p>
            </div>
        ) : (
            filteredLogs.map((log) => <LogItem key={log.id} log={log} />)
        )}
      </div>
    </div>
  );
};

// Sub-component for individual rows
const LogItem: React.FC<{ log: LogEntry }> = ({ log }) => {
    const [expanded, setExpanded] = useState(false);
    const style = LEVEL_CONFIG[log.level];
    const catStyle = CATEGORY_CONFIG[log.category];

    // Format timestamp: HH:MM:SS.ms
    const date = new Date(log.timestamp);
    const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.${date.getMilliseconds().toString().padStart(3, '0')}`;

    return (
        <div className={clsx("border-b border-white/[0.02] font-mono text-[11px] group transition-colors hover:bg-white/[0.02]", style.bg)}>
            {/* Header / Summary Line */}
            <div 
                className="flex items-start py-0.5 px-3 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                {/* Expand Chevron */}
                <div className="w-4 mt-0.5 text-zinc-600">
                    {log.details ? (expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />) : null}
                </div>

                {/* Timestamp */}
                <span className="text-zinc-600 mr-3 shrink-0 select-none w-16 tabular-nums">{timeStr}</span>

                {/* Category Pill */}
                <span className={clsx("mr-3 shrink-0 flex items-center gap-1 w-24", catStyle.color)}>
                    {/* Icon removed from row for cleaner look, relying on color code */}
                    <span className="font-semibold opacity-90">{log.category}</span>
                </span>

                {/* Message */}
                <span className={clsx("flex-1 break-all leading-relaxed", style.text)}>
                    {log.message}
                </span>

                {/* Source File (Mock) */}
                <span className="text-zinc-700 text-[10px] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity select-none">
                    src/main.rs:42
                </span>
            </div>

            {/* Expanded Details (JSON) */}
            {expanded && log.details && (
                <div className="pl-12 pr-4 pb-2 pt-1">
                    <div className="bg-[#0a0a0c] border border-zinc-800/50 rounded p-2 overflow-x-auto">
                        <pre className="text-zinc-400">{JSON.stringify(log.details, null, 2)}</pre>
                    </div>
                </div>
            )}
        </div>
    );
}