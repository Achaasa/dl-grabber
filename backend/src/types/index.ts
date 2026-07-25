export interface ExtractionRequest {
  urls: string[];
  settings: ExtractorSettings;
}

export interface ExtractorSettings {
  headless: boolean;
  concurrency: number;
  timeout: number;
  retryCount: number;
  delayMs: number;
}

export interface PartLink {
  partNumber: string;
  originalUrl: string;
  finalUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface ExtractionLog {
  timestamp: string;
  message: string;
  level: 'info' | 'warn' | 'error' | 'success';
}

export interface ExtractionProgress {
  sessionId: string;
  currentPage: string;
  totalPages: number;
  pagesCompleted: number;
  currentPart: string;
  totalParts: number;
  partsCompleted: number;
  partsFailed: number;
  partsRemaining: number;
  logs: ExtractionLog[];
  results: PartLink[];
  status: 'idle' | 'running' | 'paused' | 'completed' | 'cancelled' | 'error';
  elapsedSeconds: number;
  settings: ExtractorSettings;
}

export interface SessionSummary {
  sessionId: string;
  status: string;
  pagesProcessed: number;
  partsFound: number;
  successful: number;
  failed: number;
  elapsedSeconds: number;
  startedAt: string;
}

export const DEFAULT_SETTINGS: ExtractorSettings = {
  headless: true,
  concurrency: 4,
  timeout: 20000,
  retryCount: 2,
  delayMs: 500,
};
