'use client';

import { ChangeEvent, useRef, useState } from 'react';
import { SubscribedPackage } from '@/lib/types';
import { mergePackages } from '@/lib/storage';

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
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (
          !Array.isArray(parsed) ||
          !parsed.every(
            (item) =>
              typeof item === 'object' &&
              item !== null &&
              typeof item.name === 'string' &&
              typeof item.lastSeenVersion === 'string' &&
              typeof item.addedAt === 'string'
          )
        ) {
          setMessage('Invalid file: expected an array of { name, lastSeenVersion, addedAt }');
          setTimeout(() => setMessage(null), 4000);
          return;
        }

        const count = mergePackages(parsed as SubscribedPackage[]);
        onImport();
        setMessage(
          count === 0
            ? 'No new packages — all already tracked'
            : `Imported ${count} package${count === 1 ? '' : 's'}`
        );
        setTimeout(() => setMessage(null), 3000);
      } catch {
        setMessage('Failed to parse file');
        setTimeout(() => setMessage(null), 4000);
      } finally {
        // Reset so the same file can be re-selected
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <button
        onClick={handleExport}
        disabled={packages.length === 0}
        className="text-xs px-2.5 py-1 rounded-md bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        title="Export subscriptions as JSON"
      >
        Export
      </button>
      <button
        onClick={handleImportClick}
        className="text-xs px-2.5 py-1 rounded-md bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors"
        title="Import subscriptions from JSON"
      >
        Import
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />
      {message && (
        <span className="text-xs text-emerald-400 ml-1">{message}</span>
      )}
    </div>
  );
}
