import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NpmPackageData, SubscribedPackage } from '../lib/types';

interface Props {
  pkg: SubscribedPackage;
  data: NpmPackageData | null;
  loading: boolean;
  onRemove: (name: string) => void;
  onMarkSeen: (name: string, version: string) => void;
  onPress?: () => void;
}

export default function PackageRow({ pkg, data, loading, onRemove, onMarkSeen, onPress }: Props) {
  const hasUpdate = data && data.latestVersion !== pkg.lastSeenVersion;

  return (
    <Pressable onPress={onPress} style={[styles.row, hasUpdate && styles.rowUpdate]}>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{pkg.name}</Text>
        {loading ? (
          <Text style={styles.meta}>Checking…</Text>
        ) : data ? (
          hasUpdate ? (
            <Text style={styles.metaUpdate}>
              {pkg.lastSeenVersion} → {data.latestVersion}
            </Text>
          ) : (
            <Text style={styles.meta}>v{data.latestVersion}</Text>
          )
        ) : (
          <Text style={styles.metaError}>Failed to load</Text>
        )}
      </View>

      <View style={styles.actions}>
        {hasUpdate && data && (
          <Pressable
            onPress={() => onMarkSeen(pkg.name, data.latestVersion)}
            style={styles.seenBtn}
            accessibilityLabel={`Mark ${pkg.name} as seen`}
          >
            <Text style={styles.seenBtnText}>Mark seen</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => onRemove(pkg.name)}
          style={styles.removeBtn}
          accessibilityLabel={`Remove ${pkg.name}`}
        >
          <Text style={styles.removeBtnText}>✕</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
  },
  rowUpdate: {
    borderWidth: 1,
    borderColor: '#065f46',
  },
  info: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    color: '#f9fafb',
    fontSize: 14,
    fontWeight: '500',
  },
  meta: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  metaUpdate: {
    color: '#10b981',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  metaError: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  seenBtn: {
    backgroundColor: '#064e3b',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  seenBtnText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '500',
  },
  removeBtn: {
    padding: 4,
  },
  removeBtnText: {
    color: '#4b5563',
    fontSize: 14,
  },
});
