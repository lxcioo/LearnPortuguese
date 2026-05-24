import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 Minuten
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();

export const StorageService = {
  async getItem<T>(key: string, useCache = true): Promise<T | null> {
    if (useCache) {
      const cached = cache.get(key);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.data;
      }
    }

    try {
      const json = await AsyncStorage.getItem(key);
      const data = json ? JSON.parse(json) : null;
      if (useCache && data !== null) {
        cache.set(key, { data, timestamp: Date.now() });
      }
      return data;
    } catch (e) {
      console.error(`Error reading ${key}:`, e);
      return null;
    }
  },

  async setItem<T>(key: string, data: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
      cache.set(key, { data, timestamp: Date.now() });
    } catch (e) {
      console.error(`Error writing ${key}:`, e);
    }
  },

  async mergeItem<T extends Record<string, any>>(key: string, updates: Partial<T>): Promise<T | null> {
    try {
      const existing = await this.getItem<T>(key, false);
      const merged = { ...existing, ...updates };
      await this.setItem(key, merged);
      return merged;
    } catch (e) {
      console.error(`Error merging ${key}:`, e);
      return null;
    }
  },

  clearCache(key?: string): void {
    if (key) cache.delete(key);
    else cache.clear();
  },
};
