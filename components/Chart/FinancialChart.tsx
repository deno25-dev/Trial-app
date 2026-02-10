import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, ColorType, CrosshairMode } from 'lightweight-charts';
import { useChart } from '../../context/ChartContext';
import { TauriService } from '../../services/tauriService';
import { THEME_CONFIG } from '../../constants';
import { OhlcData } from '../../types';

export const FinancialChart: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartApiRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  
  const { state } = useChart();
  const [loading, setLoading] = useState(true);

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
    // This ensures the chart adapts not just to window resize, but also layout changes (like panel toggles)
    const resizeObserver = new ResizeObserver((entries) => {
      if (!chartContainerRef.current || !chartApiRef.current) return;
      
      const { width, height } = entries[0].contentRect;
      
      // Ensure we have valid dimensions to avoid library errors
      if (width === 0 || height === 0) return;

      chartApiRef.current.applyOptions({ 
        width: width,
        height: height
      });
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []); // Run once on mount

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
            timeScale: {
                borderColor: currentTheme.grid,
            },
            rightPriceScale: {
                borderColor: currentTheme.grid,
            }
        });

        seriesRef.current.applyOptions({
            upColor: currentTheme.candleUp,
            downColor: currentTheme.candleDown,
            wickUpColor: currentTheme.wickUp,
            wickDownColor: currentTheme.wickDown,
        });
    }
  }, [state.theme]);

  // Data Loading Logic (Stream A)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await TauriService.loadLocalData(state.symbol, state.interval);
        if (seriesRef.current) {
          // Type casting necessary as lightweight-charts expects strict types
          seriesRef.current.setData(data as unknown as CandlestickData[]);
        }
      } catch (error) {
        console.error("Failed to load chart data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [state.symbol, state.interval]);

  return (
    <div className="w-full h-full relative group">
      <div ref={chartContainerRef} className="w-full h-full" />
      
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-50">
          <div className="text-primary font-mono animate-pulse">LOADING STREAM A...</div>
        </div>
      )}
      
      {/* Watermark/Ticker Overlay */}
      <div className="absolute top-4 left-4 pointer-events-none opacity-20 text-6xl font-bold text-muted">
        {state.symbol}
      </div>
    </div>
  );
};