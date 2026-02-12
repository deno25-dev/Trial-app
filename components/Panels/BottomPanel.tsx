import React, { useState } from 'react';
import { BarChart2, Plus, Maximize2, X } from 'lucide-react';
import { Position } from '../../types';
import clsx from 'clsx';

// --- MOCK DATA FOR POSITIONS ---
const MOCK_POSITIONS: Position[] = [
    {
        id: '1',
        symbol: 'BTCUSDT',
        leverage: 10,
        side: 'Long',
        size: 0.521,
        sizeCurrency: 'BTC',
        entryPrice: 64230.50,
        markPrice: 65013.62,
        liqPrice: 58100.00,
        margin: 3346.21,
        pnl: 408.00,
        roe: 12.19
    },
    {
        id: '2',
        symbol: 'ETHUSDT',
        leverage: 20,
        side: 'Short',
        size: 4.20,
        sizeCurrency: 'ETH',
        entryPrice: 3450.10,
        markPrice: 3452.00,
        liqPrice: 3600.00,
        margin: 1200.00,
        pnl: -7.98,
        roe: -0.66
    }
];

type PanelTab = 'Positions' | 'Open Orders' | 'Order History' | 'Trade History';

export const BottomPanel: React.FC<{ height: number }> = ({ height }) => {
  const [activeTab, setActiveTab] = useState<PanelTab>('Positions');

  // --- SUB-COMPONENTS ---
  
  const TabButton = ({ label, count }: { label: PanelTab; count?: number }) => (
      <button
        onClick={() => setActiveTab(label)}
        className={clsx(
            "h-full px-4 text-xs font-medium transition-colors relative flex items-center gap-2 border-r border-border",
            activeTab === label 
                ? "text-primary bg-surface-highlight" 
                : "text-muted hover:text-text hover:bg-surface-highlight/50"
        )}
      >
          {label}
          {count !== undefined && (
              <span className={clsx(
                  "px-1.5 rounded text-[10px] min-w-[16px] text-center",
                  activeTab === label ? "bg-primary/20 text-primary" : "bg-surface text-muted border border-border"
              )}>{count}</span>
          )}
          {activeTab === label && (
              <div className="absolute top-0 left-0 w-full h-[2px] bg-primary" />
          )}
      </button>
  );

  return (
    <div className="h-full flex flex-col bg-background text-text font-sans">
        {/* --- HEADER --- */}
        <div className="h-10 border-b border-border flex items-center bg-surface shrink-0">
            
            {/* Market Overview Toggle (Mock) */}
            <button className="h-full px-4 flex items-center gap-2 border-r border-border text-muted hover:bg-surface-highlight hover:text-text transition-colors">
                <BarChart2 size={14} className="text-primary" />
                <span className="text-xs font-bold">Market Overview</span>
                <span className="text-[9px] border border-border px-1 rounded text-muted">OFFLINE</span>
            </button>

            {/* Tabs */}
            <div className="flex h-full overflow-x-auto no-scrollbar">
                <TabButton label="Positions" count={2} />
                <TabButton label="Open Orders" count={0} />
                <TabButton label="Order History" />
                <TabButton label="Trade History" />
            </div>

            <div className="flex-1" />

            {/* Panel Actions */}
            <div className="flex items-center px-2 gap-1 text-muted">
                <button className="p-1.5 hover:text-text hover:bg-surface-highlight rounded"><Maximize2 size={14} /></button>
                <button className="p-1.5 hover:text-text hover:bg-surface-highlight rounded"><Plus size={14} /></button>
                <button className="p-1.5 hover:text-text hover:bg-surface-highlight rounded"><X size={14} /></button>
            </div>
        </div>

        {/* --- CONTENT TABLE --- */}
        <div className="flex-1 overflow-auto bg-background custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-surface z-10 text-muted font-medium shadow-sm">
                    <tr>
                        <th className="py-2 px-4 border-b border-border font-medium">SYMBOL</th>
                        <th className="py-2 px-4 border-b border-border font-medium">SIDE</th>
                        <th className="py-2 px-4 border-b border-border font-medium">SIZE</th>
                        <th className="py-2 px-4 border-b border-border font-medium">ENTRY PRICE</th>
                        <th className="py-2 px-4 border-b border-border font-medium">MARK PRICE</th>
                        <th className="py-2 px-4 border-b border-border font-medium">LIQ. PRICE</th>
                        <th className="py-2 px-4 border-b border-border font-medium">MARGIN</th>
                        <th className="py-2 px-4 border-b border-border font-medium text-right">PNL (ROE%)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {activeTab === 'Positions' && MOCK_POSITIONS.map((pos) => (
                        <tr key={pos.id} className="hover:bg-surface-highlight/30 transition-colors group">
                            {/* Symbol */}
                            <td className="py-3 px-4 font-bold text-text">
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${pos.side === 'Long' ? 'bg-success' : 'bg-muted'}`} />
                                    {pos.symbol}
                                    <span className="bg-primary/10 text-primary px-1.5 rounded text-[10px] font-mono border border-primary/20">{pos.leverage}x</span>
                                </div>
                            </td>
                            
                            {/* Side */}
                            <td className={clsx("py-3 px-4 font-medium", pos.side === 'Long' ? "text-success" : "text-danger")}>
                                {pos.side}
                            </td>

                            {/* Size */}
                            <td className="py-3 px-4 font-mono text-text">
                                {pos.size} <span className="text-muted text-[10px]">{pos.sizeCurrency}</span>
                            </td>

                            {/* Prices */}
                            <td className="py-3 px-4 font-mono text-text">{pos.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="py-3 px-4 font-mono text-text">{pos.markPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="py-3 px-4 font-mono text-danger">{pos.liqPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            
                            {/* Margin */}
                            <td className="py-3 px-4 font-mono text-text">
                                {pos.margin.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-muted text-[10px]">USDT</span>
                            </td>

                            {/* PNL */}
                            <td className="py-3 px-4 text-right font-mono font-medium">
                                <div className={clsx(pos.pnl >= 0 ? "text-success" : "text-danger")}>
                                    {pos.pnl >= 0 ? '+' : ''}{pos.pnl.toFixed(2)}
                                    <span className="ml-1 opacity-80">({pos.pnl >= 0 ? '+' : ''}{pos.roe.toFixed(2)}%)</span>
                                </div>
                            </td>
                        </tr>
                    ))}
                    
                    {/* Placeholder for empty tabs */}
                    {activeTab !== 'Positions' && (
                        <tr>
                            <td colSpan={8} className="py-12 text-center text-muted italic">
                                No records found for {activeTab}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
  );
};