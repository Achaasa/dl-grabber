import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import type { ExtractionProgress, ExtractorSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { startExtraction, getProgress, cancelExtraction } from '../utils/api';

interface ExtractionContextType {
  progress: ExtractionProgress;
  isRunning: boolean;
  urls: string[];
  setUrls: (urls: string[]) => void;
  settings: ExtractorSettings;
  setSettings: (settings: ExtractorSettings) => void;
  beginExtraction: () => Promise<void>;
  cancelCurrent: () => Promise<void>;
  clearResults: () => void;
}

const defaultProgress: ExtractionProgress = {
  sessionId: '',
  currentPage: '',
  totalPages: 0,
  pagesCompleted: 0,
  currentPart: '',
  totalParts: 0,
  partsCompleted: 0,
  partsFailed: 0,
  partsRemaining: 0,
  logs: [],
  results: [],
  status: 'idle',
  elapsedSeconds: 0,
  settings: DEFAULT_SETTINGS,
};

const ExtractionContext = createContext<ExtractionContextType | null>(null);

export function ExtractionProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<ExtractionProgress>(defaultProgress);
  const [isRunning, setIsRunning] = useState(false);
  const [urls, setUrls] = useState<string[]>([]);
  const [settings, setSettings] = useState<ExtractorSettings>(DEFAULT_SETTINGS);
  const pollingRef = useRef<number | null>(null);

  const clearResults = useCallback(() => {
    setProgress(defaultProgress);
  }, []);

  const pollProgress = useCallback(async () => {
    try {
      const p = await getProgress();
      setProgress(p);

      const allResults = p.results || [];
      const completed = allResults.filter((r) => r.status === 'completed').length;
      const failed = allResults.filter((r) => r.status === 'failed').length;
      const total = allResults.length;

      if (completed + failed >= total && total > 0 && p.status === 'running') {
        setProgress((prev) => ({ ...prev, status: 'completed' }));
        setIsRunning(false);
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    } catch {
      // ignore polling errors
    }
  }, []);

  const beginExtraction = useCallback(async () => {
    try {
      setIsRunning(true);
      setProgress(defaultProgress);

      await startExtraction(urls, settings);

      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      pollingRef.current = window.setInterval(pollProgress, 500);
    } catch (err: any) {
      setIsRunning(false);
      setProgress((prev) => ({
        ...prev,
        status: 'error',
        logs: [...prev.logs, { timestamp: new Date().toISOString(), message: err.message, level: 'error' }],
      }));
    }
  }, [urls, settings, pollProgress]);

  const cancelCurrent = useCallback(async () => {
    try {
      await cancelExtraction();
      setIsRunning(false);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      setProgress((prev) => ({ ...prev, status: 'cancelled' }));
    } catch {
      // ignore
    }
  }, []);

  return (
    <ExtractionContext.Provider
      value={{
        progress,
        isRunning,
        urls,
        setUrls,
        settings,
        setSettings,
        beginExtraction,
        cancelCurrent,
        clearResults,
      }}
    >
      {children}
    </ExtractionContext.Provider>
  );
}

export function useExtraction(): ExtractionContextType {
  const ctx = useContext(ExtractionContext);
  if (!ctx) throw new Error('useExtraction must be used within ExtractionProvider');
  return ctx;
}
