'use client';

import { useEffect, useState } from 'react';
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
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const hasUpdate = data != null && data.latestVersion !== pkg.lastSeenVersion;

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

  // If the card is already expanded when metadata arrives, kick off the release fetch.
  useEffect(() => {
    if (expanded && !releasesLoaded && !releasesLoading && data?.repositoryUrl) {
      fetchReleases(data.repositoryUrl);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, data?.repositoryUrl]);

  async function handleToggle() {
    const next = !expanded;
    setExpanded(next);
    if (next && !releasesLoaded && data?.repositoryUrl) {
      fetchReleases(data.repositoryUrl);
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
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
  }

  return (
    <div
      className={`rounded-lg border overflow-hidden transition-colors ${
        hasUpdate ? 'border-emerald-800 bg-emerald-950/20' : 'border-gray-800 bg-gray-900/40'
      }`}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={handleToggle}
          className="flex items-center gap-3 flex-1 text-left min-w-0"
        >
          <svg
            className={`w-3.5 h-3.5 text-gray-500 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>

          <span className="font-medium text-gray-100 truncate">{pkg.name}</span>

          {loading ? (
            <span className="text-xs text-gray-600 shrink-0">loading…</span>
          ) : data ? (
            <div className="flex items-center gap-1.5 shrink-0">
              {hasUpdate && (
                <span className="text-xs text-gray-500 line-through">v{pkg.lastSeenVersion}</span>
              )}
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  hasUpdate
                    ? 'bg-emerald-900/60 text-emerald-300'
                    : 'bg-gray-800 text-gray-400'
                }`}
              >
                v{data.latestVersion}
              </span>
              {hasUpdate && (
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
                  new
                </span>
              )}
            </div>
          ) : null}

          {lastChecked && !loading && (
            <span className="hidden sm:block text-xs text-gray-600 shrink-0">
              Checked {formatRelativeTime(lastChecked)}
            </span>
          )}

          {data?.description && !expanded && (
            <span className="hidden sm:block text-sm text-gray-500 truncate max-w-xs">
              {data.description}
            </span>
          )}
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          {hasUpdate && (
            <button
              onClick={() => onMarkAsSeen(pkg.name, data!.latestVersion)}
              className="text-xs px-2.5 py-1 rounded-md bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-400 transition-colors"
            >
              Mark seen
            </button>
          )}
          <button
            onClick={() => onRemove(pkg.name)}
            className="p-1.5 text-gray-600 hover:text-gray-400 transition-colors"
            title="Stop tracking"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t border-gray-800 px-4 py-4 space-y-4">
          {data?.description && (
            <p className="text-sm text-gray-400">{data.description}</p>
          )}

          <div className="flex gap-4 text-xs">
            {data?.homepage && (
              <a
                href={data.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                Homepage ↗
              </a>
            )}
            {data?.repositoryUrl && (
              <a
                href={data.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                GitHub ↗
              </a>
            )}
            <a
              href={`https://www.npmjs.com/package/${pkg.name}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              npm ↗
            </a>
          </div>

          {/* Releases */}
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-3">
              Recent Releases
            </h4>

            {releasesLoading && (
              <p className="text-sm text-gray-500">Loading releases…</p>
            )}

            {!releasesLoading && releasesLoaded && releases.length === 0 && (
              <p className="text-sm text-gray-500">
                {data?.repositoryUrl
                  ? 'No GitHub releases found for this package'
                  : 'No repository URL — cannot fetch releases'}
              </p>
            )}

            {!releasesLoading && !releasesLoaded && !data?.repositoryUrl && (
              <p className="text-sm text-gray-500">No repository URL — cannot fetch releases</p>
            )}

            {releases.length > 0 && (
              <div className="space-y-3">
                {releases.map(release => (
                  <div
                    key={release.tagName}
                    className="border border-gray-800 rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-sm text-gray-200 truncate">
                          {release.name || release.tagName}
                        </span>
                        <span className="text-xs text-gray-500 shrink-0">
                          {formatDate(release.publishedAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={release.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:underline"
                        >
                          View ↗
                        </a>
                        {release.body && !summaries[release.tagName] && (
                          <button
                            onClick={() => handleSummarize(release)}
                            disabled={summaryLoading[release.tagName]}
                            className="text-xs px-2 py-1 rounded-md bg-violet-900/40 hover:bg-violet-800/60 text-violet-400 transition-colors disabled:opacity-50"
                          >
                            {summaryLoading[release.tagName] ? 'Summarizing…' : '✦ AI Summary'}
                          </button>
                        )}
                      </div>
                    </div>

                    {summaryError[release.tagName] && (
                      <p className="text-xs text-red-400">{summaryError[release.tagName]}</p>
                    )}

                    {summaries[release.tagName] && (
                      <div className="p-3 rounded-md bg-violet-950/30 border border-violet-900/40">
                        <p className="text-xs font-medium text-violet-400 mb-1.5">AI Summary</p>
                        <p className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">
                          {summaries[release.tagName]}
                        </p>
                      </div>
                    )}

                    {release.body && (
                      <pre className="text-xs text-gray-500 font-mono whitespace-pre-wrap line-clamp-6 leading-relaxed overflow-hidden">
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
    </div>
  );
}
