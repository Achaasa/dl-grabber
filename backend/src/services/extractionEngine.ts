import type { Page, BrowserContext } from 'playwright';
import { extractPartLinks } from './pageExtractor.js';
import { extractDownloadUrl } from './downloadExtractor.js';
import type {
  PartLink,
  ExtractionLog,
  ExtractionProgress,
  ExtractorSettings,
} from '../types/index.js';
import { createLog, formatElapsed } from '../utils/logging.js';
import { v4 as uuidv4 } from 'uuid';

export class ExtractionEngine {
  private context: BrowserContext;
  private settings: ExtractorSettings;
  private sessionId: string;
  private logs: ExtractionLog[] = [];
  private results: Map<string, PartLink> = new Map();
  private processedUrls: Set<string> = new Set();
  private cancelled = false;
  private startTime = 0;
  private onProgress: ((progress: ExtractionProgress) => void) | null = null;

  constructor(context: BrowserContext, settings: ExtractorSettings) {
    this.context = context;
    this.settings = settings;
    this.sessionId = uuidv4();
  }

  setOnProgress(callback: (progress: ExtractionProgress) => void): void {
    this.onProgress = callback;
  }

  cancel(): void {
    this.cancelled = true;
    this.log('Cancelling extraction...', 'warn');
    this.emitProgress();
  }

  private log(message: string, level: ExtractionLog['level'] = 'info'): void {
    const entry = createLog(message, level);
    this.logs.push(entry);
  }

  private emitProgress(): void {
    if (!this.onProgress) return;

    const allResults = Array.from(this.results.values());
    const partsCompleted = allResults.filter((r) => r.status === 'completed').length;
    const partsFailed = allResults.filter((r) => r.status === 'failed').length;

    const progress: ExtractionProgress = {
      sessionId: this.sessionId,
      currentPage: '',
      totalPages: 0,
      pagesCompleted: 0,
      currentPart: '',
      totalParts: allResults.length,
      partsCompleted,
      partsFailed,
      partsRemaining: allResults.length - partsCompleted - partsFailed,
      logs: [...this.logs],
      results: allResults,
      status: this.cancelled ? 'cancelled' : 'running',
      elapsedSeconds: formatElapsed(this.startTime),
      settings: this.settings,
    };

    this.onProgress(progress);
  }

  async extractFromPages(pageUrls: string[]): Promise<void> {
    this.startTime = Date.now();
    this.cancelled = false;
    this.results.clear();
    this.processedUrls.clear();
    this.logs = [];
    this.log(`Starting extraction for ${pageUrls.length} page(s)`, 'info');

    for (let i = 0; i < pageUrls.length; i++) {
      if (this.cancelled) {
        this.log('Extraction cancelled by user', 'warn');
        break;
      }

      const pageUrl = pageUrls[i].trim();
      if (!pageUrl) continue;

      this.log(`Processing page ${i + 1}/${pageUrls.length}: ${pageUrl}`, 'info');
      await this.processPage(pageUrl);
    }

    if (!this.cancelled) {
      const allResults = Array.from(this.results.values());
      const completed = allResults.filter((r) => r.status === 'completed').length;
      const failed = allResults.filter((r) => r.status === 'failed').length;
      this.log(`Extraction finished: ${completed} completed, ${failed} failed`, 'success');
    }

    this.emitProgress();
  }

  private async processPage(pageUrl: string): Promise<void> {
    let retries = 0;
    const maxRetries = this.settings.retryCount;

    while (retries < maxRetries) {
      if (this.cancelled) return;

      let page: Page | null = null;
      try {
        page = await this.context.newPage();
        this.log(`Opening page: ${pageUrl}`, 'info');

        await page.goto(pageUrl, {
          waitUntil: 'domcontentloaded',
          timeout: this.settings.timeout,
        });

        this.log(`Page title: ${await page.title().catch(() => 'unknown')}`, 'info');

        const partLinks = await extractPartLinks(page, pageUrl);
        this.log(`Found ${partLinks.length} part links`, 'success');

        for (const link of partLinks) {
          if (!this.results.has(link.partNumber)) {
            this.results.set(link.partNumber, {
              partNumber: link.partNumber,
              originalUrl: link.url,
              finalUrl: '',
              status: 'pending',
            });
          }
        }

        this.emitProgress();

        if (partLinks.length > 0) {
          await this.processPartLinksConcurrently(partLinks);
        } else {
          this.log('No part links found on this page', 'warn');
        }

        await page.close();
        return;
      } catch (error: any) {
        retries++;
        this.log(
          `Error processing page (attempt ${retries}/${maxRetries}): ${error.message}`,
          'warn'
        );
        if (page) await page.close().catch(() => {});
        if (retries > maxRetries) {
          this.log(`Failed to process page after ${maxRetries} attempts`, 'error');
        }
        await this.delay(2000 * retries);
      }
    }
  }

  private async processPartLinksConcurrently(
    partLinks: { url: string; partNumber: string }[]
  ): Promise<void> {
    const concurrency = Math.min(this.settings.concurrency, partLinks.length);
    const queue = [...partLinks];

    const worker = async () => {
      while (queue.length > 0 && !this.cancelled) {
        const link = queue.shift()!;
        if (this.processedUrls.has(link.url)) continue;
        this.processedUrls.add(link.url);
        await this.processSinglePart(link.url, link.partNumber);
      }
    };

    const workers = Array.from({ length: concurrency }, () => worker());
    await Promise.all(workers);
  }

  private async processSinglePart(url: string, partNumber: string): Promise<void> {
    let retries = 0;
    const maxRetries = this.settings.retryCount;

    const record = this.results.get(partNumber);
    if (record) {
      record.status = 'processing';
      record.originalUrl = url;
    }
    this.emitProgress();

    while (retries < maxRetries && !this.cancelled) {
      let partPage: Page | null = null;
      try {
        partPage = await this.context.newPage();
        this.log(`Opening part${partNumber}: ${url}`, 'info');

        await partPage.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: this.settings.timeout,
        });

        this.log(`Part${partNumber} page title: ${await partPage.title().catch(() => 'unknown')}`, 'info');

        const { url: finalUrl, debug } = await extractDownloadUrl(partPage, this.settings);

        for (const d of debug) {
          this.log(`[Debug part${partNumber}] ${d}`, 'info');
        }

        if (finalUrl) {
          if (!this.processedUrls.has(finalUrl)) {
            this.processedUrls.add(finalUrl);
            this.log(`Extracted download URL for part${partNumber}: ${finalUrl}`, 'success');
          } else {
            this.log(`Part${partNumber} URL already seen (duplicate), saving anyway`, 'warn');
          }

          const rec = this.results.get(partNumber);
          if (rec) {
            rec.finalUrl = finalUrl;
            rec.status = 'completed';
          }

          await partPage.close();
          this.emitProgress();
          await this.delay(this.settings.delayMs);
          return;
        }

        retries++;
        this.log(
          `No download URL found for part${partNumber}, retrying (${retries}/${maxRetries})...`,
          'warn'
        );
        await partPage.close();
        await this.delay(2000 * retries);
      } catch (error: any) {
        retries++;
        this.log(
          `Error extracting part${partNumber} (${retries}/${maxRetries}): ${error.message}`,
          'error'
        );
        if (partPage) await partPage.close().catch(() => {});
        await this.delay(2000 * retries);
      }
    }

    const rec = this.results.get(partNumber);
    if (rec) {
      rec.status = 'failed';
      rec.error = `Failed after ${maxRetries} retries`;
    }
    this.log(`Failed to extract part${partNumber}`, 'error');
    this.emitProgress();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getProgress(): ExtractionProgress {
    const allResults = Array.from(this.results.values());
    return {
      sessionId: this.sessionId,
      currentPage: '',
      totalPages: 0,
      pagesCompleted: 0,
      currentPart: '',
      totalParts: allResults.length,
      partsCompleted: allResults.filter((r) => r.status === 'completed').length,
      partsFailed: allResults.filter((r) => r.status === 'failed').length,
      partsRemaining: allResults.filter((r) => r.status === 'pending' || r.status === 'processing').length,
      logs: [...this.logs],
      results: allResults,
      status: this.cancelled ? 'cancelled' : 'running',
      elapsedSeconds: formatElapsed(this.startTime),
      settings: this.settings,
    };
  }
}
