import { useState, useCallback, useEffect } from 'react';
import { Drawing } from '../types';
import { TauriService } from '../services/tauriService';
import { Telemetry } from '../utils/telemetry';
import { useChart } from '../context/ChartContext';

export const useDrawingRegistry = (sourceId: string) => {
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const { clearDrawings } = useChart();

  // 1. Fetch from Source of Truth (Backend)
  const fetchDrawings = useCallback(async () => {
    if (!sourceId) return;
    try {
      const loaded = await TauriService.loadDrawings(sourceId);
      // Filter out orphaned/corrupt data if any
      const validDrawings = loaded.filter(d => d.points && d.points.length > 0);
      setDrawings(validDrawings);
      Telemetry.debug('Persistence', `Hydrated ${validDrawings.length} drawings from DB`, { sourceId });
    } catch (e) {
      Telemetry.error('Persistence', 'Failed to hydrate drawings', { error: e });
    }
  }, [sourceId]);

  // Initial Load when sourceId changes
  useEffect(() => {
    fetchDrawings();
  }, [fetchDrawings]);

  // 2. Save with Global Sync Handshake
  const saveDrawing = useCallback(async (drawing: Drawing) => {
    // A. Optimistic Update (Immediate UI feedback)
    setDrawings(prev => {
      const exists = prev.find(d => d.id === drawing.id);
      if (exists) {
        return prev.map(d => d.id === drawing.id ? drawing : d);
      }
      return [...prev, drawing];
    });

    // B. Persist
    try {
      await TauriService.saveDrawing(drawing);
      Telemetry.success('Persistence', 'Drawing Synced', { id: drawing.id });
    } catch (e) {
      Telemetry.error('Persistence', 'Save failed', { error: e });
    }
  }, [fetchDrawings]);

  // 3. Delete with Sync
  const deleteDrawing = useCallback(async (id: string) => {
    // Optimistic
    setDrawings(prev => prev.filter(d => d.id !== id));

    try {
      await TauriService.deleteDrawing(id);
    } catch (e) {
      Telemetry.error('Persistence', 'Delete failed', { error: e });
    }
  }, [fetchDrawings]);

  // 4. Clear All
  const clearAllDrawings = useCallback(async () => {
    setDrawings([]);
    try {
        await TauriService.clearAllDrawings(sourceId);
    } catch (e) {
        Telemetry.error('Persistence', 'Clear all failed', { error: e });
        await fetchDrawings();
    }
  }, [sourceId, fetchDrawings]);

  return {
    drawings,
    setDrawings, // Exposed for temporary drag updates (FinancialChart internal state)
    saveDrawing,
    deleteDrawing,
    clearAllDrawings,
    fetchDrawings
  };
};