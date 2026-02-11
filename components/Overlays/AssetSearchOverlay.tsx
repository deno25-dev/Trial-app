import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, FileText, Database, X, RefreshCw, Folder, Star, Clock } from 'lucide-react';
import { useChart } from '../../context/ChartContext';
import { TauriService } from '../../services/tauriService';
import { AssetMetadata } from '../../types';
import clsx from 'clsx';
import { Telemetry } from '../../utils/telemetry';

export const AssetSearchOverlay: React.FC = () => {
  const { isSearchOpen, toggleSearch, setSymbol } = useChart();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Focus input on open
  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSearchTerm('');
    }
  }, [isSearchOpen]);

  // Fetch Assets (Cached Metadata)
  const { data: assets, isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: TauriService.getAssets,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    enabled: isSearchOpen, // Only fetch when open
  });

  // Manual Scan Mutation
  const scanMutation = useMutation({
    mutationFn: TauriService.scanAssets,
    onSuccess: (newData) => {
        queryClient.setQueryData(['assets'], newData);
        Telemetry.info('UI', 'Asset Library Manually Refreshed');
    }
  });

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isSearchOpen) return;
      
      if (e.key === 'Escape') {
        toggleSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, toggleSearch]);

  if (!isSearchOpen) return null;

  // Filter Logic
  const filteredAssets = assets 
    ? assets.filter(a => a.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || a.path.toLowerCase().includes(searchTerm.toLowerCase()))
    : [];

  const handleSelect = (symbol: string) => {
      setSymbol(symbol);
      toggleSearch();
      Telemetry.info('UI', `Asset Selected via Overlay: ${symbol}`);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-32 px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/60 backdrop-blur-md"
        onClick={toggleSearch}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-2xl bg-[#09090b] border border-zinc-800 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Folder size={18} />
            </div>
            <div className="flex-1">
                <h2 className="text-sm font-bold text-zinc-100">Asset Library</h2>
                <p className="text-[10px] text-zinc-500">{assets?.length || 0} symbols found in Internal Database</p>
            </div>
            <button 
                onClick={toggleSearch}
                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors"
            >
                <X size={18} />
            </button>
        </div>

        {/* Search Bar */}
        <div className="relative border-b border-zinc-800">
            <Search className="absolute left-4 top-3.5 text-blue-500" size={20} />
            <input 
                ref={inputRef}
                type="text" 
                placeholder="Search symbols (e.g. BTC, ETH, SPX)..." 
                className="w-full bg-transparent px-12 py-3.5 text-lg text-zinc-200 placeholder-zinc-600 outline-none font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            {/* Action Buttons */}
            <div className="absolute right-3 top-2.5 flex items-center gap-2">
                <button 
                    onClick={() => scanMutation.mutate()}
                    disabled={scanMutation.isPending}
                    className={clsx(
                        "p-1.5 rounded-md border border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 transition-all",
                        scanMutation.isPending && "animate-spin text-blue-400 border-blue-500/30"
                    )}
                    title="Rescan ./Assets Folder"
                >
                    <RefreshCw size={14} />
                </button>
                <button className="px-3 py-1.5 rounded-md border border-zinc-700 bg-zinc-800/50 text-xs font-medium text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5">
                    <Star size={12} />
                    Favorites Only
                </button>
            </div>
        </div>

        {/* Results List */}
        <div className="max-h-[400px] overflow-y-auto min-h-[300px] bg-[#050505]">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-48 text-zinc-500 gap-3">
                    <RefreshCw className="animate-spin" size={24} />
                    <span className="text-xs">Loading Index...</span>
                </div>
            ) : filteredAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-zinc-600 gap-4">
                    <Database size={48} strokeWidth={1} className="opacity-50" />
                    <div className="text-center">
                        <p className="font-medium text-zinc-400">Database Empty</p>
                        <p className="text-xs mt-1">Add folders to /src/database/ to populate this library.</p>
                    </div>
                </div>
            ) : (
                <div className="p-2 flex flex-col gap-1">
                    {filteredAssets.map((asset, idx) => (
                        <button
                            key={asset.id}
                            onClick={() => handleSelect(asset.symbol)}
                            className={clsx(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group border border-transparent",
                                selectedIdx === idx 
                                    ? "bg-blue-500/10 border-blue-500/20" 
                                    : "hover:bg-zinc-900 border-transparent hover:border-zinc-800"
                            )}
                            onMouseEnter={() => setSelectedIdx(idx)}
                        >
                            <div className={clsx(
                                "w-8 h-8 rounded flex items-center justify-center text-xs font-bold uppercase",
                                asset.path.includes("Crypto") ? "bg-orange-500/10 text-orange-500" :
                                asset.path.includes("Forex") ? "bg-green-500/10 text-green-500" :
                                "bg-zinc-800 text-zinc-400"
                            )}>
                                {asset.symbol.substring(0, 1)}
                            </div>
                            
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-zinc-200 group-hover:text-blue-400 transition-colors">
                                        {asset.symbol}
                                    </span>
                                    <span className="text-[10px] px-1.5 rounded bg-zinc-800 text-zinc-500 font-mono">
                                        {asset.size}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <FileText size={10} className="text-zinc-600" />
                                    <span className="text-[10px] text-zinc-600 font-mono truncate max-w-[300px]">
                                        {asset.path}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                                    <Clock size={10} />
                                    <span>{new Date(asset.lastModified).toLocaleDateString()}</span>
                                </div>
                                <span className="text-[9px] text-blue-500 bg-blue-500/10 px-1.5 rounded">
                                    CACHED
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="bg-[#09090b] border-t border-zinc-800 p-2 flex items-center justify-between px-4 text-[10px] text-zinc-500">
            <span>Select a timeframe to Quick-Load the chart.</span>
            <div className="flex items-center gap-4">
                <span className="hover:text-zinc-300 cursor-pointer">ESC to close</span>
            </div>
        </div>

      </div>
    </div>
  );
};