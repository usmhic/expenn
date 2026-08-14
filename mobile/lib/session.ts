import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'expenn_session';

interface StoredSession {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
}

let _cachedSession: StoredSession | null = null;

function isWebStorageAvailable() {
  return Platform.OS === 'web' && typeof localStorage !== 'undefined';
}

export async function setStoredSession(session: StoredSession | null) {
  _cachedSession = session;
  if (!session) {
    await clearStoredSession();
    return;
  }

  const serialized = JSON.stringify(session);
  try {
    if (isWebStorageAvailable()) {
      localStorage.setItem(SESSION_KEY, serialized);
    } else {
      await SecureStore.setItemAsync(SESSION_KEY, serialized);
    }
  } catch {}
}

export async function getStoredSession(): Promise<StoredSession | null> {
  if (_cachedSession) return _cachedSession;
  try {
    const raw = isWebStorageAvailable()
      ? localStorage.getItem(SESSION_KEY)
      : await SecureStore.getItemAsync(SESSION_KEY);

    if (raw) {
      _cachedSession = JSON.parse(raw);
      return _cachedSession;
    }
  } catch {}
  return null;
}

export async function clearStoredSession() {
  _cachedSession = null;
  try {
    if (isWebStorageAvailable()) {
      localStorage.removeItem(SESSION_KEY);
    } else {
      await SecureStore.deleteItemAsync(SESSION_KEY);
    }
  } catch {}
}
