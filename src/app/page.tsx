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
  const fetchGenRef = useRef<Record<string, number>>({});

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

  const withUpdates = packages.filter(
    p => packageData[p.name] && packageData[p.name]!.latestVersion !== p.lastSeenVersion
  );
  const upToDate = packages.filter(
    p => !packageData[p.name] || packageData[p.name]!.latestVersion === p.lastSeenVersion
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-950/90 backdrop-blur-sm px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold tracking-tight">npm tracker</h1>
            <p className="text-xs text-gray-500 mt-0.5">Track node package updates</p>
          </div>
          <div className="flex items-center gap-1">
          {packages.length > 0 && (
            <button
              onClick={handleRefreshAll}
              className="p-2 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-md transition-colors"
              title="Refresh all packages"
              aria-label="Refresh all packages"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          )}
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-md transition-colors"
            title="AI settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <SearchBar onAdd={handleAdd} subscribedNames={packages.map(p => p.name)} />
        <BulkImport subscribedNames={packages.map(p => p.name)} onImport={() => setPackages(getSubscribedPackages())} />
        <DataPortability packages={packages} onImport={() => setPackages(getSubscribedPackages())} />

        {packages.length === 0 ? (
          <div className="mt-24 text-center text-gray-600">
            <p className="text-base">No packages tracked yet</p>
            <p className="text-sm mt-1">Search for an npm package above to get started</p>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {withUpdates.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-emerald-500">
                    Updates available — {withUpdates.length}
                  </p>
                  <button
                    onClick={handleMarkAllSeen}
                    className="text-xs px-2.5 py-1 rounded-md bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-400 transition-colors"
                  >
                    Mark all seen
                  </button>
                </div>
                <div className="space-y-2">
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
                <p className="text-xs font-medium uppercase tracking-wider text-gray-600 mb-3">
                  Up to date — {upToDate.length}
                </p>
                <div className="space-y-2">
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
      </main>

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
