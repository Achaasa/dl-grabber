import { chromium, type Browser, type BrowserContext } from 'playwright';
import type { ExtractorSettings } from '../types/index.js';
import path from 'path';

if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  const p = process.platform === 'win32'
    ? path.join(process.env.LOCALAPPDATA || process.env.USERPROFILE || '', 'ms-playwright')
    : path.join(process.env.HOME || '/opt/render/project', '.cache', 'playwright');
  process.env.PLAYWRIGHT_BROWSERS_PATH = p;
}

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private settings: ExtractorSettings;

  constructor(settings: ExtractorSettings) {
    this.settings = settings;
  }

  async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: this.settings.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=ChromeWhatsNewUI',
          '--no-default-browser-check',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-site-isolation-trials',
        ],
      });
      this.context = await this.browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US',
        timezoneId: 'America/New_York',
        permissions: [],
        bypassCSP: true,
      });

      await this.context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] as unknown as PluginArray });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      });
    }
  }

  async getContext(): Promise<BrowserContext> {
    if (!this.context) {
      await this.initialize();
    }
    return this.context!;
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  updateSettings(settings: ExtractorSettings): void {
    this.settings = settings;
  }

  getSettings(): ExtractorSettings {
    return this.settings;
  }
}
