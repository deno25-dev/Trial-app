import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TauriService } from '../services/tauriService';
import { StickyNote, ChartLayout, TradeLog } from '../types';
import { Telemetry } from '../utils/telemetry';

// --- STICKY NOTES ---

export const useStickyNotes = () => {
  return useQuery({
    queryKey: ['stickyNotes'],
    queryFn: async () => {
      // List all note files
      const files = await TauriService.listFolder('StickyNotes');
      const notes: StickyNote[] = [];
      for (const file of files) {
        const note = await TauriService.readJson<StickyNote>('StickyNotes', file);
        if (note) notes.push(note);
      }
      return notes;
    },
    staleTime: 1000 * 60, // 1 minute
  });
};

export const useSaveStickyNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (note: StickyNote) => {
      await TauriService.saveAtomicJson('StickyNotes', `${note.id}.json`, note);
      return note;
    },
    onMutate: async (newNote) => {
      // OPTIMISTIC UPDATE: Cancel refetches
      await queryClient.cancelQueries({ queryKey: ['stickyNotes'] });

      // Snapshot previous value
      const previousNotes = queryClient.getQueryData<StickyNote[]>(['stickyNotes']);

      // Optimistically update cache
      queryClient.setQueryData<StickyNote[]>(['stickyNotes'], (old) => {
        const existing = old || [];
        const index = existing.findIndex((n) => n.id === newNote.id);
        if (index !== -1) {
          const updated = [...existing];
          updated[index] = newNote;
          return updated;
        }
        return [...existing, newNote];
      });

      return { previousNotes };
    },
    onError: (err, newNote, context) => {
      Telemetry.error('Persistence', 'Failed to save Sticky Note', { error: err });
      // Rollback
      if (context?.previousNotes) {
        queryClient.setQueryData(['stickyNotes'], context.previousNotes);
      }
    },
    onSuccess: (data) => {
      Telemetry.success('Persistence', `Sticky Note Saved Atomically`, { id: data.id });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['stickyNotes'] });
    },
  });
};

// --- CHART LAYOUTS ---

export const useSaveLayout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (layout: ChartLayout) => {
      await TauriService.saveAtomicJson('Layouts', `${layout.id}.json`, layout);
      return layout;
    },
    onSuccess: (data) => {
      Telemetry.success('Persistence', `Layout Saved: ${data.name}`, { id: data.id });
      queryClient.invalidateQueries({ queryKey: ['layouts'] });
    },
    onError: (err) => {
      Telemetry.error('Persistence', 'Failed to save Layout', { error: err });
    }
  });
};

// --- TRADE LOGGING (SQL) ---

export const useLogTrade = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (trade: Omit<TradeLog, 'id'>) => {
      return await TauriService.logTrade(trade);
    },
    onSuccess: (id, variables) => {
      Telemetry.info('Database', `Trade Logged: ${variables.symbol} ${variables.side}`, { rowId: id });
      queryClient.invalidateQueries({ queryKey: ['trades', variables.symbol] });
    },
    onError: (err) => {
      Telemetry.error('Database', 'Trade Log Failed', { error: err });
    }
  });
};