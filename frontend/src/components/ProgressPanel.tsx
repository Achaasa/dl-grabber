import type { ExtractionProgress } from '../types';

interface ProgressPanelProps {
  progress: ExtractionProgress;
}

export function ProgressPanel({ progress }: ProgressPanelProps) {
  const { totalParts, partsCompleted, partsFailed, partsRemaining, elapsedSeconds } = progress;
  const total = totalParts || 1;
  const done = partsCompleted + partsFailed;
  const pct = Math.min(100, Math.round((done / total) * 100));

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec.toString().padStart(2, '0')}s`;
  };

  const barColor = progress.status === 'error' ? 'bg-[#EF4444]' :
    progress.status === 'cancelled' ? 'bg-[#F59E0B]' :
    pct >= 100 ? 'bg-[#22C55E]' : 'bg-[#22C55E]';

  return (
    <div className="card animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse-dot" />
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse-dot" />
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse-dot" />
          </div>
          <span className="text-sm font-semibold text-[#CBD5E1]">
            {progress.status === 'running' ? 'Extracting...' : 'Complete'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[#64748B]">{formatTime(elapsedSeconds)}</span>
          <span className="text-xs font-mono font-bold text-[#22C55E]">{pct}%</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="w-full h-2 bg-[#0F172A] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: totalParts, color: 'text-[#60A5FA]' },
          { label: 'Completed', value: partsCompleted, color: 'text-[#22C55E]' },
          { label: 'Failed', value: partsFailed, color: 'text-[#EF4444]' },
          { label: 'Remaining', value: partsRemaining, color: 'text-[#F59E0B]' },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#0F172A] rounded-lg p-3 text-center border border-[#334155]">
            <div className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-[#64748B] mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
