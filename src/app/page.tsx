'use client';

import { useEffect, useRef, useState } from 'react';
import { NpmPackageData, OllamaSettings, SubscribedPackage } from '@/lib/types';
import {
  addPackage,
  getOllamaSettings,
  getSubscribedPackages,
  markAsSeen,
  removePackage,
  saveOllamaSettings,
} from '@/lib/storage';
import SearchBar from '@/components/SearchBar';
import BulkImport from '@/components/BulkImport';
import PackageCard from '@/components/PackageCard';
import SettingsPanel from '@/components/SettingsPanel';
import DataPortability from '@/components/DataPortability';
import { BoxIcon, CheckIcon, ClockIcon, PackageIcon, RefreshIcon, SettingsIcon } from '@/components/Icons';

function formatRelativeTime(iso: string, currentTime: number | null): string {
  const checkedTime = new Date(iso).getTime();
  const diffMs = (currentTime ?? checkedTime) - checkedTime;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export default function Home() {
  const [packages, setPackages] = useState<SubscribedPackage[]>([]);
  const [packageData, setPackageData] = useState<Record<string, NpmPackageData | null>>({});
  const [loadingPkg, setLoadingPkg] = useState<Record<string, boolean>>({});
  const [ollamaSettings, setOllamaSettings] = useState<OllamaSettings>({
    baseUrl: 'http://localhost:11434',
    model: 'llama3.2',
  });
  const [showSettings, setShowSettings] = useState(false);
  const [lastChecked, setLastChecked] = useState<Record<string, string>>({});
  const [now, setNow] = useState<number | null>(null);
  const fetchGenRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      setPackages(getSubscribedPackages());
      setOllamaSettings(getOllamaSettings());
      setNow(Date.now());
    }, 0);
    const clockTimer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      window.clearTimeout(loadTimer);
      window.clearInterval(clockTimer);
    };
  }, []);

  useEffect(() => {
    packages.forEach(pkg => {
      if (packageData[pkg.name] === undefined && !loadingPkg[pkg.name]) {
        fetchPackage(pkg.name);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packages]);

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
    addPackage({ name, lastSeenVersion: latestVersion, addedAt: new Date().toISOString() });
    setPackages(getSubscribedPackages());
  }

  function handleRemove(name: string) {
    removePackage(name);
    setPackages(getSubscribedPackages());
    setPackageData(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
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
    packages.forEach(pkg => fetchPackage(pkg.name, true));
  }

  function handleSaveSettings(settings: OllamaSettings) {
    saveOllamaSettings(settings);
    setOllamaSettings(settings);
    setShowSettings(false);
  }

  const subscribedNames = packages.map(pkg => pkg.name);
  const loadingCount = packages.filter(pkg => loadingPkg[pkg.name]).length;
  const withUpdates = packages.filter(
    pkg => packageData[pkg.name] && packageData[pkg.name]!.latestVersion !== pkg.lastSeenVersion
  );
  const upToDate = packages.filter(
    pkg => !packageData[pkg.name] || packageData[pkg.name]!.latestVersion === pkg.lastSeenVersion
  );
  const recentChecks = packages
    .filter(pkg => lastChecked[pkg.name])
    .sort((a, b) => new Date(lastChecked[b.name]).getTime() - new Date(lastChecked[a.name]).getTime())
    .slice(0, 3);

  return (
    <div className="relative min-h-screen overflow-hidden bg-neutral-950 text-zinc-100">
      <div className="dashboard-grid pointer-events-none fixed inset-0 z-0" />

      <div className="relative z-10">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-neutral-950/80 backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white shadow-lg shadow-red-950/40">
                <BoxIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-100">npm tracker</p>
                <p className="text-xs text-zinc-500">{packages.length} tracked</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {packages.length > 0 && (
                <button
                  type="button"
                  onClick={handleRefreshAll}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-400 transition hover:border-teal-300/35 hover:text-teal-100"
                  title="Refresh all packages"
                  aria-label="Refresh all packages"
                >
                  <RefreshIcon className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-400 transition hover:border-teal-300/35 hover:text-teal-100"
                title="Summary runtime"
                aria-label="Summary runtime"
              >
                <SettingsIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <section className="min-w-0 space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-zinc-50 sm:text-3xl">
                Registry workspace
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-zinc-400">
                Track npm dist-tags, semver drift, and release notes like a package platform.
              </p>
            </div>

            <SearchBar onAdd={handleAdd} subscribedNames={subscribedNames} />

            <div className="grid gap-4 md:grid-cols-2">
              <BulkImport subscribedNames={subscribedNames} onImport={() => setPackages(getSubscribedPackages())} />
              <DataPortability packages={packages} onImport={() => setPackages(getSubscribedPackages())} />
            </div>

            {packages.length === 0 ? (
              <section className="registry-panel rounded-lg border border-dashed border-white/15 px-6 py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-red-400/20 bg-red-500/10 text-red-100">
                  <PackageIcon className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-base font-semibold text-zinc-100">No registry entries</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                  Query npm and pin a package to this workspace.
                </p>
              </section>
            ) : (
              <div className="space-y-8">
                {withUpdates.length > 0 && (
                  <section>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-semibold text-red-100">Version drift</h2>
                        <p className="mt-1 text-xs text-zinc-500">
                          {withUpdates.length} package{withUpdates.length === 1 ? '' : 's'} moved past the stored version.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleMarkAllSeen}
                        className="inline-flex h-9 items-center gap-2 rounded-md bg-zinc-100 px-3 text-xs font-semibold text-neutral-950 transition hover:bg-white"
                      >
                        <CheckIcon className="h-4 w-4" />
                        Acknowledge all
                      </button>
                    </div>
                    <div className="space-y-3">
                      {withUpdates.map(pkg => (
                        <PackageCard
                          key={pkg.name}
                          pkg={pkg}
                          data={packageData[pkg.name] ?? null}
                          loading={loadingPkg[pkg.name] ?? false}
                          onRemove={handleRemove}
                          onMarkAsSeen={handleMarkAsSeen}
                          ollamaSettings={ollamaSettings}
                          lastChecked={lastChecked[pkg.name]}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {upToDate.length > 0 && (
                  <section>
                    <div className="mb-3">
                      <h2 className="text-sm font-semibold text-zinc-200">Aligned packages</h2>
                      <p className="mt-1 text-xs text-zinc-500">
                        {upToDate.length} package{upToDate.length === 1 ? '' : 's'} at the latest known dist-tag.
                      </p>
                    </div>
                    <div className="space-y-3">
                      {upToDate.map(pkg => (
                        <PackageCard
                          key={pkg.name}
                          pkg={pkg}
                          data={packageData[pkg.name] ?? null}
                          loading={loadingPkg[pkg.name] ?? false}
                          onRemove={handleRemove}
                          onMarkAsSeen={handleMarkAsSeen}
                          ollamaSettings={ollamaSettings}
                          lastChecked={lastChecked[pkg.name]}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </section>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <section className="registry-panel rounded-lg border p-5">
              <h2 className="text-sm font-semibold text-zinc-100">Registry state</h2>
              <div className="mt-4 grid gap-3">
                <div className="flex items-center justify-between rounded-md border border-white/10 bg-black/20 px-3 py-3">
                  <span className="text-sm text-zinc-400">watchlist</span>
                  <span className="text-lg font-semibold text-zinc-50">{packages.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-red-400/20 bg-red-500/10 px-3 py-3">
                  <span className="text-sm text-red-100">drift</span>
                  <span className="text-lg font-semibold text-red-50">{withUpdates.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border border-amber-200/15 bg-amber-200/[0.08] px-3 py-3">
                  <span className="text-sm text-amber-100">resolving</span>
                  <span className="text-lg font-semibold text-amber-50">{loadingCount}</span>
                </div>
              </div>
            </section>

            <section className="registry-panel rounded-lg border p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-zinc-100">Summary runtime</h2>
                  <p className="mt-1 break-all font-mono text-xs text-zinc-500">{ollamaSettings.model}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSettings(true)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 text-zinc-400 transition hover:border-teal-300/35 hover:text-teal-100"
                  aria-label="Open summary runtime settings"
                >
                  <SettingsIcon className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-3 break-all text-xs leading-5 text-zinc-500">{ollamaSettings.baseUrl}</p>
            </section>

            <section className="registry-panel rounded-lg border p-5">
              <div className="mb-4 flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-zinc-400" />
                <h2 className="text-sm font-semibold text-zinc-100">Registry reads</h2>
              </div>
              {recentChecks.length === 0 ? (
                <p className="text-sm text-zinc-500">No reads in this session.</p>
              ) : (
                <div className="space-y-3">
                  {recentChecks.map(pkg => (
                    <div key={pkg.name} className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-200">{pkg.name}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {formatRelativeTime(lastChecked[pkg.name], now)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </main>
      </div>

      {showSettings && (
        <SettingsPanel
          settings={ollamaSettings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
