import { ExtractionProvider, useExtraction } from './context/ExtractionContext';
import { UrlInput } from './components/UrlInput';
import { ProgressPanel } from './components/ProgressPanel';
import { LogPanel } from './components/LogPanel';
import { ResultsTable } from './components/ResultsTable';
import { SettingsPanel } from './components/SettingsPanel';
import { exportToTxt, exportToCsv, downloadFile, copyToClipboard } from './utils/export';
import { Toaster, toast } from 'react-hot-toast';

function AppContent() {
  const {
    progress, isRunning, urls, setUrls, settings, setSettings,
    beginExtraction, cancelCurrent, clearResults,
  } = useExtraction();

  const allDone = progress.status === 'completed' || progress.status === 'cancelled' || progress.status === 'error';
  const hasResults = progress.results.length > 0;

  const handleCopyAll = async () => {
    const txt = exportToTxt(progress.results);
    if (!txt) { toast.error('No completed URLs to copy'); return; }
    await copyToClipboard(txt);
    toast.success('Copied all URLs to clipboard');
  };

  const handleExportTxt = () => {
    const txt = exportToTxt(progress.results);
    if (!txt) { toast.error('No completed URLs to export'); return; }
    downloadFile(txt, 'downloads.txt');
    toast.success('Exported downloads.txt');
  };

  const handleExportCsv = () => {
    const csv = exportToCsv(progress.results);
    downloadFile(csv, 'downloads.csv', 'text/csv');
    toast.success('Exported downloads.csv');
  };

  const statusLabel = progress.status === 'idle' ? 'Ready' :
    progress.status === 'running' ? 'Running' :
    progress.status === 'completed' ? 'Completed' :
    progress.status === 'cancelled' ? 'Cancelled' :
    progress.status === 'error' ? 'Error' : 'Idle';

  const statusColor = progress.status === 'completed' ? 'text-[#22C55E]' :
    progress.status === 'error' ? 'text-[#EF4444]' :
    progress.status === 'running' ? 'text-[#3B82F6]' :
    'text-[#64748B]';

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F8FAFC]">
      <Toaster position="top-right" toastOptions={{
        style: { background: '#1E293B', color: '#F8FAFC', border: '1px solid #334155' },
      }} />

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-gradient-to-br from-[#22C55E] to-[#16A34A] rounded-xl flex items-center justify-center shadow-lg shadow-[#22C55E]/20">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold font-mono tracking-tight">Download Link Extractor</h1>
            <p className="text-sm text-[#64748B]">Extract final download URLs from file-host pages</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${progress.status === 'running' ? 'bg-[#22C55E] animate-pulse' : progress.status === 'error' ? 'bg-[#EF4444]' : 'bg-[#64748B]'}`} />
            <span className={`text-xs font-semibold uppercase tracking-wider ${statusColor}`}>{statusLabel}</span>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <UrlInput urls={urls} onUrlsChange={setUrls} disabled={isRunning} />

            <div className="flex flex-wrap items-center gap-3">
              {!isRunning ? (
                <button className="btn-primary" onClick={beginExtraction} disabled={urls.length === 0}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <polyline points="5 12 10 17 19 8" />
                  </svg>
                  Start Extraction
                </button>
              ) : (
                <button className="btn-danger" onClick={cancelCurrent}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  Cancel
                </button>
              )}

              {allDone && hasResults && (
                <>
                  <button className="btn-success" onClick={handleCopyAll}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy All
                  </button>
                  <button className="btn-ghost" onClick={handleExportTxt}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M12 10v6m0 0-3-3m3 3 3-3m2 8H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
                    </svg>
                    TXT
                  </button>
                  <button className="btn-ghost" onClick={handleExportCsv}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
                    </svg>
                    CSV
                  </button>
                  <button className="btn-ghost" onClick={clearResults}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" />
                    </svg>
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <SettingsPanel settings={settings} onChange={setSettings} disabled={isRunning} />
          </div>
        </div>

        {/* Progress */}
        {hasResults && (progress.status === 'running' || allDone) && (
          <ProgressPanel progress={progress} />
        )}

        {/* Logs */}
        <LogPanel logs={progress.logs} />

        {/* Results */}
        <ResultsTable results={progress.results} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ExtractionProvider>
      <AppContent />
    </ExtractionProvider>
  );
}
