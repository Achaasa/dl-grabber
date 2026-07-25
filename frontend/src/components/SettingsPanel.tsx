import type { ExtractorSettings } from '../types';

interface SettingsPanelProps {
  settings: ExtractorSettings;
  onChange: (settings: ExtractorSettings) => void;
  disabled: boolean;
}

export function SettingsPanel({ settings, onChange, disabled }: SettingsPanelProps) {
  const update = (partial: Partial<ExtractorSettings>) => {
    onChange({ ...settings, ...partial });
  };

  return (
    <div className="card space-y-4">
      <h3 className="text-sm font-semibold text-[#CBD5E1] font-mono">Settings</h3>

      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={settings.headless}
          onChange={(e) => update({ headless: e.target.checked })}
          disabled={disabled}
          className="w-4 h-4 rounded border-[#475569] bg-[#0F172A] text-[#22C55E] focus:ring-[#22C55E] cursor-pointer"
        />
        <span className="text-sm text-[#CBD5E1]">Headless mode</span>
      </label>

      <div className="grid grid-cols-2 gap-3">
        {[
          { key: 'concurrency', label: 'Concurrency', min: 1, max: 10, step: 1 },
          { key: 'timeout', label: 'Timeout (ms)', min: 5000, max: 120000, step: 1000 },
          { key: 'retryCount', label: 'Retries', min: 0, max: 10, step: 1 },
          { key: 'delayMs', label: 'Delay (ms)', min: 0, max: 10000, step: 100 },
        ].map(({ key, label, min, max, step }) => (
          <div key={key} className="space-y-1">
            <label className="text-xs text-[#64748B] font-medium">{label}</label>
            <input
              type="number"
              min={min}
              max={max}
              step={step}
              value={(settings as any)[key]}
              onChange={(e) => update({ [key]: Math.max(min, Math.min(max, Number(e.target.value))) })}
              disabled={disabled}
              className="input-field text-xs"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
