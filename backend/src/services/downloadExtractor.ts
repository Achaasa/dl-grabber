import type { Page } from 'playwright';
import type { ExtractorSettings } from '../types/index.js';

export interface DownloadResult {
  url: string | null;
  debug: string[];
}

export async function extractDownloadUrl(
  page: Page,
  settings: ExtractorSettings,
): Promise<DownloadResult> {
  const debug: string[] = [];
  const start = Date.now();

  try {
    await page.waitForLoadState('domcontentloaded', { timeout: settings.timeout }).catch((e) => debug.push(`load timeout: ${e.message}`));
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    if (gone(start)) return done(debug, 'timeout');

    debug.push(`URL: ${page.url()}`);

    // Check direct links
    const direct = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]')).map((a) => (a as HTMLAnchorElement).href).filter((h) => /\.(rar|zip|7z|iso|bin)(\?|$)/i.test(h))
    ).catch(() => []);
    if (direct.length > 0) return { url: direct[0], debug: [...debug, `Direct: ${direct[0]}`] };

    // Get the hx-post endpoint
    const endpoint = await page.evaluate(() => {
      const btn = document.querySelector('[hx-post]');
      return btn ? btn.getAttribute('hx-post') : null;
    }).catch(() => null);

    if (!endpoint) {
      // Try finding by text
      const btnExists = await page.locator('a:has-text("DOWNLOAD"), a:has-text("Download")').first().count().catch(() => 0);
      if (!btnExists) {
        debug.push('No download button');
        return { url: null, debug };
      }
      // No hx-post but button exists - try clicking anyway
      const url = await tryClicks(page, debug, start);
      if (url) return { url, debug };
      return done(debug, 'click failed');
    }

    debug.push(`HTMX endpoint: ${endpoint}`);

    // Block actual file downloads to save bandwidth — URLs are still captured via JS interception below
    await page.route(/\.(rar|zip|7z|iso|bin)(\?|$)/i, (route) => route.abort()).catch(() => {});
    await page.route('**/dl.fuckingfast.co/**', (route) => route.abort()).catch(() => {});

    // Monkey-patch XMLHttpRequest and fetch BEFORE clicking to intercept download URL
    const hijackCode = `
    (function() {
      // Store original methods
      const origOpen = XMLHttpRequest.prototype.open;
      const origSend = XMLHttpRequest.prototype.send;
      const origFetch = window.fetch;

      window.__capturedUrls = [];

      function captureUrl(url) {
        if (url && !window.__capturedUrls.includes(url)) {
          window.__capturedUrls.push(url);
        }
      }

      // Intercept fetch
      window.fetch = function(...args) {
        const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
        return origFetch.apply(this, args).then(function(response) {
          const clone = response.clone();
          if (/dl\\.fuckingfast\\.co/i.test(url) || /\\.(rar|zip|7z|iso|bin)/i.test(url)) {
            captureUrl(url);
          }
          clone.text().then(function(body) {
            window.__lastResponseBody = body;
            window.__lastResponseUrl = url;
            // Check body for URLs
            var matches = body.match(/https?:\\/\\/[^\\s"<>']+/g);
            if (matches) matches.forEach(function(m) { if (m.includes('dl.fuckingfast') || m.includes('.rar')) captureUrl(m); });
            // Check for window.location redirects
            if (body.includes('window.location') || body.includes('document.location')) {
              var locMatch = body.match(/(?:location\\.href|location\\s*=|document\\.location)\\s*=\\s*['"]([^'"]+)['"]/);
              if (locMatch) captureUrl(locMatch[1]);
            }
          }).catch(function(){});
          return response;
        }).catch(function(e) { return origFetch.apply(this, args); });
      };

      // Intercept XHR
      XMLHttpRequest.prototype.open = function(method, url) {
        this.__url = typeof url === 'string' ? url : (url || '');
        return origOpen.apply(this, arguments);
      };
      XMLHttpRequest.prototype.send = function() {
        this.addEventListener('load', function() {
          var url = this.__url || '';
          if (/dl\\.fuckingfast\\.co/i.test(url) || /\\.(rar|zip|7z|iso|bin)/i.test(url)) {
            captureUrl(url);
          }
          try {
            var body = this.responseText || '';
            window.__lastResponseBody = body;
            window.__lastResponseUrl = url;
            var matches = body.match(/https?:\\/\\/[^\\s"<>']+/g);
            if (matches) matches.forEach(function(m) { if (m.includes('dl.fuckingfast') || m.includes('.rar')) captureUrl(m); });
          } catch(e) {}
        });
        return origSend.apply(this, arguments);
      };

      // Override window.open to capture URLs
      var origOpen2 = window.open;
      window.open = function(url) {
        if (url && url !== 'about:blank') captureUrl(url);
        return origOpen2.apply(this, arguments);
      };

      // Override location setters
      var desc = Object.getOwnPropertyDescriptor(window, 'location') || {};
      var _href = window.location.href;
      Object.defineProperty(window, 'location', {
        get: function() { return { href: _href, ...window.location }; },
        set: function(val) { captureUrl(val); _href = val; },
        configurable: true
      });
    })();
    `;

    await page.evaluate(hijackCode).catch(() => {});

    // Now click the button up to 5 times (for two-click system)
    for (let attempt = 0; attempt < 5 && !gone(start); attempt++) {
      const btn = page.locator('[hx-post], a:has-text("DOWNLOAD"), a:has-text("Download")').first();
      const exists = await btn.count().catch(() => 0);
      if (!exists) { debug.push('Button gone'); break; }

      debug.push(`Click ${attempt + 1}...`);

      // Set up Playwright-level interception
      const dlPromise = page.waitForEvent('download', { timeout: 12000 }).catch(() => null) as Promise<any>;
      const navPromise = page.waitForNavigation({ timeout: 12000, waitUntil: 'domcontentloaded' }).then(() => page.url()).catch(() => '');
      const popupPromise = page.context().waitForEvent('page', { timeout: 12000 }).catch(() => null) as Promise<any>;

      const capturedPlaywrightUrls: string[] = [];
      const respHandler = (resp: { url: () => string; headers: () => Record<string, string> }) => {
        const u = resp.url();
        const h = resp.headers();
        if (h['hx-redirect'] || h['HX-Redirect']) {
          const r = h['hx-redirect'] || h['HX-Redirect'] || '';
          debug.push(`HX-Redirect: ${r}`);
          capturedPlaywrightUrls.push(r);
        }
        if (h['location'] || h['Location']) {
          const r = h['location'] || h['Location'] || '';
          if (r !== 'about:blank') {
            debug.push(`Location: ${r}`);
            capturedPlaywrightUrls.push(r);
          }
        }
        if (/\.(rar|zip|7z|iso|bin)/i.test(u)) capturedPlaywrightUrls.push(u);
      };
      page.on('response', respHandler);

      await btn.click({ timeout: 5000, force: true }).catch((e: any) => debug.push(`Click error: ${e.message}`));

      await page.waitForTimeout(3000);

      page.removeListener('response', respHandler);

      // Check Playwright-level captures (HX-Redirect URLs include dl.fuckingfast.co — accept those)
      for (const u of capturedPlaywrightUrls) {
        if (u.startsWith('http') && u !== 'about:blank' && (!u.includes('fuckingfast.co') || u.includes('dl.fuckingfast.co'))) return { url: u, debug };
      }

      // Check download event
      const dl = await dlPromise;
      if (dl) { const u = dl.url(); if (u && u !== 'about:blank') return { url: u, debug }; }

      // Check navigation
      const navUrl = await navPromise;
      if (navUrl && navUrl.startsWith('http') && !navUrl.includes('fuckingfast.co')) return { url: navUrl, debug };

      // Check popup
      const popup = await popupPromise;
      if (popup) {
        try {
          debug.push(`Popup: ${popup.url()}`);
          await popup.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
          for (let i = 0; i < 20; i++) {
            await popup.waitForTimeout(500);
            const pu = popup.url();
            if (pu && pu !== 'about:blank' && pu.startsWith('http')) {
              debug.push(`Popup navigated to: ${pu}`);
              if (!pu.includes('fuckingfast.co')) {
                try { await popup.close(); } catch {} 
                return { url: pu, debug };
              }
              break;
            }
          }
          const popupLinks = await popup.evaluate(() =>
            Array.from(document.querySelectorAll('a[href]')).map((a) => (a as HTMLAnchorElement).href)
          ).catch(() => []);
          for (const l of popupLinks) {
            if (/\.(rar|zip|7z|iso|bin)/i.test(l)) { try { await popup.close(); } catch {}; return { url: l, debug }; }
          }
          try { await popup.close(); } catch {}
        } catch { try { await popup.close(); } catch {} }
      }

      // Check hijacked URLs from JavaScript
      const hijacked = await page.evaluate(() => (window as any).__capturedUrls || []).catch(() => []) as string[];
      if (hijacked.length > 0) {
        debug.push(`Hijacked URLs: ${JSON.stringify(hijacked)}`);
        for (const u of hijacked) {
          if (u.startsWith('http') && !u.includes('fuckingfast.co') && u !== 'about:blank') return { url: u, debug };
          if (u.startsWith('http') && u.includes('dl.fuckingfast.co')) return { url: u, debug };
        }
      }

      // Check the last response body
      const lastBody = await page.evaluate(() => (window as any).__lastResponseBody || '').catch(() => '') as string;
      const lastUrl = await page.evaluate(() => (window as any).__lastResponseUrl || '').catch(() => '') as string;
      if (lastBody) {
        debug.push(`Last response: ${lastUrl} -> ${lastBody.slice(0, 200)}`);
        const urlMatch = lastBody.match(/https?:\/\/dl\.fuckingfast\.co\/dl\/[^\s"<>']+/);
        if (urlMatch) return { url: urlMatch[0], debug };
        const locMatch = lastBody.match(/(?:location\.href|location\s*=|document\.location)\s*=\s*['"]([^'"]+)['"]/);
        if (locMatch) return { url: locMatch[1], debug };
      }

      // Check page for download links after click
      const postLinks = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a[href]'))
          .map((a) => (a as HTMLAnchorElement).href)
          .filter((h) => /\.(rar|zip|7z|iso|bin)/i.test(h))
      ).catch(() => []);
      if (postLinks.length > 0) return { url: postLinks[0], debug };

      const textUrl = await page.evaluate(() => {
        const m = (document.body?.innerText || '').match(/https?:\/\/[^\s]+\.(rar|zip|7z|iso|bin)/i);
        return m ? m[0] : null;
      }).catch(() => null);
      if (textUrl) return { url: textUrl, debug };

      debug.push(`Click ${attempt + 1}: no result`);
      await page.waitForTimeout(1000);
    }

    return done(debug, 'all clicks exhausted');
  } catch (error: any) {
    debug.push(`Fatal: ${error.message}`);
    return { url: null, debug };
  }
}

async function tryClicks(page: Page, debug: string[], start: number): Promise<string | null> {
  for (let i = 0; i < 3 && !gone(start); i++) {
    const btn = page.locator('a:has-text("DOWNLOAD"), a:has-text("Download")').first();
    if ((await btn.count().catch(() => 0)) === 0) break;
    debug.push(`Simple click ${i + 1}...`);
    await btn.click({ timeout: 3000, force: true }).catch(() => {});
    await page.waitForTimeout(3000);
    const u = page.url();
    if (u.startsWith('http') && !u.includes('fuckingfast.co')) return u;
  }
  return null;
}

function elapsed(start: number): number { return Date.now() - start; }

function gone(start: number): boolean { return Date.now() - start > 35000; }

function done(debug: string[], msg: string): DownloadResult {
  debug.push(msg);
  return { url: null, debug };
}
