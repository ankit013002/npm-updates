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
import { getOllamaSettings, saveOllamaSettings } from '../lib/storage';
import type { OllamaSettings } from '../lib/types';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<OllamaSettings>({
    baseUrl: 'http://localhost:11434',
    model: 'llama3.2',
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    getOllamaSettings().then(setSettings);
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await saveOllamaSettings(settings);
      Alert.alert('Saved', 'Settings saved.');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    try {
      const res = await fetch(`${settings.baseUrl.replace(/\/$/, '')}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const json = await res.json();
        const models: string[] = (json.models ?? []).map((m: { name: string }) => m.name);
        Alert.alert(
          'Connected',
          models.length > 0
            ? `Available models:\n${models.join('\n')}`
            : 'No models found — try pulling one with `ollama pull llama3.2`.'
        );
      } else {
        Alert.alert('Error', `Ollama returned HTTP ${res.status}`);
      }
    } catch {
      Alert.alert(
        'Connection failed',
        'Could not reach Ollama.\n\nOn a physical device, replace localhost with your computer\'s local IP (e.g. 192.168.1.x).'
      );
    } finally {
      setTesting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Settings' }} />

      <Text style={styles.sectionLabel}>Ollama</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Base URL</Text>
        <TextInput
          style={styles.input}
          value={settings.baseUrl}
          onChangeText={text => setSettings(s => ({ ...s, baseUrl: text }))}
          placeholder="http://localhost:11434"
          placeholderTextColor="#4b5563"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

        <View style={styles.divider} />

        <Text style={styles.label}>Model</Text>
        <TextInput
          style={styles.input}
          value={settings.model}
          onChangeText={text => setSettings(s => ({ ...s, model: text }))}
          placeholder="llama3.2"
          placeholderTextColor="#4b5563"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <Text style={styles.hint}>
        On a physical device or emulator, replace {'"localhost"'} with your computer{'’'}s
        local IP address so the device can reach Ollama.
      </Text>

      <View style={styles.btnRow}>
        <Pressable onPress={handleTest} style={[styles.btn, styles.btnSecondary]} disabled={testing}>
          {testing ? (
            <ActivityIndicator color="#10b981" />
          ) : (
            <Text style={styles.btnSecondaryText}>Test connection</Text>
          )}
        </Pressable>

        <Pressable onPress={handleSave} style={[styles.btn, styles.btnPrimary]} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnPrimaryText}>Save</Text>
          )}
        </Pressable>
      </View>
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
  },
  label: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 14,
    marginBottom: 4,
  },
  input: {
    color: '#f9fafb',
    fontSize: 15,
    paddingVertical: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#1f2937',
    marginTop: 4,
  },
  hint: {
    color: '#4b5563',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
    marginBottom: 28,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  btnPrimary: {
    backgroundColor: '#10b981',
  },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  btnSecondary: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
  },
  btnSecondaryText: {
    color: '#10b981',
    fontWeight: '500',
    fontSize: 15,
  },
});
