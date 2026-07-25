import { Router, type Request, type Response } from 'express';
import { BrowserManager } from '../services/browserManager.js';
import { ExtractionEngine } from '../services/extractionEngine.js';
import type { ExtractionRequest, ExtractionProgress, ExtractorSettings, SessionSummary } from '../types/index.js';
import { DEFAULT_SETTINGS } from '../types/index.js';
import { formatElapsed } from '../utils/logging.js';

const router = Router();

const browserManager = new BrowserManager(DEFAULT_SETTINGS);
let currentEngine: ExtractionEngine | null = null;
let currentProgress: ExtractionProgress | null = null;
let sessionStartTime = 0;
let pagesProcessed = 0;
let totalPartsFound = 0;

router.post('/start', async (req: Request, res: Response) => {
  try {
    const { urls, settings } = req.body as ExtractionRequest;

    if (!urls || urls.length === 0) {
      res.status(400).json({ error: 'No URLs provided' });
      return;
    }

    const mergedSettings: ExtractorSettings = {
      ...DEFAULT_SETTINGS,
      ...settings,
    };

    browserManager.updateSettings(mergedSettings);
    await browserManager.initialize();

    const context = await browserManager.getContext();
    const engine = new ExtractionEngine(context, mergedSettings);
    currentEngine = engine;
    sessionStartTime = Date.now();
    pagesProcessed = 0;
    totalPartsFound = 0;

    engine.setOnProgress((progress) => {
      currentProgress = progress;
    });

    res.json({ sessionId: engine['sessionId'], message: 'Extraction started' });

    engine.extractFromPages(urls).catch((err) => {
      console.error('Extraction error:', err);
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/progress', (_req: Request, res: Response) => {
  if (currentEngine) {
    const progress = currentEngine.getProgress();
    currentProgress = progress;
  }

  if (currentProgress) {
    const allResults = currentProgress.results || [];
    const completed = allResults.filter((r) => r.status === 'completed').length;
    const failed = allResults.filter((r) => r.status === 'failed').length;
    const totalParts = allResults.length;

    const isRunning = currentProgress.status === 'running';
    const isDone = completed + failed >= totalParts && totalParts > 0 && isRunning;

    const status = isDone ? 'completed' : currentProgress.status;

    res.json({
      ...currentProgress,
      status,
    });
    return;
  }
  res.json({ status: 'idle' });
});

router.post('/cancel', (_req: Request, res: Response) => {
  if (currentEngine) {
    currentEngine.cancel();
    res.json({ message: 'Cancellation requested' });
  } else {
    res.json({ message: 'No active extraction' });
  }
});

router.get('/summary', (_req: Request, res: Response) => {
  if (currentProgress) {
    const summary: SessionSummary = {
      sessionId: currentProgress.sessionId,
      status: currentProgress.status,
      pagesProcessed: pagesProcessed,
      partsFound: currentProgress.totalParts,
      successful: currentProgress.partsCompleted,
      failed: currentProgress.partsFailed,
      elapsedSeconds: currentProgress.elapsedSeconds,
      startedAt: new Date(sessionStartTime).toISOString(),
    };
    res.json(summary);
  } else {
    res.json({
      sessionId: '',
      status: 'idle',
      pagesProcessed: 0,
      partsFound: 0,
      successful: 0,
      failed: 0,
      elapsedSeconds: 0,
      startedAt: '',
    });
  }
});

router.post('/settings', (req: Request, res: Response) => {
  const settings = req.body as Partial<ExtractorSettings>;
  const merged = { ...DEFAULT_SETTINGS, ...settings };
  browserManager.updateSettings(merged);
  res.json({ message: 'Settings updated', settings: merged });
});

router.get('/settings', (_req: Request, res: Response) => {
  res.json(browserManager.getSettings());
});

router.post('/shutdown', async (_req: Request, res: Response) => {
  await browserManager.close();
  res.json({ message: 'Browser closed' });
});

export default router;
