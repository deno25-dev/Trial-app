import React, { useState, useEffect, useRef } from 'react';
import { X, Trash2, Copy, Filter, ChevronRight, ChevronDown, Terminal, Bug, Radio, Database, Activity, Globe, Layout, Server, AlertTriangle, CheckCircle, Info, Clock } from 'lucide-react';
import { Telemetry } from '../utils/telemetry';
import { LogEntry, LogCategory, LogLevel } from '../types';
import clsx from 'clsx';

// Category Configuration for Icons and Colors
const CATEGORY_CONFIG: Record<LogCategory, { icon: React.ReactNode; color: string }> = {
  UI: { icon: <Layout size={12} />, color: 'text-blue-400' },
  Network: { icon: <Globe size={12} />, color: 'text-purple-400' },
  Performance: { icon: <Activity size={12} />, color: 'text-pink-400' },
  Persistence: { icon: <Database size={12} />, color: 'text-yellow-500' },
  Bridge: { icon: <Server size={12} />, color: 'text-cyan-400' },
  Database: { icon: <Database size={12} />, color: 'text-orange-400' },
  System: { icon: <Terminal size={12} />, color: 'text-gray-400' },
};

const LEVEL_CONFIG: Record<LogLevel, { icon: React.ReactNode; bg: string; text: string; border: string }> = {
  info: { icon: <Info size={12} />, bg: 'bg-transparent', text: 'text-text', border: 'border-transparent' },
  warn: { icon: <AlertTriangle size={12} />, bg: 'bg-yellow-500/10', text: 'text-yellow-500', border: 'border-yellow-500/20' },
  error: { icon: <Bug size={12} />, bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20' },
  debug: { icon: <Terminal size={12} />, bg: 'bg-transparent', text: 'text-muted', border: 'border-transparent' },
  success: { icon: <CheckCircle size={12} />, bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/20' },
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
    <div className="fixed inset-x-0 bottom-0 h-[400px] bg-[#0a0a0c] border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-[100] flex flex-col font-mono text-xs">
      
      {/* --- Toolbar --- */}
      <div className="h-10 bg-surface border-b border-border flex items-center justify-between px-2 shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 mr-4 text-muted select-none">
                <Terminal size={14} />
                <span className="font-bold text-text">CONSOLE</span>
            </div>

            {/* Filter Input */}
            <div className="relative group">
                <Filter size={12} className="absolute left-2 top-1.5 text-muted group-focus-within:text-primary" />
                <input 
                    type="text" 
                    placeholder="Filter" 
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    className="bg-background border border-border rounded pl-6 pr-2 py-1 w-32 focus:w-48 transition-all outline-none focus:border-primary text-text placeholder-muted"
                />
            </div>

            <div className="w-px h-4 bg-border mx-2" />

            {/* Category Toggles */}
            {(Object.keys(CATEGORY_CONFIG) as LogCategory[]).map(cat => (
                <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={clsx(
                        "px-2 py-1 rounded border transition-colors flex items-center gap-1.5",
                        activeCategories.has(cat) 
                            ? "bg-primary/10 border-primary/30 text-text" 
                            : "bg-transparent border-transparent text-muted hover:bg-surface hover:text-text"
                    )}
                >
                    {CATEGORY_CONFIG[cat].icon}
                    <span>{cat}</span>
                </button>
            ))}
        </div>

        <div className="flex items-center gap-2">
            <button 
                onClick={copyToClipboard}
                title="Copy as JSON"
                className="p-1.5 text-muted hover:text-text hover:bg-surface rounded transition-colors"
            >
                <Copy size={14} />
            </button>
            <button 
                onClick={() => Telemetry.clear()}
                title="Clear Console"
                className="p-1.5 text-muted hover:text-danger hover:bg-surface rounded transition-colors"
            >
                <Trash2 size={14} />
            </button>
            <div className="w-px h-4 bg-border mx-1" />
            <button 
                onClick={onClose}
                className="p-1.5 text-muted hover:text-text hover:bg-surface rounded transition-colors"
            >
                <X size={16} />
            </button>
        </div>
      </div>

      {/* --- Log Stream --- */}
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto overflow-x-hidden p-2 bg-[#0d1117]"
      >
        {filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted opacity-50 select-none">
                <Terminal size={32} strokeWidth={1} className="mb-2" />
                <p>No logs found</p>
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
        <div className={clsx("border-b border-border/10 font-mono text-[11px] group", style.bg)}>
            {/* Header / Summary Line */}
            <div 
                className="flex items-start py-1 px-2 cursor-pointer hover:bg-white/5"
                onClick={() => setExpanded(!expanded)}
            >
                {/* Expand Chevron */}
                <div className="w-4 mt-0.5 text-muted">
                    {log.details ? (expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />) : null}
                </div>

                {/* Timestamp */}
                <span className="text-muted mr-3 shrink-0 select-none w-16">{timeStr}</span>

                {/* Category Pill */}
                <span className={clsx("mr-3 shrink-0 flex items-center gap-1 w-24", catStyle.color)}>
                    {catStyle.icon}
                    <span className="font-bold">{log.category}</span>
                </span>

                {/* Message */}
                <span className={clsx("flex-1 break-all", style.text)}>
                    {log.message}
                </span>

                {/* Source File (Mock) */}
                <span className="text-muted/40 text-[10px] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity select-none">
                    src/main.rs:42
                </span>
            </div>

            {/* Expanded Details (JSON) */}
            {expanded && log.details && (
                <div className="pl-10 pr-2 pb-2">
                    <div className="bg-black/30 border border-border/20 rounded p-2 overflow-x-auto">
                        <pre className="text-text/70">{JSON.stringify(log.details, null, 2)}</pre>
                    </div>
                </div>
            )}
        </div>
    );
}