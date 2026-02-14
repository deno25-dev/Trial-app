
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ChartState, DrawingToolType, Timeframe, AppSkin, ChartTab } from '../types';
import { DEFAULT_SYMBOL, DEFAULT_TIMEFRAME, SKIN_CONFIG, FAVORITE_TIMEFRAMES } from '../constants';

interface ChartContextType {
  state: ChartState;
  isSearchOpen: boolean;
  isDataExplorerOpen: boolean;
  isTradePanelOpen: boolean;
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
  addTab: () => void;
  removeTab: (id: string) => void;
  selectTab: (id: string) => void;
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
    activeTabId: '1'
  });

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDataExplorerOpen, setIsDataExplorerOpen] = useState(false);
  const [isTradePanelOpen, setIsTradePanelOpen] = useState(false);

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
        // If the skin is light type, remove .dark class. If dark, add it.
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
      // Update the active tab's symbol
      const newTabs = prev.tabs.map(tab => 
        tab.id === prev.activeTabId ? { ...tab, symbol } : tab
      );
      return { ...prev, symbol, tabs: newTabs };
    });
  };

  const setInterval = (interval: Timeframe) => {
    setState(prev => {
      // Update the active tab's interval
      const newTabs = prev.tabs.map(tab => 
        tab.id === prev.activeTabId ? { ...tab, interval } : tab
      );
      return { ...prev, interval, tabs: newTabs };
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

  const toggleTheme = () => {
    setState(prev => {
      const newTheme = prev.theme === 'dark' ? 'light' : 'dark';
      
      // Auto-select a default skin for the target theme
      let newSkin: AppSkin = prev.skin;
      
      if (newTheme === 'light') {
          // If switching to light, force Polar if currently on a dark skin
          if (SKIN_CONFIG[prev.skin].type === 'dark') {
              newSkin = 'polar';
          }
      } else {
          // If switching to dark, force Default if currently on a light skin
          if (SKIN_CONFIG[prev.skin].type === 'light') {
              newSkin = 'default';
          }
      }

      return { ...prev, theme: newTheme, skin: newSkin };
    });
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

  return (
    <ChartContext.Provider value={{ 
        state, 
        isSearchOpen, 
        isDataExplorerOpen,
        isTradePanelOpen,
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
        addTab,
        removeTab,
        selectTab
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