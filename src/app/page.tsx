'use client';

import { useEffect, useMemo, useRef, useState, FormEvent } from 'react';
import { NpmPackageData, OllamaSettings, SubscribedPackage } from '@/lib/types';
import {
  addPackage,
  getOllamaSettings,
  getSubscribedPackages,
  markAsSeen,
  removePackage,
  saveOllamaSettings,
} from '@/lib/storage';
import PackageCard from '@/components/PackageCard';
import SettingsPanel from '@/components/SettingsPanel';
import BulkImport from '@/components/BulkImport';
import DataPortability from '@/components/DataPortability';
import DiscoverPage from '@/components/DiscoverPage';

// ─── Tracking search bar ──────────────────────────────────────────────────────

function TrackingSearch({ onAdd, subscribedNames }: { onAdd: (name: string, version: string) => void; subscribedNames: string[] }) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<NpmPackageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        ref.current?.querySelector('input')?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearching(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/package/${encodeURIComponent(trimmed)}`);
      if (!res.ok) { setError('Package not found'); return; }
      const data = await res.json();
      setResult(data);
      setOpen(true);
    } catch {
      setError('Failed to reach npm registry');
    } finally {
      setSearching(false);
    }
  }

  function handleAdd(name: string, version: string) {
    onAdd(name, version);
    setResult(null);
    setQuery('');
    setOpen(false);
  }

  const alreadyTracked = result ? subscribedNames.includes(result.name) : false;

  return (
    <div ref={ref} className="relative">
      <form onSubmit={handleSearch}>
        <div className={`flex items-center gap-3 h-12 px-4 rounded-xl bg-zinc-900/60 ring-1 ring-inset transition-all duration-200
          ${open || searching ? 'ring-[var(--accent-ring-strong)] shadow-[0_0_0_4px_var(--accent-soft),0_18px_40px_-20px_rgba(0,0,0,0.8)]' : 'ring-white/[0.07] hover:ring-white/[0.12]'}`}>
          <svg className="w-4 h-4 text-zinc-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setError(null); }}
            onFocus={() => result && setOpen(true)}
            placeholder="Search npm — try react-router, drizzle-orm, dayjs…"
            className="flex-1 bg-transparent outline-none text-[14px] text-zinc-100 placeholder:text-zinc-600"
          />
          <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-zinc-500">
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] ring-1 ring-inset ring-white/10 font-mono text-[10px]">⌘K</kbd>
            <span className="text-zinc-600">·</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] ring-1 ring-inset ring-white/10 font-mono text-[10px]">↵</kbd>
            <span>to add</span>
          </span>
          <button type="submit" disabled={searching || !query.trim()}
            className="shrink-0 h-7 px-3 rounded-lg text-[12px] font-medium text-white bg-[var(--accent)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition">
            {searching ? '…' : 'Search'}
          </button>
        </div>
      </form>

      {error && <p className="mt-2 text-[12.5px] text-red-400">{error}</p>}

      {open && result && (
        <div className="absolute z-40 left-0 right-0 mt-2 rounded-xl bg-zinc-900/95 backdrop-blur-xl ring-1 ring-inset ring-white/[0.08] shadow-2xl overflow-hidden">
          <div className="mx-1.5 px-3 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] ring-1 ring-inset ring-white/[0.06] grid place-items-center text-zinc-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[13px] text-zinc-100">{result.name}</span>
                <span className="font-mono text-[11px] text-zinc-500">v{result.latestVersion}</span>
                {alreadyTracked && <span className="text-[10px] uppercase tracking-wider text-zinc-500">tracked</span>}
              </div>
              {result.description && <p className="text-[12px] text-zinc-500 truncate">{result.description}</p>}
            </div>
            <button
              onClick={() => !alreadyTracked && handleAdd(result.name, result.latestVersion)}
              disabled={alreadyTracked}
              className={`shrink-0 h-7 px-3 rounded-md text-[12px] font-medium transition
                ${alreadyTracked ? 'text-zinc-500 ring-1 ring-inset ring-white/[0.05]' : 'text-white bg-[var(--accent)] hover:brightness-110'}`}
            >
              {alreadyTracked ? 'Tracked' : 'Track'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Action chips ─────────────────────────────────────────────────────────────

function ActionChips({ onOpenBulk, onExport }: { onOpenBulk: () => void; onExport: () => void }) {
  const Chip = ({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) => (
    <button onClick={onClick}
      className="group inline-flex items-center gap-2 h-8 px-3 rounded-full text-[12px] text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] transition-colors">
      <span className="text-zinc-500 group-hover:text-[var(--accent)] transition-colors">{icon}</span>
      <span>{label}</span>
    </button>
  );
  return (
    <div className="flex flex-wrap items-center gap-1 px-1">
      <Chip
        icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}
        label="Import package.json"
        onClick={onOpenBulk}
      />
      <span className="w-px h-3 bg-white/[0.08]" />
      <Chip
        icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
        label="Export list"
        onClick={onExport}
      />
    </div>
  );
}

// ─── Pulse dot ────────────────────────────────────────────────────────────────

function PulseDot() {
  return (
    <span className="relative inline-flex w-2 h-2">
      <span className="absolute inset-0 rounded-full bg-emerald-400/80 animate-pulse-ping" />
      <span className="relative w-2 h-2 rounded-full bg-emerald-400" />
    </span>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onImport }: { onImport: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/[0.08] py-16 px-6 text-center">
      <div className="mx-auto w-16 h-16 grid place-items-center rounded-2xl bg-white/[0.02] ring-1 ring-inset ring-white/[0.05] text-zinc-500">
        <svg className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth={1.25} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
      <h3 className="mt-5 text-[16px] font-semibold text-zinc-100">Nothing tracked yet</h3>
      <p className="mt-1.5 text-[13px] text-zinc-500">
        Search for a package above, or import your <span className="font-mono text-zinc-300">package.json</span>.
      </p>
      <button onClick={onImport}
        className="mt-5 inline-flex items-center gap-2 h-9 px-3.5 rounded-md bg-white/[0.04] ring-1 ring-inset ring-white/[0.07] text-[12.5px] text-zinc-200 hover:bg-white/[0.07] transition">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        Import package.json
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [packages, setPackages] = useState<SubscribedPackage[]>([]);
  const [packageData, setPackageData] = useState<Record<string, NpmPackageData | null>>({});
  const [loadingPkg, setLoadingPkg] = useState<Record<string, boolean>>({});
  const [ollamaSettings, setOllamaSettings] = useState<OllamaSettings>({ baseUrl: 'http://localhost:11434', model: 'llama3.2' });
  const [showSettings, setShowSettings] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [lastChecked, setLastChecked] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [view, setView] = useState<'discover' | 'tracking'>('discover');
  const fetchGenRef = useRef<Record<string, number>>({});
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPackages(getSubscribedPackages());
    setOllamaSettings(getOllamaSettings());
  }, []);

  useEffect(() => {
    packages.forEach(pkg => {
      if (packageData[pkg.name] === undefined && !loadingPkg[pkg.name]) {
        fetchPackage(pkg.name);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packages]);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 1800);
  }

  async function fetchPackage(name: string, force = false) {
    const gen = (fetchGenRef.current[name] = (fetchGenRef.current[name] ?? 0) + 1);
    setLoadingPkg(prev => ({ ...prev, [name]: true }));
    try {
      const url = force ? `/api/package/${name}?force=1` : `/api/package/${name}`;
      const res = await fetch(url);
      const data = await res.json();
      if (fetchGenRef.current[name] !== gen) return;
      if (res.ok) {
        setPackageData(prev => ({ ...prev, [name]: data }));
        setLastChecked(prev => ({ ...prev, [name]: new Date().toISOString() }));
      } else {
        setPackageData(prev => ({ ...prev, [name]: prev[name] ?? null }));
      }
    } catch {
      if (fetchGenRef.current[name] !== gen) return;
      setPackageData(prev => ({ ...prev, [name]: prev[name] ?? null }));
    } finally {
      if (fetchGenRef.current[name] === gen) {
        setLoadingPkg(prev => ({ ...prev, [name]: false }));
      }
    }
  }

  function handleAdd(name: string, latestVersion: string) {
    if (packages.some(p => p.name === name)) {
      showToast(`${name} is already tracked`);
      return;
    }
    addPackage({ name, lastSeenVersion: latestVersion, addedAt: new Date().toISOString() });
    setPackages(getSubscribedPackages());
    showToast(`Tracking ${name}`);
    // If added with a placeholder version, fetch real data
    if (latestVersion === '0.0.0') fetchPackage(name);
  }

  function handleRemove(name: string) {
    removePackage(name);
    setPackages(getSubscribedPackages());
    setPackageData(prev => { const next = { ...prev }; delete next[name]; return next; });
  }

  function handleMarkAsSeen(name: string, version: string) {
    markAsSeen(name, version);
    setPackages(getSubscribedPackages());
  }

  function handleMarkAllSeen() {
    withUpdates.forEach(pkg => {
      const latest = packageData[pkg.name]?.latestVersion;
      if (latest) markAsSeen(pkg.name, latest);
    });
    setPackages(getSubscribedPackages());
  }

  function handleRefreshAll() {
    setRefreshing(true);
    packages.forEach(pkg => fetchPackage(pkg.name, true));
    setTimeout(() => setRefreshing(false), 900);
  }

  function handleSaveSettings(settings: OllamaSettings) {
    saveOllamaSettings(settings);
    setOllamaSettings(settings);
    setShowSettings(false);
  }

  function handleExport() {
    const names = packages.map(p => p.name);
    const blob = new Blob([JSON.stringify(names, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'npm-tracker-list.json'; a.click();
    URL.revokeObjectURL(url);
  }

  const withUpdates = packages.filter(
    p => packageData[p.name] && packageData[p.name]!.latestVersion !== p.lastSeenVersion
  );
  const upToDate = packages.filter(
    p => !packageData[p.name] || packageData[p.name]!.latestVersion === p.lastSeenVersion
  );

  const trackedNames = useMemo(() => new Set(packages.map(p => p.name)), [packages]);

  return (
    <div className="min-h-screen text-zinc-200 selection:bg-[var(--accent-soft)]" style={{ background: '#0a0a0f' }}>
      {/* ambient radial glow */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-50"
        style={{ background: 'radial-gradient(800px 400px at 50% -100px, var(--accent-soft), transparent 60%)' }} />

      {/* ─── Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#0a0a0f]/80 border-b border-white/[0.06]">
        {/* shimmer line */}
        <div className="absolute inset-x-0 -bottom-px h-px overflow-hidden pointer-events-none">
          <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-70 animate-shimmer" />
        </div>

        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          {/* logo */}
          <button onClick={() => setView('discover')} className="flex items-center gap-3 shrink-0">
            <div className="relative w-7 h-7 rounded-md bg-[var(--accent-soft)] ring-1 ring-inset ring-[var(--accent-ring)] flex items-center justify-center">
              <svg viewBox="0 0 18 18" className="w-3.5 h-3.5 text-[var(--accent)]" fill="currentColor">
                <path d="M0 0h18v18H0z" fill="none"/>
                <path d="M2 2h14v14h-2V4H9v12H2z"/>
              </svg>
            </div>
            <h1 className="text-[15px] font-semibold text-zinc-100 tracking-tight">npm tracker</h1>
          </button>

          {/* tabs */}
          <nav className="hidden sm:flex items-center gap-0.5 p-0.5 rounded-lg bg-white/[0.025] ring-1 ring-inset ring-white/[0.05]">
            <TabBtn active={view === 'discover'} onClick={() => setView('discover')}>
              Discover
            </TabBtn>
            <TabBtn active={view === 'tracking'} onClick={() => setView('tracking')}>
              <span>Tracking</span>
              <span className={`text-[10px] tabular-nums px-1.5 py-px rounded-full
                ${view === 'tracking' ? 'bg-white/[0.08] text-zinc-100' : 'bg-white/[0.04] text-zinc-400'}`}>
                {packages.length}
              </span>
              {withUpdates.length > 0 && (
                <span className="relative w-1.5 h-1.5">
                  <span className="absolute inset-0 rounded-full bg-emerald-400 animate-pulse" />
                </span>
              )}
            </TabBtn>
          </nav>

          {/* icon buttons */}
          <div className="flex items-center gap-1">
            <IconBtn label="Refresh all" onClick={handleRefreshAll}>
              <svg className={`w-4 h-4 ${refreshing ? 'animate-spin-once' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </IconBtn>
            <IconBtn label="Settings" onClick={() => setShowSettings(true)}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </IconBtn>
          </div>
        </div>
      </header>

      {/* ─── Main ───────────────────────────────────────────────────── */}
      <main className="relative z-10 max-w-3xl mx-auto px-6 pb-24">
        {view === 'discover' ? (
          <DiscoverPage onAdd={handleAdd} trackedNames={trackedNames} />
        ) : (
          <div className="pt-6">
            <div className="space-y-2.5">
              <TrackingSearch onAdd={handleAdd} subscribedNames={packages.map(p => p.name)} />
              <ActionChips onOpenBulk={() => setShowBulk(true)} onExport={handleExport} />
            </div>

            {/* Updates available */}
            {withUpdates.length > 0 && (
              <section className="relative mt-9">
                <div className="relative flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <PulseDot />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300/90">Updates available</span>
                    <span className="text-[10px] font-mono tabular-nums text-emerald-300/60">{String(withUpdates.length).padStart(2, '0')}</span>
                  </div>
                  <button onClick={handleMarkAllSeen}
                    className="h-7 px-2.5 rounded-md text-[11.5px] text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] transition-colors">
                    Mark all seen
                  </button>
                </div>
                <div className="space-y-2">
                  {withUpdates.map(pkg => (
                    <PackageCard key={pkg.name} pkg={pkg} data={packageData[pkg.name] ?? null}
                      loading={loadingPkg[pkg.name] ?? false} onRemove={handleRemove}
                      onMarkAsSeen={handleMarkAsSeen} ollamaSettings={ollamaSettings}
                      lastChecked={lastChecked[pkg.name]} />
                  ))}
                </div>
              </section>
            )}

            {/* All clear */}
            {withUpdates.length === 0 && packages.length > 0 && (
              <section className="mt-9 rounded-xl bg-emerald-500/[0.04] ring-1 ring-inset ring-emerald-500/[0.08] px-5 py-4 flex items-center gap-3">
                <span className="w-7 h-7 grid place-items-center rounded-full bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/20 text-emerald-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <div>
                  <div className="text-[13px] text-zinc-100">All clear.</div>
                  <div className="text-[12px] text-zinc-500">Every tracked package is on its latest version.</div>
                </div>
              </section>
            )}

            {/* Up to date */}
            {upToDate.length > 0 && (
              <section className="mt-10">
                <div className="flex items-center gap-2.5 mb-3 opacity-80">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Up to date</span>
                  <span className="text-[10px] font-mono tabular-nums text-zinc-600">{String(upToDate.length).padStart(2, '0')}</span>
                </div>
                <div className="space-y-1.5">
                  {upToDate.map(pkg => (
                    <PackageCard key={pkg.name} pkg={pkg} data={packageData[pkg.name] ?? null}
                      loading={loadingPkg[pkg.name] ?? false} onRemove={handleRemove}
                      onMarkAsSeen={handleMarkAsSeen} ollamaSettings={ollamaSettings}
                      lastChecked={lastChecked[pkg.name]} />
                  ))}
                </div>
              </section>
            )}

            {packages.length === 0 && (
              <div className="mt-10">
                <EmptyState onImport={() => setShowBulk(true)} />
              </div>
            )}

            {/* Data portability (kept functional, hidden visually in a subtle row) */}
            <div className="mt-8">
              <DataPortability packages={packages} onImport={() => setPackages(getSubscribedPackages())} />
            </div>
          </div>
        )}

        <div className="mt-16 flex items-center justify-between text-[11px] text-zinc-600">
          <span className="font-mono">npm-tracker · v1.4.0</span>
          <span>Last refresh {refreshing ? 'running…' : '–'}</span>
        </div>
      </main>

      {/* ─── Toast ──────────────────────────────────────────────────── */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] transition-all duration-200
        ${toast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
        <div className="px-3.5 py-2 rounded-lg bg-zinc-900/95 ring-1 ring-inset ring-white/[0.08] text-[12.5px] text-zinc-100 backdrop-blur-xl shadow-2xl flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          {toast}
        </div>
      </div>

      {/* ─── Modals ──────────────────────────────────────────────────── */}
      {showSettings && (
        <SettingsPanel settings={ollamaSettings} onSave={handleSaveSettings} onClose={() => setShowSettings(false)} />
      )}
      {showBulk && (
        <BulkImport
          subscribedNames={packages.map(p => p.name)}
          onImport={() => { setPackages(getSubscribedPackages()); setShowBulk(false); }}
        />
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-[12.5px] transition-all
        ${active ? 'bg-white/[0.06] text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]' : 'text-zinc-400 hover:text-zinc-100'}`}>
      {children}
    </button>
  );
}

function IconBtn({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} aria-label={label} title={label}
      className="w-8 h-8 grid place-items-center rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-[var(--accent-soft)] transition-colors">
      {children}
    </button>
  );
}
