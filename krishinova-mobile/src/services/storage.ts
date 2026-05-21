import AsyncStorage from '@react-native-async-storage/async-storage';
import { Farmer } from '../types';

const KEYS = {
  FARMER_PROFILE: '@khrishicore:farmer_profile',
  AUTH_TOKEN: '@khrishicore:auth_token',
  APP_LANGUAGE: '@khrishicore:language',
  OFFLINE_SCAN_QUEUE: '@khrishicore:offline_scans',
};

export const localStore = {
  // Store Farmer Profile
  saveFarmerProfile: async (farmer: Farmer): Promise<void> => {
    try {
      const jsonString = JSON.stringify(farmer);
      await AsyncStorage.setItem(KEYS.FARMER_PROFILE, jsonString);
    } catch (e) {
      console.error('Error saving farmer profile', e);
    }
  },

  // Retrieve Farmer Profile
  getFarmerProfile: async (): Promise<Farmer | null> => {
    try {
      const jsonString = await AsyncStorage.getItem(KEYS.FARMER_PROFILE);
      return jsonString ? JSON.parse(jsonString) : null;
    } catch (e) {
      console.error('Error retrieving farmer profile', e);
      return null;
    }
  },

  // Save Auth Session Token
  saveAuthToken: async (token: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(KEYS.AUTH_TOKEN, token);
    } catch (e) {
      console.error('Error saving auth token', e);
    }
  },

  // Retrieve Auth Session Token
  getAuthToken: async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(KEYS.AUTH_TOKEN);
    } catch (e) {
      console.error('Error retrieving auth token', e);
      return null;
    }
  },

  // Store preferred App Language (e.g., 'en', 'hi')
  saveLanguage: async (lang: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(KEYS.APP_LANGUAGE, lang);
    } catch (e) {
      console.error('Error saving app language', e);
    }
  },

  // Retrieve preferred App Language
  getLanguage: async (): Promise<string> => {
    try {
      const lang = await AsyncStorage.getItem(KEYS.APP_LANGUAGE);
      return lang || 'en'; // default to English
    } catch (e) {
      console.error('Error retrieving app language', e);
      return 'en';
    }
  },

  // Clear Session Data on Log Out
  clearSession: async (): Promise<void> => {
    try {
      await AsyncStorage.multiRemove([KEYS.FARMER_PROFILE, KEYS.AUTH_TOKEN]);
    } catch (e) {
      console.error('Error clearing session', e);
    }
  },

  // Retrieve Offline Scans Queue
  getOfflineScans: async (): Promise<any[]> => {
    try {
      const scansStr = await AsyncStorage.getItem(KEYS.OFFLINE_SCAN_QUEUE);
      return scansStr ? JSON.parse(scansStr) : [];
    } catch (e) {
      console.error('Error getting offline scans queue', e);
      return [];
    }
  },

  // Queue Scan Offline for sync
  queueOfflineScan: async (scan: any): Promise<void> => {
    try {
      const queue = await localStore.getOfflineScans();
      queue.push(scan);
      await AsyncStorage.setItem(KEYS.OFFLINE_SCAN_QUEUE, JSON.stringify(queue));
    } catch (e) {
      console.error('Error queuing offline scan', e);
    }
  },

  // Clear Offline Scans Queue
  clearOfflineScans: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(KEYS.OFFLINE_SCAN_QUEUE);
    } catch (e) {
      console.error('Error clearing offline scans queue', e);
    }
  },

  // Generic type-safe wrappers requested by setup instructions
  saveData: async <T>(key: string, data: T): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Error saving data for key ${key}`, e);
    }
  },

  getData: async <T>(key: string): Promise<T | null> => {
    try {
      const val = await AsyncStorage.getItem(key);
      return val ? JSON.parse(val) as T : null;
    } catch (e) {
      console.error(`Error retrieving data for key ${key}`, e);
      return null;
    }
  },

  removeData: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.error(`Error removing key ${key}`, e);
    }
  },

  clearAll: async (): Promise<void> => {
    try {
      await AsyncStorage.clear();
    } catch (e) {
      console.error('Error clearing storage', e);
    }
  },
};

export default localStore;
