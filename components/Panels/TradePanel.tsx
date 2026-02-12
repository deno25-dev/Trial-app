import React, { useState } from 'react';
import { useChart } from '../../context/ChartContext';
import { useMarket } from '../../context/MarketContext';
import { 
  ArrowRightLeft, 
  X, 
  ExternalLink, 
  Wallet, 
  Settings2,
  Zap,
  HelpCircle,
  Plus,
  Minus
} from 'lucide-react';
import clsx from 'clsx';

export const TradePanel: React.FC = () => {
  const { state, toggleTradePanel } = useChart();
  const { prices } = useMarket();
  
  // Local State
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'limit' | 'market' | 'stop'>('limit');
  const [marketType, setMarketType] = useState<'spot' | 'futures'>('futures');
  const [leverage, setLeverage] = useState(20);
  const [price, setPrice] = useState<string>('');
  const [amount, setAmount] = useState<string>('1.0');
  
  const [tpEnabled, setTpEnabled] = useState(false);
  const [slEnabled, setSlEnabled] = useState(false);
  
  const [isPostOnly, setIsPostOnly] = useState(false);
  const [isReduceOnly, setIsReduceOnly] = useState(false);

  // Derived Data
  const currentPrice = prices[state.symbol]?.c || '0.00';
  const numPrice = parseFloat(price || currentPrice);
  const numAmount = parseFloat(amount || '0');
  const notionalValue = numPrice * numAmount;
  const marginCost = notionalValue / leverage;
  const estFee = notionalValue * 0.0005; // 0.05%

  return (
    <div className="h-full flex flex-col bg-surface border-l border-border w-[320px] select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-highlight/10">
        <div className="flex items-center gap-2 text-text font-bold">
          <ArrowRightLeft size={16} />
          <span>Order Entry</span>
        </div>
        <div className="flex items-center gap-2 text-muted">
          <button className="hover:text-text transition-colors"><ExternalLink size={14} /></button>
          <button onClick={toggleTradePanel} className="hover:text-text transition-colors"><X size={16} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-5">
        
        {/* Market Type Toggle */}
        <div className="flex p-1 bg-background rounded-lg border border-border">
          <button 
            onClick={() => setMarketType('spot')}
            className={clsx(
              "flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2",
              marketType === 'spot' ? "bg-surface-highlight text-text shadow-sm" : "text-muted hover:text-text"
            )}
          >
            <Wallet size={12} /> SPOT
          </button>
          <button 
            onClick={() => setMarketType('futures')}
            className={clsx(
              "flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2",
              marketType === 'futures' ? "bg-primary/20 text-primary shadow-sm" : "text-muted hover:text-text"
            )}
          >
            <Zap size={12} /> FUTURES
          </button>
        </div>

        {/* Balance Card */}
        <div className="bg-surface-highlight/20 border border-white/5 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
             <div className="flex items-center gap-1.5 text-muted text-[10px] font-medium uppercase tracking-wide">
                <Wallet size={10} /> Available Balance
             </div>
             <Settings2 size={12} className="text-muted cursor-pointer hover:text-text" />
          </div>
          <div className="text-2xl font-mono font-bold text-text mb-1">$100,000.00</div>
          <div className="flex items-center justify-between text-[10px]">
             <span className="text-muted">Unrealized P&L</span>
             <span className="text-success font-mono">+ $1,240.50</span>
          </div>
        </div>

        {/* Side Toggle */}
        <div className="grid grid-cols-2 gap-2 h-9">
          <button 
             onClick={() => setSide('buy')}
             className={clsx(
               "rounded-lg font-bold text-xs transition-all border",
               side === 'buy' 
                 ? "bg-success hover:bg-success/90 text-white border-transparent shadow-[0_0_15px_rgba(34,197,94,0.3)]" 
                 : "bg-surface-highlight text-muted border-transparent hover:border-success/30"
             )}
          >
            Buy
          </button>
          <button 
             onClick={() => setSide('sell')}
             className={clsx(
               "rounded-lg font-bold text-xs transition-all border",
               side === 'sell' 
                 ? "bg-danger hover:bg-danger/90 text-white border-transparent shadow-[0_0_15px_rgba(239,68,68,0.3)]" 
                 : "bg-surface-highlight text-muted border-transparent hover:border-danger/30"
             )}
          >
            Sell
          </button>
        </div>

        {/* Order Type Tabs */}
        <div className="flex border-b border-border">
          {['LIMIT', 'MARKET', 'STOP'].map((type) => (
             <button 
               key={type}
               onClick={() => setOrderType(type.toLowerCase() as any)}
               className={clsx(
                 "flex-1 pb-2 text-[11px] font-bold transition-all relative",
                 orderType === type.toLowerCase() ? "text-primary" : "text-muted hover:text-text"
               )}
             >
               {type}
               {orderType === type.toLowerCase() && (
                 <div className="absolute bottom-0 left-0 w-full h-[2px] bg-primary rounded-t-full" />
               )}
             </button>
          ))}
        </div>

        {/* Inputs */}
        <div className="flex flex-col gap-3">
            {/* Price Input */}
            <div>
               <div className="flex justify-between text-[10px] text-muted mb-1.5 px-1">
                  <span>Price (USD)</span>
                  <span className="font-mono text-primary cursor-pointer hover:underline" onClick={() => setPrice(currentPrice)}>
                     Last: {parseFloat(currentPrice).toFixed(2)}
                  </span>
               </div>
               <div className="relative group">
                  <input 
                     type="number" 
                     className="w-full bg-background border border-border rounded-lg py-2.5 pl-3 pr-16 text-sm font-mono text-text focus:border-primary focus:outline-none transition-colors"
                     placeholder="0.00"
                     value={price}
                     onChange={(e) => setPrice(e.target.value)}
                  />
                  <div className="absolute right-1 top-1 h-[calc(100%-8px)] flex">
                      <div className="w-px bg-border my-1 mx-1" />
                      <button className="px-2 text-muted hover:text-text transition-colors"><Minus size={12} /></button>
                      <button className="px-2 text-muted hover:text-text transition-colors"><Plus size={12} /></button>
                  </div>
               </div>
            </div>

            {/* Amount Input */}
            <div>
               <div className="text-[10px] text-muted mb-1.5 px-1">
                  Amount ({state.symbol}_{state.interval}.csv)
               </div>
               <div className="relative">
                  <input 
                     type="number" 
                     className="w-full bg-background border border-border rounded-lg py-2.5 pl-3 pr-3 text-sm font-mono text-text focus:border-primary focus:outline-none transition-colors text-right"
                     placeholder="0.00"
                     value={amount}
                     onChange={(e) => setAmount(e.target.value)}
                  />
               </div>
            </div>
        </div>

        {/* TP / SL */}
        <div className="grid grid-cols-2 gap-3">
             {/* Stop Loss */}
             <div>
                <div className="flex items-center gap-2 mb-2">
                    <input 
                       type="checkbox" 
                       id="cb-sl" 
                       checked={slEnabled}
                       onChange={(e) => setSlEnabled(e.target.checked)}
                       className="w-3.5 h-3.5 rounded border-border bg-background text-primary focus:ring-0 cursor-pointer" 
                    />
                    <label htmlFor="cb-sl" className="text-[10px] font-bold text-muted cursor-pointer select-none">Stop Loss</label>
                </div>
                <button 
                   disabled={!slEnabled}
                   className="w-full bg-background border border-border rounded-lg py-2 text-xs text-muted font-mono hover:border-text/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                   Price
                </button>
             </div>

             {/* Take Profit */}
             <div>
                <div className="flex items-center gap-2 mb-2">
                    <input 
                       type="checkbox" 
                       id="cb-tp" 
                       checked={tpEnabled}
                       onChange={(e) => setTpEnabled(e.target.checked)}
                       className="w-3.5 h-3.5 rounded border-border bg-background text-primary focus:ring-0 cursor-pointer" 
                    />
                    <label htmlFor="cb-tp" className="text-[10px] font-bold text-muted cursor-pointer select-none">Take Profit</label>
                </div>
                <button 
                   disabled={!tpEnabled}
                   className="w-full bg-background border border-border rounded-lg py-2 text-xs text-muted font-mono hover:border-text/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                   Price
                </button>
             </div>
        </div>

        {/* Leverage */}
        <div className="space-y-3 pt-2">
             <div className="flex justify-between items-center text-[10px]">
                 <div className="flex items-center gap-1.5 text-primary font-bold">
                    <Zap size={10} /> Leverage
                 </div>
                 <span className="font-mono text-primary font-bold text-sm">{leverage}x</span>
             </div>
             <input 
                type="range" 
                min="1" 
                max="125" 
                step="1"
                value={leverage}
                onChange={(e) => setLeverage(parseInt(e.target.value))}
                className="w-full h-1.5 bg-surface-highlight rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary/80"
             />
             <div className="flex justify-between text-[9px] text-muted font-mono">
                 <span>5x</span>
                 <span>25x</span>
                 <span>50x</span>
                 <span>75x</span>
                 <span>100x</span>
                 <span>125x</span>
             </div>
        </div>

        {/* Options */}
        <div className="flex gap-4 pt-1">
             <div className="flex items-center gap-2">
                 <input 
                    type="checkbox" 
                    id="cb-post" 
                    checked={isPostOnly}
                    onChange={(e) => setIsPostOnly(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-border bg-background text-primary focus:ring-0 cursor-pointer"
                 />
                 <label htmlFor="cb-post" className="text-[10px] text-muted cursor-pointer">Post Only</label>
             </div>
             <div className="flex items-center gap-2">
                 <input 
                    type="checkbox" 
                    id="cb-reduce" 
                    checked={isReduceOnly}
                    onChange={(e) => setIsReduceOnly(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-border bg-background text-primary focus:ring-0 cursor-pointer"
                 />
                 <label htmlFor="cb-reduce" className="text-[10px] text-muted cursor-pointer">Reduce Only</label>
             </div>
        </div>

        {/* Summary */}
        <div className="bg-background border border-border rounded-lg p-3 space-y-2">
             <div className="flex justify-between text-[11px]">
                <span className="text-muted">Value</span>
                <span className="font-mono text-text">${notionalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
             </div>
             <div className="flex justify-between text-[11px]">
                <span className="text-muted">Cost (Margin)</span>
                <span className="font-mono text-text">${marginCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
             </div>
             <div className="flex justify-between text-[11px]">
                <div className="flex items-center gap-1 text-muted">
                    Est. Fee (0.05%) <HelpCircle size={10} />
                </div>
                <span className="font-mono text-text">${estFee.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
             </div>
        </div>

        {/* Submit Button */}
        <button className={clsx(
           "w-full py-3.5 rounded-lg font-bold text-sm text-white shadow-lg transition-all active:scale-[0.98] mt-auto",
           side === 'buy' 
             ? "bg-success hover:bg-success/90 shadow-success/20" 
             : "bg-danger hover:bg-danger/90 shadow-danger/20"
        )}>
            {side === 'buy' ? 'Buy / Long' : 'Sell / Short'} {state.symbol}
        </button>

      </div>

      {/* Footer Warning */}
      <div className="py-2 text-center border-t border-border bg-surface-highlight/10">
          <span className="text-[9px] text-muted opacity-60">Simulation Mode - No Real Funds At Risk</span>
      </div>
    </div>
  );
};