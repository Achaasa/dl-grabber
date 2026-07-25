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

export const DEFAULT_SETTINGS: ExtractorSettings = {
  headless: true,
  concurrency: 3,
  timeout: 30000,
  retryCount: 3,
  delayMs: 1000,
};
