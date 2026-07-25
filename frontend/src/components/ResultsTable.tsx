import { useState, useMemo } from 'react';
import type { PartLink } from '../types';
import { copyToClipboard, sortByPart } from '../utils/export';
import toast from 'react-hot-toast';

interface ResultsTableProps {
  results: PartLink[];
}

const statusConfig: Record<string, { badge: string; label: string }> = {
  completed:  { badge: 'badge-success', label: 'Completed' },
  failed:     { badge: 'badge-error',   label: 'Failed' },
  processing: { badge: 'badge-warning', label: 'Processing' },
  pending:    { badge: 'badge-neutral', label: 'Pending' },
};

export function ResultsTable({ results }: ResultsTableProps) {
  const [search, setSearch] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const sorted = useMemo(() => sortByPart(results), [results]);

  const filtered = useMemo(() => {
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter(
      (r) =>
        r.partNumber.toLowerCase().includes(q) ||
        r.originalUrl.toLowerCase().includes(q) ||
        r.finalUrl.toLowerCase().includes(q)
    );
  }, [sorted, search]);

  const handleCopyUrl = async (url: string, index: number) => {
    await copyToClipboard(url);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1200);
    toast.success('URL copied');
  };

  if (results.length === 0) return null;

  return (
    <div className="card animate-fade-in space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[#CBD5E1] font-mono">
          Results <span className="text-[#64748B] font-sans">({results.length})</span>
        </h3>
        <input
          type="text"
          placeholder="Filter results..."
          className="input-field w-full sm:w-56 text-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#334155]">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[#64748B] text-xs bg-[#0F172A]">
              <th className="py-2.5 px-3 font-semibold uppercase tracking-wider">Part</th>
              <th className="py-2.5 px-3 font-semibold uppercase tracking-wider">Status</th>
              <th className="py-2.5 px-3 font-semibold uppercase tracking-wider hidden md:table-cell">Original URL</th>
              <th className="py-2.5 px-3 font-semibold uppercase tracking-wider">Final URL</th>
              <th className="py-2.5 px-3 font-semibold uppercase tracking-wider w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#334155]">
            {filtered.map((result, i) => {
              const cfg = statusConfig[result.status] || statusConfig.pending;
              const idx = results.indexOf(result);
              return (
                <tr key={result.partNumber} className="hover:bg-[#0F172A]/50 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-xs text-[#F8FAFC]">
                    {/^\d+$/.test(result.partNumber) ? `Part ${result.partNumber}` : result.partNumber}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={cfg.badge}>{cfg.label}</span>
                  </td>
                  <td className="py-2.5 px-3 hidden md:table-cell max-w-[200px]">
                    <a href={result.originalUrl} target="_blank" rel="noopener noreferrer"
                       className="text-[#60A5FA] hover:text-[#93C5FD] hover:underline truncate block text-xs">
                      {result.originalUrl}
                    </a>
                  </td>
                  <td className="py-2.5 px-3 max-w-[250px]">
                    {result.finalUrl ? (
                      <a href={result.finalUrl} target="_blank" rel="noopener noreferrer"
                         className="text-[#4ADE80] hover:text-[#86EFAC] hover:underline truncate block text-xs">
                        {result.finalUrl}
                      </a>
                    ) : (
                      <span className="text-[#475569]">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <button className="text-[#475569] hover:text-[#22C55E] transition-colors disabled:opacity-30 cursor-pointer"
                            disabled={!result.finalUrl}
                            onClick={() => handleCopyUrl(result.finalUrl!, idx)}
                            title="Copy URL">
                      {copiedIndex === idx ? (
                        <svg className="w-4 h-4 text-[#22C55E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && search && (
        <div className="text-center text-[#475569] py-6 text-sm">No results match your search.</div>
      )}
    </div>
  );
}
