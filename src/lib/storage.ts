import { SummarySettings, SubscribedPackage } from './types';

const PACKAGES_KEY = 'npm-tracker-packages';
const SETTINGS_KEY = 'npm-tracker-settings';

const DEFAULT_SETTINGS: SummarySettings = {
  claudeApiKey: '',
};

export function getSubscribedPackages(): SubscribedPackage[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(PACKAGES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function savePackages(packages: SubscribedPackage[]): void {
  localStorage.setItem(PACKAGES_KEY, JSON.stringify(packages));
}

export function addPackage(pkg: SubscribedPackage): void {
  const packages = getSubscribedPackages();
  if (!packages.find(p => p.name === pkg.name)) {
    savePackages([...packages, pkg]);
  }
}

export function removePackage(name: string): void {
  savePackages(getSubscribedPackages().filter(p => p.name !== name));
}

export function markAsSeen(name: string, version: string): void {
  savePackages(
    getSubscribedPackages().map(p =>
      p.name === name ? { ...p, lastSeenVersion: version } : p
    )
  );
}

export function getSummarySettings(): SummarySettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? JSON.parse(data) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSummarySettings(settings: SummarySettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
