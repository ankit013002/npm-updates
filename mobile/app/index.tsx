import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, router } from 'expo-router';
import type { NpmPackageData, SubscribedPackage } from '../lib/types';
import {
  addPackage,
  getSubscribedPackages,
  markAsSeen,
  removePackage,
} from '../lib/storage';
import { fetchPackageData } from '../lib/npm';
import PackageRow from '../components/PackageRow';
import SearchModal from '../components/SearchModal';

type PkgDataMap = Record<string, NpmPackageData | null>;
type BoolMap = Record<string, boolean>;

type Section = {
  title: string;
  hasMarkAll: boolean;
  data: SubscribedPackage[];
};

export default function HomeScreen() {
  const [packages, setPackages] = useState<SubscribedPackage[]>([]);
  const [packageData, setPackageData] = useState<PkgDataMap>({});
  const [loading, setLoading] = useState<BoolMap>({});
  const [refreshing, setRefreshing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const genRef = useRef<Record<string, number>>({});

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll(force = false) {
    const pkgs = await getSubscribedPackages();
    setPackages(pkgs);
    pkgs.forEach(p => fetchOne(p.name, force));
  }

  async function fetchOne(name: string, force = false) {
    const gen = (genRef.current[name] = (genRef.current[name] ?? 0) + 1);
    setLoading(prev => ({ ...prev, [name]: true }));
    try {
      const data = await fetchPackageData(name);
      if (genRef.current[name] !== gen) return;
      setPackageData(prev => ({ ...prev, [name]: data }));
    } catch {
      if (genRef.current[name] !== gen) return;
      setPackageData(prev => ({ ...prev, [name]: prev[name] ?? null }));
    } finally {
      if (genRef.current[name] === gen) {
        setLoading(prev => ({ ...prev, [name]: false }));
      }
    }
  }

  async function handleAdd(name: string, version: string) {
    await addPackage({ name, lastSeenVersion: version, addedAt: new Date().toISOString() });
    setShowSearch(false);
    await loadAll();
  }

  async function handleRemove(name: string) {
    await removePackage(name);
    setPackages(prev => prev.filter(p => p.name !== name));
    setPackageData(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  async function handleMarkSeen(name: string, version: string) {
    await markAsSeen(name, version);
    setPackages(prev =>
      prev.map(p => (p.name === name ? { ...p, lastSeenVersion: version } : p))
    );
  }

  const withUpdates = packages.filter(
    p => packageData[p.name] && packageData[p.name]!.latestVersion !== p.lastSeenVersion
  );
  const upToDate = packages.filter(
    p => !packageData[p.name] || packageData[p.name]!.latestVersion === p.lastSeenVersion
  );

  async function handleMarkAllSeen() {
    await Promise.all(
      withUpdates.map(pkg => {
        const latest = packageData[pkg.name]?.latestVersion;
        return latest ? markAsSeen(pkg.name, latest) : Promise.resolve();
      })
    );
    setPackages(prev =>
      prev.map(p => {
        const latest = packageData[p.name]?.latestVersion;
        return latest ? { ...p, lastSeenVersion: latest } : p;
      })
    );
  }

  const sections: Section[] = [
    ...(withUpdates.length > 0
      ? [{ title: `Updates available — ${withUpdates.length}`, hasMarkAll: true, data: withUpdates }]
      : []),
    ...(upToDate.length > 0
      ? [{ title: `Up to date — ${upToDate.length}`, hasMarkAll: false, data: upToDate }]
      : []),
  ];

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll(true);
    setRefreshing(false);
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'npm tracker',
          headerRight: () => (
            <View style={styles.headerBtns}>
              {packages.length > 0 && (
                <Pressable
                  onPress={() => loadAll(true)}
                  style={styles.headerBtn}
                  accessibilityLabel="Refresh"
                >
                  <Text style={styles.headerBtnText}>↻</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => router.push('/settings')}
                style={styles.headerBtn}
                accessibilityLabel="Settings"
              >
                <Text style={styles.headerBtnText}>⚙</Text>
              </Pressable>
            </View>
          ),
        }}
      />

      {packages.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No packages tracked yet</Text>
          <Text style={styles.emptySub}>Tap + to search for an npm package</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.name}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#10b981"
            />
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text
                style={[
                  styles.sectionTitle,
                  section.hasMarkAll ? styles.sectionTitleUpdate : styles.sectionTitleOk,
                ]}
              >
                {section.title}
              </Text>
              {section.hasMarkAll && (
                <Pressable onPress={handleMarkAllSeen} style={styles.markAllBtn}>
                  <Text style={styles.markAllText}>Mark all seen</Text>
                </Pressable>
              )}
            </View>
          )}
          renderItem={({ item }) => (
            <PackageRow
              pkg={item}
              data={packageData[item.name] ?? null}
              loading={loading[item.name] ?? false}
              onRemove={handleRemove}
              onMarkSeen={handleMarkSeen}
              onPress={() => router.push(`/package/${encodeURIComponent(item.name)}`)}
            />
          )}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
        />
      )}

      <Pressable
        onPress={() => setShowSearch(true)}
        style={styles.fab}
        accessibilityLabel="Add package"
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      <SearchModal
        visible={showSearch}
        subscribedNames={packages.map(p => p.name)}
        onClose={() => setShowSearch(false)}
        onAdd={handleAdd}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  headerBtns: {
    flexDirection: 'row',
    gap: 4,
  },
  headerBtn: {
    padding: 6,
  },
  headerBtnText: {
    color: '#9ca3af',
    fontSize: 18,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTitleUpdate: {
    color: '#10b981',
  },
  sectionTitleOk: {
    color: '#4b5563',
  },
  markAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#064e3b',
    borderRadius: 6,
  },
  markAllText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '500',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '600',
  },
  emptySub: {
    color: '#6b7280',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: {
    color: '#fff',
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '300',
  },
});
