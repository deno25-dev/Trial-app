import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Check } from 'lucide-react';
import clsx from 'clsx';

interface TextToolModalProps {
    isOpen: boolean;
    initialText: string;
    onApply: (text: string) => void;
    onClose: () => void;
    position: { x: number, y: number };
}

export const TextToolModal: React.FC<TextToolModalProps> = ({ isOpen, initialText, onApply, onClose, position }) => {
    const [text, setText] = useState(initialText);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isOpen) {
            setText(initialText);
            setTimeout(() => {
                textareaRef.current?.focus();
                textareaRef.current?.select();
            }, 50);
        }
    }, [isOpen, initialText]);

    if (!isOpen) return null;

    return (
        <div 
            className="absolute z-[100] animate-in fade-in zoom-in-95 duration-100"
            style={{ 
                left: Math.min(position.x, window.innerWidth - 320), // Prevent overflow right
                top: Math.min(position.y, window.innerHeight - 200)  // Prevent overflow bottom
            }}
        >
            <div className="w-[300px] bg-surface/95 backdrop-blur-md border border-border shadow-2xl rounded-lg overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-white/5 handle cursor-move">
                    <span className="text-xs font-bold text-muted uppercase tracking-wider">Edit Text</span>
                    <button onClick={onClose} className="text-muted hover:text-text transition-colors">
                        <X size={14} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-3">
                    <div className="relative">
                        <textarea
                            ref={textareaRef}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            className="w-full h-24 bg-background border border-border rounded-md p-2 text-sm text-text resize-none focus:outline-none focus:border-primary transition-colors font-sans"
                            placeholder="Enter text..."
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    onApply(text);
                                }
                            }}
                        />
                        <div className="absolute bottom-2 right-2">
                            <Bot size={16} className="text-success opacity-80" />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-2 border-t border-border bg-white/5">
                    <button
                        onClick={() => onApply(text)}
                        className="w-full py-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded flex items-center justify-center gap-2 transition-colors"
                    >
                        <Check size={14} />
                        Apply
                    </button>
                </div>
            </div>
        </div>
    );
};