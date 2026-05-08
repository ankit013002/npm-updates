import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { fetchPackageData, fetchReleases } from '../../lib/npm';
import { getSubscribedPackages, getSummarySettings, markAsSeen } from '../../lib/storage';
import { generateSummary } from '../../lib/summarize';
import type { GitHubRelease, NpmPackageData, SubscribedPackage } from '../../lib/types';

export default function PackageDetailScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const decodedName = decodeURIComponent(name);

  const [data, setData] = useState<NpmPackageData | null>(null);
  const [releases, setReleases] = useState<GitHubRelease[]>([]);
  const [sub, setSub] = useState<SubscribedPackage | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingReleases, setLoadingReleases] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [summaryLoading, setSummaryLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    load();
  }, [decodedName]);

  async function load() {
    setLoadingData(true);
    setError(null);
    try {
      const [pkgData, pkgs] = await Promise.all([
        fetchPackageData(decodedName),
        getSubscribedPackages(),
      ]);
      setData(pkgData);
      setSub(pkgs.find(p => p.name === decodedName) ?? null);
      if (pkgData.repositoryUrl) {
        setLoadingReleases(true);
        fetchReleases(pkgData.repositoryUrl)
          .then(setReleases)
          .finally(() => setLoadingReleases(false));
      }
    } catch {
      setError('Failed to load package data.');
    } finally {
      setLoadingData(false);
    }
  }

  async function handleSummarize(release: GitHubRelease) {
    if (!release.body || summaryLoading[release.tagName]) return;
    setSummaryLoading(prev => ({ ...prev, [release.tagName]: true }));
    try {
      const { claudeApiKey } = await getSummarySettings();
      const summary = await generateSummary(release.body, decodedName, claudeApiKey);
      setSummaries(prev => ({ ...prev, [release.tagName]: summary }));
    } finally {
      setSummaryLoading(prev => ({ ...prev, [release.tagName]: false }));
    }
  }

  async function handleMarkSeen(version: string) {
    await markAsSeen(decodedName, version);
    setSub(prev => (prev ? { ...prev, lastSeenVersion: version } : prev));
  }

  const hasUpdate = data && sub && data.latestVersion !== sub.lastSeenVersion;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: decodedName }} />

      {loadingData ? (
        <ActivityIndicator color="#10b981" style={styles.spinner} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : data ? (
        <>
          {/* Package info */}
          <View style={styles.card}>
            <Text style={styles.pkgName}>{data.name}</Text>
            {data.description ? (
              <Text style={styles.pkgDesc}>{data.description}</Text>
            ) : null}

            <View style={styles.versionRow}>
              <View style={styles.versionBadge}>
                <Text style={styles.versionLabel}>Latest</Text>
                <Text style={styles.versionValue}>{data.latestVersion}</Text>
              </View>
              {sub && (
                <View style={styles.versionBadge}>
                  <Text style={styles.versionLabel}>Last seen</Text>
                  <Text
                    style={[
                      styles.versionValue,
                      hasUpdate && styles.versionValueOld,
                    ]}
                  >
                    {sub.lastSeenVersion}
                  </Text>
                </View>
              )}
            </View>

            {hasUpdate && (
              <Pressable
                onPress={() => handleMarkSeen(data.latestVersion)}
                style={styles.markSeenBtn}
              >
                <Text style={styles.markSeenText}>
                  Mark {data.latestVersion} as seen
                </Text>
              </Pressable>
            )}
          </View>

          {/* Links */}
          {(data.homepage || data.repositoryUrl) && (
            <View style={styles.linkRow}>
              {data.homepage && (
                <Pressable
                  onPress={() => Linking.openURL(data.homepage!)}
                  style={styles.linkBtn}
                >
                  <Text style={styles.linkBtnText}>Homepage ↗</Text>
                </Pressable>
              )}
              {data.repositoryUrl && (
                <Pressable
                  onPress={() => {
                    const m = data.repositoryUrl!.match(/github\.com\/[^/]+\/[^/#.]+/);
                    if (m) Linking.openURL(`https://${m[0]}`);
                  }}
                  style={styles.linkBtn}
                >
                  <Text style={styles.linkBtnText}>GitHub ↗</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Releases */}
          <Text style={styles.releasesHeading}>Recent releases</Text>
          {loadingReleases ? (
            <ActivityIndicator color="#10b981" />
          ) : releases.length === 0 ? (
            <Text style={styles.noReleases}>No GitHub releases found.</Text>
          ) : (
            releases.map(r => (
              <View key={r.tagName} style={styles.release}>
                <View style={styles.releaseHeader}>
                  <Text style={styles.releaseTag}>{r.tagName}</Text>
                  <Text style={styles.releaseDate}>
                    {new Date(r.publishedAt).toLocaleDateString()}
                  </Text>
                </View>
                {r.name && r.name !== r.tagName && (
                  <Text style={styles.releaseName}>{r.name}</Text>
                )}
                {r.body ? (
                  <Text style={styles.releaseBody} numberOfLines={6}>
                    {r.body.trim()}
                  </Text>
                ) : null}
                <View style={styles.releaseFooter}>
                  <Pressable onPress={() => Linking.openURL(r.url)} style={styles.releaseLink}>
                    <Text style={styles.releaseLinkText}>View on GitHub ↗</Text>
                  </Pressable>
                  {r.body && !summaries[r.tagName] && (
                    <Pressable
                      onPress={() => handleSummarize(r)}
                      disabled={summaryLoading[r.tagName]}
                      style={[styles.summarizeBtn, summaryLoading[r.tagName] && styles.summarizeBtnDisabled]}
                    >
                      <Text style={styles.summarizeBtnText}>
                        {summaryLoading[r.tagName] ? 'Summarizing…' : 'Summarize'}
                      </Text>
                    </Pressable>
                  )}
                </View>
                {summaries[r.tagName] ? (
                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryLabel}>Summary</Text>
                    <Text style={styles.summaryText}>{summaries[r.tagName]}</Text>
                  </View>
                ) : null}
              </View>
            ))
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  content: {
    padding: 16,
    paddingBottom: 48,
  },
  spinner: {
    marginTop: 40,
  },
  error: {
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 40,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  pkgName: {
    color: '#f9fafb',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  pkgDesc: {
    color: '#9ca3af',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  versionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  versionBadge: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
  },
  versionLabel: {
    color: '#6b7280',
    fontSize: 11,
    marginBottom: 2,
  },
  versionValue: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
  versionValueOld: {
    color: '#ef4444',
  },
  markSeenBtn: {
    backgroundColor: '#064e3b',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  markSeenText: {
    color: '#10b981',
    fontWeight: '600',
    fontSize: 14,
  },
  linkRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  linkBtn: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  linkBtnText: {
    color: '#6b7280',
    fontSize: 13,
  },
  releasesHeading: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  noReleases: {
    color: '#4b5563',
    fontSize: 13,
  },
  release: {
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  releaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  releaseTag: {
    color: '#10b981',
    fontWeight: '600',
    fontSize: 13,
  },
  releaseDate: {
    color: '#4b5563',
    fontSize: 12,
  },
  releaseName: {
    color: '#d1d5db',
    fontSize: 13,
    marginBottom: 6,
  },
  releaseBody: {
    color: '#6b7280',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  releaseFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  releaseLink: {},
  releaseLinkText: {
    color: '#4b5563',
    fontSize: 12,
  },
  summarizeBtn: {
    backgroundColor: '#1e1b4b',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  summarizeBtnDisabled: {
    opacity: 0.5,
  },
  summarizeBtnText: {
    color: '#a5b4fc',
    fontSize: 12,
  },
  summaryBox: {
    backgroundColor: '#1e1b4b',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  summaryLabel: {
    color: '#818cf8',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryText: {
    color: '#c7d2fe',
    fontSize: 13,
    lineHeight: 20,
  },
});
