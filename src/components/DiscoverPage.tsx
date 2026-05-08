'use client';

import { useState, useRef, useEffect, useMemo, FormEvent } from 'react';
import {
  TRENDING, COLLECTIONS, RECOMMENDED, CATEGORIES, SPOTLIGHT, ACTIVITY,
  formatDownloads, TrendingPackage, Collection, RecommendedPackage,
} from '@/lib/discover-data';
import { NpmPackageData } from '@/lib/types';

interface DiscoverProps {
  onAdd: (name: string, latestVersion: string) => void;
  trackedNames: Set<string>;
}

// ─── Sparkline ───────────────────────────────────────────────────────────────

function Sparkline({ data, w = 64, h = 22 }: { data: number[]; w?: number; h?: number }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const dx = w / (data.length - 1);
  const norm = (v: number) => h - ((v - min) / Math.max(1, max - min)) * (h - 4) - 2;
  const path = data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${i * dx},${norm(v)}`).join(' ');
  const area = path + ` L ${w},${h} L 0,${h} Z`;
  const endX = (data.length - 1) * dx;
  const endY = norm(data[data.length - 1]);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <path d={area} fill="currentColor" opacity={0.12} />
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={endX} cy={endY} r="2" fill="currentColor" />
    </svg>
  );
}

// ─── Hero search ─────────────────────────────────────────────────────────────

function HeroSearch({ onAdd, trackedNames }: DiscoverProps) {
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

  return (
    <div ref={ref} className="relative max-w-xl mx-auto">
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
            placeholder="Search npm — try drizzle-orm, hono, shadcn…"
            className="flex-1 bg-transparent outline-none text-[14px] text-zinc-100 placeholder:text-zinc-600"
          />
          <button type="submit" disabled={searching || !query.trim()}
            className="shrink-0 h-7 px-3 rounded-lg text-[12px] font-medium text-white bg-[var(--accent)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition">
            {searching ? '…' : 'Search'}
          </button>
        </div>
      </form>

      {error && <p className="mt-2 text-center text-[12.5px] text-red-400">{error}</p>}

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
                {trackedNames.has(result.name) && (
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500">tracked</span>
                )}
              </div>
              {result.description && (
                <p className="text-[12px] text-zinc-500 truncate">{result.description}</p>
              )}
            </div>
            <button
              onClick={() => handleAdd(result.name, result.latestVersion)}
              disabled={trackedNames.has(result.name)}
              className={`shrink-0 h-7 px-3 rounded-md text-[12px] font-medium transition
                ${trackedNames.has(result.name)
                  ? 'text-zinc-500 ring-1 ring-inset ring-white/[0.05]'
                  : 'text-white bg-[var(--accent)] hover:brightness-110'}`}
            >
              {trackedNames.has(result.name) ? 'Tracked' : 'Track'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section header ──────────────────────────────────────────────────────────

function SectionHeader({ kicker, title, meta }: { kicker: string; title: string; meta?: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)] mb-1.5">{kicker}</div>
      <h2 className="text-[18px] font-semibold tracking-tight text-zinc-100">{title}</h2>
      {meta && <div className="text-[11.5px] text-zinc-500 mt-0.5">{meta}</div>}
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function DiscoverHero({ onAdd, trackedNames }: DiscoverProps) {
  return (
    <section className="relative pt-10 pb-2">
      <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-[860px] h-[320px] opacity-60 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, var(--accent-soft), transparent 70%)' }} />
      <div className="relative text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] ring-1 ring-inset ring-white/[0.06] mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-zinc-300">2,184,304 packages indexed · updated live</span>
        </div>
        <h1 className="text-[34px] sm:text-[42px] font-semibold tracking-tight text-zinc-100 leading-[1.05]">
          Discover packages worth&nbsp;tracking.
        </h1>
        <p className="mt-3 text-[14px] text-zinc-400 max-w-xl mx-auto">
          Hand-picked collections, what&apos;s trending, and personalized picks for the stack you&apos;re already on.
        </p>
        <div className="mt-7">
          <HeroSearch onAdd={onAdd} trackedNames={trackedNames} />
        </div>
      </div>
    </section>
  );
}

// ─── Trending ─────────────────────────────────────────────────────────────────

function TrendingRow({ pkg, rank, tracked, onAdd }: { pkg: TrendingPackage; rank: number; tracked: boolean; onAdd: (name: string) => void }) {
  return (
    <div className="group flex items-center gap-3 px-3.5 py-3 rounded-xl bg-white/[0.018] ring-1 ring-inset ring-white/[0.05] hover:ring-white/[0.1] hover:bg-white/[0.03] transition-all hover:-translate-y-px">
      <span className="font-mono tabular-nums text-[10.5px] text-zinc-600 w-5 shrink-0">
        {String(rank).padStart(2, '0')}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[13.5px] text-zinc-100 truncate">{pkg.name}</span>
          <span className="text-[11px] font-medium tabular-nums text-emerald-300">+{pkg.delta}%</span>
        </div>
        <div className="text-[11.5px] text-zinc-500 truncate">{pkg.description}</div>
      </div>
      <div className="hidden sm:block text-emerald-300/80 shrink-0">
        <Sparkline data={pkg.spark} />
      </div>
      <div className="text-right shrink-0 w-16">
        <div className="font-mono text-[11px] tabular-nums text-zinc-300">{formatDownloads(pkg.weekly)}</div>
        <div className="text-[10px] text-zinc-600">/wk</div>
      </div>
      <button
        onClick={() => !tracked && onAdd(pkg.name)}
        disabled={tracked}
        className={`shrink-0 ml-1 h-7 px-2.5 rounded-md text-[11.5px] transition
          ${tracked
            ? 'text-zinc-500 ring-1 ring-inset ring-white/[0.05]'
            : 'text-zinc-200 bg-white/[0.04] hover:bg-[var(--accent)] hover:text-white ring-1 ring-inset ring-white/[0.06]'}`}
      >
        {tracked ? 'Tracked' : 'Track'}
      </button>
    </div>
  );
}

function TrendingSection({ onAdd, trackedNames }: DiscoverProps) {
  return (
    <section className="mt-14">
      <SectionHeader kicker="Trending" title="Hot this week" meta="Sorted by 7-day download growth" />
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {TRENDING.map((p, i) => (
          <TrendingRow key={p.name} pkg={p} rank={i + 1}
            tracked={trackedNames.has(p.name)}
            onAdd={name => onAdd(name, '0.0.0')} />
        ))}
      </div>
    </section>
  );
}

// ─── Collections ─────────────────────────────────────────────────────────────

function CollectionCard({ collection, onAdd, trackedNames }: { collection: Collection; onAdd: (name: string) => void; trackedNames: Set<string> }) {
  const trackedCount = collection.packages.filter(n => trackedNames.has(n)).length;
  return (
    <div className="group relative rounded-2xl overflow-hidden ring-1 ring-inset ring-white/[0.06] bg-gradient-to-br from-white/[0.025] to-transparent p-4 hover:ring-white/[0.12] transition-all">
      <div className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-40 blur-3xl"
        style={{ background: collection.accent }} />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-semibold text-zinc-100">{collection.title}</h3>
            <p className="text-[12px] text-zinc-500 mt-0.5">{collection.blurb}</p>
          </div>
          <span className="shrink-0 text-[10px] font-mono tabular-nums text-zinc-500 px-1.5 py-0.5 rounded bg-white/[0.04] ring-1 ring-inset ring-white/[0.06]">
            {collection.packages.length}
          </span>
        </div>
        <ul className="mt-3.5 space-y-1">
          {collection.packages.map(name => {
            const tracked = trackedNames.has(name);
            return (
              <li key={name} className="flex items-center justify-between py-1.5 px-2 -mx-2 rounded-md hover:bg-white/[0.03]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-1 h-1 rounded-full shrink-0" style={{ background: collection.accent, opacity: 0.8 }} />
                  <span className="font-mono text-[12.5px] text-zinc-200 truncate">{name}</span>
                </div>
                {tracked ? (
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500">tracked</span>
                ) : (
                  <button onClick={() => onAdd(name)}
                    className="text-[11px] text-zinc-500 hover:text-zinc-100 transition opacity-0 group-hover:opacity-100">
                    + add
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <div className="mt-4 flex items-center justify-between text-[11px] text-zinc-500">
          <span>{trackedCount} of {collection.packages.length} tracked</span>
          <button
            onClick={() => collection.packages.forEach(name => !trackedNames.has(name) && onAdd(name))}
            className="text-[var(--accent)] hover:brightness-125 transition font-medium">
            Track all →
          </button>
        </div>
      </div>
    </div>
  );
}

function CollectionsSection({ onAdd, trackedNames }: DiscoverProps) {
  return (
    <section className="mt-14">
      <SectionHeader kicker="Collections" title="Curated stacks" meta="Battle-tested combinations from working teams." />
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
        {COLLECTIONS.map(c => (
          <CollectionCard key={c.id} collection={c} onAdd={name => onAdd(name, '0.0.0')} trackedNames={trackedNames} />
        ))}
      </div>
    </section>
  );
}

// ─── Recommended ─────────────────────────────────────────────────────────────

function RecommendedSection({ onAdd, trackedNames }: DiscoverProps) {
  const visible = useMemo(
    () => RECOMMENDED.filter(r => !trackedNames.has(r.name)).slice(0, 6),
    [trackedNames]
  );
  if (visible.length === 0) return null;
  return (
    <section className="mt-14">
      <SectionHeader kicker="For you" title="Recommended based on your stack" meta="Picks chosen from packages you already track." />
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {visible.map((r: RecommendedPackage) => (
          <div key={r.name} className="group relative rounded-xl p-3.5 bg-white/[0.018] ring-1 ring-inset ring-white/[0.05] hover:ring-white/[0.1] transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-[12.5px] text-zinc-100 truncate">{r.name}</span>
              <span className="text-[10px] font-mono tabular-nums text-zinc-500">{formatDownloads(r.weekly)}</span>
            </div>
            <p className="text-[11.5px] text-zinc-400 leading-relaxed line-clamp-2 min-h-[2.6em]">{r.description}</p>
            <div className="mt-2.5 flex items-center justify-between">
              <span className="text-[10px] text-zinc-600">because you {r.reason}</span>
              <button onClick={() => onAdd(r.name, '0.0.0')}
                className="text-[11px] text-[var(--accent)] hover:brightness-125 transition font-medium">
                + Track
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Spotlight ────────────────────────────────────────────────────────────────

function SpotlightSection({ onAdd, trackedNames }: DiscoverProps) {
  const s = SPOTLIGHT;
  const tracked = trackedNames.has(s.name);
  return (
    <section className="mt-14">
      <SectionHeader kicker="Spotlight" title="Worth knowing about" />
      <div className="mt-4 relative rounded-2xl overflow-hidden ring-1 ring-inset ring-white/[0.07] bg-gradient-to-br from-violet-500/[0.08] via-transparent to-transparent">
        <div className="pointer-events-none absolute -top-20 -left-10 w-72 h-72 rounded-full opacity-50 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, oklch(70% 0.19 300), transparent)' }} />
        <div className="relative p-5 sm:p-6 grid sm:grid-cols-[1fr_auto] gap-5 items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-3.5 h-3.5 text-violet-300" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1l1.8 4.2L14 6l-3 3 .7 4.2L8 11l-3.7 2.2.7-4.2L2 6l4.2-.8z" />
              </svg>
              <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-violet-300/90">Featured</span>
            </div>
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <h3 className="font-mono text-[16px] text-zinc-100">{s.name}</h3>
              <span className="font-mono text-[11.5px] text-zinc-500 tabular-nums">v{s.version}</span>
              <span className="text-[10.5px] px-1.5 py-px rounded bg-emerald-500/10 ring-1 ring-inset ring-emerald-400/20 text-emerald-300 font-medium">
                {s.growth}
              </span>
            </div>
            <p className="text-[13px] text-zinc-300 mt-1.5">{s.tagline}</p>
            <p className="text-[12.5px] text-zinc-500 mt-1.5 leading-relaxed max-w-xl">{s.description}</p>
            <div className="mt-3 flex items-center gap-3 text-[11.5px] text-zinc-500">
              <span>by <span className="text-zinc-300 font-mono">{s.by}</span></span>
              <span className="w-px h-3 bg-white/10" />
              <span className="tabular-nums">{formatDownloads(s.weekly)} downloads/wk</span>
            </div>
          </div>
          <div className="shrink-0">
            <button
              onClick={() => !tracked && onAdd(s.name, s.version)}
              disabled={tracked}
              className={`h-10 px-4 rounded-lg text-[13px] font-medium transition
                ${tracked
                  ? 'text-zinc-400 ring-1 ring-inset ring-white/[0.08]'
                  : 'bg-violet-500 text-white hover:brightness-110 shadow-[0_8px_24px_-8px_rgba(167,139,250,0.5)]'}`}
            >
              {tracked ? 'Already tracking' : 'Start tracking'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Categories ───────────────────────────────────────────────────────────────

function CategoriesSection() {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <section className="mt-14">
      <SectionHeader kicker="Browse" title="Categories" />
      <div className="mt-4 flex flex-wrap gap-2">
        {CATEGORIES.map(c => {
          const active = selected === c.id;
          return (
            <button key={c.id}
              onClick={() => setSelected(active ? null : c.id)}
              className={`inline-flex items-center gap-2 h-9 pl-3 pr-3.5 rounded-full ring-1 ring-inset transition-all
                ${active
                  ? 'bg-[var(--accent)]/15 ring-[var(--accent-ring-strong)] text-zinc-100'
                  : 'bg-white/[0.025] ring-white/[0.06] text-zinc-300 hover:ring-white/[0.12] hover:bg-white/[0.04]'}`}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: `oklch(70% 0.16 ${c.hue})` }} />
              <span className="text-[12.5px]">{c.label}</span>
              <span className={`text-[10.5px] tabular-nums ${active ? 'text-zinc-300' : 'text-zinc-500'}`}>
                {c.count}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ─── Activity ─────────────────────────────────────────────────────────────────

function ActivityRail() {
  return (
    <section className="mt-14">
      <SectionHeader kicker="Recent" title="Activity" />
      <ol className="mt-4 relative pl-5">
        <div className="absolute left-[5px] top-1.5 bottom-1.5 w-px bg-gradient-to-b from-white/10 to-transparent" />
        {ACTIVITY.map((a, i) => (
          <li key={i} className="relative py-2.5 flex items-baseline gap-3">
            <span className={`absolute -left-[19px] top-3 w-2.5 h-2.5 rounded-full ring-2 ring-[#0a0a0f]
              ${a.who === 'you' ? 'bg-[var(--accent)]' : 'bg-zinc-500'}`} />
            <div className="flex-1 text-[12.5px] text-zinc-300">
              <span className={a.who === 'you' ? 'text-[var(--accent)] font-medium' : 'text-zinc-400'}>{a.who}</span>
              <span className="text-zinc-500"> {a.action} </span>
              <span className="font-mono text-zinc-100">{a.what}</span>
            </div>
            <span className="text-[11px] text-zinc-600 font-mono tabular-nums">{a.when} ago</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DiscoverPage({ onAdd, trackedNames }: DiscoverProps) {
  return (
    <div>
      <DiscoverHero onAdd={onAdd} trackedNames={trackedNames} />
      <TrendingSection onAdd={onAdd} trackedNames={trackedNames} />
      <CollectionsSection onAdd={onAdd} trackedNames={trackedNames} />
      <RecommendedSection onAdd={onAdd} trackedNames={trackedNames} />
      <SpotlightSection onAdd={onAdd} trackedNames={trackedNames} />
      <CategoriesSection />
      <ActivityRail />
    </div>
  );
}
