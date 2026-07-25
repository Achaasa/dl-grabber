import type { ExtractionLog } from '../types/index.js';

export function createLog(message: string, level: ExtractionLog['level'] = 'info'): ExtractionLog {
  return {
    timestamp: new Date().toISOString(),
    message,
    level,
  };
}

export function formatElapsed(startTime: number): number {
  return Math.floor((Date.now() - startTime) / 1000);
}

export function naturalSort(items: string[]): string[] {
  return items.sort((a, b) => {
    const getParts = (s: string): (string | number)[] =>
      s.split(/(\d+)/).map((x) => (isNaN(Number(x)) ? x.toLowerCase() : Number(x)));

    const partsA = getParts(a);
    const partsB = getParts(b);

    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const aPart = partsA[i];
      const bPart = partsB[i];

      if (aPart === undefined) return -1;
      if (bPart === undefined) return 1;

      if (typeof aPart === 'number' && typeof bPart === 'number') {
        if (aPart !== bPart) return aPart - bPart;
      } else {
        const strCompare = String(aPart).localeCompare(String(bPart));
        if (strCompare !== 0) return strCompare;
      }
    }
    return 0;
  });
}

export function extractPartNumber(url: string): string {
  const match = url.match(/\.?part(\d+)/i);
  if (match) {
    return match[1].padStart(2, '0');
  }
  const hashMatch = url.match(/#(.+)$/);
  if (hashMatch) {
    const nameMatch = hashMatch[1].match(/part(\d+)/i);
    if (nameMatch) return nameMatch[1].padStart(2, '0');
  }
  return '00';
}
