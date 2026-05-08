'use client';

import { useEffect, useRef, useState } from 'react';
import { OllamaSettings } from '@/lib/types';
import { SettingsIcon, XIcon } from '@/components/Icons';

interface Props {
  settings: OllamaSettings;
  onSave: (settings: OllamaSettings) => void;
  onClose: () => void;
}

export default function SettingsPanel({ settings, onSave, onClose }: Props) {
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl);
  const [model, setModel] = useState(settings.model);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="registry-panel w-full max-w-lg overflow-hidden rounded-lg border"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-teal-300/20 bg-teal-400/[0.1] text-teal-100">
              <SettingsIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 id="settings-title" className="text-base font-semibold text-zinc-50">
                Summary runtime
              </h2>
              <p className="mt-1 text-sm text-zinc-400">Local Ollama endpoint for release notes.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-zinc-500 transition hover:bg-white/[0.05] hover:text-zinc-100"
            aria-label="Close settings"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-200">Ollama URL</span>
            <input
              ref={firstInputRef}
              type="text"
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 font-mono text-sm text-zinc-100 outline-none transition focus:border-teal-300/60 focus:ring-4 focus:ring-teal-300/10"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-200">Model</span>
            <input
              type="text"
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder="llama3.2, mistral, codellama"
              className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 font-mono text-sm text-zinc-100 outline-none transition focus:border-teal-300/60 focus:ring-4 focus:ring-teal-300/10 placeholder:text-zinc-600"
            />
          </label>

          <div className="rounded-md border border-amber-200/15 bg-amber-200/[0.08] px-3 py-3 text-xs leading-5 text-amber-100">
            Pull a model first with <code className="rounded-md bg-black/30 px-1.5 py-0.5 font-mono">ollama pull llama3.2</code>.
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-white/10 p-5">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-md px-4 text-sm font-medium text-zinc-400 transition hover:bg-white/[0.04] hover:text-zinc-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave({ baseUrl, model })}
            className="h-10 rounded-md bg-zinc-100 px-4 text-sm font-semibold text-neutral-950 transition hover:bg-white"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
