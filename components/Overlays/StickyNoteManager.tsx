
import React from 'react';
import { useStickyNotes, useSaveStickyNote, useDeleteStickyNote } from '../../hooks/usePersistence';
import { StickyNote } from './StickyNote';

export const StickyNoteManager: React.FC = () => {
    const { data: notes } = useStickyNotes();
    const saveMutation = useSaveStickyNote();
    const deleteMutation = useDeleteStickyNote();

    if (!notes || notes.length === 0) return null;

    return (
        <>
            {notes.map((note) => (
                <StickyNote 
                    key={note.id} 
                    note={note} 
                    onSave={(updated) => saveMutation.mutate(updated)}
                    onDelete={(id) => deleteMutation.mutate(id)}
                />
            ))}
        </>
    );
};
