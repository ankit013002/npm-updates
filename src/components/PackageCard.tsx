'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GitHubRelease, NpmPackageData, OllamaSettings, SubscribedPackage } from '@/lib/types';

interface Props {
  pkg: SubscribedPackage;
  data: NpmPackageData | null;
  loading: boolean;
  onRemove: (name: string) => void;
  onMarkAsSeen: (name: string, version: string) => void;
  ollamaSettings: OllamaSettings;
  lastChecked?: string;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function versionDiffIndex(from: string, to: string): number {
  const a = from.split('.');
  const b = to.split('.');
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return i;
  return 2;
}

function bumpType(from: string, to: string): 'major' | 'minor' | 'patch' {
  const idx = versionDiffIndex(from, to);
  return idx === 0 ? 'major' : idx === 1 ? 'minor' : 'patch';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function VersionDiff({ from, to }: { from: string; to: string }) {
  const idx = versionDiffIndex(from, to);
  const fromParts = from.split('.');
  const toParts = to.split('.');
  return (
    <span className="font-mono text-[13px] tracking-tight tabular-nums">
      <span className="text-zinc-500">
        {fromParts.map((p, i) => (
          <span key={i} className={i === idx ? 'text-zinc-400' : ''}>
            {p}{i < fromParts.length - 1 ? '.' : ''}
          </span>
        ))}
      </span>
      <span className="mx-1.5 text-zinc-600">→</span>
      <span className="text-zinc-200">
        {toParts.map((p, i) => (
          <span key={i} className={i === idx ? 'text-emerald-300 font-semibold' : ''}
            style={i === idx ? { textShadow: '0 0 14px rgba(52,211,153,.45)' } : undefined}>
            {p}{i < toParts.length - 1 ? '.' : ''}
          </span>
        ))}
      </span>
    </span>
  );
}

function BumpTag({ bump }: { bump: 'major' | 'minor' | 'patch' }) {
  const tone =
    bump === 'major' ? 'text-amber-300/90 bg-amber-500/10 ring-amber-400/20' :
    bump === 'minor' ? 'text-emerald-300/90 bg-emerald-500/10 ring-emerald-400/20' :
                      'text-zinc-300/90 bg-white/5 ring-white/10';
  return (
    <span className={`px-1.5 py-px text-[10px] font-medium uppercase tracking-wider rounded ring-1 ring-inset ${tone}`}>
      {bump}
    </span>
  );
}

function PulseDot() {
  return (
    <span className="relative inline-flex w-2 h-2">
      <span className="absolute inset-0 rounded-full bg-emerald-400/80 animate-pulse-ping" />
      <span className="relative w-2 h-2 rounded-full bg-emerald-400" />
    </span>
  );
}

function ExpandRegion({ open, children }: { open: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [h, setH] = useState<number | 'auto'>(open ? 'auto' : 0);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const inner = ref.current.firstElementChild as HTMLElement | null;
    if (!inner) return;
    if (open) {
      const target = inner.scrollHeight;
      setH(target);
      const t = setTimeout(() => setH('auto'), 220);
      return () => clearTimeout(t);
    } else {
      setH(inner.scrollHeight);
      requestAnimationFrame(() => setH(0));
    }
  }, [open]);

  return (
    <div ref={ref} style={{ height: typeof h === 'number' ? `${h}px` : h, transition: 'height 220ms cubic-bezier(0.4,0,0.2,1)', overflow: 'hidden' }}>
      <div className={open ? 'opacity-100' : 'opacity-0'} style={{ transition: 'opacity 180ms ease 40ms' }}>
        {children}
      </div>
    </div>
  );
}

// ─── Release timeline ─────────────────────────────────────────────────────────

function ReleaseRow({ release, onSummarize, summary, summaryLoading, summaryError }:
  { release: GitHubRelease; onSummarize: () => void; summary?: string; summaryLoading: boolean; summaryError?: string }) {
  return (
    <li className="relative">
      <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-400/90 shadow-[0_0_10px_rgba(52,211,153,0.45)] ring-2 ring-[#0a0a0f]" />
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="font-mono text-[12.5px] text-zinc-100">{release.name || release.tagName}</span>
        <span className="text-[11px] text-zinc-500">{formatDate(release.publishedAt)}</span>
        <div className="ml-auto flex items-center gap-1">
          <a href={release.url} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 h-6 px-2 rounded text-[11px] text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]">
            View ↗
          </a>
          {release.body && !summary && (
            <button onClick={onSummarize} disabled={summaryLoading}
              className="group inline-flex items-center gap-1.5 h-6 px-2 rounded text-[11px] text-violet-300 hover:bg-violet-500/10 transition-colors relative overflow-hidden disabled:opacity-50">
              <svg className={`w-3 h-3 ${summaryLoading ? 'animate-spin-slow' : ''}`} viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1l1.8 4.2L14 6l-3 3 .7 4.2L8 11l-3.7 2.2.7-4.2L2 6l4.2-.8z" />
              </svg>
              <span>{summaryLoading ? 'Summarizing…' : '✦ AI Summary'}</span>
            </button>
          )}
        </div>
      </div>

      {summaryError && <p className="mt-1.5 text-[12px] text-red-400">{summaryError}</p>}

      {summary && (
        <div className="mt-2 relative rounded-lg overflow-hidden">
          <div className="absolute inset-0 bg-violet-500/[0.06] backdrop-blur-sm" />
          <div className="relative p-3 ring-1 ring-inset ring-violet-400/15 rounded-lg bg-gradient-to-br from-violet-500/[0.04] to-transparent">
            <div className="flex items-center gap-1.5 mb-1.5">
              <svg className="w-3 h-3 text-violet-300" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1l1.8 4.2L14 6l-3 3 .7 4.2L8 11l-3.7 2.2.7-4.2L2 6l4.2-.8z" />
              </svg>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300/90">AI Summary</span>
            </div>
            <p className="text-[12.5px] leading-relaxed text-violet-100/90 whitespace-pre-line">{summary}</p>
          </div>
        </div>
      )}

      {release.body && (
        <pre className="mt-2.5 text-[12px] leading-[1.55] text-zinc-400 whitespace-pre-wrap font-sans line-clamp-6 max-w-2xl">
          {release.body}
        </pre>
      )}
    </li>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

export default function PackageCard({ pkg, data, loading, onRemove, onMarkAsSeen, ollamaSettings, lastChecked }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [releases, setReleases] = useState<GitHubRelease[]>([]);
  const [releasesLoading, setReleasesLoading] = useState(false);
  const [releasesLoaded, setReleasesLoaded] = useState(false);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [summaryLoading, setSummaryLoading] = useState<Record<string, boolean>>({});
  const [summaryError, setSummaryError] = useState<Record<string, string>>({});
  const [marking, setMarking] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const hasUpdate = data != null && data.latestVersion !== pkg.lastSeenVersion;
  const bump = hasUpdate ? bumpType(pkg.lastSeenVersion, data!.latestVersion) : null;

  async function fetchReleases(repoUrl: string) {
    setReleasesLoading(true);
    try {
      const res = await fetch(`/api/changelog?repoUrl=${encodeURIComponent(repoUrl)}`);
      const json = await res.json();
      setReleases(json.releases ?? []);
    } catch {
      setReleases([]);
    } finally {
      setReleasesLoading(false);
      setReleasesLoaded(true);
    }
  }

  useEffect(() => {
    if (expanded && !releasesLoaded && !releasesLoading && data?.repositoryUrl) {
      fetchReleases(data.repositoryUrl);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, data?.repositoryUrl]);

  function handleToggle() {
    const next = !expanded;
    setExpanded(next);
    if (next && !releasesLoaded && data?.repositoryUrl) {
      fetchReleases(data.repositoryUrl);
    }
  }

  function handleMark(e: React.MouseEvent) {
    e.stopPropagation();
    setMarking(true);
    setTimeout(() => {
      onMarkAsSeen(pkg.name, data!.latestVersion);
      setMarking(false);
    }, 600);
  }

  async function handleSummarize(release: GitHubRelease) {
    if (!release.body) return;
    setSummaryLoading(prev => ({ ...prev, [release.tagName]: true }));
    setSummaryError(prev => ({ ...prev, [release.tagName]: '' }));
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changelog: release.body, packageName: pkg.name, baseUrl: ollamaSettings.baseUrl, model: ollamaSettings.model }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSummaryError(prev => ({ ...prev, [release.tagName]: json.error ?? 'Failed' }));
      } else {
        setSummaries(prev => ({ ...prev, [release.tagName]: json.summary }));
      }
    } catch {
      setSummaryError(prev => ({ ...prev, [release.tagName]: 'Could not reach Ollama' }));
    } finally {
      setSummaryLoading(prev => ({ ...prev, [release.tagName]: false }));
    }
  }

  return (
    <div
      onClick={handleToggle}
      className={`group relative rounded-xl cursor-pointer transition-all duration-200
        ${hasUpdate
          ? 'bg-emerald-950/25 ring-1 ring-inset ring-emerald-500/[0.08] hover:ring-emerald-500/20 hover:-translate-y-px hover:shadow-[0_8px_24px_-8px_rgba(16,185,129,0.15)]'
          : 'bg-white/[0.015] ring-1 ring-inset ring-white/[0.05] hover:ring-white/[0.09] hover:bg-white/[0.025]'}
        ${marking ? 'opacity-60' : ''}`}
      style={{ transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
    >
      {/* left accent stripe for updates */}
      {hasUpdate && (
        <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-emerald-400/80 shadow-[0_0_12px_rgba(52,211,153,0.5)]" />
      )}

      <div className="flex items-start gap-3 px-4 py-3.5 pl-5">
        {/* chevron */}
        <button
          aria-label={expanded ? 'Collapse' : 'Expand'}
          className="shrink-0 mt-1 w-5 h-5 grid place-items-center rounded text-zinc-500 hover:text-zinc-200"
          onClick={e => { e.stopPropagation(); handleToggle(); }}
        >
          <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className={`font-mono text-[14px] font-medium ${hasUpdate ? 'text-zinc-100' : 'text-zinc-300'}`}>
              {pkg.name}
            </span>

            {loading && <span className="text-[11px] text-zinc-600">loading…</span>}

            {!loading && hasUpdate && data && (
              <>
                <VersionDiff from={pkg.lastSeenVersion} to={data.latestVersion} />
                <BumpTag bump={bump!} />
                <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-300/90">
                  <PulseDot />
                  <span className="uppercase tracking-wider">live</span>
                </span>
              </>
            )}

            {!loading && !hasUpdate && data && (
              <>
                <span className="font-mono text-[12px] text-zinc-500 tabular-nums">v{data.latestVersion}</span>
                <span className="text-[11px] text-zinc-600">· current</span>
              </>
            )}
          </div>

          {!expanded && data?.description && (
            <p className={`mt-1.5 text-[12.5px] leading-relaxed truncate ${hasUpdate ? 'text-zinc-400' : 'text-zinc-500'}`}>
              {data.description}
            </p>
          )}
        </div>

        {/* right rail */}
        <div className="shrink-0 flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {lastChecked && !loading && (
            <span className="hidden md:inline-flex items-center font-mono text-[10.5px] text-zinc-600 tabular-nums mr-1">
              {formatRelativeTime(lastChecked)}
            </span>
          )}
          {hasUpdate && data && (
            <button
              onClick={handleMark}
              disabled={marking}
              className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] transition-all
                ${marking ? 'text-zinc-500 bg-white/[0.04]' : 'text-emerald-300 hover:bg-emerald-500/10'}`}
            >
              {marking ? (
                <>
                  <svg className="w-3.5 h-3.5 text-emerald-300 animate-check-pop" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Seen</span>
                </>
              ) : (
                <span>Mark seen</span>
              )}
            </button>
          )}
          <button
            onClick={() => onRemove(pkg.name)}
            aria-label="Remove"
            className="w-7 h-7 grid place-items-center rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.04]"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* expanded body */}
      <ExpandRegion open={expanded}>
        <div className="px-5 pb-5 pt-1 pl-12">
          {data?.description && (
            <p className="text-[13px] text-zinc-400 leading-relaxed max-w-2xl">{data.description}</p>
          )}

          <div className="mt-3 flex items-center gap-1 flex-wrap">
            {data?.homepage && (
              <a href={data.homepage} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                className="group inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] transition-colors">
                <svg className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span className="font-mono text-[11.5px]">Homepage</span>
                <span className="text-[10px] text-zinc-600">↗</span>
              </a>
            )}
            {data?.repositoryUrl && (
              <a href={data.repositoryUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                className="group inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] transition-colors">
                <svg className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span className="font-mono text-[11.5px]">GitHub</span>
                <span className="text-[10px] text-zinc-600">↗</span>
              </a>
            )}
            <a href={`https://www.npmjs.com/package/${pkg.name}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
              className="group inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] transition-colors">
              <svg className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" viewBox="0 0 24 24" fill="currentColor">
                <path d="M0 0v24h24V0H0zm6.672 19.992H4.008V8.016H6.672v11.976zm7.992 0h-2.664V8.016h2.664v8.652h2.664V8.016h2.664v11.976h-5.328z"/>
              </svg>
              <span className="font-mono text-[11.5px]">npm</span>
              <span className="text-[10px] text-zinc-600">↗</span>
            </a>
          </div>

          {/* Releases */}
          <div className="mt-5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 mb-3">
              Recent releases
            </div>

            {releasesLoading && (
              <p className="text-[13px] text-zinc-500">Loading releases…</p>
            )}

            {!releasesLoading && releasesLoaded && releases.length === 0 && (
              <p className="text-[13px] text-zinc-500">
                {data?.repositoryUrl ? 'No GitHub releases found' : 'No repository URL — cannot fetch releases'}
              </p>
            )}

            {!releasesLoading && !releasesLoaded && !data?.repositoryUrl && (
              <p className="text-[13px] text-zinc-500">No repository URL — cannot fetch releases</p>
            )}

            {releases.length > 0 && (
              <div className="relative pl-5">
                <div className="absolute left-[5px] top-1.5 bottom-1.5 w-px bg-gradient-to-b from-white/10 via-white/[0.06] to-transparent" />
                <ol className="space-y-5">
                  {releases.map(release => (
                    <ReleaseRow
                      key={release.tagName}
                      release={release}
                      onSummarize={() => handleSummarize(release)}
                      summary={summaries[release.tagName]}
                      summaryLoading={summaryLoading[release.tagName] ?? false}
                      summaryError={summaryError[release.tagName]}
                    />
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      </ExpandRegion>
    </div>
  );
}
