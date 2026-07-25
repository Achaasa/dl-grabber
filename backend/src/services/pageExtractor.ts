import type { Page } from 'playwright';
import { naturalSort, extractPartNumber } from '../utils/logging.js';

const PART_PATTERNS = [
  /part\d+/i,
  /\.part\d+(\.\w+)?/i,
  /[#?].*part\d+/i,
];

const URL_REGEX = /https?:\/\/[^\s<"'>]+/gi;

export async function extractPartLinks(page: Page, baseUrl: string): Promise<{ url: string; partNumber: string }[]> {
  await page.waitForLoadState('domcontentloaded');

  const isPastebin = baseUrl.includes('paste.');
  if (isPastebin) {
    return await handlePastebinPage(page);
  }

  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2000);

  let allUrls = await collectAllUrls(page);
  if (allUrls.length === 0) {
    await page.waitForTimeout(3000);
    allUrls = await collectAllUrls(page);
  }

  let result = extractMatches(allUrls);
  if (result.length > 0) return result;

  const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 500) || '');
  throw new Error(`No part links found on page. Page text: ${bodyText}`);
}

async function handlePastebinPage(page: Page): Promise<{ url: string; partNumber: string }[]> {
  const rawUrl = buildRawUrl(page.url());

  if (rawUrl) {
    try {
      await page.goto(rawUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);

      const text = await page.evaluate(() => document.body?.innerText || '');
      const textUrls = extractUrlsFromText(text);
      const result = extractMatches(textUrls);
      if (result.length > 0) return result;

      const allUrls = await collectAllUrls(page);
      const hrefResult = extractMatches(allUrls);
      if (hrefResult.length > 0) return hrefResult;
    } catch {
      // raw URL failed, fall back to normal page
    }
  }

  const timeout = 45000;
  const pollInterval = 1500;
  let waited = 0;

  while (waited < timeout) {
    const allUrls = await collectAllUrls(page);
    const result = extractMatches(allUrls);
    if (result.length > 0) return result;

    const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 500) || '');
    const hasDecrypting = /decrypt/i.test(bodyText);

    if (!hasDecrypting && bodyText.length > 50) {
      const anyUrls = allUrls.filter((u) => u.startsWith('http'));
      if (anyUrls.length > 0) {
        const fallback = naturalSort(anyUrls).map((url) => ({
          url,
          partNumber: extractPartNumber(url),
        }));
        if (fallback.length > 0) return fallback;
      }
    }

    try {
      const rawBtn = page.locator('a:has-text("Raw text"), button:has-text("Raw text"), [id*="raw"], [class*="raw"]').first();
      if (await rawBtn.count().catch(() => 0) > 0) {
        await rawBtn.click({ timeout: 5000, force: true }).catch(() => {});
        await page.waitForTimeout(2000);

        const afterClickUrls = await collectAllUrls(page);
        const afterResult = extractMatches(afterClickUrls);
        if (afterResult.length > 0) return afterResult;

        const rawTextUrl = page.url();
        if (rawTextUrl.includes('raw')) {
          const text = await page.evaluate(() => document.body?.innerText || '');
          const rawUrls = extractUrlsFromText(text);
          const rawResult = extractMatches(rawUrls);
          if (rawResult.length > 0) return rawResult;
        }
      }
    } catch {
      // raw text button not found or not clickable yet
    }

    if (waited === 0) {
      const clickTargets = ['img', '.btn', 'button', 'a[href]'];
      for (const sel of clickTargets) {
        try {
          const el = page.locator(sel).first();
          if (await el.count().catch(() => 0) > 0 && await el.isVisible().catch(() => false)) {
            await el.click({ timeout: 1000, force: true }).catch(() => {});
          }
        } catch {
          continue;
        }
      }
    }

    await page.waitForTimeout(pollInterval);
    waited += pollInterval;
  }

  const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 800) || '');
  const html = await page.evaluate(() => (document as any).documentElement?.outerHTML?.slice(0, 1000) || '').catch(() => '');
  throw new Error(`Pastebin: no links after ${timeout}ms. Body: ${bodyText} | HTML: ${html}`);
}

function buildRawUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const pasteId = u.pathname.slice(1) || u.searchParams.get('') || u.search.slice(1).split('#')[0];
    const hash = u.hash.slice(1);
    if (!pasteId || !hash) return null;
    if (u.search) {
      return `${u.origin}${u.pathname}${u.search}&raw${hash ? '#' + hash : ''}`;
    }
    return `${u.origin}${u.pathname}?${pasteId}&raw${hash ? '#' + hash : ''}`;
  } catch {
    return null;
  }
}

async function collectAllUrls(page: Page): Promise<string[]> {
  const hrefs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href]')).map((a) => (a as HTMLAnchorElement).href);
  });

  const textUrls = await extractPlainTextUrls(page);

  return [...new Set([...hrefs, ...textUrls])];
}

async function extractPlainTextUrls(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const results: string[] = [];
    const text = document.body?.innerText || '';
    const urlRegex = /https?:\/\/[^\s<"'>]+/gi;
    let match;
    while ((match = urlRegex.exec(text)) !== null) {
      if (!results.includes(match[0])) results.push(match[0]);
    }

    const containers = document.querySelectorAll('pre, code, .content, .paste, [class*="content"], [class*="paste"], [class*="result"], #pastecontent');
    containers.forEach((el) => {
      const elText = (el as HTMLElement).innerText || '';
      let m;
      while ((m = urlRegex.exec(elText)) !== null) {
        if (!results.includes(m[0])) results.push(m[0]);
      }
    });

    return results;
  });
}

function extractUrlsFromText(text: string): string[] {
  const results: string[] = [];
  let match;
  while ((match = URL_REGEX.exec(text)) !== null) {
    if (!results.includes(match[0])) results.push(match[0]);
  }
  return results;
}

function extractMatches(hrefs: string[]): { url: string; partNumber: string }[] {
  const links: string[] = [];

  for (const href of hrefs) {
    for (const pattern of PART_PATTERNS) {
      if (pattern.test(href)) {
        if (!links.includes(href)) {
          links.push(href);
        }
        break;
      }
    }
  }

  if (links.length === 0) {
    const allFuckingFast = hrefs.filter((h) => h.includes('fuckingfast.co'));
    if (allFuckingFast.length > 0) {
      return naturalSort(allFuckingFast).map((url) => ({
        url,
        partNumber: extractPartNumber(url),
      }));
    }
  }

  return naturalSort(links).map((url) => ({
    url,
    partNumber: extractPartNumber(url),
  }));
}
