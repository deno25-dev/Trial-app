import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, HistogramData, ColorType, CrosshairMode, LineStyle, MouseEventParams, Time } from 'lightweight-charts';
import { useQuery } from '@tanstack/react-query';
import { useChart } from '../../context/ChartContext';
import { TauriService } from '../../services/tauriService';
import { SKIN_CONFIG, LIGHT_THEME_CHART } from '../../constants';
import { Telemetry } from '../../utils/telemetry';
import { OhlcData, Drawing, Point } from '../../types';
import { TrendlinePrimitive } from './Primitives/TrendlinePrimitive';
import { TextToolModal } from './TextToolModal';
import { DrawingToolbar } from './DrawingToolbar';
import { useDrawingRegistry } from '../../hooks/useDrawingRegistry';

// Helper to format numbers with precision
const formatPrice = (price: number) => price.toFixed(2);
const formatVol = (vol: number) => {
    if (vol >= 1000000) return (vol / 1000000).toFixed(2) + 'M';
    if (vol >= 1000) return (vol / 1000).toFixed(2) + 'K';
    return vol.toFixed(0);
};

export const FinancialChart: React.FC = () => {
  // --- REFS (Stable across renders) ---
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartWrapperRef = useRef<HTMLDivElement>(null); // New Wrapper Ref for Event Capture
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null); // Transient Canvas for high-perf drawing
  
  const chartApiRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const trendlinePrimitiveRef = useRef<TrendlinePrimitive | null>(null);
  
  const { state, setTool } = useChart();

  // --- PERSISTENCE HOOK (Mandate 1.4 & 0.17) ---
  const sourceId = `${state.symbol}_${state.interval}`;
  const { drawings, saveDrawing, deleteDrawing, setDrawings: setLocalDrawings } = useDrawingRegistry(sourceId);

  // --- HEADLESS STATE REFS (For 60fps & Event Handlers) ---
  const activeToolRef = useRef(state.activeTool);
  const isMagnetModeRef = useRef(state.isMagnetMode);
  const activeSymbolRef = useRef(state.symbol);
  const activeIntervalRef = useRef(state.interval);

  // Drawing Interaction State
  const currentDrawingRef = useRef<Drawing | null>(null);
  
  // MANDATE 1.4: Shadow Registry (Transient Drawings)
  // Holds drawings that are "committing" but potentially not yet fully round-tripped by the DB.
  // This ensures zero flicker.
  const transientDrawingsRef = useRef<Drawing[]>([]);

  // Separate ref for Brush points (screen coords) to avoid heavy re-calculations during drag
  const currentBrushPathRef = useRef<{x: number, y: number}[]>([]);
  
  const drawingStateRef = useRef<{
      phase: 'idle' | 'drawing' | 'dragging';
      activeDrawingId: string | null;
      dragAnchor: number | null;
  }>({ phase: 'idle', activeDrawingId: null, dragAnchor: null });

  // --- REACT STATE ---
  // Note: 'drawings' is now managed by the hook
  const [legend, setLegend] = useState<{
    open: string; high: string; low: string; close: string;
    change: string; changePercent: string; volume: string; color: string;
  } | null>(null);

  // Text Modal State
  const [textModal, setTextModal] = useState<{
      isOpen: boolean;
      x: number;
      y: number;
      time: number;
      price: number;
      initialText: string;
      editDrawingId?: string;
  }>({ isOpen: false, x: 0, y: 0, time: 0, price: 0, initialText: '' });

  // Selected Drawing State for Toolbar
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);

  // --- 1. TOOL & STATE SYNC (No Re-Render of Chart) ---
  useEffect(() => {
    // Update Refs
    activeToolRef.current = state.activeTool;
    isMagnetModeRef.current = state.isMagnetMode;

    // Apply CSS Locking Class
    if (chartWrapperRef.current) {
        if (state.activeTool !== 'cursor' && state.activeTool !== 'crosshair') {
            chartWrapperRef.current.classList.add('drawing-active');
        } else {
            chartWrapperRef.current.classList.remove('drawing-active');
        }
    }

    // Clear selection if changing tools (except if just toggling cursor)
    if (state.activeTool !== 'cursor') {
        setSelectedDrawingId(null);
        setLocalDrawings(prev => {
            const next = prev.map(d => ({ ...d, selected: false }));
            trendlinePrimitiveRef.current?.setDrawings(next);
            return next;
        });
    }

  }, [state.activeTool, state.isMagnetMode]);

  // Sync Symbol/Interval Refs
  useEffect(() => {
    activeSymbolRef.current = state.symbol;
    activeIntervalRef.current = state.interval;
    // Clear transient on symbol change to avoid ghost drawings from other charts
    transientDrawingsRef.current = [];
    trendlinePrimitiveRef.current?.setTransientDrawings([]);
  }, [state.symbol, state.interval]);


  // --- 2. DATA FETCHING (Independent of Tool) ---
  const { data: chartData, isLoading, error } = useQuery({
    queryKey: ['chartData', state.symbol, state.interval],
    queryFn: () => TauriService.loadChartData(state.symbol, state.interval),
    refetchOnWindowFocus: false,
    // Critical: Do NOT depend on activeTool
  });

  // Sync Drawings from Registry to Primitive (Hydration Loop)
  useEffect(() => {
     if (trendlinePrimitiveRef.current) {
         trendlinePrimitiveRef.current.setDrawings(drawings);
         
         // Clean up Shadow Registry: Remove items that are now present in the main 'drawings' list
         // This prevents duplication while maintaining visibility continuity
         const persistedIds = new Set(drawings.map(d => d.id));
         transientDrawingsRef.current = transientDrawingsRef.current.filter(d => !persistedIds.has(d.id));
         trendlinePrimitiveRef.current.setTransientDrawings(transientDrawingsRef.current);
     }
  }, [drawings]);


  // --- 3. CHART ENGINE INITIALIZATION (Run Once) ---
  // Resolve theme for initial create
  const initialTheme = useMemo(() => {
      return state.theme === 'light' ? LIGHT_THEME_CHART : SKIN_CONFIG[state.skin].chart;
  }, []); // Run once

  useEffect(() => {
    if (!chartContainerRef.current) return;

    Telemetry.info('UI', `Initializing Chart Engine`, { symbol: state.symbol });

    // Initialize Chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: initialTheme.background },
        textColor: initialTheme.text,
        fontFamily: "'Inter', sans-serif",
      },
      grid: {
        vertLines: { color: initialTheme.grid, visible: true },
        horzLines: { color: initialTheme.grid, visible: true },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
            width: 1,
            color: initialTheme.crosshair,
            style: LineStyle.Dashed,
            labelBackgroundColor: initialTheme.crosshair,
        },
        horzLine: {
            width: 1,
            color: initialTheme.crosshair,
            style: LineStyle.Dashed,
            labelBackgroundColor: initialTheme.crosshair,
        },
      },
      timeScale: {
        borderColor: initialTheme.grid,
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: initialTheme.grid,
      },
    });

    chartApiRef.current = chart;

    // Add Series
    const volumeSeries = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: '', 
    });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
    volumeSeriesRef.current = volumeSeries;

    const series = chart.addCandlestickSeries({
      upColor: initialTheme.candleUp,
      downColor: initialTheme.candleDown,
      borderVisible: false,
      wickUpColor: initialTheme.wickUp,
      wickDownColor: initialTheme.wickDown,
    });
    seriesRef.current = series;

    // Attach Primitive
    const trendlinePrimitive = new TrendlinePrimitive();
    series.attachPrimitive(trendlinePrimitive);
    trendlinePrimitiveRef.current = trendlinePrimitive;
    // Immediate sync if drawings loaded before chart init
    trendlinePrimitive.setDrawings(drawings);

    // Legend Listener
    chart.subscribeCrosshairMove((param) => {
        if (!param.time || !seriesRef.current || !volumeSeriesRef.current) {
            updateLegendWithLatest();
            return;
        }
        const candle = param.seriesData.get(seriesRef.current) as CandlestickData;
        const volume = param.seriesData.get(volumeSeriesRef.current) as HistogramData;
        if (candle) updateLegend(candle, volume?.value);
    });

    // Handle Resize
    const resizeObserver = new ResizeObserver((entries) => {
      if (!chartContainerRef.current || !chartApiRef.current) return;
      const { width, height } = entries[0].contentRect;
      chartApiRef.current.applyOptions({ width, height });
      
      // Resize Overlay Canvas
      if (overlayCanvasRef.current) {
          overlayCanvasRef.current.width = width;
          overlayCanvasRef.current.height = height;
      }
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      Telemetry.debug('UI', 'Chart Engine Disposed');
    };
  }, []); // CRITICAL: Empty dependency array ensures chart persists across tool changes

  // --- 4. THEME & GRID UPDATES (Declarative) ---
  const currentTheme = useMemo(() => {
      return state.theme === 'light' ? LIGHT_THEME_CHART : SKIN_CONFIG[state.skin].chart;
  }, [state.theme, state.skin]);

  useEffect(() => {
    if (!chartApiRef.current || !seriesRef.current) return;
    
    chartApiRef.current.applyOptions({
        layout: {
            background: { type: ColorType.Solid, color: currentTheme.background },
            textColor: currentTheme.text,
        },
        grid: {
            vertLines: { color: currentTheme.grid, visible: state.showGrid },
            horzLines: { color: currentTheme.grid, visible: state.showGrid },
        },
        timeScale: { borderColor: currentTheme.grid },
        rightPriceScale: { borderColor: currentTheme.grid },
        crosshair: {
            vertLine: { color: currentTheme.crosshair, labelBackgroundColor: currentTheme.crosshair },
            horzLine: { color: currentTheme.crosshair, labelBackgroundColor: currentTheme.crosshair },
        }
    });
    seriesRef.current.applyOptions({
        upColor: currentTheme.candleUp,
        downColor: currentTheme.candleDown,
        wickUpColor: currentTheme.wickUp,
        wickDownColor: currentTheme.wickDown,
    });
    
    // Force redraw primitive to pick up new selection colors if needed
    trendlinePrimitiveRef.current?.requestUpdate();

  }, [currentTheme, state.showGrid]);


  // --- 5. INTERACTION LOGIC (Attached to Wrapper to capture events) ---
  useEffect(() => {
    const wrapper = chartWrapperRef.current;
    if (!wrapper) return;

    const getChartPoint = (e: MouseEvent) => {
        if (!chartApiRef.current || !seriesRef.current || !wrapper) return null;
        const rect = wrapper.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Defensive Check: Ensure we are within bounds before asking chart lib
        if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;

        const time = chartApiRef.current.timeScale().coordinateToTime(x);
        const price = seriesRef.current.coordinateToPrice(y);

        if (!time || !price) return null;
        return { time: time as number, price, x, y };
    };

    const getMagnetPoint = (point: { x: number, y: number, time: number, price: number }) => {
        if (!isMagnetModeRef.current || !chartData || !seriesRef.current) return null;
        
        // Basic magnet logic reused
        const candle = chartData.find(d => d.time === point.time);
        if (!candle) return null;

        const prices = [candle.open, candle.high, candle.low, candle.close];
        const series = seriesRef.current;
        const candleX = chartApiRef.current?.timeScale().timeToCoordinate(point.time as Time) || 0;
        
        let minDist = Infinity;
        let nearestPrice = candle.close;

        for (const p of prices) {
            const priceY = series.priceScale().priceToCoordinate(p);
            if (priceY !== null) {
                const dist = Math.sqrt((point.x - candleX)**2 + (point.y - priceY)**2);
                if (dist < 30 && dist < minDist) {
                    minDist = dist;
                    nearestPrice = p;
                }
            }
        }
        
        if (minDist < 30) return { time: candle.time, price: nearestPrice };
        return null;
    };

    const handleMouseDown = (e: MouseEvent) => {
        const tool = activeToolRef.current;
        const point = getChartPoint(e);
        if (!point) return;

        let finalPoint: Point = { time: point.time, price: point.price };
        const magnet = getMagnetPoint(point);
        if (magnet) finalPoint = magnet;

        // A. CURSOR MODE (Selection/Dragging)
        if (tool === 'cursor' || tool === 'crosshair') {
            const primitive = trendlinePrimitiveRef.current;
            const hit = primitive?.hitTest(point.x, point.y);
            
            if (hit) {
                e.preventDefault(); 
                e.stopPropagation();

                const drawing = primitive?.drawings.find(d => d.id === hit.drawing.id);
                if (drawing) {
                    currentDrawingRef.current = { ...drawing, selected: true };
                    
                    drawingStateRef.current = {
                        phase: 'dragging',
                        activeDrawingId: drawing.id,
                        dragAnchor: hit.anchor ?? null
                    };

                    setSelectedDrawingId(drawing.id);
                    setLocalDrawings(prev => {
                        const next = prev.map(d => ({ ...d, selected: d.id === hit.drawing.id }));
                        primitive?.setDrawings(next);
                        return next;
                    });
                }
            } else {
                setSelectedDrawingId(null);
                setLocalDrawings(prev => {
                     const next = prev.map(d => ({ ...d, selected: false }));
                     primitive?.setDrawings(next);
                     return next;
                 });
            }
            return;
        }

        // B. TEXT TOOL (Create)
        if (tool === 'text') {
            e.preventDefault();
            e.stopPropagation();
            setTextModal({
                isOpen: true,
                x: e.clientX,
                y: e.clientY,
                time: finalPoint.time,
                price: finalPoint.price,
                initialText: ''
            });
            return;
        }

        // C. BRUSH (Freehand)
        if (tool === 'brush') {
            e.preventDefault();
            e.stopPropagation();
            currentBrushPathRef.current = [{ x: point.x, y: point.y }];
            
            const newDrawing: Drawing = {
                id: crypto.randomUUID(),
                sourceId: `${activeSymbolRef.current}_${activeIntervalRef.current}`,
                type: 'brush',
                points: [],
                properties: {
                    color: currentTheme.crosshair,
                    lineWidth: 2,
                    lineStyle: 0
                },
                selected: true
            };
            currentDrawingRef.current = newDrawing;
            drawingStateRef.current = { phase: 'drawing', activeDrawingId: newDrawing.id, dragAnchor: null };
            return;
        }

        // D. INFINITE LINES (Horizontal/Vertical) & RAYS
        if (tool === 'horizontal_line' || tool === 'vertical_line' || tool === 'horizontal_ray') {
            e.preventDefault();
            e.stopPropagation();

            const newDrawing: Drawing = {
                id: crypto.randomUUID(),
                sourceId: `${activeSymbolRef.current}_${activeIntervalRef.current}`,
                type: tool as any,
                points: [finalPoint], // Single anchor point
                properties: {
                    color: currentTheme.crosshair,
                    lineWidth: 2,
                    lineStyle: 0
                },
                selected: true
            };

            // Use Hook for Persistence
            saveDrawing(newDrawing);
            
            setSelectedDrawingId(newDrawing.id);
            setTool('cursor');
            return;
        }

        // E. GEOMETRIC SHAPES & LINES (Trendline, Ray, Rect, Triangle...)
        
        // Multi-Step Drawing Logic
        if (drawingStateRef.current.phase === 'drawing' && currentDrawingRef.current) {
            // We are already drawing a shape with >2 points (Triangle/RotatedRect)
            // This click sets the next point
            return; // Logic handled implicitly via state flow if we don't reset state on MouseUp.
        }

        // START NEW DRAWING
        e.preventDefault();
        e.stopPropagation();

        let initialPoints = [finalPoint, finalPoint];
        if (tool === 'triangle' || tool === 'rotated_rectangle') {
            initialPoints = [finalPoint, finalPoint, finalPoint];
        }

        const newDrawing: Drawing = {
            id: crypto.randomUUID(),
            sourceId: `${activeSymbolRef.current}_${activeIntervalRef.current}`,
            type: tool as any,
            points: initialPoints,
            properties: {
                color: currentTheme.crosshair,
                lineWidth: 2,
                lineStyle: 0,
                showBackground: ['rectangle', 'triangle', 'rotated_rectangle'].includes(tool as string), 
                backgroundColor: currentTheme.crosshair + '33'
            },
            selected: true
        };

        currentDrawingRef.current = newDrawing;
        trendlinePrimitiveRef.current?.updateTempDrawing(newDrawing);
        
        drawingStateRef.current = {
            phase: 'drawing',
            activeDrawingId: newDrawing.id,
            dragAnchor: 1 // Start dragging index 1 (P2)
        };
    };

    const handleMouseMove = (e: MouseEvent) => {
        // FIX 1: Null-Safe Guard (Mandate 0.21 / Fix 7)
        // If we are not actively interacting, or if the chart isn't ready, bail out immediately.
        const state = drawingStateRef.current;
        if (state.phase === 'idle' && !state.activeDrawingId) return;
        if (!currentDrawingRef.current) return; // Critical Guard

        const point = getChartPoint(e);
        if (!point) return; // FIX 2: Coordinate Safety

        let finalPoint: Point = { time: point.time, price: point.price };
        const magnet = getMagnetPoint(point);
        if (magnet) finalPoint = magnet;

        const d = currentDrawingRef.current;

        if (state.phase === 'drawing') {
            
            // Brush Logic
            if (d.type === 'brush') {
                const ctx = overlayCanvasRef.current?.getContext('2d');
                if (ctx) {
                    const path = currentBrushPathRef.current;
                    // FIX: Safety guard for race condition where mouseMove fires after mouseUp has cleared the path
                    if (path.length === 0) return;
                    
                    const lastPt = path[path.length - 1];
                    const newPt = { x: point.x, y: point.y };
                    path.push(newPt);
                    ctx.beginPath();
                    // FIX: Only draw if lastPt exists
                    if (lastPt) {
                        ctx.moveTo(lastPt.x, lastPt.y);
                        ctx.lineTo(newPt.x, newPt.y);
                        ctx.strokeStyle = d.properties.color;
                        ctx.lineWidth = d.properties.lineWidth;
                        ctx.lineCap = 'round';
                        ctx.lineJoin = 'round';
                        ctx.stroke();
                    }
                }
                return;
            }

            // Shape Logic: Update the point currently being dragged (state.dragAnchor)
            if (state.dragAnchor !== null) {
                const newPoints = [...d.points];
                if (state.dragAnchor < newPoints.length) {
                    newPoints[state.dragAnchor] = finalPoint;
                    
                    currentDrawingRef.current = { ...d, points: newPoints };
                    trendlinePrimitiveRef.current?.updateTempDrawing(currentDrawingRef.current);
                }
            }
            
        } else if (state.phase === 'dragging') {
            if (d.type === 'text') {
                 currentDrawingRef.current = { ...d, points: [finalPoint] };
                 trendlinePrimitiveRef.current?.updateTempDrawing(currentDrawingRef.current);
                 return;
            }

            // Standard dragging for multi-point tools or single-point H/V lines
            if (state.dragAnchor !== null && d.type !== 'brush') {
                const newPoints = [...d.points];
                if (state.dragAnchor < newPoints.length) {
                    newPoints[state.dragAnchor] = finalPoint;
                    currentDrawingRef.current = { ...d, points: newPoints };
                    trendlinePrimitiveRef.current?.updateTempDrawing(currentDrawingRef.current);
                }
            }
        }
    };

    const handleMouseUp = () => {
        if (!currentDrawingRef.current) {
            drawingStateRef.current = { phase: 'idle', activeDrawingId: null, dragAnchor: null };
            return;
        }

        const d = currentDrawingRef.current;
        const state = drawingStateRef.current;

        // BRUSH COMMIT
        if (d.type === 'brush') {
            const path = currentBrushPathRef.current;
            const timeScale = chartApiRef.current?.timeScale();
            const series = seriesRef.current;

            if (timeScale && series && path.length > 1) {
                const convertedPoints: Point[] = path.map(pt => {
                    const time = timeScale.coordinateToTime(pt.x) as number;
                    const price = series.coordinateToPrice(pt.y) as number;
                    return { time, price };
                }).filter(p => p.time !== null && p.price !== null);

                const finalDrawing = { ...d, points: convertedPoints };
                commitDrawing(finalDrawing);
                
                const ctx = overlayCanvasRef.current?.getContext('2d');
                ctx?.clearRect(0, 0, overlayCanvasRef.current?.width || 0, overlayCanvasRef.current?.height || 0);
                currentBrushPathRef.current = [];
            } else {
                abortDrawing();
            }
            return;
        }

        // SHAPE COMMIT / STEP LOGIC
        if (state.phase === 'drawing') {
            // Check if we need more points
            if (d.type === 'triangle' || d.type === 'rotated_rectangle') {
                if (state.dragAnchor === 1) {
                    // Just finished P2. Move to P3.
                    drawingStateRef.current = { ...state, dragAnchor: 2 };
                    return; // Don't commit yet
                }
            }
            
            // If we are here, we are done (dragAnchor was last point or 2-point shape)
            commitDrawing(d);
            setTool('cursor');
            return;
        }

        // DRAGGING COMMIT
        if (state.phase === 'dragging') {
            commitDrawing(d);
        }
    };

    const commitDrawing = async (drawing: Drawing) => {
        // MANDATE 1.4: Push to Shadow Registry immediately for Zero-Flicker
        transientDrawingsRef.current.push(drawing);
        trendlinePrimitiveRef.current?.setTransientDrawings([...transientDrawingsRef.current]);

        // Synchronously reset state to stop interactive updates
        drawingStateRef.current = { phase: 'idle', activeDrawingId: null, dragAnchor: null };
        trendlinePrimitiveRef.current?.updateTempDrawing(null);
        currentDrawingRef.current = null;

        // Use hook to save and update state (Optimistic -> Save -> Fetch Loop)
        // When drawings come back via prop, useEffect will clean up the transient list
        await saveDrawing(drawing);
    };

    const abortDrawing = () => {
        trendlinePrimitiveRef.current?.updateTempDrawing(null);
        currentDrawingRef.current = null;
        drawingStateRef.current = { phase: 'idle', activeDrawingId: null, dragAnchor: null };
    };

    // Attach to Wrapper with capture for MouseDown to intercept before chart
    wrapper.addEventListener('mousedown', handleMouseDown, { capture: true });
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
        wrapper.removeEventListener('mousedown', handleMouseDown, { capture: true });
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };

  }, [chartData, currentTheme]); // Re-bind if data/theme radically changes, but Ref access handles tool changes

  // --- 6. LEGEND SYNC ---
  const latestDataRef = useRef<{candle: OhlcData, vol: number} | null>(null);
  const updateLegend = (candle: CandlestickData | OhlcData, vol?: number) => {
      if (!candle) return;
      const open = candle.open;
      const close = candle.close;
      const diff = close - open;
      const percent = (diff / open) * 100;
      const color = diff >= 0 ? 'text-success' : 'text-danger';
      const volStr = vol ? formatVol(vol) : '0';

      setLegend({
          open: formatPrice(open),
          high: formatPrice(candle.high),
          low: formatPrice(candle.low),
          close: formatPrice(close),
          change: (diff >= 0 ? '+' : '') + formatPrice(diff),
          changePercent: (percent >= 0 ? '+' : '') + percent.toFixed(2),
          volume: volStr,
          color: color
      });
  };
  const updateLegendWithLatest = () => {
      if (latestDataRef.current) updateLegend(latestDataRef.current.candle, latestDataRef.current.vol);
  };

  // Sync Data to Chart (Lightweight operation)
  useEffect(() => {
    if (seriesRef.current && volumeSeriesRef.current && chartData && chartData.length > 0) {
      const start = performance.now();
      
      const candles: CandlestickData[] = [];
      const volumes: HistogramData[] = [];
      
      // Optimization: pre-allocate or map
      for(let i=0; i<chartData.length; i++) {
          const d = chartData[i];
          const time = d.time as any;
          candles.push({ time, open: d.open, high: d.high, low: d.low, close: d.close });
          const isUp = d.close >= d.open;
          volumes.push({ time, value: d.volume, color: isUp ? currentTheme.candleUp + '80' : currentTheme.candleDown + '80' });
      }

      seriesRef.current.setData(candles);
      volumeSeriesRef.current.setData(volumes);

      // INJECT DATA INTO PRIMITIVE FOR COORDINATE RESOLUTION
      if (trendlinePrimitiveRef.current) {
          trendlinePrimitiveRef.current.setData(chartData);
      }

      const last = chartData[chartData.length - 1];
      latestDataRef.current = { candle: last, vol: last.volume };
      updateLegendWithLatest();

      // Reactive Hydration: Trigger primitive update now that time scale is populated
      trendlinePrimitiveRef.current?.requestUpdate();

      const perf = performance.now() - start;
      if (perf > 16) Telemetry.warn('Performance', 'Chart Render Dropped Frame', { duration: `${perf.toFixed(2)}ms` });
    }
  }, [chartData, currentTheme]); 

  // --- TEXT TOOL HANDLERS ---
  const handleTextApply = (text: string) => {
      const isEdit = !!textModal.editDrawingId;

      if (isEdit) {
           // EDIT MODE: Use hook
           const current = drawings.find(d => d.id === textModal.editDrawingId);
           if (current) {
               const updated = { ...current, properties: { ...current.properties, text } };
               saveDrawing(updated);
           }
      } else {
           // CREATE MODE
           if (!text.trim()) {
               setTextModal({ ...textModal, isOpen: false });
               setTool('cursor');
               return;
           }

           const newDrawing: Drawing = {
                id: crypto.randomUUID(),
                sourceId: `${state.symbol}_${state.interval}`,
                type: 'text',
                points: [{ time: textModal.time, price: textModal.price }],
                properties: {
                    color: currentTheme.text,
                    lineWidth: 1,
                    lineStyle: 0,
                    text: text,
                    fontSize: 14,
                    showBackground: false
                },
                selected: true
            };

            saveDrawing(newDrawing);
            
            setSelectedDrawingId(newDrawing.id);
            setTool('cursor');
      }

      setTextModal({ ...textModal, isOpen: false });
  };

  const selectedDrawing = useMemo(() => drawings.find(d => d.id === selectedDrawingId), [drawings, selectedDrawingId]);

  const handleDrawingUpdate = (updates: Partial<Drawing['properties']>) => {
      if (!selectedDrawingId) return;
      const current = drawings.find(d => d.id === selectedDrawingId);
      if (current) {
          const updated = { ...current, properties: { ...current.properties, ...updates } };
          saveDrawing(updated);
      }
  };

  const handleDrawingDelete = () => {
      if (!selectedDrawingId) return;
      deleteDrawing(selectedDrawingId);
      setSelectedDrawingId(null);
  };

  const handleTextEditStart = () => {
      if (!selectedDrawing || selectedDrawing.type !== 'text') return;
      
      // Calculate screen position for modal
      const p1 = selectedDrawing.points[0];
      const timeScale = chartApiRef.current?.timeScale();
      const series = seriesRef.current;
      
      if (timeScale && series) {
          const x = timeScale.timeToCoordinate(p1.time as Time) ?? 0;
          const y = series.priceToCoordinate(p1.price) ?? 0;
          
          // Add offset for UI
          const rect = chartWrapperRef.current?.getBoundingClientRect();
          const pageX = (rect?.left ?? 0) + x;
          const pageY = (rect?.top ?? 0) + y;

          setTextModal({
              isOpen: true,
              x: pageX,
              y: pageY,
              time: p1.time,
              price: p1.price,
              initialText: selectedDrawing.properties.text || '',
              editDrawingId: selectedDrawing.id
          });
      }
  };

  return (
    <div 
        ref={chartWrapperRef}
        className="w-full h-full relative group bg-background transition-colors duration-300 chart-wrapper"
    >
      <div ref={chartContainerRef} className="w-full h-full chart-container" />
      
      {/* Interaction Layer (Overlay) for Drawing Capture */}
      <div id="drawing-canvas-layer" className="absolute inset-0 w-full h-full z-10 pointer-events-none">
          <canvas ref={overlayCanvasRef} className="w-full h-full" />
      </div>

      {/* --- FLOATING TOOLBARS --- */}
      {selectedDrawing && (
          <DrawingToolbar 
             drawing={selectedDrawing}
             onUpdate={handleDrawingUpdate}
             onDelete={handleDrawingDelete}
             onEdit={handleTextEditStart}
          />
      )}

      {/* --- TEXT TOOL MODAL --- */}
      <TextToolModal 
          isOpen={textModal.isOpen}
          initialText={textModal.initialText}
          onApply={handleTextApply}
          onClose={() => setTextModal({ ...textModal, isOpen: false })}
          position={{ x: textModal.x, y: textModal.y }}
      />

      {/* --- LEGEND --- */}
      {legend && (
        <div className="absolute top-2 left-3 z-20 flex flex-wrap items-center gap-4 text-[11px] select-none pointer-events-none font-sans font-medium tabular-nums">
            <div className="flex items-center gap-2">
                 <span className="font-bold text-base text-text tracking-tight">{state.symbol}</span>
                 <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-bold">{state.interval}</span>
                 <span className={`text-sm font-bold ${legend.color} ml-1`}>{legend.close}</span>
                 <span className={`${legend.color} text-xs`}>{legend.change} ({legend.changePercent}%)</span>
            </div>
            <div className="hidden md:flex items-center gap-4 ml-2">
                <div className="flex gap-1.5"><span className="text-muted font-medium">O</span><span className="text-primary font-medium tracking-wide">{legend.open}</span></div>
                <div className="flex gap-1.5"><span className="text-muted font-medium">H</span><span className="text-primary font-medium tracking-wide">{legend.high}</span></div>
                <div className="flex gap-1.5"><span className="text-muted font-medium">L</span><span className="text-primary font-medium tracking-wide">{legend.low}</span></div>
                <div className="flex gap-1.5"><span className="text-muted font-medium">C</span><span className="text-primary font-medium tracking-wide">{legend.close}</span></div>
                <span className="text-border/50">|</span>
                <div className="flex gap-1.5"><span className="text-muted font-medium">Vol</span><span className="text-primary font-medium tracking-wide">{legend.volume}</span></div>
            </div>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-50 pointer-events-none">
          <div className="text-primary font-mono animate-pulse text-xs tracking-widest">INITIALIZING STREAM A...</div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50 pointer-events-auto">
          <div className="text-danger font-mono p-4 border border-danger bg-surface rounded text-sm">DATA FAILURE: {error.message}</div>
        </div>
      )}
    </div>
  );
};