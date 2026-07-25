import { useEffect, useRef } from 'react';
import type { ExtractionLog } from '../types';

interface LogPanelProps {
  logs: ExtractionLog[];
}

const levelStyles: Record<string, string> = {
  info:    'text-[#60A5FA]',
  warn:    'text-[#FDE68A]',
  error:   'text-[#F87171]',
  success: 'text-[#4ADE80]',
};

const levelIcons: Record<string, string> = {
  info:    '●',
  warn:    '◆',
  error:   '▲',
  success: '✓',
};

export function LogPanel({ logs }: LogPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs.length]);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#CBD5E1] font-mono">
          Logs
          {logs.length > 0 && <span className="text-[#64748B] font-sans ml-2">({logs.length})</span>}
        </h3>
      </div>

      <div className="bg-[#0F172A] rounded-lg h-48 overflow-y-auto p-3 font-mono text-xs space-y-1">
        {logs.length === 0 && (
          <div className="text-[#475569] italic">Waiting for logs...</div>
        )}
        {logs.map((log, i) => (
          <div key={i} className="flex items-start gap-2 leading-relaxed">
            <span className={levelStyles[log.level] || 'text-[#64748B]'}>{levelIcons[log.level] || '○'}</span>
            <span className="text-[#475569] shrink-0">
              {new Date(log.timestamp).toLocaleTimeString()}
            </span>
            <span className={levelStyles[log.level] || 'text-[#CBD5E1]'}>{log.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
