'use client';

import { ChangeEvent, useRef, useState } from 'react';
import { addPackage, getSubscribedPackages } from '@/lib/storage';
import { CheckIcon, ChevronRightIcon, FileJsonIcon, UploadIcon } from '@/components/Icons';

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
    const value = JSON.parse(raw);
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error('Content must be a JSON object');
    }
    parsed = value as Record<string, unknown>;
  } catch (err) {
    throw err instanceof Error ? err : new Error('Invalid JSON');
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
    if (phase === 'importing') return;
    if (open) reset();
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

    const trackedSet = new Set(subscribedNames);
    const alreadyTracked: string[] = [];
    const toImport: string[] = [];
    for (const name of names) {
      if (trackedSet.has(name)) alreadyTracked.push(name);
      else toImport.push(name);
    }

    setParsed({ packages: toImport, alreadyTracked });
    setPhase('preview');
  }

  async function handleConfirm() {
    if (!parsed) return;

    const toImport = parsed.packages;
    setPhase('importing');
    setProgress({ done: 0, total: toImport.length });

    let subscribed = 0;
    const existingNames = new Set(getSubscribedPackages().map(pkg => pkg.name));

    for (let i = 0; i < toImport.length; i++) {
      const name = toImport[i];
      try {
        const urlPath = name.split('/').map(encodeURIComponent).join('/');
        const res = await fetch(`/api/package/${urlPath}`);
        if (res.ok) {
          const data = await res.json();
          if (!existingNames.has(name)) {
            addPackage({
              name,
              lastSeenVersion: data.latestVersion,
              addedAt: new Date().toISOString(),
            });
            existingNames.add(name);
            subscribed++;
          }
        }
      } catch {
        // Skip packages that cannot be resolved from npm.
      }
      setProgress({ done: i + 1, total: toImport.length });
    }

    setSummary({
      subscribed,
      skipped: parsed.alreadyTracked.length + (toImport.length - subscribed),
    });
    setPhase('done');
    onImport();
  }

  return (
    <section className="registry-panel rounded-lg border">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-white/[0.03] sm:p-5"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-amber-200/20 bg-amber-200/10 text-amber-100">
          <FileJsonIcon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-zinc-100">Import manifest</span>
          <span className="mt-0.5 block text-sm text-zinc-400">
            Scan dependencies from package.json.
          </span>
        </span>
        <ChevronRightIcon
          className={`h-4 w-4 shrink-0 text-zinc-500 transition ${open ? 'rotate-90 text-zinc-200' : ''}`}
        />
      </button>

      {open && (
        <div className="border-t border-white/10 p-4 sm:p-5">
          {phase === 'input' && (
            <div className="space-y-4">
              <textarea
                value={text}
                onChange={e => {
                  setText(e.target.value);
                  setParseError(null);
                }}
                placeholder={'{\n  "dependencies": {\n    "react": "^19.0.0"\n  }\n}'}
                rows={8}
                className="min-h-48 w-full resize-y rounded-md border border-white/10 bg-black/30 px-3 py-3 font-mono text-xs leading-5 text-zinc-200 outline-none transition focus:border-amber-200/60 focus:ring-4 focus:ring-amber-200/10 placeholder:text-zinc-600"
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 text-xs font-medium text-zinc-300 transition hover:border-amber-200/35 hover:text-amber-100">
                  <UploadIcon className="h-4 w-4" />
                  Upload manifest
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".json"
                    className="sr-only"
                    onChange={handleFileChange}
                  />
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={reset}
                    className="h-9 rounded-md px-3 text-xs font-medium text-zinc-400 transition hover:bg-white/[0.04] hover:text-zinc-100"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handlePreview}
                    disabled={!text.trim()}
                    className="h-9 rounded-md bg-zinc-100 px-3 text-xs font-semibold text-neutral-950 transition hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-500"
                  >
                    Scan
                  </button>
                </div>
              </div>

              {parseError && (
                <p className="rounded-md border border-red-300/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {parseError}
                </p>
              )}
            </div>
          )}

          {phase === 'preview' && parsed && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-zinc-100">
                  {parsed.packages.length} new package{parsed.packages.length === 1 ? '' : 's'}
                </p>
                {parsed.alreadyTracked.length > 0 && (
                  <p className="mt-1 text-xs text-zinc-500">
                    {parsed.alreadyTracked.length} already in the watchlist.
                  </p>
                )}
              </div>

              {parsed.packages.length > 0 && (
                <div className="max-h-44 overflow-y-auto rounded-md border border-white/10 bg-black/20 p-2">
                  {parsed.packages.map(name => (
                    <div key={name} className="py-1 font-mono text-xs text-zinc-400">
                      {name}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPhase('input')}
                  className="h-9 rounded-md px-3 text-xs font-medium text-zinc-400 transition hover:bg-white/[0.04] hover:text-zinc-100"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={parsed.packages.length === 0}
                  className="h-9 rounded-md bg-zinc-100 px-3 text-xs font-semibold text-neutral-950 transition hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-500"
                >
                  Add all
                </button>
              </div>
            </div>
          )}

          {phase === 'importing' && progress && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-zinc-200">
                Importing {progress.done}/{progress.total}
              </p>
              <div className="h-2 overflow-hidden rounded-sm bg-white/10">
                <div
                  className="h-full rounded-sm bg-emerald-300 transition-all"
                  style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {phase === 'done' && summary && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-300/[0.12] text-emerald-200 ring-1 ring-emerald-300/20">
                  <CheckIcon className="h-4 w-4" />
                </span>
                <p className="text-sm text-zinc-300">
                  Imported <span className="font-semibold text-emerald-100">{summary.subscribed}</span>{' '}
                  package{summary.subscribed === 1 ? '' : 's'}.
                  {summary.skipped > 0 && (
                    <span className="text-zinc-500"> {summary.skipped} skipped.</span>
                  )}
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setOpen(false);
                  }}
                  className="h-9 rounded-md bg-zinc-800 px-3 text-xs font-semibold text-zinc-100 transition hover:bg-zinc-700"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
