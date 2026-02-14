
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StickyNote as StickyNoteType } from '../../types';
import { 
    X, 
    Minus, 
    Save, 
    Pin, 
    Palette, 
    Type, 
    PenTool, 
    Eraser, 
    ArrowDownRight,
    GripVertical
} from 'lucide-react';
import clsx from 'clsx';

interface StickyNoteProps {
    note: StickyNoteType;
    onSave: (note: StickyNoteType) => void;
    onDelete: (id: string) => void;
}

const COLORS = [
    { name: 'Yellow', value: '#fef08a' }, // yellow-200
    { name: 'Blue', value: '#bae6fd' },   // sky-200
    { name: 'Green', value: '#bbf7d0' },  // green-200
    { name: 'Pink', value: '#fbcfe8' },   // pink-200
    { name: 'Purple', value: '#e9d5ff' }, // purple-200
    { name: 'Grey', value: '#e4e4e7' },   // zinc-200
];

type ToolType = 'text' | 'ink' | 'eraser';

export const StickyNote: React.FC<StickyNoteProps> = ({ note, onSave, onDelete }) => {
    // Local State
    const [position, setPosition] = useState(note.position);
    const [size, setSize] = useState(note.size);
    const [content, setContent] = useState(note.content);
    const [color, setColor] = useState(note.color);
    const [title, setTitle] = useState(note.title || "Untitled Note");
    const [isPinned, setIsPinned] = useState(note.isPinned || false);
    const [isMinimized, setIsMinimized] = useState(note.isMinimized || false);
    const [activeTool, setActiveTool] = useState<ToolType>('text');
    const [isPaletteOpen, setIsPaletteOpen] = useState(false);
    
    // Refs
    const noteRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDragging = useRef(false);
    const isResizing = useRef(false);
    const isDrawing = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const initialPos = useRef({ x: 0, y: 0 });
    const initialSize = useRef({ w: 0, h: 0 });

    // Sync from props
    useEffect(() => {
        setPosition(note.position);
        setSize(note.size);
        setContent(note.content);
        setColor(note.color);
        setTitle(note.title || "Untitled Note");
        setIsPinned(note.isPinned || false);
        setIsMinimized(note.isMinimized || false);
    }, [note.id]);

    // Save Helper
    const saveToDb = useCallback((updates: Partial<StickyNoteType>) => {
        onSave({
            ...note,
            position,
            size,
            content,
            title,
            color,
            isPinned,
            isMinimized,
            lastModified: Date.now(),
            ...updates
        });
    }, [note, position, size, content, title, color, isPinned, isMinimized, onSave]);

    // Auto-save title on blur or pause
    useEffect(() => {
        const handler = setTimeout(() => {
            if (title !== note.title) {
                saveToDb({ title });
            }
        }, 1000);
        return () => clearTimeout(handler);
    }, [title]);

    // CANVAS LOGIC
    // Load ink data when canvas mounts or resizes
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear before redraw to prevent artifacts
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (note.inkData) {
            const img = new Image();
            img.src = note.inkData;
            img.onload = () => {
                ctx.drawImage(img, 0, 0);
            };
        }
    }, [size, note.inkData, isMinimized]); // Re-run on resize or if external inkData changes

    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        if (activeTool === 'text') return;
        
        isDrawing.current = true;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        ctx.beginPath();
        ctx.moveTo(x, y);
        
        // Settings
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (activeTool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = 15;
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = '#000000'; // Default black ink
            ctx.lineWidth = 2;
        }
    };

    const handleCanvasMouseMove = (e: React.MouseEvent) => {
        if (!isDrawing.current || activeTool === 'text') return;
        
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const handleCanvasMouseUp = () => {
        if (!isDrawing.current) return;
        isDrawing.current = false;
        
        // Save Ink
        const canvas = canvasRef.current;
        if (canvas) {
            const dataUrl = canvas.toDataURL();
            saveToDb({ inkData: dataUrl });
        }
    };

    // WINDOW DRAG LOGIC
    const handleDragStart = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
        e.preventDefault();
        e.stopPropagation();
        isDragging.current = true;
        dragStart.current = { x: e.clientX, y: e.clientY };
        initialPos.current = { ...position };

        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd as any);
        document.body.style.cursor = 'grabbing';
    };

    const handleDragMove = (e: MouseEvent) => {
        if (!isDragging.current) return;
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        setPosition({
            x: initialPos.current.x + dx,
            y: initialPos.current.y + dy
        });
    };

    const handleDragEnd = (e: MouseEvent) => {
        isDragging.current = false;
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd as any);
        document.body.style.cursor = 'default';
        saveToDb({ position: { 
            x: initialPos.current.x + e.clientX - dragStart.current.x, 
            y: initialPos.current.y + e.clientY - dragStart.current.y 
        } });
    };

    // WINDOW RESIZE LOGIC
    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        isResizing.current = true;
        dragStart.current = { x: e.clientX, y: e.clientY };
        initialSize.current = { ...size };

        document.addEventListener('mousemove', handleResizeMove);
        document.addEventListener('mouseup', handleResizeEnd as any);
    };

    const handleResizeMove = (e: MouseEvent) => {
        if (!isResizing.current) return;
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        setSize({
            w: Math.max(200, initialSize.current.w + dx),
            h: Math.max(150, initialSize.current.h + dy)
        });
    };

    const handleResizeEnd = (e: MouseEvent) => {
        isResizing.current = false;
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd as any);
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        saveToDb({
            size: {
                w: Math.max(200, initialSize.current.w + dx),
                h: Math.max(150, initialSize.current.h + dy)
            }
        });
    };

    // Auto-save content
    useEffect(() => {
        const handler = setTimeout(() => {
            if (content !== note.content) {
                saveToDb({ content });
            }
        }, 1000);
        return () => clearTimeout(handler);
    }, [content]);

    return (
        <div 
            ref={noteRef}
            className={clsx(
                "absolute rounded-lg shadow-xl overflow-visible flex flex-col border border-black/10 transition-shadow",
                isDragging.current ? "shadow-2xl" : "shadow-xl"
            )}
            style={{
                left: position.x,
                top: position.y,
                width: size.w,
                height: isMinimized ? 'auto' : size.h,
                backgroundColor: color,
                zIndex: isPinned ? 50 : 20
            }}
            onMouseDown={() => {}}
        >
            {/* Header */}
            <div 
                className="h-8 flex items-center justify-between px-2 cursor-grab active:cursor-grabbing border-b border-black/5 select-none"
                onMouseDown={handleDragStart}
            >
                <div className="flex items-center gap-1 opacity-70 hover:opacity-100 flex-1 min-w-0 mr-2">
                    <GripVertical size={14} className="text-black/40 flex-shrink-0" />
                    <input 
                        className="bg-transparent border-none outline-none text-xs font-bold text-black/70 placeholder-black/30 w-full hover:bg-black/5 rounded px-1 transition-colors"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Untitled Note"
                        onMouseDown={(e) => e.stopPropagation()} // Allow selecting text without dragging
                        onBlur={() => saveToDb({ title })}
                    />
                </div>
                
                <div className="flex items-center gap-0.5 flex-shrink-0">
                    {/* Palette */}
                    <div className="relative">
                        <button 
                            onClick={() => setIsPaletteOpen(!isPaletteOpen)}
                            className="p-1 hover:bg-black/10 rounded text-black/60 hover:text-black transition-colors"
                        >
                            <Palette size={12} />
                        </button>
                        {isPaletteOpen && (
                            <div className="absolute top-full right-0 mt-1 p-1 bg-white border border-gray-200 shadow-lg rounded-lg flex gap-1 z-50">
                                {COLORS.map(c => (
                                    <button
                                        key={c.name}
                                        className="w-4 h-4 rounded-full border border-gray-300 hover:scale-110 transition-transform"
                                        style={{ backgroundColor: c.value }}
                                        onClick={() => {
                                            setColor(c.value);
                                            saveToDb({ color: c.value });
                                            setIsPaletteOpen(false);
                                        }}
                                        title={c.name}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={() => {
                            setIsPinned(!isPinned);
                            saveToDb({ isPinned: !isPinned });
                        }}
                        className={clsx("p-1 rounded transition-colors", isPinned ? "bg-black/10 text-black" : "hover:bg-black/10 text-black/60")}
                        title="Pin to Top"
                    >
                        <Pin size={12} className={isPinned ? "fill-current" : ""} />
                    </button>

                    <div className="w-px h-3 bg-black/10 mx-1" />

                    {/* Tools */}
                    <button 
                        onClick={() => setActiveTool('text')}
                        className={clsx("p-1 rounded transition-colors font-bold", activeTool === 'text' ? "bg-black/10 text-black" : "text-black/60 hover:bg-black/5")}
                        title="Text Mode"
                    >
                        <span className="flex items-center justify-center w-3 h-3 text-[10px] font-serif">T</span>
                    </button>
                    <button 
                        onClick={() => setActiveTool('ink')}
                        className={clsx("p-1 rounded transition-colors", activeTool === 'ink' ? "bg-black/10 text-black" : "text-black/60 hover:bg-black/5")}
                        title="Ink Mode"
                    >
                        <PenTool size={12} />
                    </button>
                    <button 
                        onClick={() => setActiveTool('eraser')}
                        className={clsx("p-1 rounded transition-colors", activeTool === 'eraser' ? "bg-black/10 text-black" : "text-black/60 hover:bg-black/5")}
                        title="Eraser"
                    >
                        <Eraser size={12} />
                    </button>
                    
                    <button 
                        onClick={() => saveToDb({})}
                        className="p-1 hover:bg-black/10 rounded text-black/60" 
                        title="Save"
                    >
                        <Save size={12} />
                    </button>

                    <div className="w-px h-3 bg-black/10 mx-1" />

                    <button 
                        onClick={() => {
                            setIsMinimized(!isMinimized);
                            saveToDb({ isMinimized: !isMinimized });
                        }}
                        className="p-1 hover:bg-black/10 rounded text-black/60"
                    >
                        <Minus size={12} />
                    </button>
                    <button 
                        onClick={() => onDelete(note.id)}
                        className="p-1 hover:bg-red-500/20 hover:text-red-600 rounded text-black/60"
                    >
                        <X size={12} />
                    </button>
                </div>
            </div>

            {/* Body */}
            {!isMinimized && (
                <div className="flex-1 relative group overflow-hidden">
                    {/* Text Layer */}
                    <textarea 
                        className={clsx(
                            "absolute inset-0 w-full h-full bg-transparent resize-none focus:outline-none p-3 text-sm text-black/80 font-medium placeholder-black/30 font-sans leading-relaxed z-10",
                            activeTool !== 'text' && "pointer-events-none opacity-50"
                        )}
                        placeholder="Write something..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        spellCheck={false}
                    />
                    
                    {/* Ink Layer */}
                    <canvas 
                        ref={canvasRef}
                        width={size.w}
                        height={size.h - 32} // Subtract header height
                        className={clsx(
                            "absolute inset-0 z-20 touch-none",
                            activeTool === 'text' ? "pointer-events-none" : "cursor-crosshair"
                        )}
                        onMouseDown={handleCanvasMouseDown}
                        onMouseMove={handleCanvasMouseMove}
                        onMouseUp={handleCanvasMouseUp}
                        onMouseLeave={handleCanvasMouseUp}
                    />
                    
                    {/* Resize Handle */}
                    <div 
                        className="absolute bottom-0 right-0 p-1 cursor-nwse-resize opacity-0 group-hover:opacity-50 hover:opacity-100 transition-opacity z-30"
                        onMouseDown={handleResizeStart}
                    >
                        <ArrowDownRight size={14} className="text-black/40" />
                    </div>
                </div>
            )}
        </div>
    );
};
