import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ChartState, DrawingToolType, Timeframe } from '../types';
import { DEFAULT_SYMBOL, DEFAULT_TIMEFRAME } from '../constants';

interface ChartContextType {
  state: ChartState;
  setSymbol: (symbol: string) => void;
  setInterval: (interval: Timeframe) => void;
  setTool: (tool: DrawingToolType) => void;
  toggleMagnet: () => void;
  toggleChartType: () => void;
  toggleGrid: () => void;
  toggleTheme: () => void;
}

const ChartContext = createContext<ChartContextType | undefined>(undefined);

export const ChartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ChartState>({
    symbol: DEFAULT_SYMBOL,
    interval: DEFAULT_TIMEFRAME,
    chartType: 'candle',
    isMagnetMode: false,
    activeTool: 'crosshair',
    showGrid: true,
    theme: 'dark'
  });

  // Ensure DOM matches initial state
  useEffect(() => {
    if (state.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const setSymbol = (symbol: string) => setState(prev => ({ ...prev, symbol }));
  const setInterval = (interval: Timeframe) => setState(prev => ({ ...prev, interval }));
  const setTool = (activeTool: DrawingToolType) => setState(prev => ({ ...prev, activeTool }));
  const toggleMagnet = () => setState(prev => ({ ...prev, isMagnetMode: !prev.isMagnetMode }));
  const toggleChartType = () => setState(prev => ({ ...prev, chartType: prev.chartType === 'candle' ? 'line' : 'candle' }));
  const toggleGrid = () => setState(prev => ({ ...prev, showGrid: !prev.showGrid }));
  
  const toggleTheme = () => {
    setState(prev => {
      const newTheme = prev.theme === 'dark' ? 'light' : 'dark';
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { ...prev, theme: newTheme };
    });
  };

  return (
    <ChartContext.Provider value={{ state, setSymbol, setInterval, setTool, toggleMagnet, toggleChartType, toggleGrid, toggleTheme }}>
      {children}
    </ChartContext.Provider>
  );
};

export const useChart = () => {
  const context = useContext(ChartContext);
  if (!context) throw new Error("useChart must be used within a ChartProvider");
  return context;
};