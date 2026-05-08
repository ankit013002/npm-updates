'use client';

import { useEffect, useRef, useState } from 'react';
import { SummarySettings } from '@/lib/types';

interface Props {
  settings: SummarySettings;
  onSave: (settings: SummarySettings) => void;
  onClose: () => void;
}

export default function SettingsPanel({ settings, onSave, onClose }: Props) {
  const [claudeApiKey, setClaudeApiKey] = useState(settings.claudeApiKey);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 id="settings-title" className="text-base font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Changelog summaries work without a key using a built-in extractor.
          Add a Claude API key for richer AI-generated summaries.
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Claude API key <span className="text-gray-600 font-normal">(optional)</span>
          </label>
          <input
            ref={inputRef}
            type="password"
            value={claudeApiKey}
            onChange={e => setClaudeApiKey(e.target.value)}
            placeholder="sk-ant-…"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-gray-500 placeholder-gray-600 transition-colors"
          />
          <p className="mt-1.5 text-xs text-gray-500">
            Stored in your browser only. Leave blank to use the built-in extractor.
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({ claudeApiKey })}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
