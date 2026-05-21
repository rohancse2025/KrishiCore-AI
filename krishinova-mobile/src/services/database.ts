import * as SQLite from 'expo-sqlite';
import { Crop, SensorData } from '../types';

let db: SQLite.SQLiteDatabase;

try {
  db = SQLite.openDatabaseSync('krishinova.db');
} catch (error) {
  console.error('Failed to open database synchronously, preparing mock database interface:', error);
}

export const database = {
  // Initialize Database Tables
  initDatabase: async (): Promise<void> => {
    if (!db) return;
    try {
      // Create tables for offline data caching
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        
        CREATE TABLE IF NOT EXISTS crops (
          id TEXT PRIMARY KEY,
          crop_name TEXT NOT NULL,
          planted_date TEXT NOT NULL,
          area REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sensor_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          temperature REAL NOT NULL,
          humidity REAL NOT NULL,
          soil_moisture REAL NOT NULL,
          timestamp TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS scans_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          disease_name TEXT NOT NULL,
          confidence REAL NOT NULL,
          description TEXT NOT NULL,
          solutions TEXT NOT NULL,
          image_uri TEXT,
          timestamp TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sync_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          endpoint TEXT NOT NULL,
          method TEXT NOT NULL,
          body TEXT NOT NULL,
          timestamp TEXT NOT NULL
        );
      `);
      console.log('Database tables initialized successfully.');
    } catch (error) {
      console.error('Failed to initialize database tables:', error);
    }
  },

  // Save Crop Offline
  saveCropOffline: async (crop: Crop): Promise<void> => {
    if (!db) return;
    try {
      await db.runAsync(
        'INSERT OR REPLACE INTO crops (id, crop_name, planted_date, area) VALUES (?, ?, ?, ?)',
        [crop.id, crop.crop_name, crop.planted_date, crop.area]
      );
    } catch (error) {
      console.error('Failed to save crop offline:', error);
    }
  },

  // Retrieve Crops Offline
  getCropsOffline: async (): Promise<Crop[]> => {
    if (!db) {
      return [
        { id: '1', crop_name: 'Wheat', planted_date: '2026-03-10', area: 2.5 },
        { id: '2', crop_name: 'Rice', planted_date: '2026-04-15', area: 4.0 },
      ];
    }
    try {
      const result = await db.getAllAsync<any>('SELECT * FROM crops ORDER BY planted_date DESC');
      return result.map(row => ({
        id: row.id,
        crop_name: row.crop_name,
        planted_date: row.planted_date,
        area: row.area,
      }));
    } catch (error) {
      console.error('Failed to retrieve crops offline:', error);
      return [];
    }
  },

  // Save Sensor Telemetry data locally
  saveSensorDataOffline: async (data: SensorData): Promise<void> => {
    if (!db) return;
    try {
      await db.runAsync(
        'INSERT INTO sensor_history (temperature, humidity, soil_moisture, timestamp) VALUES (?, ?, ?, ?)',
        [data.temperature, data.humidity, data.soil_moisture, data.timestamp]
      );
    } catch (error) {
      console.error('Failed to save sensor data offline:', error);
    }
  },

  // Retrieve local Sensor Telemetry history
  getSensorDataOffline: async (): Promise<SensorData[]> => {
    if (!db) {
      return [
        { temperature: 32.5, humidity: 60.2, soil_moisture: 42.0, timestamp: '2026-05-21T10:00:00Z' },
        { temperature: 33.1, humidity: 59.8, soil_moisture: 41.5, timestamp: '2026-05-21T11:00:00Z' },
        { temperature: 34.0, humidity: 58.0, soil_moisture: 40.8, timestamp: '2026-05-21T12:00:00Z' },
      ];
    }
    try {
      const result = await db.getAllAsync<any>('SELECT * FROM sensor_history ORDER BY timestamp DESC LIMIT 50');
      return result.map(row => ({
        temperature: row.temperature,
        humidity: row.humidity,
        soil_moisture: row.soil_moisture,
        timestamp: row.timestamp,
      }));
    } catch (error) {
      console.error('Failed to retrieve sensor history offline:', error);
      return [];
    }
  },

  // Save Leaf Diagnoses offline
  saveScanOffline: async (
    diseaseName: string,
    confidence: number,
    description: string,
    solutions: string[],
    imageUri: string
  ): Promise<void> => {
    if (!db) return;
    try {
      await db.runAsync(
        'INSERT INTO scans_history (disease_name, confidence, description, solutions, image_uri, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
        [diseaseName, confidence, description, JSON.stringify(solutions), imageUri, new Date().toISOString()]
      );
    } catch (error) {
      console.error('Failed to save scan offline:', error);
    }
  },

  // Retrieve local Leaf Diagnoses history
  getScansOffline: async (): Promise<any[]> => {
    if (!db) {
      return [
        {
          id: 1,
          disease_name: 'Tomato Early Blight',
          confidence: 0.94,
          description: 'Early blight of tomato caused by Alternaria solani.',
          solutions: JSON.stringify(['Apply fungicide', 'Remove infected leaves']),
          image_uri: 'mock_uri',
          timestamp: '2026-05-21T15:30:00Z'
        }
      ];
    }
    try {
      const result = await db.getAllAsync<any>('SELECT * FROM scans_history ORDER BY timestamp DESC');
      return result.map(row => ({
        id: row.id,
        disease_name: row.disease_name,
        confidence: row.confidence,
        description: row.description,
        solutions: JSON.parse(row.solutions),
        image_uri: row.image_uri,
        timestamp: row.timestamp,
      }));
    } catch (error) {
      console.error('Failed to retrieve scans offline:', error);
      return [];
    }
  },

  // Delete crop offline
  deleteCropOffline: async (id: string): Promise<void> => {
    if (!db) return;
    try {
      await db.runAsync('DELETE FROM crops WHERE id = ?', [id]);
    } catch (error) {
      console.error('Failed to delete crop offline:', error);
    }
  },

  // Sync Queue management methods
  addToQueue: async (endpoint: string, method: string, body: any): Promise<void> => {
    if (!db) return;
    try {
      const bodyStr = JSON.stringify(body);
      const timestamp = new Date().toISOString();
      await db.runAsync(
        'INSERT INTO sync_queue (endpoint, method, body, timestamp) VALUES (?, ?, ?, ?)',
        [endpoint, method, bodyStr, timestamp]
      );
      console.log(`Successfully queued ${method} request to ${endpoint}`);
    } catch (error) {
      console.error('Failed to add action to offline sync queue:', error);
    }
  },

  getQueue: async (): Promise<any[]> => {
    if (!db) return [];
    try {
      const result = await db.getAllAsync<any>('SELECT * FROM sync_queue ORDER BY timestamp ASC');
      return result.map(row => ({
        id: row.id,
        endpoint: row.endpoint,
        method: row.method,
        body: JSON.parse(row.body),
        timestamp: row.timestamp
      }));
    } catch (error) {
      console.error('Failed to retrieve offline sync queue:', error);
      return [];
    }
  },

  removeFromQueue: async (id: number): Promise<void> => {
    if (!db) return;
    try {
      await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
    } catch (error) {
      console.error(`Failed to remove sync queue item ${id}:`, error);
    }
  },

  clearQueue: async (): Promise<void> => {
    if (!db) return;
    try {
      await db.runAsync('DELETE FROM sync_queue');
    } catch (error) {
      console.error('Failed to clear sync queue:', error);
    }
  }
};

export default database;
