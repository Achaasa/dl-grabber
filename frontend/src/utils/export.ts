import type { PartLink } from '../types';

export function sortByPart(results: PartLink[]): PartLink[] {
  return [...results].sort((a, b) => parseInt(a.partNumber, 10) - parseInt(b.partNumber, 10));
}

export function exportToTxt(results: PartLink[]): string {
  return sortByPart(results)
    .filter((r) => r.status === 'completed' && r.finalUrl)
    .map((r) => r.finalUrl)
    .join('\n');
}

export function exportToCsv(results: PartLink[]): string {
  const header = 'Part,Original URL,Final URL,Status';
  const rows = sortByPart(results).map(
    (r) => `"${r.partNumber}","${r.originalUrl}","${r.finalUrl}","${r.status}"`
  );
  return [header, ...rows].join('\n');
}

export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  }
}
