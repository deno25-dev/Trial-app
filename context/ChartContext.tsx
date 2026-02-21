

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ChartState, DrawingToolType, Timeframe, AppSkin, ChartTab } from '../types';
import { DEFAULT_SYMBOL, DEFAULT_TIMEFRAME, SKIN_CONFIG, FAVORITE_TIMEFRAMES } from '../constants';

interface ChartContextType {
  state: ChartState;
  isSearchOpen: boolean;
  isDataExplorerOpen: boolean;
  isTradePanelOpen: boolean;
  isStickyNoteManagerOpen: boolean; 
  setSymbol: (symbol: string) => void;
  setInterval: (interval: Timeframe) => void;
  setTool: (tool: DrawingToolType) => void;
  setSkin: (skin: AppSkin) => void;
  toggleMagnet: () => void;
  toggleChartType: () => void;
  toggleGrid: () => void;
  toggleFavoritesBar: () => void;
  toggleFavorite: (timeframe: Timeframe) => void;
  toggleTheme: () => void;
  toggleSearch: () => void;
  toggleDataExplorer: () => void;
  toggleTradePanel: () => void;
  toggleStickyNoteManager: () => void;
  addTab: () => void;
  removeTab: (id: string) => void;
  selectTab: (id: string) => void;
  
  // Replay Methods
  toggleReplay: () => void;
  setReplayPlaying: (isPlaying: boolean) => void;
  setReplaySpeed: (speed: number) => void;
  setReplayWaitingForCut: (isWaiting: boolean) => void;

  // Clear Drawings Trigger
  clearDrawingsTrigger: number;
  chartRevision: number;
  clearDrawings: () => void;

  // Price Scale Methods
  setPriceScaleMode: (mode: 'Linear' | 'Logarithmic' | 'Percentage') => void;
  toggleAutoScale: () => void;
  toggleInvertScale: () => void;
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
    showFavoritesBar: true,
    theme: 'dark',
    skin: 'default',
    favorites: [...FAVORITE_TIMEFRAMES],
    tabs: [{ id: '1', symbol: DEFAULT_SYMBOL, interval: DEFAULT_TIMEFRAME }],
    activeTabId: '1',
    replay: {
      isActive: false,
      isPlaying: false,
      speed: 1, // 1 tick per frame update cycle (simulated speed)
      isWaitingForCut: false,
      currentTimestamp: null
    },
    // Default Price Scale Settings
    priceScaleMode: 'Linear',
    isAutoScale: true,
    isInverted: false
  });

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDataExplorerOpen, setIsDataExplorerOpen] = useState(false);
  const [isTradePanelOpen, setIsTradePanelOpen] = useState(false);
  const [isStickyNoteManagerOpen, setIsStickyNoteManagerOpen] = useState(false);

  // Clear Drawings Logic
  const [clearDrawingsTrigger, setClearDrawingsTrigger] = useState(0);
  const [chartRevision, setChartRevision] = useState(0);
  const clearDrawings = () => {
    setClearDrawingsTrigger(prev => prev + 1);
    setChartRevision(prev => prev + 1);
  };

  // Ensure DOM matches initial state
  useEffect(() => {
    if (state.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Skin Application Effect - UNIFIED
  useEffect(() => {
    const skinData = SKIN_CONFIG[state.skin];
    if (skinData) {
        const root = document.documentElement;
        
        // 1. Apply CSS Variables
        Object.entries(skinData.css).forEach(([key, value]) => {
            root.style.setProperty(key, value as string);
        });

        // 2. Sync Theme Class (Important for Tailwind Dark Mode utils)
        if (skinData.type === 'light') {
            root.classList.remove('dark');
        } else {
            root.classList.add('dark');
        }
    }
  }, [state.skin]);

  // Sync state.theme when DOM class changes via Skin (to keep toggle button in sync)
  useEffect(() => {
      const skinData = SKIN_CONFIG[state.skin];
      if (skinData) {
          setState(prev => ({
              ...prev,
              theme: skinData.type === 'light' ? 'light' : 'dark'
          }));
      }
  }, [state.skin]);

  const setSymbol = (symbol: string) => {
    setState(prev => {
      const newTabs = prev.tabs.map(tab => 
        tab.id === prev.activeTabId ? { ...tab, symbol } : tab
      );
      // Reset replay on symbol change
      return { 
        ...prev, 
        symbol, 
        tabs: newTabs,
        replay: { ...prev.replay, isActive: false, isPlaying: false, isWaitingForCut: false }
      };
    });
  };

  const setInterval = (interval: Timeframe) => {
    setState(prev => {
      const newTabs = prev.tabs.map(tab => 
        tab.id === prev.activeTabId ? { ...tab, interval } : tab
      );
      // Reset replay on interval change
      return { 
        ...prev, 
        interval, 
        tabs: newTabs,
        replay: { ...prev.replay, isActive: false, isPlaying: false, isWaitingForCut: false }
      };
    });
  };

  const setTool = (activeTool: DrawingToolType) => setState(prev => ({ ...prev, activeTool }));
  
  const setSkin = (skin: AppSkin) => setState(prev => ({ ...prev, skin }));
  
  const toggleMagnet = () => setState(prev => ({ ...prev, isMagnetMode: !prev.isMagnetMode }));
  const toggleChartType = () => setState(prev => ({ ...prev, chartType: prev.chartType === 'candle' ? 'line' : 'candle' }));
  const toggleGrid = () => setState(prev => ({ ...prev, showGrid: !prev.showGrid }));
  const toggleFavoritesBar = () => setState(prev => ({ ...prev, showFavoritesBar: !prev.showFavoritesBar }));
  
  const toggleFavorite = (tf: Timeframe) => {
    setState(prev => {
        const isFav = prev.favorites.includes(tf);
        let newFavs;
        if (isFav) {
            newFavs = prev.favorites.filter(f => f !== tf);
        } else {
            newFavs = [...prev.favorites, tf];
        }
        return { ...prev, favorites: newFavs };
    });
  };

  const toggleSearch = () => setIsSearchOpen(prev => !prev);
  const toggleDataExplorer = () => setIsDataExplorerOpen(prev => !prev);
  const toggleTradePanel = () => setIsTradePanelOpen(prev => !prev);
  const toggleStickyNoteManager = () => setIsStickyNoteManagerOpen(prev => !prev);

  const toggleTheme = () => {
    setState(prev => {
      const newTheme = prev.theme === 'dark' ? 'light' : 'dark';
      let newSkin: AppSkin = prev.skin;
      
      if (newTheme === 'light') {
          if (SKIN_CONFIG[prev.skin].type === 'dark') {
              newSkin = 'polar';
          }
      } else {
          if (SKIN_CONFIG[prev.skin].type === 'light') {
              newSkin = 'default';
          }
      }

      return { ...prev, theme: newTheme, skin: newSkin };
    });
  };

  // --- REPLAY ACTIONS ---
  const toggleReplay = () => {
    setState(prev => {
      // If turning ON, set waiting for cut. If turning OFF, reset everything.
      const isActive = !prev.replay.isActive;
      return {
        ...prev,
        replay: {
          isActive,
          isPlaying: false,
          isWaitingForCut: isActive, // Start by waiting for cut
          speed: 1,
          currentTimestamp: null
        }
      };
    });
  };

  const setReplayPlaying = (isPlaying: boolean) => {
    setState(prev => ({
      ...prev,
      replay: { ...prev.replay, isPlaying }
    }));
  };

  const setReplaySpeed = (speed: number) => {
    setState(prev => ({
      ...prev,
      replay: { ...prev.replay, speed }
    }));
  };

  const setReplayWaitingForCut = (isWaiting: boolean) => {
    setState(prev => ({
      ...prev,
      replay: { ...prev.replay, isWaitingForCut: isWaiting }
    }));
  };

  // --- TAB MANAGEMENT ---
  const addTab = () => {
    const newId = crypto.randomUUID();
    const newTab: ChartTab = { id: newId, symbol: DEFAULT_SYMBOL, interval: DEFAULT_TIMEFRAME };
    setState(prev => ({
        ...prev,
        tabs: [...prev.tabs, newTab],
        activeTabId: newId,
        symbol: newTab.symbol,
        interval: newTab.interval
    }));
  };

  const removeTab = (id: string) => {
    setState(prev => {
        if (prev.tabs.length <= 1) return prev; // Don't close last tab
        const newTabs = prev.tabs.filter(t => t.id !== id);
        
        let newActiveId = prev.activeTabId;
        let newSymbol = prev.symbol;
        let newInterval = prev.interval;

        // If we closed the active tab, switch to the last one
        if (id === prev.activeTabId) {
            const lastTab = newTabs[newTabs.length - 1];
            newActiveId = lastTab.id;
            newSymbol = lastTab.symbol;
            newInterval = lastTab.interval;
        }

        return {
            ...prev,
            tabs: newTabs,
            activeTabId: newActiveId,
            symbol: newSymbol,
            interval: newInterval
        };
    });
  };

  const selectTab = (id: string) => {
    setState(prev => {
        const tab = prev.tabs.find(t => t.id === id);
        if (!tab) return prev;
        return {
            ...prev,
            activeTabId: id,
            symbol: tab.symbol,
            interval: tab.interval
        };
    });
  };

  // --- PRICE SCALE ACTIONS ---
  const setPriceScaleMode = (mode: 'Linear' | 'Logarithmic' | 'Percentage') => {
      setState(prev => ({ ...prev, priceScaleMode: mode }));
  };

  const toggleAutoScale = () => {
      setState(prev => ({ ...prev, isAutoScale: !prev.isAutoScale }));
  };

  const toggleInvertScale = () => {
      setState(prev => ({ ...prev, isInverted: !prev.isInverted }));
  };

  return (
    <ChartContext.Provider value={{ 
        state, 
        isSearchOpen, 
        isDataExplorerOpen,
        isTradePanelOpen,
        isStickyNoteManagerOpen,
        setSymbol, 
        setInterval, 
        setTool, 
        setSkin, 
        toggleMagnet, 
        toggleChartType, 
        toggleGrid, 
        toggleFavoritesBar, 
        toggleFavorite,
        toggleTheme, 
        toggleSearch,
        toggleDataExplorer,
        toggleTradePanel,
        toggleStickyNoteManager,
        addTab,
        removeTab,
        selectTab,
        toggleReplay,
        setReplayPlaying,
        setReplaySpeed,
        setReplayWaitingForCut,
        clearDrawingsTrigger,
        chartRevision,
        clearDrawings,
        setPriceScaleMode,
        toggleAutoScale,
        toggleInvertScale
    }}>
      {children}
    </ChartContext.Provider>
  );
};

export const useChart = () => {
  const context = useContext(ChartContext);
  if (!context) throw new Error("useChart must be used within a ChartProvider");
  return context;
};