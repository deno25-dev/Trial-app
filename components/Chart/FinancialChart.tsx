

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, HistogramData, MouseEventParams, Time, CandlestickSeries, HistogramSeries, ColorType, CrosshairMode, PriceScaleMode } from 'lightweight-charts';
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

// Binary Search Helper for Coordinate Mapping
function getIndexForTime(data: OhlcData[], time: number): number {
    let lo = 0;
    let hi = data.length - 1;
    while (lo <= hi) {
        const mid = (lo + hi) >>> 1;
        const midVal = data[mid].time;
        if (midVal === time) return mid;
        if (midVal < time) lo = mid + 1;
        else hi = mid - 1;
    }
    return lo; // Return insertion point/nearest
}

// Extrapolation Helper
function getTimeForIndex(index: number, data: OhlcData[]): number {
    if (data.length === 0) return 0;
    if (index < 0) {
        const first = data[0];
        const second = data[1];
        const diff = (second?.time || 0) - first.time;
        return first.time + (index * (diff || 60)); // Fallback 60s
    }
    if (index < data.length) return data[index].time;
    
    // Extrapolate Future
    const last = data[data.length - 1];
    const prev = data[data.length - 2];
    const diff = last.time - (prev?.time || (last.time - 60));
    return last.time + ((index - (data.length - 1)) * diff);
}

export const FinancialChart: React.FC = () => {
  // --- REFS (Stable across renders) ---
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartWrapperRef = useRef<HTMLDivElement>(null); // New Wrapper Ref for Event Capture
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null); // Transient Canvas for high-perf drawing
  
  const chartApiRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const trendlinePrimitiveRef = useRef<TrendlinePrimitive | null>(null);
  
  const { state, setTool, setReplayWaitingForCut, toggleInvertScale } = useChart();

  // --- REPLAY SYSTEM REFS ---
  const fullDataRef = useRef<OhlcData[]>([]); // Stores the Source of Truth dataset
  const replayIndexRef = useRef<number>(0);
  const replayFrameRef = useRef<number>(0);
  const lastReplayTimeRef = useRef<number>(0);

  // --- PERSISTENCE HOOK (Mandate 1.4 & 0.17) ---
  const sourceId = `${state.symbol}_${state.interval}`;
  const { drawings, saveDrawing, deleteDrawing, clearAllDrawings, setDrawings: setLocalDrawings } = useDrawingRegistry(sourceId);

  // --- HEADLESS STATE REFS (For 60fps & Event Handlers) ---
  const activeToolRef = useRef(state.activeTool);
  const isMagnetModeRef = useRef(state.isMagnetMode);
  const activeSymbolRef = useRef(state.symbol);
  const activeIntervalRef = useRef(state.interval);
  const isReplayModeRef = useRef(state.replay.isActive);
  const isReplayWaitingCutRef = useRef(state.replay.isWaitingForCut);

  // Drawing Interaction State
  const currentDrawingRef = useRef<Drawing | null>(null);
  
  // MANDATE 1.4: Shadow Registry (Transient Drawings)
  const transientDrawingsRef = useRef<Drawing[]>([]);

  // Separate ref for Brush points (screen coords) to avoid heavy re-calculations during drag
  const currentBrushPathRef = useRef<{x: number, y: number}[]>([]);
  
  // Drag Origin for "Move Whole Shape" logic
  const dragOriginRef = useRef<{
      startLogical: number;
      startPrice: number;
      originalPoints: Point[];
  } | null>(null);

  const drawingStateRef = useRef<{
      phase: 'idle' | 'drawing' | 'dragging';
      activeDrawingId: string | null;
      dragAnchor: number | null;
  }>({ phase: 'idle', activeDrawingId: null, dragAnchor: null });

  // --- REACT STATE ---
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

  const { clearDrawingsTrigger } = useChart();

  // Handle Clear All Trigger from Context
  useEffect(() => {
    if (clearDrawingsTrigger > 0) {
      handleClearAll();
    }
  }, [clearDrawingsTrigger]);

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.altKey && e.code === 'KeyI') {
              e.preventDefault();
              toggleInvertScale();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleInvertScale]);

  // --- 1. TOOL & STATE SYNC (No Re-Render of Chart) ---
  useEffect(() => {
    activeToolRef.current = state.activeTool;
    isMagnetModeRef.current = state.isMagnetMode;
    isReplayModeRef.current = state.replay.isActive;
    isReplayWaitingCutRef.current = state.replay.isWaitingForCut;

    // Apply CSS Locking Class
    if (chartWrapperRef.current) {
        if (state.activeTool !== 'cursor' && state.activeTool !== 'crosshair') {
            chartWrapperRef.current.classList.add('drawing-active');
        } else if (state.replay.isWaitingForCut) {
            chartWrapperRef.current.style.cursor = 'cell'; // Scissors/Cut cursor visual
        } else {
            chartWrapperRef.current.classList.remove('drawing-active');
            chartWrapperRef.current.style.cursor = '';
        }
    }

    if (state.activeTool !== 'cursor') {
        setSelectedDrawingId(null);
        setLocalDrawings(prev => {
            const next = prev.map(d => ({ ...d, selected: false }));
            trendlinePrimitiveRef.current?.setDrawings(next);
            return next;
        });
    }

  }, [state.activeTool, state.isMagnetMode, state.replay.isWaitingForCut, state.replay.isActive]);

  // Sync Symbol/Interval Refs
  useEffect(() => {
    activeSymbolRef.current = state.symbol;
    activeIntervalRef.current = state.interval;
    transientDrawingsRef.current = [];
    trendlinePrimitiveRef.current?.setTransientDrawings([]);
  }, [state.symbol, state.interval]);


  // --- 2. DATA FETCHING (Independent of Tool) ---
  const { data: chartData, isLoading, error } = useQuery({
    queryKey: ['chartData', state.symbol, state.interval],
    queryFn: () => TauriService.loadChartData(state.symbol, state.interval),
    refetchOnWindowFocus: false,
  });

  // Sync Data to FullDataRef
  useEffect(() => {
      if (chartData && chartData.length > 0) {
          fullDataRef.current = [...chartData];
      }
  }, [chartData]);

  // Sync Drawings from Registry to Primitive (Hydration Loop)
  useEffect(() => {
     if (trendlinePrimitiveRef.current) {
         trendlinePrimitiveRef.current.setDrawings(drawings);
         
         // Clean up Shadow Registry
         const persistedIds = new Set(drawings.map(d => d.id));
         transientDrawingsRef.current = transientDrawingsRef.current.filter(d => !persistedIds.has(d.id));
         trendlinePrimitiveRef.current.setTransientDrawings(transientDrawingsRef.current);
         
         trendlinePrimitiveRef.current.requestUpdate();
     }
  }, [drawings]);


  // --- 3. CHART ENGINE INITIALIZATION (Run Once) ---
  const initialTheme = useMemo(() => {
      return state.theme === 'light' ? LIGHT_THEME_CHART : SKIN_CONFIG[state.skin].chart;
  }, []); 

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
        vertLine: { width: 1, color: initialTheme.crosshair, style: 2, labelBackgroundColor: initialTheme.crosshair },
        horzLine: { width: 1, color: initialTheme.crosshair, style: 2, labelBackgroundColor: initialTheme.crosshair },
      },
      timeScale: {
        borderColor: initialTheme.grid,
        timeVisible: true,
        secondsVisible: false,
        shiftVisibleRangeOnNewBar: false // Mandate 0.22.1 for Replay
      },
      rightPriceScale: {
        borderColor: initialTheme.grid,
        // Initial Scale Settings
        mode: PriceScaleMode.Normal,
        autoScale: true,
        invertScale: false
      },
    });

    chartApiRef.current = chart;

    // Add Series
    const volumeSeries = chart.addSeries(HistogramSeries, {
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: '', 
    });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
    volumeSeriesRef.current = volumeSeries;

    const series = chart.addSeries(CandlestickSeries, {
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
  }, []);

  // --- 4. THEME & GRID & SCALE UPDATES (Declarative) ---
  const currentTheme = useMemo(() => {
      return state.theme === 'light' ? LIGHT_THEME_CHART : SKIN_CONFIG[state.skin].chart;
  }, [state.theme, state.skin]);

  useEffect(() => {
    if (!chartApiRef.current || !seriesRef.current) return;
    
    // Map Context Mode to Library Mode
    let mode = PriceScaleMode.Normal;
    if (state.priceScaleMode === 'Logarithmic') mode = PriceScaleMode.Logarithmic;
    if (state.priceScaleMode === 'Percentage') mode = PriceScaleMode.Percentage;

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
        rightPriceScale: { 
            borderColor: currentTheme.grid,
            mode: mode,
            autoScale: state.isAutoScale,
            invertScale: state.isInverted
        },
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
    
    trendlinePrimitiveRef.current?.requestUpdate();

  }, [currentTheme, state.showGrid, state.priceScaleMode, state.isAutoScale, state.isInverted]);


  // --- 5. INTERACTION LOGIC (Attached to Wrapper to capture events) ---
  useEffect(() => {
    const wrapper = chartWrapperRef.current;
    if (!wrapper) return;

    const getChartPoint = (e: MouseEvent) => {
        if (!chartApiRef.current || !seriesRef.current || !wrapper) return null;
        const rect = wrapper.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;

        const time = chartApiRef.current.timeScale().coordinateToTime(x);
        const price = seriesRef.current.coordinateToPrice(y);

        if (!time || !price) return null;
        return { time: time as number, price, x, y };
    };

    const getMagnetPoint = (point: { x: number, y: number, time: number, price: number }) => {
        if (!isMagnetModeRef.current || !chartData || !seriesRef.current) return null;
        
        const candle = chartData.find(d => d.time === point.time);
        if (!candle) return null;

        const prices = [candle.open, candle.high, candle.low, candle.close];
        const series = seriesRef.current;
        const candleX = chartApiRef.current?.timeScale().timeToCoordinate(point.time as Time) || 0;
        
        let minDist = Infinity;
        let nearestPrice = candle.close;

        for (const p of prices) {
            const priceY = series.priceToCoordinate(p);
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

        // --- REPLAY CUT LOGIC ---
        if (isReplayWaitingCutRef.current) {
            const index = getIndexForTime(fullDataRef.current, point.time);
            replayIndexRef.current = index;
            
            // Perform the Cut
            if (seriesRef.current && volumeSeriesRef.current) {
                const sliced = fullDataRef.current.slice(0, index + 1);
                
                // Map data for update
                const candles = sliced.map(d => ({ time: d.time as any, open: d.open, high: d.high, low: d.low, close: d.close }));
                const volumes = sliced.map(d => ({ time: d.time as any, value: d.volume, color: (d.close >= d.open ? currentTheme.candleUp : currentTheme.candleDown) + '80' }));

                seriesRef.current.setData(candles);
                volumeSeriesRef.current.setData(volumes);
                
                // Drop Visual Marker (Vertical Line)
                const marker: Drawing = {
                    id: crypto.randomUUID(),
                    sourceId: `${activeSymbolRef.current}_${activeIntervalRef.current}`,
                    type: 'vertical_line',
                    points: [finalPoint],
                    properties: { color: '#f59e0b', lineWidth: 2, lineStyle: 1 }, // Amber Dashed
                    selected: false
                };
                commitDrawing(marker);
            }
            
            // Exit "Waiting for Cut" state
            setReplayWaitingForCut(false);
            return;
        }

        // --- NORMAL DRAWING LOGIC ---
        if (tool === 'cursor' || tool === 'crosshair') {
            const primitive = trendlinePrimitiveRef.current;
            const hit = primitive?.hitTest(point.x, point.y);
            
            if (selectedDrawingId && (!hit || hit.drawing.id !== selectedDrawingId)) {
                 setSelectedDrawingId(null);
                 setLocalDrawings(prev => {
                     const next = prev.map(d => ({ ...d, selected: false }));
                     primitive?.setDrawings(next);
                     return next;
                 });
            }
            
            if (hit) {
                e.preventDefault(); 
                e.stopImmediatePropagation();

                const drawing = primitive?.drawings.find(d => d.id === hit.drawing.id);
                if (drawing) {
                    currentDrawingRef.current = { ...drawing, selected: true };
                    primitive?.setActiveInteractionId(drawing.id);

                    const logical = chartApiRef.current?.timeScale().coordinateToLogical(point.x);
                    
                    if (logical !== null && logical !== undefined) {
                        dragOriginRef.current = {
                            startLogical: logical,
                            startPrice: point.price,
                            originalPoints: [...drawing.points]
                        };
                    }

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

        if (tool === 'text') {
            e.preventDefault(); e.stopPropagation();
            setTextModal({ isOpen: true, x: e.clientX, y: e.clientY, time: finalPoint.time, price: finalPoint.price, initialText: '' });
            return;
        }

        if (tool === 'brush') {
            e.preventDefault(); e.stopPropagation();
            currentBrushPathRef.current = [{ x: point.x, y: point.y }];
            const newDrawing: Drawing = { id: crypto.randomUUID(), sourceId: `${activeSymbolRef.current}_${activeIntervalRef.current}`, type: 'brush', points: [], properties: { color: currentTheme.crosshair, lineWidth: 2, lineStyle: 0 }, selected: true };
            currentDrawingRef.current = newDrawing;
            drawingStateRef.current = { phase: 'drawing', activeDrawingId: newDrawing.id, dragAnchor: null };
            return;
        }

        if (tool === 'horizontal_line' || tool === 'vertical_line' || tool === 'horizontal_ray') {
            e.preventDefault(); e.stopPropagation();
            const newDrawing: Drawing = { id: crypto.randomUUID(), sourceId: `${activeSymbolRef.current}_${activeIntervalRef.current}`, type: tool as any, points: [finalPoint], properties: { color: currentTheme.crosshair, lineWidth: 2, lineStyle: 0 }, selected: true };
            saveDrawing(newDrawing);
            setSelectedDrawingId(newDrawing.id);
            setTool('cursor');
            return;
        }

        e.preventDefault(); e.stopPropagation();
        let initialPoints = [finalPoint, finalPoint];
        if (tool === 'triangle' || tool === 'rotated_rectangle') initialPoints = [finalPoint, finalPoint, finalPoint];

        const newDrawing: Drawing = { id: crypto.randomUUID(), sourceId: `${activeSymbolRef.current}_${activeIntervalRef.current}`, type: tool as any, points: initialPoints, properties: { color: currentTheme.crosshair, lineWidth: 2, lineStyle: 0, showBackground: ['rectangle', 'triangle', 'rotated_rectangle'].includes(tool as string), backgroundColor: currentTheme.crosshair + '33' }, selected: true };
        currentDrawingRef.current = newDrawing;
        trendlinePrimitiveRef.current?.updateTempDrawing(newDrawing);
        drawingStateRef.current = { phase: 'drawing', activeDrawingId: newDrawing.id, dragAnchor: 1 };
    };

    const handleMouseMove = (e: MouseEvent) => {
        const state = drawingStateRef.current;
        const drawing = currentDrawingRef.current;

        if (state.phase === 'idle' && !state.activeDrawingId) return;
        if (!drawing) return;

        const point = getChartPoint(e);
        if (!point) return; 

        let finalPoint: Point = { time: point.time, price: point.price };
        const magnet = getMagnetPoint(point);
        if (magnet) finalPoint = magnet;

        if (state.phase === 'drawing') {
            if (drawing.type === 'brush') {
                const ctx = overlayCanvasRef.current?.getContext('2d');
                if (ctx) {
                    const path = currentBrushPathRef.current;
                    if (path.length === 0) return;
                    const lastPt = path[path.length - 1];
                    const newPt = { x: point.x, y: point.y };
                    path.push(newPt);
                    ctx.beginPath();
                    if (lastPt) {
                        ctx.moveTo(lastPt.x, lastPt.y);
                        ctx.lineTo(newPt.x, newPt.y);
                        ctx.strokeStyle = drawing.properties.color;
                        ctx.lineWidth = drawing.properties.lineWidth;
                        ctx.lineCap = 'round';
                        ctx.lineJoin = 'round';
                        ctx.stroke();
                    }
                }
                return;
            }

            if (state.dragAnchor !== null) {
                if (state.dragAnchor >= drawing.points.length) return;
                const newPoints = [...drawing.points];
                newPoints[state.dragAnchor] = finalPoint;
                currentDrawingRef.current = { ...drawing, points: newPoints };
                trendlinePrimitiveRef.current?.updateTempDrawing(currentDrawingRef.current);
            }
        } else if (state.phase === 'dragging') {
            if (state.dragAnchor !== null) {
                if (drawing.type === 'text') {
                     currentDrawingRef.current = { ...drawing, points: [finalPoint] };
                     trendlinePrimitiveRef.current?.updateTempDrawing(currentDrawingRef.current);
                     return;
                }
                if (state.dragAnchor >= drawing.points.length) return;
                const newPoints = [...drawing.points];
                newPoints[state.dragAnchor] = finalPoint;
                currentDrawingRef.current = { ...drawing, points: newPoints };
                trendlinePrimitiveRef.current?.updateTempDrawing(currentDrawingRef.current);
                return;
            }

            if (state.dragAnchor === null && dragOriginRef.current && chartData) {
                const currentLogical = chartApiRef.current?.timeScale().coordinateToLogical(point.x);
                if (currentLogical !== null && currentLogical !== undefined) {
                    const { startLogical, startPrice, originalPoints } = dragOriginRef.current;
                    const deltaIdx = Math.round(currentLogical - startLogical);
                    const deltaPrice = point.price - startPrice;
                    const newPoints = originalPoints.map(p => {
                        const originalIdx = getIndexForTime(chartData, p.time);
                        const newIdx = originalIdx + deltaIdx;
                        const newTime = getTimeForIndex(newIdx, chartData);
                        return { time: newTime, price: p.price + deltaPrice };
                    });
                    currentDrawingRef.current = { ...drawing, points: newPoints };
                    trendlinePrimitiveRef.current?.updateTempDrawing(currentDrawingRef.current);
                }
            }
        }
    };

    const handleMouseUp = () => {
        if (!currentDrawingRef.current) {
            drawingStateRef.current = { phase: 'idle', activeDrawingId: null, dragAnchor: null };
            dragOriginRef.current = null;
            trendlinePrimitiveRef.current?.setActiveInteractionId(null);
            return;
        }

        const d = currentDrawingRef.current;
        const state = drawingStateRef.current;

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
            } else { abortDrawing(); }
            return;
        }

        if (state.phase === 'drawing') {
            if (d.type === 'triangle' || d.type === 'rotated_rectangle') {
                if (state.dragAnchor === 1) { drawingStateRef.current = { ...state, dragAnchor: 2 }; return; }
            }
            commitDrawing(d);
            setTool('cursor');
            return;
        }

        if (state.phase === 'dragging') commitDrawing(d);
        dragOriginRef.current = null;
    };

    const commitDrawing = async (drawing: Drawing) => {
        // Remove from transient ref as it's now being persisted
        transientDrawingsRef.current = transientDrawingsRef.current.filter(d => d.id !== drawing.id);
        trendlinePrimitiveRef.current?.setTransientDrawings([...transientDrawingsRef.current]);

        trendlinePrimitiveRef.current?.setActiveInteractionId(null);
        drawingStateRef.current = { phase: 'idle', activeDrawingId: null, dragAnchor: null };
        trendlinePrimitiveRef.current?.updateTempDrawing(null);
        currentDrawingRef.current = null;
        
        await saveDrawing(drawing);
    };

    const abortDrawing = () => {
        trendlinePrimitiveRef.current?.updateTempDrawing(null);
        trendlinePrimitiveRef.current?.setActiveInteractionId(null);
        currentDrawingRef.current = null;
        drawingStateRef.current = { phase: 'idle', activeDrawingId: null, dragAnchor: null };
        dragOriginRef.current = null;
    };

    wrapper.addEventListener('mousedown', handleMouseDown, { capture: true });
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
        wrapper.removeEventListener('mousedown', handleMouseDown, { capture: true });
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };

  }, [chartData, currentTheme]);

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

  // --- REPLAY ANIMATION LOOP ---
  useEffect(() => {
    if (!state.replay.isPlaying) {
        cancelAnimationFrame(replayFrameRef.current);
        return;
    }

    const animate = (timestamp: number) => {
        if (!lastReplayTimeRef.current) lastReplayTimeRef.current = timestamp;
        
        // Control speed
        const interval = 1000 / (1 * state.replay.speed); // Base 1 tick per second * speed multiplier
        
        if (timestamp - lastReplayTimeRef.current > interval) {
             const nextIndex = replayIndexRef.current + 1;
             
             if (nextIndex < fullDataRef.current.length) {
                 const d = fullDataRef.current[nextIndex];
                 replayIndexRef.current = nextIndex;

                 if (seriesRef.current && volumeSeriesRef.current) {
                     // Using .update() for performance
                     seriesRef.current.update({ time: d.time as any, open: d.open, high: d.high, low: d.low, close: d.close });
                     const isUp = d.close >= d.open;
                     volumeSeriesRef.current.update({ time: d.time as any, value: d.volume, color: (isUp ? currentTheme.candleUp : currentTheme.candleDown) + '80' });
                 }
             } else {
                 // End of data
                 cancelAnimationFrame(replayFrameRef.current);
                 return;
             }
             
             lastReplayTimeRef.current = timestamp;
        }

        replayFrameRef.current = requestAnimationFrame(animate);
    };

    replayFrameRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(replayFrameRef.current);
  }, [state.replay.isPlaying, state.replay.speed, currentTheme]);

  // Sync Data to Chart (Lightweight operation) - ONLY IF NOT IN REPLAY MODE
  // If in Replay Mode, we handle data manually via the Cut or Loop.
  useEffect(() => {
    if (state.replay.isActive) return; // Skip standard update if Replay is on

    if (seriesRef.current && volumeSeriesRef.current && chartData && chartData.length > 0) {
      const start = performance.now();
      
      const candles: CandlestickData[] = [];
      const volumes: HistogramData[] = [];
      
      for(let i=0; i<chartData.length; i++) {
          const d = chartData[i];
          const time = d.time as any;
          candles.push({ time, open: d.open, high: d.high, low: d.low, close: d.close });
          const isUp = d.close >= d.open;
          volumes.push({ time, value: d.volume, color: isUp ? currentTheme.candleUp + '80' : currentTheme.candleDown + '80' });
      }

      seriesRef.current.setData(candles);
      volumeSeriesRef.current.setData(volumes);
      trendlinePrimitiveRef.current?.setData(chartData);

      const last = chartData[chartData.length - 1];
      latestDataRef.current = { candle: last, vol: last.volume };
      updateLegendWithLatest();
      trendlinePrimitiveRef.current?.requestUpdate();

      const perf = performance.now() - start;
      if (perf > 16) Telemetry.warn('Performance', 'Chart Render Dropped Frame', { duration: `${perf.toFixed(2)}ms` });
    }
  }, [chartData, currentTheme, state.replay.isActive]); 

  // --- TEXT TOOL HANDLERS ---
  const handleTextApply = (text: string) => {
      const isEdit = !!textModal.editDrawingId;
      if (isEdit) {
           const current = drawings.find(d => d.id === textModal.editDrawingId);
           if (current) saveDrawing({ ...current, properties: { ...current.properties, text } });
      } else {
           if (!text.trim()) { setTextModal({ ...textModal, isOpen: false }); setTool('cursor'); return; }
           const newDrawing: Drawing = { id: crypto.randomUUID(), sourceId: `${state.symbol}_${state.interval}`, type: 'text', points: [{ time: textModal.time, price: textModal.price }], properties: { color: currentTheme.text, lineWidth: 1, lineStyle: 0, text: text, fontSize: 14, showBackground: false }, selected: true };
           saveDrawing(newDrawing);
           setSelectedDrawingId(newDrawing.id);
           setTool('cursor');
      }
      setTextModal({ ...textModal, isOpen: false });
  };

  const selectedDrawing = useMemo(() => drawings.find(d => d.id === selectedDrawingId), [drawings, selectedDrawingId]);

  const handleTextEditStart = () => {
      if (!selectedDrawing || selectedDrawing.type !== 'text') return;
      const p1 = selectedDrawing.points[0];
      const timeScale = chartApiRef.current?.timeScale();
      const series = seriesRef.current;
      if (timeScale && series) {
          const x = timeScale.timeToCoordinate(p1.time as Time) ?? 0;
          const y = series.priceToCoordinate(p1.price) ?? 0;
          const rect = chartWrapperRef.current?.getBoundingClientRect();
          const pageX = (rect?.left ?? 0) + x;
          const pageY = (rect?.top ?? 0) + y;
          setTextModal({ isOpen: true, x: pageX, y: pageY, time: p1.time, price: p1.price, initialText: selectedDrawing.properties.text || '', editDrawingId: selectedDrawing.id });
      }
  };

  const handleDrawingUpdate = (updates: Partial<Drawing['properties']>) => {
      if (!selectedDrawingId) return;
      const current = drawings.find(d => d.id === selectedDrawingId);
      if (current) saveDrawing({ ...current, properties: { ...current.properties, ...updates } });
  };

  const handleDrawingDelete = () => {
      if (!selectedDrawingId) return;
      
      // Surgical Wipe from Primitive first (Visual)
      if (trendlinePrimitiveRef.current) {
          const nextDrawings = trendlinePrimitiveRef.current.drawings.filter(d => d.id !== selectedDrawingId);
          trendlinePrimitiveRef.current.setDrawings(nextDrawings);
          trendlinePrimitiveRef.current.setActiveInteractionId(null);
          trendlinePrimitiveRef.current.updateTempDrawing(null);
          trendlinePrimitiveRef.current.requestUpdate();
      }

      // Persistence Delete
      deleteDrawing(selectedDrawingId);
      setSelectedDrawingId(null);
  };

  const handleClearAll = () => {
      // Guard: Prevent loop if already empty
      if (drawings.length === 0 && transientDrawingsRef.current.length === 0) {
          return;
      }

      Telemetry.info('Diagnostic', 'Initiating Clear All', { 
          stateCount: drawings.length, 
          primitiveCount: trendlinePrimitiveRef.current?.drawings.length 
      });
      
      clearAllDrawings();
      
      // Clear Primitive Internal Data for Zero-Flicker Wipe
      if (trendlinePrimitiveRef.current) {
          trendlinePrimitiveRef.current.setDrawings([]);
          trendlinePrimitiveRef.current.setTransientDrawings([]);
          trendlinePrimitiveRef.current.requestUpdate();
      }
      
      // Clear Transient Drawings Ref
      transientDrawingsRef.current = [];
      
      trendlinePrimitiveRef.current?.setActiveInteractionId(null);
      trendlinePrimitiveRef.current?.updateTempDrawing(null);
      setSelectedDrawingId(null);

      // Post-clear check (Next tick)
      setTimeout(() => {
          Telemetry.info('Diagnostic', 'Clear All Complete', { 
              stateCount: drawings.length, 
              primitiveCount: trendlinePrimitiveRef.current?.drawings.length,
              transientCount: transientDrawingsRef.current.length
          });
      }, 0);
  };

  return (
    <div 
        ref={chartWrapperRef}
        className="w-full h-full relative group bg-background transition-colors duration-300 chart-wrapper"
    >
      <div ref={chartContainerRef} className="w-full h-full chart-container" />
      <div id="drawing-canvas-layer" className="absolute inset-0 w-full h-full z-10 pointer-events-none">
          <canvas ref={overlayCanvasRef} className="w-full h-full" />
      </div>

      {selectedDrawing && <DrawingToolbar drawing={selectedDrawing} onUpdate={handleDrawingUpdate} onDelete={handleDrawingDelete} onEdit={handleTextEditStart} />}
      <TextToolModal isOpen={textModal.isOpen} initialText={textModal.initialText} onApply={handleTextApply} onClose={() => setTextModal({ ...textModal, isOpen: false })} position={{ x: textModal.x, y: textModal.y }} />

      {legend && (
        <div className="absolute top-2 left-3 z-20 flex flex-wrap items-center gap-4 text-[11px] select-none pointer-events-none font-sans font-medium tabular-nums">
            <div className="flex items-center gap-2">
                 <span className="font-bold text-base text-text tracking-tight">{state.symbol}</span>
                 <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-bold">{state.interval}</span>
                 {state.replay.isActive && <span className="text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded font-bold animate-pulse">REPLAY</span>}
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

      {isLoading && <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-50 pointer-events-none"><div className="text-primary font-mono animate-pulse text-xs tracking-widest">INITIALIZING STREAM A...</div></div>}
      {error && <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50 pointer-events-auto"><div className="text-danger font-mono p-4 border border-danger bg-surface rounded text-sm">DATA FAILURE: {error.message}</div></div>}
    </div>
  );
};