import React, { useState, useEffect } from 'react';
import { useChart } from '../../context/ChartContext';
import { TauriService } from '../../services/tauriService';
import { FileSystemItem } from '../../types';
import { Folder, FileText, ChevronRight, X, ArrowLeft, Database, FolderOpen } from 'lucide-react';
import clsx from 'clsx';
import { Telemetry } from '../../utils/telemetry';

export const DataExplorerSidebar: React.FC = () => {
  const { isDataExplorerOpen, toggleDataExplorer, setSymbol } = useChart();
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [items, setItems] = useState<FileSystemItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load directory contents when path changes
  useEffect(() => {
    if (currentPath) {
      loadDirectory(currentPath);
    }
  }, [currentPath]);

  const loadDirectory = async (path: string) => {
    setIsLoading(true);
    try {
      const data = await TauriService.listDirectory(path);
      setItems(data);
    } catch (error) {
      Telemetry.error('System', 'Failed to list directory', { path, error });
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = async () => {
    try {
      const path = await TauriService.openDirectoryDialog();
      if (path) {
        setCurrentPath(path);
      }
    } catch (error) {
      Telemetry.error('System', 'Failed to open directory dialog', { error });
    }
  };

  const handleItemClick = (item: FileSystemItem) => {
    if (item.type === 'dir') {
      setCurrentPath(item.path);
    } else if (item.extension === 'csv') {
      setSymbol(item.name);
      Telemetry.info('UI', `Loaded External File: ${item.name}`, { path: item.path });
    } else {
        Telemetry.warn('UI', `Unsupported file type: ${item.extension}`);
    }
  };

  const handleUp = () => {
    if (!currentPath) return;
    // Simple mock logic for moving up directory
    const parts = currentPath.split('/');
    if (parts.length > 2) {
        parts.pop();
        setCurrentPath(parts.join('/'));
    } else {
        // At root of mount, maybe clear or go to root?
        // For this mock, we assume /mnt/external is the root user selected
        // So we keep them there or maybe just do nothing if they are at root
        if (currentPath === '/mnt/external') {
            // Do nothing, or reset to allow re-selection?
        } else {
             parts.pop();
             setCurrentPath(parts.join('/'));
        }
    }
  };

  // Extract breadcrumbs
  const breadcrumbs = currentPath ? currentPath.split('/').filter(Boolean) : [];

  return (
    <div className="h-full flex flex-col bg-surface/50 overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-surface">
        <div className="flex items-center gap-2">
            <Database size={16} className="text-primary" />
            <span className="font-bold text-sm">Data Explorer</span>
        </div>
        <button 
            onClick={toggleDataExplorer} 
            className="p-1 hover:bg-text/5 rounded text-muted hover:text-text transition-colors"
        >
            <X size={16} />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {!currentPath ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <FolderOpen size={32} className="text-primary" />
                </div>
                <h3 className="text-sm font-bold text-text mb-1">No Folder Selected</h3>
                <p className="text-xs text-muted mb-4">Open a local directory to analyze external CSV data.</p>
                <button 
                    onClick={handleOpenDialog}
                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded transition-colors"
                >
                    Select Folder
                </button>
            </div>
        ) : (
            <div className="flex flex-col min-h-0 h-full">
                {/* Navigation Bar */}
                <div className="px-3 py-2 border-b border-border flex items-center gap-2 bg-background/50">
                    <button 
                        onClick={handleUp}
                        className="p-1 hover:bg-text/10 rounded text-muted hover:text-text disabled:opacity-30"
                        title="Go Up"
                        disabled={currentPath === '/mnt/external'}
                    >
                        <ArrowLeft size={14} />
                    </button>
                    <div className="flex-1 overflow-hidden flex items-center gap-1 text-xs text-muted font-mono whitespace-nowrap mask-linear-fade">
                        {breadcrumbs.map((part, i) => (
                            <React.Fragment key={i}>
                                <span className={i === breadcrumbs.length -1 ? "text-text font-bold" : ""}>{part}</span>
                                {i < breadcrumbs.length - 1 && <ChevronRight size={10} />}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* File List */}
                <div className="flex-1 overflow-y-auto p-1">
                    {items.length === 0 && !isLoading && (
                         <div className="text-center p-4 text-xs text-muted">Folder is empty.</div>
                    )}
                    {items.map((item) => (
                        <div 
                            key={item.path}
                            onClick={() => handleItemClick(item)}
                            className={clsx(
                                "flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors group",
                                "hover:bg-text/5"
                            )}
                        >
                            <div className={clsx(
                                "w-6 h-6 flex items-center justify-center rounded shrink-0",
                                item.type === 'dir' ? "text-blue-400 bg-blue-400/10" : 
                                item.extension === 'csv' ? "text-emerald-500 bg-emerald-500/10" : "text-zinc-500 bg-zinc-500/10"
                            )}>
                                {item.type === 'dir' ? <Folder size={14} /> : <FileText size={14} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-text truncate group-hover:text-primary transition-colors">
                                    {item.name}
                                </div>
                                {item.type === 'file' && (
                                    <div className="text-[10px] text-muted flex items-center gap-2">
                                        <span>{item.size}</span>
                                        <span className="w-1 h-1 rounded-full bg-border" />
                                        <span className="uppercase">{item.extension}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>
      
      {/* Footer Status */}
      {currentPath && (
          <div className="p-2 border-t border-border bg-background/50 text-[10px] text-muted flex justify-between items-center">
             <span>{items.length} items</span>
             <span>Read-Only (Lane 2)</span>
          </div>
      )}
    </div>
  );
};