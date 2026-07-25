import type { ExtractorSettings, ExtractionProgress } from '../types';

const BASE = '/api/extraction';

export async function startExtraction(urls: string[], settings: ExtractorSettings): Promise<{ sessionId: string }> {
  const res = await fetch(`${BASE}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls, settings }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to start extraction');
  }
  return res.json();
}

export async function getProgress(): Promise<ExtractionProgress> {
  const res = await fetch(`${BASE}/progress`);
  if (!res.ok) throw new Error('Failed to get progress');
  return res.json();
}

export async function cancelExtraction(): Promise<void> {
  await fetch(`${BASE}/cancel`, { method: 'POST' });
}

export async function getSettings(): Promise<ExtractorSettings> {
  const res = await fetch(`${BASE}/settings`);
  if (!res.ok) throw new Error('Failed to get settings');
  return res.json();
}

export async function updateSettings(settings: Partial<ExtractorSettings>): Promise<void> {
  await fetch(`${BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
}

export async function shutdownBrowser(): Promise<void> {
  await fetch(`${BASE}/shutdown`, { method: 'POST' });
}
