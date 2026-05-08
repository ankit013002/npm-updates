import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { searchPackages } from '../lib/npm';

interface Result {
  name: string;
  description: string;
  version: string;
}

interface Props {
  visible: boolean;
  subscribedNames: string[];
  onClose: () => void;
  onAdd: (name: string, version: string) => void;
}

export default function SearchModal({ visible, subscribedNames, onClose, onAdd }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setResults([]);
    }
  }, [visible]);

  function handleChangeText(text: string) {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchPackages(text.trim());
        setResults(res);
      } finally {
        setSearching(false);
      }
    }, 350);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Add package</Text>
          <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close">
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            style={styles.input}
            placeholder="Search npm packages…"
            placeholderTextColor="#4b5563"
            value={query}
            onChangeText={handleChangeText}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searching && <ActivityIndicator color="#10b981" style={styles.spinner} />}
        </View>

        <FlatList
          data={results}
          keyExtractor={item => item.name}
          renderItem={({ item }) => {
            const already = subscribedNames.includes(item.name);
            return (
              <Pressable
                onPress={() => !already && onAdd(item.name, item.version)}
                style={[styles.result, already && styles.resultDisabled]}
                disabled={already}
              >
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName}>{item.name}</Text>
                  {item.description ? (
                    <Text style={styles.resultDesc} numberOfLines={1}>{item.description}</Text>
                  ) : null}
                </View>
                <Text style={styles.resultVersion}>
                  {already ? 'added' : `v${item.version}`}
                </Text>
              </Pressable>
            );
          }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  title: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    color: '#6b7280',
    fontSize: 16,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    color: '#f9fafb',
    fontSize: 15,
    paddingVertical: 12,
  },
  spinner: {
    marginLeft: 8,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  resultDisabled: {
    opacity: 0.4,
  },
  resultInfo: {
    flex: 1,
    marginRight: 12,
  },
  resultName: {
    color: '#f9fafb',
    fontSize: 14,
    fontWeight: '500',
  },
  resultDesc: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  resultVersion: {
    color: '#10b981',
    fontSize: 12,
  },
});
