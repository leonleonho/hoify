import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const IS_WEB = Platform.OS === 'web';

export async function getItem(key: string): Promise<string | null> {
  if (IS_WEB) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  try { return SecureStore.getItemAsync(key); } catch { return null; }
}

export async function setItem(key: string, value: string): Promise<void> {
  if (IS_WEB) {
    try { localStorage.setItem(key, value); } catch { /* quota exceeded etc */ }
    return;
  }
  try { await SecureStore.setItemAsync(key, value); } catch { /* secure store unavailable */ }
}
