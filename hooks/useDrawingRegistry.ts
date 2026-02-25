import { useState, useCallback, useEffect, useRef } from 'react';
import { Drawing, DrawingCommand } from '../types';
import { TauriService } from '../services/tauriService';
import { Telemetry } from '../utils/telemetry';
import { useChart } from '../context/ChartContext';

export const useDrawingRegistry = (sourceId: string) => {
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const { clearDrawings } = useChart();

  // --- HISTORY SYSTEM (COMMAND PATTERN) ---
  const [past, setPast] = useState<DrawingCommand[]>([]);
  const [future, setFuture] = useState<DrawingCommand[]>([]);
  const isInternalUpdateRef = useRef(false);

  const pushCommand = useCallback((command: DrawingCommand) => {
    setPast(prev => [...prev, command]);
    setFuture([]); // Clear redo stack on new action
  }, []);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const command = past[past.length - 1];
    setPast(prev => prev.slice(0, -1));
    
    isInternalUpdateRef.current = true;
    command.undo();
    isInternalUpdateRef.current = false;
    
    setFuture(prev => [command, ...prev]);
    Telemetry.info('UI', `Undo: ${command.label || 'Action'}`);
  }, [past]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const command = future[0];
    setFuture(prev => prev.slice(1));
    
    isInternalUpdateRef.current = true;
    command.execute();
    isInternalUpdateRef.current = false;
    
    setPast(prev => [...prev, command]);
    Telemetry.info('UI', `Redo: ${command.label || 'Action'}`);
  }, [future]);

  // 1. Fetch from Source of Truth (Backend)
  const fetchDrawings = useCallback(async () => {
    if (!sourceId) return;
    try {
      const loaded = await TauriService.loadDrawings(sourceId);
      // Filter out orphaned/corrupt data if any
      const validDrawings = loaded.filter(d => d.points && d.points.length > 0);
      setDrawings(validDrawings);
      // Clear history when switching symbols/intervals to prevent cross-contamination
      setPast([]);
      setFuture([]);
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
  const saveDrawing = useCallback(async (drawing: Drawing, isMove: boolean = false) => {
    let oldDrawing: Drawing | null = null;

    // A. Optimistic Update (Immediate UI feedback)
    setDrawings(prev => {
      const existing = prev.find(d => d.id === drawing.id);
      if (existing) {
        oldDrawing = { ...existing };
        return prev.map(d => d.id === drawing.id ? drawing : d);
      }
      return [...prev, drawing];
    });

    // B. Push to History (if not an internal undo/redo update)
    // We defer this slightly to ensure oldDrawing is captured if it exists
    if (!isInternalUpdateRef.current) {
        const command: DrawingCommand = {
            label: oldDrawing ? (isMove ? 'Move' : 'Modify') : 'Add',
            execute: () => saveDrawing(drawing),
            undo: () => {
                if (oldDrawing) {
                    saveDrawing(oldDrawing);
                } else {
                    deleteDrawing(drawing.id);
                }
            }
        };
        pushCommand(command);
    }

    // C. Persist
    try {
      await TauriService.saveDrawing(drawing);
      if (!isMove) Telemetry.success('Persistence', 'Drawing Synced', { id: drawing.id });
    } catch (e) {
      Telemetry.error('Persistence', 'Save failed', { error: e });
    }
  }, [pushCommand]); // Removed drawings dependency

  // 3. Delete with Sync
  const deleteDrawing = useCallback(async (id: string) => {
    let drawingToDelete: Drawing | null = null;

    // Optimistic
    setDrawings(prev => {
        const target = prev.find(d => d.id === id);
        if (target) drawingToDelete = { ...target };
        return prev.filter(d => d.id !== id);
    });

    if (!isInternalUpdateRef.current && drawingToDelete) {
        const snapshot = { ...drawingToDelete };
        pushCommand({
            label: 'Delete',
            execute: () => deleteDrawing(id),
            undo: () => saveDrawing(snapshot)
        });
    }

    try {
      await TauriService.deleteDrawing(id);
    } catch (e) {
      Telemetry.error('Persistence', 'Delete failed', { error: e });
    }
  }, [pushCommand, saveDrawing]); // Removed drawings dependency

  // 4. Clear All
  const clearAllDrawings = useCallback(async () => {
    let snapshot: Drawing[] = [];
    
    setDrawings(prev => {
        snapshot = [...prev];
        return [];
    });

    if (!isInternalUpdateRef.current) {
        const savedSnapshot = [...snapshot];
        pushCommand({
            label: 'Clear All',
            execute: () => clearAllDrawings(),
            undo: () => {
                savedSnapshot.forEach(d => saveDrawing(d));
            }
        });
    }

    try {
        await TauriService.clearAllDrawings(sourceId);
    } catch (e) {
        Telemetry.error('Persistence', 'Clear all failed', { error: e });
        await fetchDrawings(); // Revert on failure
    }
  }, [sourceId, fetchDrawings, pushCommand, saveDrawing]); // Removed drawings dependency

  return {
    drawings,
    setDrawings, // Exposed for temporary drag updates (FinancialChart internal state)
    saveDrawing,
    deleteDrawing,
    clearAllDrawings,
    fetchDrawings,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0
  };
};