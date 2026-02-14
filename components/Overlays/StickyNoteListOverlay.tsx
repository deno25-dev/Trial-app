
import React, { useState, useEffect } from 'react';
import { useChart } from '../../context/ChartContext';
import { useStickyNotes, useDeleteStickyNote } from '../../hooks/usePersistence';
import { StickyNote, X, Trash2, Calendar, FileText } from 'lucide-react';
import clsx from 'clsx';
import { Telemetry } from '../../utils/telemetry';

export const StickyNoteListOverlay: React.FC = () => {
    const { isStickyNoteManagerOpen, toggleStickyNoteManager } = useChart();
    const { data: notes, isLoading, refetch } = useStickyNotes();
    const deleteMutation = useDeleteStickyNote();
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Refresh on open
    useEffect(() => {
        if (isStickyNoteManagerOpen) {
            refetch();
            setSelectedId(null);
        }
    }, [isStickyNoteManagerOpen, refetch]);

    // Close on ESC
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isStickyNoteManagerOpen) return;
            if (e.key === 'Escape') toggleStickyNoteManager();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isStickyNoteManagerOpen, toggleStickyNoteManager]);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to permanently delete this note?')) {
            await deleteMutation.mutateAsync(id);
        }
    };

    const handleLoad = () => {
        if (selectedId) {
            // In the current architecture, active notes are always rendered if they exist in DB.
            // "Loading" simply means acknowledging its presence and closing the manager to view it.
            // We could optionally center the view or highlight it, but for now we just close the overlay.
            Telemetry.info('UI', `Sticky Note Loaded: ${selectedId}`);
            toggleStickyNoteManager();
        }
    };

    if (!isStickyNoteManagerOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={toggleStickyNoteManager}
            />

            {/* Modal */}
            <div className="relative w-full max-w-2xl bg-[#0F172A] border border-blue-900/30 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <StickyNote className="text-yellow-500" size={20} />
                        <h2 className="text-base font-bold text-white tracking-wide">Sticky Note Manager</h2>
                    </div>
                    <button 
                        onClick={toggleStickyNoteManager}
                        className="text-white/50 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* List Content */}
                <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[500px] p-4 bg-[#0B1121]">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full text-white/30 text-sm">Loading notes...</div>
                    ) : !notes || notes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-white/30 gap-2">
                            <StickyNote size={32} strokeWidth={1} />
                            <span className="text-sm">No saved notes found.</span>
                        </div>
                    ) : (
                        <div className="grid gap-2">
                            {notes.map((note) => {
                                const isSelected = selectedId === note.id;
                                return (
                                    <div 
                                        key={note.id}
                                        onClick={() => setSelectedId(note.id)}
                                        className={clsx(
                                            "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all group",
                                            isSelected 
                                                ? "bg-blue-500/10 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                                                : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* Icon Box */}
                                            <div className={clsx(
                                                "w-10 h-10 rounded-lg flex items-center justify-center text-yellow-500/80",
                                                isSelected ? "bg-yellow-500/20" : "bg-white/5"
                                            )}>
                                                <StickyNote size={18} />
                                            </div>

                                            {/* Meta Info */}
                                            <div className="flex flex-col gap-0.5">
                                                <span className={clsx(
                                                    "text-sm font-medium transition-colors",
                                                    isSelected ? "text-white" : "text-white/80"
                                                )}>
                                                    {note.title || "Untitled Note"}
                                                </span>
                                                <div className="flex items-center gap-3 text-[10px] text-white/40">
                                                    <span className="flex items-center gap-1">
                                                        <FileText size={10} />
                                                        {note.id.substring(0, 8)}.json
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Calendar size={10} />
                                                        {new Date(note.lastModified).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <button 
                                            onClick={(e) => handleDelete(e, note.id)}
                                            className="p-2 text-white/30 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            title="Delete Note"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
                    <div className="text-[10px] text-white/40 font-mono">
                         Click to load • Listing files from [Project_Root]/Database/StickyNotes/
                    </div>
                    {selectedId && (
                         <button 
                            onClick={handleLoad}
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded transition-colors shadow-lg shadow-blue-900/20"
                         >
                             Load Note
                         </button>
                    )}
                </div>

            </div>
        </div>
    );
};
