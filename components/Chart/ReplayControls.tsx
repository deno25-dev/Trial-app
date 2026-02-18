

import React from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  X, 
  Scissors,
  FastForward
} from 'lucide-react';
import { useChart } from '../../context/ChartContext';
import clsx from 'clsx';

export const ReplayControls: React.FC = () => {
  const { state, toggleReplay, setReplayPlaying, setReplaySpeed } = useChart();
  const { isActive, isPlaying, speed, isWaitingForCut } = state.replay;

  if (!isActive) return null;

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="flex items-center gap-1 bg-[#1e293b] border border-white/10 rounded-full px-3 py-2 shadow-2xl backdrop-blur-md">
        
        {/* Status Indicator / Cut Info */}
        {isWaitingForCut ? (
            <div className="flex items-center gap-2 px-2 text-xs font-bold text-amber-400 animate-pulse">
                <Scissors size={14} />
                <span>SELECT START POINT</span>
            </div>
        ) : (
            <>
                {/* Play/Pause */}
                <button
                    onClick={() => setReplayPlaying(!isPlaying)}
                    className="p-2 rounded-full bg-primary text-white hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                    title={isPlaying ? "Pause" : "Play"}
                >
                    {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                </button>

                <div className="w-px h-5 bg-white/10 mx-1" />

                {/* Step Forward */}
                <button
                    onClick={() => {
                        setReplayPlaying(false);
                        // The step logic is handled in FinancialChart via context effect, 
                        // but ideally we'd expose a step() function. 
                        // For now, pausing is the safe action, the chart handles single tick if logic permits.
                        // We will rely on speed setting 1 tick per frame if we want "step" feel 
                        // or user just toggles play/pause quickly.
                    }}
                    className="p-2 rounded-full text-muted hover:text-white hover:bg-white/10 transition-colors"
                    title="Step Forward"
                >
                    <SkipForward size={18} />
                </button>

                <div className="w-px h-5 bg-white/10 mx-1" />

                {/* Speed Controls */}
                <div className="flex items-center gap-1 bg-black/20 rounded-full p-0.5">
                    {[1, 3, 10].map((s) => (
                        <button
                            key={s}
                            onClick={() => setReplaySpeed(s)}
                            className={clsx(
                                "px-2 py-1 rounded-full text-[10px] font-bold transition-all",
                                speed === s 
                                    ? "bg-white/20 text-white shadow-sm" 
                                    : "text-muted hover:text-white hover:bg-white/5"
                            )}
                        >
                            {s}x
                        </button>
                    ))}
                </div>
            </>
        )}

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Close Replay */}
        <button
            onClick={toggleReplay}
            className="p-2 rounded-full text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
            title="Exit Replay Mode"
        >
            <X size={18} />
        </button>

      </div>
    </div>
  );
};