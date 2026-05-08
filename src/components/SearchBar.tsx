'use client';

import { useState } from 'react';
import { NpmPackageData } from '@/lib/types';

interface Props {
  onAdd: (name: string, latestVersion: string) => void;
  subscribedNames: string[];
}

export default function SearchBar({ onAdd, subscribedNames }: Props) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<NpmPackageData | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setSearching(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/package/${encodeURIComponent(trimmed)}`);
      if (!res.ok) {
        setError('Package not found');
        return;
      }
      setResult(await res.json());
    } catch {
      setError('Failed to reach npm registry');
    } finally {
      setSearching(false);
    }
  }

  function handleAdd() {
    if (!result) return;
    onAdd(result.name, result.latestVersion);
    setResult(null);
    setQuery('');
  }

  const alreadyTracked = result ? subscribedNames.includes(result.name) : false;

  return (
    <div>
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search for an npm package (e.g. axios, zod, react)"
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gray-500 transition-colors"
        />
        <button
          type="submit"
          disabled={searching || !query.trim()}
          className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
        >
          {searching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      {result && (
        <div className="mt-3 flex items-start justify-between gap-4 p-4 bg-gray-900 border border-gray-700 rounded-lg">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-100">{result.name}</span>
              <span className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded-full shrink-0">
                v{result.latestVersion}
              </span>
            </div>
            {result.description && (
              <p className="mt-1 text-sm text-gray-400 line-clamp-2">{result.description}</p>
            )}
          </div>
          <button
            onClick={handleAdd}
            disabled={alreadyTracked}
            className="shrink-0 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors"
          >
            {alreadyTracked ? 'Already tracked' : 'Track'}
          </button>
        </div>
      )}
    </div>
  );
}
