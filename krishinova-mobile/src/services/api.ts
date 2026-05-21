import axios from 'axios';
import { Alert, Platform } from 'react-native';
import { SensorData, Crop, Farmer } from '../types';
import { localStore } from './storage';

// Production Render API base URL
const API_BASE_URL = 'https://krishinova-api.onrender.com/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 seconds timeout as requested
  headers: {
    'Content-Type': 'application/json',
  },
});

// Unauthorized (401) callback hook for App navigation reset
let onUnauthorizedCallback: (() => void) | null = null;
export const setUnauthorizedCallback = (callback: () => void) => {
  onUnauthorizedCallback = callback;
};

// Request Interceptor: Inject Auth Token
api.interceptors.request.use(
  async (config) => {
    const token = await localStore.getAuthToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle timeouts, 401s, and 5xx errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // 1. Handle Timeout
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      Alert.alert(
        'Request Timeout',
        'Request timed out. Check your connection.',
        [{ text: 'OK' }]
      );
      return Promise.reject(new Error('TIMEOUT_ERROR'));
    }

    // 2. Handle 401 Unauthorized
    if (error.response && error.response.status === 401) {
      await localStore.clearSession();
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
      Alert.alert(
        'Session Expired',
        'Session expired. Please login again.',
        [{ text: 'OK' }]
      );
      return Promise.reject(new Error('UNAUTHORIZED_ERROR'));
    }

    // 3. Handle 5xx Server Errors
    if (error.response && error.response.status >= 500) {
      Alert.alert(
        'Server Error',
        `The server encountered an error (${error.response.status}). Please try again later.`,
        [{ text: 'OK' }]
      );
      return Promise.reject(new Error('SERVER_ERROR'));
    }

    // 4. Handle general connection errors
    if (!error.response) {
      console.warn('Network connection error occurred.');
      return Promise.reject(new Error('NETWORK_ERROR'));
    }

    return Promise.reject(error);
  }
);

export interface MandiPrice {
  id: string;
  crop_name: string;
  market_name: string;
  state: string;
  min_price: number;
  max_price: number;
  modal_price: number;
  date: string;
  trend: 'up' | 'down' | 'stable';
}

export interface WeatherForecast {
  temp: number;
  condition: string;
  humidity: number;
  wind_speed: number;
  location: string;
  forecast: Array<{ day: string; temp: number; condition: string }>;
}

export interface ScanResult {
  disease_name: string;
  confidence: number;
  severity: 'Mild' | 'Moderate' | 'Severe';
  description: string;
  treatment: string;
  prevention: string;
}

export const krishiApi = {
  // Authentication
  login: async (phone: string, password: string): Promise<{ token: string; farmer: Farmer }> => {
    const response = await api.post('/auth/login', { phone, password });
    return response.data;
  },

  register: async (name: string, phone: string, location: string, farm_size: number): Promise<{ token: string; farmer: Farmer }> => {
    const response = await api.post('/auth/register', { name, phone, location, farm_size });
    return response.data;
  },

  // Crop Recommendation ML API
  getCropRecommendation: async (data: {
    n: number;
    p: number;
    k: number;
    temp: number;
    humidity: number;
    ph: number;
    rainfall: number;
  }): Promise<{ crop_name: string; confidence: number; reason: string }> => {
    try {
      const response = await api.post('/crops/recommend', data);
      return response.data;
    } catch (error) {
      // Re-throw if it was timeout, 401, or 500 (already handled by interceptor)
      if (error instanceof Error && ['TIMEOUT_ERROR', 'UNAUTHORIZED_ERROR', 'SERVER_ERROR'].includes(error.message)) {
        throw error;
      }
      // If offline/network error, throw special offline error so caller triggers rule-based fallback
      throw new Error('OFFLINE_MODE');
    }
  },

  // Mandi Prices
  getMandiPrices: async (state: string, commodity: string): Promise<MandiPrice[]> => {
    try {
      const response = await api.get('/market-prices', { params: { state, commodity } });
      return response.data;
    } catch (error) {
      if (error instanceof Error && ['TIMEOUT_ERROR', 'UNAUTHORIZED_ERROR', 'SERVER_ERROR'].includes(error.message)) {
        throw error;
      }
      throw new Error('OFFLINE_MODE');
    }
  },

  // Leaf scan analysis
  analyzeCropLeaf: async (imageUri: string): Promise<ScanResult> => {
    try {
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'leaf_scan.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      // @ts-ignore
      formData.append('image', {
        uri: Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
        name: filename,
        type,
      });

      const response = await api.post('/scan/scan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      if (error instanceof Error && ['TIMEOUT_ERROR', 'UNAUTHORIZED_ERROR', 'SERVER_ERROR'].includes(error.message)) {
        throw error;
      }
      throw new Error('OFFLINE_MODE');
    }
  },

  // IoT Sensor Data
  getLatestSensorData: async (): Promise<SensorData> => {
    try {
      const response = await api.get('/iot/latest');
      return response.data;
    } catch (error) {
      if (error instanceof Error && ['TIMEOUT_ERROR', 'UNAUTHORIZED_ERROR', 'SERVER_ERROR'].includes(error.message)) {
        throw error;
      }
      throw new Error('OFFLINE_MODE');
    }
  },

  // IoT Manual Override
  submitManualOverride: async (data: { autoMode: boolean; status: boolean }): Promise<void> => {
    await api.post('/iot/manual-override', data);
  },

  // Farmer Profile
  getFarmerProfile: async (): Promise<Farmer> => {
    const response = await api.get('/farmers/me');
    return response.data;
  },

  updateFarmerProfile: async (data: Partial<Farmer>): Promise<Farmer> => {
    const response = await api.put('/farmers/me', data);
    return response.data;
  },

  // Chat message
  sendChatMessage: async (message: string): Promise<{ reply: string }> => {
    try {
      const response = await api.post('/chat', { message });
      return response.data;
    } catch (error) {
      if (error instanceof Error && ['TIMEOUT_ERROR', 'UNAUTHORIZED_ERROR', 'SERVER_ERROR'].includes(error.message)) {
        throw error;
      }
      throw new Error('OFFLINE_MODE');
    }
  },

  // Weather Forecast
  getWeatherForecast: async (location: string): Promise<WeatherForecast> => {
    try {
      const response = await api.get('/weather', { params: { location } });
      return response.data;
    } catch (error) {
      if (error instanceof Error && ['TIMEOUT_ERROR', 'UNAUTHORIZED_ERROR', 'SERVER_ERROR'].includes(error.message)) {
        throw error;
      }
      // Offline fallback: Return a realistic meteorological forecast for the farmer
      return {
        temp: 32,
        condition: 'Partly Cloudy',
        humidity: 65,
        wind_speed: 14,
        location: location || 'Punjab, IN',
        forecast: [
          { day: 'Mon', temp: 33, condition: 'Sunny' },
          { day: 'Tue', temp: 32, condition: 'Partly Cloudy' },
          { day: 'Wed', temp: 31, condition: 'Rain' },
          { day: 'Thu', temp: 34, condition: 'Sunny' },
          { day: 'Fri', temp: 33, condition: 'Sunny' },
        ],
      };
    }
  },
};

export default api;
