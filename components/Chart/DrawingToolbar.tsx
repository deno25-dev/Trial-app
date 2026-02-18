import React, { useState, useRef } from 'react';
import { GripVertical, Trash2, Type, Square, Palette, ChevronDown } from 'lucide-react';
import { Drawing } from '../../types';
import clsx from 'clsx';

interface DrawingToolbarProps {
    drawing: Drawing;
    onUpdate: (updates: Partial<Drawing['properties']>) => void;
    onDelete: () => void;
    onEdit: () => void;
}

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({ drawing, onUpdate, onDelete, onEdit }) => {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const initialPos = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        isDragging.current = true;
        dragStart.current = { x: e.clientX, y: e.clientY };
        initialPos.current = { ...position };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging.current) return;
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        setPosition({ x: initialPos.current.x + dx, y: initialPos.current.y + dy });
    };

    const handleMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'default';
    };

    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#ffffff'];

    const hasBackground = ['text', 'rectangle', 'triangle', 'rotated_rectangle'].includes(drawing.type);

    return (
        <div 
            className="absolute z-50 select-none animate-in fade-in zoom-in-95 duration-100"
            style={{
                top: 'calc(20% + ' + position.y + 'px)',
                left: 'calc(50% + ' + position.x + 'px)',
                transform: 'translate(-50%, -100%)'
            }}
            onMouseDown={(e) => e.stopPropagation()} // Prevent chart click-through
        >
            <div className="flex items-center bg-surface/80 backdrop-blur-md border border-border rounded-full px-1.5 py-1 shadow-2xl gap-1">
                
                {/* Drag Handle */}
                <div 
                    className="p-1.5 text-muted hover:text-text cursor-grab active:cursor-grabbing"
                    onMouseDown={handleMouseDown}
                >
                    <GripVertical size={14} />
                </div>

                <div className="w-px h-4 bg-border mx-0.5" />

                {/* Color Picker */}
                <div className="group relative">
                    <button className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
                        <div 
                            className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                            style={{ backgroundColor: drawing.properties.color }} 
                        />
                    </button>
                    {/* Color Popup */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 p-1.5 bg-surface border border-border rounded-lg shadow-xl flex gap-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
                        {colors.map(c => (
                            <button
                                key={c}
                                className="w-4 h-4 rounded-full border border-white/10 hover:scale-110 transition-transform"
                                style={{ backgroundColor: c }}
                                onClick={() => {
                                    const updates: any = { color: c };
                                    // Update bg color too if it's set
                                    if (hasBackground) {
                                        updates.backgroundColor = c + '33';
                                    }
                                    onUpdate(updates);
                                }}
                            />
                        ))}
                    </div>
                </div>

                {drawing.type === 'text' && (
                    <>
                        <div className="w-px h-4 bg-border mx-0.5" />
                        
                        {/* Font Size */}
                        <div className="flex items-center gap-0.5 px-2 py-1 rounded hover:bg-white/10 cursor-pointer text-xs font-medium text-text">
                            <span>T{drawing.properties.fontSize}</span>
                            <ChevronDown size={10} className="text-muted" />
                        </div>

                        {/* Edit Text */}
                        <button 
                            onClick={onEdit}
                            className="p-1.5 text-muted hover:text-text hover:bg-white/10 rounded transition-colors"
                            title="Edit Text"
                        >
                            <Type size={16} />
                        </button>
                    </>
                )}

                {hasBackground && (
                    <>
                         <div className="w-px h-4 bg-border mx-0.5" />
                        {/* Background Toggle */}
                        <button 
                            onClick={() => onUpdate({ showBackground: !drawing.properties.showBackground })}
                            className={clsx(
                                "p-1.5 rounded transition-colors",
                                drawing.properties.showBackground ? "text-primary bg-primary/10" : "text-muted hover:text-text hover:bg-white/10"
                            )}
                            title="Toggle Fill"
                        >
                            <Square size={16} fill={drawing.properties.showBackground ? "currentColor" : "none"} />
                        </button>
                    </>
                )}

                <div className="w-px h-4 bg-border mx-0.5" />

                {/* Delete */}
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    className="p-1.5 text-muted hover:text-danger hover:bg-danger/10 rounded transition-colors"
                    title="Delete"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
};