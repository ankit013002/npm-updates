'use client';

import { ChangeEvent, useRef, useState } from 'react';
import { addPackage, getSubscribedPackages } from '@/lib/storage';

interface Props {
  subscribedNames: string[];
  onImport: () => void;
}

type Phase = 'input' | 'preview' | 'importing' | 'done';

interface ParsedResult {
  packages: string[];
  alreadyTracked: string[];
}

function parsePackageJson(raw: string): string[] {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON — please paste a valid package.json');
  }

  const depFields = ['dependencies', 'devDependencies', 'peerDependencies'] as const;
  const names = new Set<string>();

  for (const field of depFields) {
    const section = parsed[field];
    if (section && typeof section === 'object' && !Array.isArray(section)) {
      for (const name of Object.keys(section as Record<string, unknown>)) {
        names.add(name);
      }
    }
  }

  return Array.from(names).sort();
}

export default function BulkImport({ subscribedNames, onImport }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('input');
  const [parsed, setParsed] = useState<ParsedResult | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [summary, setSummary] = useState<{ subscribed: number; skipped: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setText('');
    setParseError(null);
    setPhase('input');
    setParsed(null);
    setProgress(null);
    setSummary(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  function handleToggle() {
    if (open) {
      reset();
    }
    setOpen(prev => !prev);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      setText((evt.target?.result as string) ?? '');
      setParseError(null);
    };
    reader.readAsText(file);
  }

  function handlePreview() {
    setParseError(null);
    let names: string[];
    try {
      names = parsePackageJson(text);
    } catch (err) {
      setParseError((err as Error).message);
      return;
    }
    if (names.length === 0) {
      setParseError('No packages found in dependencies, devDependencies, or peerDependencies');
      return;
    }
    const alreadyTracked = names.filter(n => subscribedNames.includes(n));
    const toImport = names.filter(n => !subscribedNames.includes(n));
    setParsed({ packages: toImport, alreadyTracked });
    setPhase('preview');
  }

  async function handleConfirm() {
    if (!parsed) return;
    const toImport = parsed.packages;
    setPhase('importing');
    setProgress({ done: 0, total: toImport.length });

    let subscribed = 0;

    for (let i = 0; i < toImport.length; i++) {
      const name = toImport[i];
      try {
        const encodedName = name.startsWith('@')
          ? name.replace('/', '%2F')
          : name;
        const res = await fetch(`/api/package/${encodedName}`);
        if (res.ok) {
          const data = await res.json();
          // Re-check in case something was added during the import
          const current = getSubscribedPackages();
          if (!current.find(p => p.name === name)) {
            addPackage({
              name,
              lastSeenVersion: data.latestVersion,
              addedAt: new Date().toISOString(),
            });
            subscribed++;
          }
        }
      } catch {
        // skip packages that fail
      }
      setProgress({ done: i + 1, total: toImport.length });
    }

    setSummary({ subscribed, skipped: parsed.alreadyTracked.length + (toImport.length - subscribed) });
    setPhase('done');
    onImport();
  }

  return (
    <div className="mt-3">
      <button
        onClick={handleToggle}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
      >
        <svg
          className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        Import package.json
      </button>

      {open && (
        <div className="mt-3 p-4 bg-gray-900 border border-gray-700 rounded-lg space-y-3">
          {phase === 'input' && (
            <>
              <p className="text-xs text-gray-400">
                Paste your <code className="text-gray-300">package.json</code> contents below or upload the file.
                All packages from <code className="text-gray-300">dependencies</code>,{' '}
                <code className="text-gray-300">devDependencies</code>, and{' '}
                <code className="text-gray-300">peerDependencies</code> will be imported.
              </p>

              <textarea
                value={text}
                onChange={e => { setText(e.target.value); setParseError(null); }}
                placeholder={'{\n  "dependencies": {\n    "react": "^18.0.0"\n  }\n}'}
                rows={8}
                className="w-full bg-gray-950 border border-gray-700 rounded-md px-3 py-2 text-xs text-gray-300 font-mono placeholder-gray-600 focus:outline-none focus:border-gray-500 resize-y transition-colors"
              />

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 cursor-pointer transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload file
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".json"
                    className="sr-only"
                    onChange={handleFileChange}
                  />
                </label>
              </div>

              {parseError && (
                <p className="text-xs text-red-400">{parseError}</p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={reset}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={handlePreview}
                  disabled={!text.trim()}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-md text-xs font-medium transition-colors"
                >
                  Preview import
                </button>
              </div>
            </>
          )}

          {phase === 'preview' && parsed && (
            <>
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-300">
                  Ready to subscribe to{' '}
                  <span className="text-emerald-400">{parsed.packages.length}</span> package
                  {parsed.packages.length !== 1 ? 's' : ''}
                  {parsed.alreadyTracked.length > 0 && (
                    <span className="text-gray-500">
                      {' '}({parsed.alreadyTracked.length} already tracked, skipping)
                    </span>
                  )}
                </p>
                {parsed.packages.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-md bg-gray-950 border border-gray-800 p-2">
                    {parsed.packages.map(name => (
                      <div key={name} className="text-xs text-gray-400 py-0.5 font-mono">{name}</div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setPhase('input')}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={parsed.packages.length === 0}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-md text-xs font-medium transition-colors"
                >
                  Subscribe to all
                </button>
              </div>
            </>
          )}

          {phase === 'importing' && progress && (
            <div className="space-y-2">
              <p className="text-xs text-gray-300">
                Importing {progress.done}/{progress.total}…
              </p>
              <div className="w-full bg-gray-800 rounded-full h-1.5">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${(progress.done / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {phase === 'done' && summary && (
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-xs text-gray-300">
                  Subscribed to <span className="text-emerald-400 font-medium">{summary.subscribed}</span> package
                  {summary.subscribed !== 1 ? 's' : ''}.
                  {summary.skipped > 0 && (
                    <span className="text-gray-500"> {summary.skipped} already tracked or unavailable.</span>
                  )}
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => { reset(); setOpen(false); }}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-md text-xs font-medium transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
