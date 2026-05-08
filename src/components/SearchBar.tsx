'use client';

import { FormEvent, useState } from 'react';
import { NpmPackageData } from '@/lib/types';
import { CheckIcon, PackageIcon, SearchIcon } from '@/components/Icons';

interface Props {
  onAdd: (name: string, latestVersion: string) => void;
  subscribedNames: string[];
}

const suggestions = ['react', 'next', 'typescript', 'zod'];

function packageApiPath(name: string) {
  return name.split('/').map(encodeURIComponent).join('/');
}

export default function SearchBar({ onAdd, subscribedNames }: Props) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<NpmPackageData | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSearch(rawQuery: string) {
    const trimmed = rawQuery.trim();
    if (!trimmed) return;

    setQuery(trimmed);
    setSearching(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/package/${packageApiPath(trimmed)}`);
      if (!res.ok) {
        setError('Package not found');
        return;
      }
      setResult(await res.json());
    } catch {
      setError('Failed to reach the npm registry');
    } finally {
      setSearching(false);
    }
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    void runSearch(query);
  }

  function handleAdd() {
    if (!result) return;
    onAdd(result.name, result.latestVersion);
    setResult(null);
    setQuery('');
  }

  const alreadyTracked = result ? subscribedNames.includes(result.name) : false;

  return (
    <section className="registry-panel overflow-hidden rounded-lg border">
      <div className="border-b border-white/10 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-red-400/20 bg-red-500/10 text-red-100">
            <PackageIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-zinc-100">Registry query</h2>
            <p className="text-sm text-zinc-400">Resolve an npm package and add it to the watchlist.</p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <form onSubmit={handleSearch} className="command-surface overflow-hidden rounded-md border">
          <div className="flex min-h-12 flex-col sm:flex-row">
            <div className="flex min-w-0 flex-1 items-center border-b border-white/10 sm:border-b-0 sm:border-r">
              <span className="flex h-12 shrink-0 items-center border-r border-white/10 px-3 font-mono text-xs text-zinc-500">
                npm view
              </span>
              <label className="relative flex-1">
                <span className="sr-only">Package name</span>
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="axios | @tanstack/react-query | eslint"
                  className="h-12 w-full bg-transparent px-10 font-mono text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600"
                />
              </label>
              <span className="hidden h-12 shrink-0 items-center px-3 font-mono text-xs text-zinc-600 sm:flex">
                version
              </span>
            </div>
            <button
              type="submit"
              disabled={searching || !query.trim()}
              className="inline-flex h-12 items-center justify-center gap-2 bg-zinc-100 px-5 text-sm font-semibold text-neutral-950 transition hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-500"
            >
              {searching && <span className="h-2 w-2 rounded-full bg-current opacity-70" />}
              {searching ? 'Resolving' : 'Resolve'}
            </button>
          </div>
        </form>

        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map(name => (
            <button
              key={name}
              type="button"
              onClick={() => void runSearch(name)}
              className="rounded-md border border-white/10 bg-black/20 px-2.5 py-1.5 font-mono text-xs text-zinc-400 transition hover:border-red-400/30 hover:text-red-100"
            >
              {`npm:${name}`}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="border-t border-white/10 bg-red-500/[0.08] px-4 py-3 text-sm text-red-200 sm:px-5">
          {error}
        </div>
      )}

      {result && (
        <div className="border-t border-white/10 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="break-all font-mono text-base font-semibold text-zinc-50">{result.name}</span>
                <span className="rounded-md border border-red-400/20 bg-red-500/10 px-2 py-1 font-mono text-xs font-semibold text-red-100">
                  latest@{result.latestVersion}
                </span>
              </div>
              {result.description && (
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-400">
                  {result.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={alreadyTracked}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-zinc-100 px-4 text-sm font-semibold text-neutral-950 transition hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-500"
            >
              {alreadyTracked && <CheckIcon className="h-4 w-4" />}
              {alreadyTracked ? 'Tracked' : 'Add watch'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
