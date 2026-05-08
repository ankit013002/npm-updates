import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack } from 'expo-router';
import { getSummarySettings, saveSummarySettings } from '../lib/storage';
import type { SummarySettings } from '../lib/types';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<SummarySettings>({ claudeApiKey: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSummarySettings().then(setSettings);
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await saveSummarySettings(settings);
      Alert.alert('Saved', 'Settings saved.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Settings' }} />

      <Text style={styles.sectionLabel}>Summaries</Text>
      <View style={styles.card}>
        <Text style={styles.label}>
          Claude API key <Text style={styles.labelOptional}>(optional)</Text>
        </Text>
        <TextInput
          style={styles.input}
          value={settings.claudeApiKey}
          onChangeText={text => setSettings({ claudeApiKey: text })}
          placeholder="sk-ant-…"
          placeholderTextColor="#4b5563"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
      </View>

      <Text style={styles.hint}>
        Summaries work out of the box using a built-in extractor — no key needed.
        Add a Claude API key to get richer AI-generated summaries instead.
        Your key is stored only on this device.
      </Text>

      <Pressable onPress={handleSave} style={styles.saveBtn} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Save</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  content: {
    padding: 20,
  },
  sectionLabel: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  label: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 14,
    marginBottom: 4,
  },
  labelOptional: {
    color: '#4b5563',
  },
  input: {
    color: '#f9fafb',
    fontSize: 15,
    paddingVertical: 8,
  },
  hint: {
    color: '#4b5563',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
    marginBottom: 28,
  },
  saveBtn: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
