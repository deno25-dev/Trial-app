import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, HistogramData, ColorType, CrosshairMode, LineStyle } from 'lightweight-charts';
import { useQuery } from '@tanstack/react-query';
import { useChart } from '../../context/ChartContext';
import { TauriService } from '../../services/tauriService';
import { THEME_CONFIG } from '../../constants';
import { Telemetry } from '../../utils/telemetry';
import { OhlcData } from '../../types';

// Helper to format numbers with precision
const formatPrice = (price: number) => price.toFixed(2);
const formatVol = (vol: number) => {
    if (vol >= 1000000) return (vol / 1000000).toFixed(2) + 'M';
    if (vol >= 1000) return (vol / 1000).toFixed(2) + 'K';
    return vol.toFixed(0);
};

export const FinancialChart: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartApiRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  
  const { state } = useChart();

  // --- LEGEND STATE ---
  // Stores the current values to display in the top-left overlay
  const [legend, setLegend] = useState<{
    open: string;
    high: string;
    low: string;
    close: string;
    change: string;
    changePercent: string;
    volume: string;
    color: string; // For the change percent
  } | null>(null);

  // --- DATA FETCHING ---
  const { data: chartData, isLoading, error } = useQuery({
    queryKey: ['chartData', state.symbol, state.interval],
    queryFn: () => TauriService.loadChartData(state.symbol, state.interval),
    refetchOnWindowFocus: false,
  });

  // --- CHART INITIALIZATION ---
  useEffect(() => {
    if (!chartContainerRef.current) return;

    Telemetry.info('UI', `Initializing Chart Engine`, { symbol: state.symbol, theme: state.theme });

    const initialTheme = THEME_CONFIG[state.theme];

    // Initialize Chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: initialTheme.background },
        textColor: initialTheme.text,
        fontFamily: "'Inter', sans-serif", // Set chart font to Inter
      },
      grid: {
        vertLines: { color: initialTheme.grid, visible: state.showGrid },
        horzLines: { color: initialTheme.grid, visible: state.showGrid },
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

    // 1. Add Volume Series (Histogram)
    const volumeSeries = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: '', // Overlay on the same scale
    });
    // Set volume to take up bottom 15% of the chart
    volumeSeries.priceScale().applyOptions({
        scaleMargins: {
            top: 0.85,
            bottom: 0,
        },
    });
    volumeSeriesRef.current = volumeSeries;

    // 2. Add Candlestick Series
    const series = chart.addCandlestickSeries({
      upColor: initialTheme.candleUp,
      downColor: initialTheme.candleDown,
      borderVisible: false,
      wickUpColor: initialTheme.wickUp,
      wickDownColor: initialTheme.wickDown,
    });
    seriesRef.current = series;

    // --- CROSSHAIR HANDLER ---
    chart.subscribeCrosshairMove((param) => {
        if (!param.time || !seriesRef.current || !volumeSeriesRef.current) {
            updateLegendWithLatest();
            return;
        }

        const candle = param.seriesData.get(seriesRef.current) as CandlestickData;
        const volume = param.seriesData.get(volumeSeriesRef.current) as HistogramData;
        
        if (candle) {
            updateLegend(candle, volume?.value);
        }
    });

    // Handle Resize
    const resizeObserver = new ResizeObserver((entries) => {
      if (!chartContainerRef.current || !chartApiRef.current) return;
      const { width, height } = entries[0].contentRect;
      chartApiRef.current.applyOptions({ width, height });
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      Telemetry.debug('UI', 'Chart Engine Disposed');
    };
  }, []); 

  // --- DATA SYNC & LEGEND UPDATER ---
  
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

  const latestDataRef = useRef<{candle: OhlcData, vol: number} | null>(null);

  const updateLegendWithLatest = () => {
      if (latestDataRef.current) {
          updateLegend(latestDataRef.current.candle, latestDataRef.current.vol);
      }
  };

  // Sync Data to Chart
  useEffect(() => {
    if (seriesRef.current && volumeSeriesRef.current && chartData && chartData.length > 0) {
      const start = performance.now();
      
      const candles: CandlestickData[] = [];
      const volumes: HistogramData[] = [];

      chartData.forEach((d) => {
          const time = d.time as any;
          candles.push({
              time,
              open: d.open,
              high: d.high,
              low: d.low,
              close: d.close
          });
          
          const isUp = d.close >= d.open;
          const currentTheme = THEME_CONFIG[state.theme];
          
          volumes.push({
              time,
              value: d.volume,
              color: isUp ? currentTheme.candleUp + '80' : currentTheme.candleDown + '80'
          });
      });

      seriesRef.current.setData(candles);
      volumeSeriesRef.current.setData(volumes);

      const last = chartData[chartData.length - 1];
      latestDataRef.current = { candle: last, vol: last.volume };
      updateLegendWithLatest();

      const perf = performance.now() - start;
      if (perf > 16) {
          Telemetry.warn('Performance', 'Chart Render Dropped Frame', { duration: `${perf.toFixed(2)}ms`, points: chartData.length });
      } else {
          Telemetry.debug('Performance', 'Chart Rendered', { duration: `${perf.toFixed(2)}ms` });
      }
    }
  }, [chartData, state.theme]); 

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

  useEffect(() => {
    if (chartApiRef.current && seriesRef.current && volumeSeriesRef.current) {
        const currentTheme = THEME_CONFIG[state.theme];
        chartApiRef.current.applyOptions({
            layout: {
                background: { type: ColorType.Solid, color: currentTheme.background },
                textColor: currentTheme.text,
                fontFamily: "'Inter', sans-serif",
            },
            grid: {
                vertLines: { color: currentTheme.grid },
                horzLines: { color: currentTheme.grid },
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
        Telemetry.info('UI', 'Theme Switched', { theme: state.theme });
    }
  }, [state.theme]);

  return (
    <div className="w-full h-full relative group bg-background">
      <div ref={chartContainerRef} className="w-full h-full" />
      
      {/* --- PROFESSIONAL STATUS LINE OVERLAY --- */}
      {/* Changed font-mono to font-sans + tabular-nums for a cleaner, aligned look */}
      {legend && (
        <div className="absolute top-2 left-3 z-20 flex flex-wrap items-center gap-4 text-[11px] select-none pointer-events-none font-sans font-medium tabular-nums">
            {/* Primary Status Info */}
            <div className="flex items-center gap-2">
                 <span className="font-bold text-base text-text tracking-tight">{state.symbol}</span>
                 <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-bold">{state.interval}</span>
                 
                 {/* Current Price & Change */}
                 <span className={`text-sm font-bold ${legend.color} ml-1`}>
                     {legend.close}
                 </span>
                 <span className={`${legend.color} text-xs`}>
                     {legend.change} ({legend.changePercent}%)
                 </span>
            </div>

            {/* Inline OHLCV Data - PREMIUM TERMINAL COLORS */}
            <div className="hidden md:flex items-center gap-4 ml-2">
                <div className="flex gap-1.5">
                    <span className="text-muted font-medium">O</span>
                    <span className="text-amber-500 font-medium tracking-wide">{legend.open}</span>
                </div>
                <div className="flex gap-1.5">
                    <span className="text-muted font-medium">H</span>
                    <span className="text-amber-500 font-medium tracking-wide">{legend.high}</span>
                </div>
                <div className="flex gap-1.5">
                    <span className="text-muted font-medium">L</span>
                    <span className="text-amber-500 font-medium tracking-wide">{legend.low}</span>
                </div>
                <div className="flex gap-1.5">
                    <span className="text-muted font-medium">C</span>
                    <span className="text-amber-500 font-medium tracking-wide">{legend.close}</span>
                </div>
                <span className="text-border/50">|</span>
                <div className="flex gap-1.5">
                    <span className="text-muted font-medium">Vol</span>
                    <span className="text-amber-500 font-medium tracking-wide">{legend.volume}</span>
                </div>
            </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-50">
          <div className="text-primary font-mono animate-pulse text-xs tracking-widest">
             INITIALIZING STREAM A...
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50">
          <div className="text-danger font-mono p-4 border border-danger bg-surface rounded text-sm">
             DATA FAILURE: {error.message}
          </div>
        </div>
      )}
    </div>
  );
};