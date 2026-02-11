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
            "h-full px-4 text-xs font-medium transition-colors relative flex items-center gap-2",
            activeTab === label 
                ? "text-blue-400 bg-[#1e293b]" 
                : "text-zinc-400 hover:text-zinc-200 hover:bg-[#1e293b]/50"
        )}
      >
          {label}
          {count !== undefined && (
              <span className="bg-zinc-700 text-zinc-300 px-1 rounded text-[10px] min-w-[16px] text-center">{count}</span>
          )}
          {activeTab === label && (
              <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-500" />
          )}
      </button>
  );

  return (
    <div className="h-full flex flex-col bg-[#0B1121] text-zinc-300 font-sans">
        {/* --- HEADER --- */}
        <div className="h-10 border-b border-white/5 flex items-center bg-[#151E32] shrink-0">
            
            {/* Market Overview Toggle (Mock) */}
            <button className="h-full px-4 flex items-center gap-2 border-r border-white/5 text-zinc-400 hover:bg-[#1e293b] transition-colors">
                <BarChart2 size={14} className="text-blue-500" />
                <span className="text-xs font-bold">Market Overview</span>
                <span className="text-[9px] border border-zinc-700 px-1 rounded text-zinc-500">OFFLINE</span>
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
            <div className="flex items-center px-2 gap-1 text-zinc-500">
                <button className="p-1.5 hover:text-zinc-300 hover:bg-white/5 rounded"><Maximize2 size={14} /></button>
                <button className="p-1.5 hover:text-zinc-300 hover:bg-white/5 rounded"><Plus size={14} /></button>
                <button className="p-1.5 hover:text-zinc-300 hover:bg-white/5 rounded"><X size={14} /></button>
            </div>
        </div>

        {/* --- CONTENT TABLE --- */}
        <div className="flex-1 overflow-auto bg-[#0B1121]">
            <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-[#0B1121] z-10 text-zinc-500 font-medium">
                    <tr>
                        <th className="py-2 px-4 border-b border-white/5 font-medium">SYMBOL</th>
                        <th className="py-2 px-4 border-b border-white/5 font-medium">SIDE</th>
                        <th className="py-2 px-4 border-b border-white/5 font-medium">SIZE</th>
                        <th className="py-2 px-4 border-b border-white/5 font-medium">ENTRY PRICE</th>
                        <th className="py-2 px-4 border-b border-white/5 font-medium">MARK PRICE</th>
                        <th className="py-2 px-4 border-b border-white/5 font-medium">LIQ. PRICE</th>
                        <th className="py-2 px-4 border-b border-white/5 font-medium">MARGIN</th>
                        <th className="py-2 px-4 border-b border-white/5 font-medium text-right">PNL (ROE%)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {activeTab === 'Positions' && MOCK_POSITIONS.map((pos) => (
                        <tr key={pos.id} className="hover:bg-white/[0.02] transition-colors group">
                            {/* Symbol */}
                            <td className="py-3 px-4 font-bold text-zinc-200">
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${pos.side === 'Long' ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                                    {pos.symbol}
                                    <span className="bg-[#1e293b] text-yellow-500 px-1 rounded text-[10px] font-mono border border-yellow-500/20">{pos.leverage}x</span>
                                </div>
                            </td>
                            
                            {/* Side */}
                            <td className={clsx("py-3 px-4 font-medium", pos.side === 'Long' ? "text-emerald-500" : "text-rose-500")}>
                                {pos.side}
                            </td>

                            {/* Size */}
                            <td className="py-3 px-4 font-mono text-zinc-300">
                                {pos.size} <span className="text-zinc-600 text-[10px]">{pos.sizeCurrency}</span>
                            </td>

                            {/* Prices */}
                            <td className="py-3 px-4 font-mono text-zinc-300">{pos.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="py-3 px-4 font-mono text-zinc-300">{pos.markPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="py-3 px-4 font-mono text-orange-400">{pos.liqPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            
                            {/* Margin */}
                            <td className="py-3 px-4 font-mono text-zinc-300">
                                {pos.margin.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-zinc-600 text-[10px]">USDT</span>
                            </td>

                            {/* PNL */}
                            <td className="py-3 px-4 text-right font-mono font-medium">
                                <div className={clsx(pos.pnl >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                    {pos.pnl >= 0 ? '+' : ''}{pos.pnl.toFixed(2)}
                                    <span className="ml-1 opacity-80">({pos.pnl >= 0 ? '+' : ''}{pos.roe.toFixed(2)}%)</span>
                                </div>
                            </td>
                        </tr>
                    ))}
                    
                    {/* Placeholder for empty tabs */}
                    {activeTab !== 'Positions' && (
                        <tr>
                            <td colSpan={8} className="py-12 text-center text-zinc-600 italic">
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