'use client';

import { useEffect, useState } from 'react';
import { GitHubRelease, NpmPackageData, OllamaSettings, SubscribedPackage } from '@/lib/types';
import {
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  ExternalLinkIcon,
  LoaderIcon,
  SparkIcon,
  TrashIcon,
} from '@/components/Icons';

interface Props {
  pkg: SubscribedPackage;
  data: NpmPackageData | null;
  loading: boolean;
  onRemove: (name: string) => void;
  onMarkAsSeen: (name: string, version: string) => void;
  ollamaSettings: OllamaSettings;
  lastChecked?: string;
}

export default function PackageCard({
  pkg,
  data,
  loading,
  onRemove,
  onMarkAsSeen,
  ollamaSettings,
  lastChecked,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [releases, setReleases] = useState<GitHubRelease[]>([]);
  const [releasesLoading, setReleasesLoading] = useState(false);
  const [releasesLoaded, setReleasesLoaded] = useState(false);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [summaryLoading, setSummaryLoading] = useState<Record<string, boolean>>({});
  const [summaryError, setSummaryError] = useState<Record<string, string>>({});
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => setNow(Date.now()), 0);
    const clockTimer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(clockTimer);
    };
  }, []);

  const hasUpdate = data != null && data.latestVersion !== pkg.lastSeenVersion;
  const statusLabel = loading ? 'resolving' : hasUpdate ? 'version drift' : data ? 'aligned' : 'queued';
  const latestVersion = data?.latestVersion ?? pkg.lastSeenVersion;

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
      const timer = window.setTimeout(() => {
        if (data.repositoryUrl) void fetchReleases(data.repositoryUrl);
      }, 0);
      return () => window.clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, data?.repositoryUrl]);

  async function handleToggle() {
    const next = !expanded;
    setExpanded(next);
    if (next && !releasesLoaded && data?.repositoryUrl) {
      await fetchReleases(data.repositoryUrl);
    }
  }

  async function handleSummarize(release: GitHubRelease) {
    if (!release.body) return;
    setSummaryLoading(prev => ({ ...prev, [release.tagName]: true }));
    setSummaryError(prev => ({ ...prev, [release.tagName]: '' }));
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          changelog: release.body,
          packageName: pkg.name,
          baseUrl: ollamaSettings.baseUrl,
          model: ollamaSettings.model,
        }),
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

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function formatRelativeTime(iso: string): string {
    const checkedTime = new Date(iso).getTime();
    const diffMs = (now ?? checkedTime) - checkedTime;
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
  }

  return (
    <article
      className={`overflow-hidden rounded-lg border transition ${
        hasUpdate
          ? 'border-red-400/25 bg-red-500/[0.055] shadow-[0_14px_35px_rgba(0,0,0,0.2)]'
          : 'border-white/10 bg-black/20 shadow-[0_14px_35px_rgba(0,0,0,0.16)]'
      }`}
    >
      <div className={`h-px ${hasUpdate ? 'bg-red-300/60' : 'bg-white/10'}`} />

      <div className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-5">
        <button
          type="button"
          onClick={handleToggle}
          aria-expanded={expanded}
          className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-3 text-left"
        >
          <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-black/25 text-zinc-400 transition">
            <ChevronRightIcon className={`h-4 w-4 transition ${expanded ? 'rotate-90 text-zinc-100' : ''}`} />
          </span>

          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="break-all font-mono text-base font-semibold text-zinc-50">{pkg.name}</span>
              <span
                className={`rounded-md border px-2 py-1 font-mono text-xs font-semibold ${
                  hasUpdate
                    ? 'border-red-400/25 bg-red-500/10 text-red-100'
                    : loading
                      ? 'border-amber-200/20 bg-amber-200/10 text-amber-100'
                      : 'border-white/10 bg-white/[0.04] text-zinc-300'
                }`}
              >
                {statusLabel}
              </span>
            </span>

            {data?.description && !expanded && (
              <span className="mt-2 line-clamp-2 block text-sm leading-6 text-zinc-400">
                {data.description}
              </span>
            )}

            <span className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500">
              <span className="font-mono text-zinc-300">latest:{latestVersion}</span>
              {hasUpdate && (
                <span className="font-mono line-through">seen:{pkg.lastSeenVersion}</span>
              )}
              {lastChecked && !loading && (
                <span className="inline-flex items-center gap-1.5">
                  <ClockIcon className="h-3.5 w-3.5" />
                  Checked {formatRelativeTime(lastChecked)}
                </span>
              )}
              {loading && (
                <span className="inline-flex items-center gap-1.5 text-amber-100">
                  <LoaderIcon className="h-3.5 w-3.5 animate-spin" />
                  Reading registry
                </span>
              )}
            </span>
          </span>
        </button>

        <div className="flex items-center justify-end gap-2 sm:items-start">
          {hasUpdate && (
            <button
              type="button"
              onClick={() => onMarkAsSeen(pkg.name, data!.latestVersion)}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-zinc-100 px-3 text-xs font-semibold text-neutral-950 transition hover:bg-white"
            >
              <CheckIcon className="h-4 w-4" />
              Acknowledge
            </button>
          )}
          <button
            type="button"
            onClick={() => onRemove(pkg.name)}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-zinc-500 transition hover:border-red-300/30 hover:bg-red-500/10 hover:text-red-200"
            title="Stop tracking"
            aria-label={`Stop tracking ${pkg.name}`}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/10 px-4 pb-4 sm:px-5 sm:pb-5">
          {data?.description && (
            <p className="pt-4 text-sm leading-6 text-zinc-300">{data.description}</p>
          )}

          <div className="flex flex-wrap gap-2 pt-4">
            {data?.homepage && (
              <a
                href={data.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 text-xs font-medium text-zinc-300 transition hover:border-teal-300/35 hover:text-teal-100"
              >
                home
                <ExternalLinkIcon className="h-3.5 w-3.5" />
              </a>
            )}
            {data?.repositoryUrl && (
              <a
                href={data.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 text-xs font-medium text-zinc-300 transition hover:border-teal-300/35 hover:text-teal-100"
              >
                repo
                <ExternalLinkIcon className="h-3.5 w-3.5" />
              </a>
            )}
            <a
              href={`https://www.npmjs.com/package/${pkg.name}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 text-xs font-medium text-zinc-300 transition hover:border-red-400/30 hover:text-red-100"
            >
              registry
              <ExternalLinkIcon className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="mt-5 border-t border-white/10 pt-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-zinc-100">GitHub releases</h3>
              {releases.length > 0 && (
                <span className="text-xs text-zinc-500">{releases.length} found</span>
              )}
            </div>

            {releasesLoading && (
              <p className="inline-flex items-center gap-2 text-sm text-zinc-400">
                <LoaderIcon className="h-4 w-4 animate-spin" />
                Reading releases
              </p>
            )}

            {!releasesLoading && releasesLoaded && releases.length === 0 && (
              <p className="text-sm text-zinc-500">
                {data?.repositoryUrl
                  ? 'No GitHub releases found for this package.'
                  : 'No repository URL found for this package.'}
              </p>
            )}

            {!releasesLoading && !releasesLoaded && !data?.repositoryUrl && (
              <p className="text-sm text-zinc-500">No repository URL found for this package.</p>
            )}

            {releases.length > 0 && (
              <div className="divide-y divide-white/10 border-y border-white/10">
                {releases.map(release => (
                  <div key={release.tagName} className="py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-semibold text-zinc-100">
                          {release.name || release.tagName}
                        </p>
                        <p className="mt-1 font-mono text-xs text-zinc-500">
                          {release.tagName} - {formatDate(release.publishedAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <a
                          href={release.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/10 px-2.5 text-xs font-medium text-zinc-300 transition hover:border-teal-300/35 hover:text-teal-100"
                        >
                          Open
                          <ExternalLinkIcon className="h-3.5 w-3.5" />
                        </a>
                        {release.body && !summaries[release.tagName] && (
                          <button
                            type="button"
                            onClick={() => handleSummarize(release)}
                            disabled={summaryLoading[release.tagName]}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-teal-300/25 bg-teal-300/10 px-2.5 text-xs font-semibold text-teal-100 transition hover:bg-teal-300/15 disabled:border-white/10 disabled:bg-zinc-800 disabled:text-zinc-500"
                          >
                            <SparkIcon className="h-3.5 w-3.5" />
                            {summaryLoading[release.tagName] ? 'Summarizing' : 'Summarize'}
                          </button>
                        )}
                      </div>
                    </div>

                    {summaryError[release.tagName] && (
                      <p className="mt-3 rounded-md border border-red-300/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                        {summaryError[release.tagName]}
                      </p>
                    )}

                    {summaries[release.tagName] && (
                      <div className="mt-3 border-l-2 border-teal-300/50 bg-teal-300/[0.08] py-3 pl-3 pr-4">
                        <p className="mb-1 text-xs font-semibold text-teal-100">Summary notes</p>
                        <p className="whitespace-pre-line text-sm leading-6 text-zinc-300">
                          {summaries[release.tagName]}
                        </p>
                      </div>
                    )}

                    {release.body && (
                      <pre className="mt-3 max-h-36 overflow-hidden whitespace-pre-wrap font-mono text-xs leading-5 text-zinc-500">
                        {release.body}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
