import { useRef, useState } from 'react';

interface UrlInputProps {
  urls: string[];
  onUrlsChange: (urls: string[]) => void;
  disabled: boolean;
}

export function UrlInput({ urls, onUrlsChange, disabled }: UrlInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const text = urls.join('\n');

  const handleTextChange = (value: string) => {
    const lines = value
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && (l.startsWith('http://') || l.startsWith('https://')));
    onUrlsChange(lines);
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type === 'text/plain');
    if (files.length === 0) return;
    const text = await files[0].text();
    handleTextChange(text);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    handleTextChange(text);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-[#CBD5E1]">Page URLs</label>
        {urls.length > 0 && (
          <span className="text-xs font-mono text-[#64748B] bg-[#0F172A] px-2.5 py-1 rounded-md border border-[#334155]">
            {urls.length} URL{urls.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div
        className={`relative transition-all duration-200 ${
          isDragging ? 'ring-2 ring-[#22C55E] rounded-xl' : ''
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleFileDrop}
      >
        <textarea
          className="w-full h-32 bg-[#0F172A] border border-[#334155] rounded-xl p-4 text-sm
                     font-mono text-[#F8FAFC] placeholder-[#475569]
                     focus:outline-none focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E]/30
                     resize-y transition-all duration-200 disabled:opacity-50"
          placeholder={`https://fitgirl-repacks.site/game-1/\nhttps://fitgirl-repacks.site/game-2/`}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          disabled={disabled}
        />
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#22C55E]/10 rounded-xl border-2 border-dashed border-[#22C55E] backdrop-blur-sm">
            <span className="text-[#22C55E] font-semibold text-sm">Drop .txt file here</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-[#64748B]">
        <span>Paste one URL per line</span>
        <button
          className="text-[#22C55E] hover:text-[#4ADE80] transition-colors cursor-pointer font-medium"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          Import .txt
        </button>
        <input ref={fileInputRef} type="file" accept=".txt,text/plain" className="hidden" onChange={handleFileSelect} />
      </div>
    </div>
  );
}
