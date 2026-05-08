import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SummarySettings, SubscribedPackage } from './types';

const PACKAGES_KEY = 'npm-tracker-packages';
const SETTINGS_KEY = 'npm-tracker-settings';

const DEFAULT_SETTINGS: SummarySettings = {
  claudeApiKey: '',
};

export async function getSubscribedPackages(): Promise<SubscribedPackage[]> {
  try {
    const data = await AsyncStorage.getItem(PACKAGES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

async function savePackages(packages: SubscribedPackage[]): Promise<void> {
  await AsyncStorage.setItem(PACKAGES_KEY, JSON.stringify(packages));
}

export async function addPackage(pkg: SubscribedPackage): Promise<void> {
  const packages = await getSubscribedPackages();
  if (!packages.find(p => p.name === pkg.name)) {
    await savePackages([...packages, pkg]);
  }
}

export async function removePackage(name: string): Promise<void> {
  const packages = await getSubscribedPackages();
  await savePackages(packages.filter(p => p.name !== name));
}

export async function markAsSeen(name: string, version: string): Promise<void> {
  const packages = await getSubscribedPackages();
  await savePackages(
    packages.map(p => (p.name === name ? { ...p, lastSeenVersion: version } : p))
  );
}

export async function getSummarySettings(): Promise<SummarySettings> {
  try {
    const data = await AsyncStorage.getItem(SETTINGS_KEY);
    return data ? JSON.parse(data) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSummarySettings(settings: SummarySettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
