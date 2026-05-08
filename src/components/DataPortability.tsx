'use client';

import { ChangeEvent, useRef, useState } from 'react';
import { SubscribedPackage } from '@/lib/types';
import { mergePackages } from '@/lib/storage';
import { DownloadIcon, UploadIcon } from '@/components/Icons';

interface DataPortabilityProps {
  packages: SubscribedPackage[];
  onImport: () => void;
}

export default function DataPortability({ packages, onImport }: DataPortabilityProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  function handleExport() {
    const json = JSON.stringify(packages, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'npm-tracker-subscriptions.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (
          !Array.isArray(parsed) ||
          !parsed.every(
            item =>
              typeof item === 'object' &&
              item !== null &&
              typeof item.name === 'string' &&
              typeof item.lastSeenVersion === 'string' &&
              typeof item.addedAt === 'string'
          )
        ) {
          setMessage('Invalid subscription file');
          setTimeout(() => setMessage(null), 4000);
          return;
        }

        const count = mergePackages(parsed as SubscribedPackage[]);
        onImport();
        setMessage(count === 0 ? 'No new packages' : `Imported ${count}`);
        setTimeout(() => setMessage(null), 3000);
      } catch {
        setMessage('Failed to parse file');
        setTimeout(() => setMessage(null), 4000);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  }

  return (
    <section className="registry-panel rounded-lg border p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-zinc-100">Local state</h2>
          <p className="mt-1 text-sm text-zinc-400">{packages.length} watch entries in browser storage.</p>
        </div>
        {message && (
          <span className="rounded-md border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-xs font-medium text-emerald-100">
            {message}
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleExport}
          disabled={packages.length === 0}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 text-sm font-medium text-zinc-300 transition hover:border-teal-300/35 hover:text-teal-100 disabled:border-white/5 disabled:text-zinc-600"
          title="Export subscriptions as JSON"
        >
          <DownloadIcon className="h-4 w-4" />
          Export
        </button>
        <button
          type="button"
          onClick={handleImportClick}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 text-sm font-medium text-zinc-300 transition hover:border-amber-200/35 hover:text-amber-100"
          title="Import subscriptions from JSON"
        >
          <UploadIcon className="h-4 w-4" />
          Import
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />
    </section>
  );
}
