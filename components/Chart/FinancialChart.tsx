import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, ColorType, CrosshairMode } from 'lightweight-charts';
import { useQuery } from '@tanstack/react-query';
import { useChart } from '../../context/ChartContext';
import { TauriService } from '../../services/tauriService';
import { THEME_CONFIG } from '../../constants';

export const FinancialChart: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartApiRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  
  const { state } = useChart();

  // --- UI STATE MANAGEMENT (TanStack Query) ---
  const { data: chartData, isLoading, error } = useQuery({
    queryKey: ['chartData', state.symbol, state.interval],
    queryFn: () => TauriService.loadChartData(state.symbol, state.interval),
    refetchOnWindowFocus: false, // Don't refetch Stream A on focus (Local data doesn't change)
  });

  // Mandate 0.12.1: Hard Remount on Source Change (Key strategy)
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const initialTheme = THEME_CONFIG[state.theme];

    // Initialize Chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: initialTheme.background },
        textColor: initialTheme.text,
      },
      grid: {
        vertLines: { color: initialTheme.grid, visible: state.showGrid },
        horzLines: { color: initialTheme.grid, visible: state.showGrid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      timeScale: {
        borderColor: initialTheme.grid,
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: initialTheme.grid,
      }
    });

    chartApiRef.current = chart;

    // Add Series
    const series = chart.addCandlestickSeries({
      upColor: initialTheme.candleUp,
      downColor: initialTheme.candleDown,
      borderVisible: false,
      wickUpColor: initialTheme.wickUp,
      wickDownColor: initialTheme.wickDown,
    });
    seriesRef.current = series;

    // Handle Resize using ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      if (!chartContainerRef.current || !chartApiRef.current) return;
      const { width, height } = entries[0].contentRect;
      if (width === 0 || height === 0) return;
      chartApiRef.current.applyOptions({ width: width, height: height });
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []); 

  // --- DATA SYNC ---
  useEffect(() => {
    if (seriesRef.current && chartData) {
      // Direct binary-to-chart injection
      seriesRef.current.setData(chartData as unknown as CandlestickData[]);
    }
  }, [chartData]);

  // Mandate 2.7: Toggle Gridlines
  useEffect(() => {
    if (chartApiRef.current) {
      chartApiRef.current.applyOptions({
        grid: {
          vertLines: { visible: state.showGrid },
          horzLines: { visible: state.showGrid },
        }
      });
    }
  }, [state.showGrid]);

  // Handle Theme Change
  useEffect(() => {
    if (chartApiRef.current && seriesRef.current) {
        const currentTheme = THEME_CONFIG[state.theme];
        chartApiRef.current.applyOptions({
            layout: {
                background: { type: ColorType.Solid, color: currentTheme.background },
                textColor: currentTheme.text,
            },
            grid: {
                vertLines: { color: currentTheme.grid },
                horzLines: { color: currentTheme.grid },
            },
            timeScale: { borderColor: currentTheme.grid },
            rightPriceScale: { borderColor: currentTheme.grid }
        });
        seriesRef.current.applyOptions({
            upColor: currentTheme.candleUp,
            downColor: currentTheme.candleDown,
            wickUpColor: currentTheme.wickUp,
            wickDownColor: currentTheme.wickDown,
        });
    }
  }, [state.theme]);

  return (
    <div className="w-full h-full relative group">
      <div ref={chartContainerRef} className="w-full h-full" />
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-50">
          <div className="text-primary font-mono animate-pulse">
             SYNCING STREAM A [BINARY IPC]...
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50">
          <div className="text-danger font-mono p-4 border border-danger bg-surface rounded">
             DATA FETCH FAILURE: {error.message}
          </div>
        </div>
      )}
      
      {/* Watermark */}
      <div className="absolute top-4 left-4 pointer-events-none opacity-20 text-6xl font-bold text-muted">
        {state.symbol}
      </div>
    </div>
  );
};