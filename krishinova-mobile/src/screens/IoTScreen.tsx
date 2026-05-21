import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { database } from '../services/database';
import { krishiApi } from '../services/api';
import offlineSync from '../utils/offline';
import LoadingSpinner from '../components/LoadingSpinner';

export const IoTScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [telemetry, setTelemetry] = useState<any>(null);

  // Manual Override Controller State
  const [autoMode, setAutoMode] = useState(true);
  const [pumpStatus, setPumpStatus] = useState(false);
  const [telemetryHistory, setTelemetryHistory] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const online = await offlineSync.isConnected();
      setIsOnline(online);

      // Load cached local database readings first
      const dbHistory = await database.getSensorDataOffline();
      setTelemetryHistory(dbHistory);

      if (dbHistory.length > 0) {
        setTelemetry({
          temperature: dbHistory[0].temperature,
          humidity: dbHistory[0].humidity,
          soilMoisture: dbHistory[0].soil_moisture,
          timestamp: dbHistory[0].timestamp,
        });
      }

      if (online) {
        // Fetch fresh readings from endpoint
        const fresh = await krishiApi.getLatestSensorData();
        const formatted = {
          temperature: fresh.temperature,
          humidity: fresh.humidity,
          soilMoisture: fresh.soil_moisture,
          timestamp: fresh.timestamp,
        };
        setTelemetry(formatted);

        // Save fresh readings to SQLite cache
        await database.saveSensorDataOffline({
          temperature: fresh.temperature,
          humidity: fresh.humidity,
          soil_moisture: fresh.soil_moisture,
          timestamp: fresh.timestamp,
        });

        // Refresh log
        const reloaded = await database.getSensorDataOffline();
        setTelemetryHistory(reloaded);
      }
    } catch (err) {
      console.warn('Could not fetch online IoT values, using local DB:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Manual Override Toggles
  const handleToggleAutoMode = async (value: boolean) => {
    setAutoMode(value);
    
    const isNowOnline = await offlineSync.isConnected();
    setIsOnline(isNowOnline);

    const payload = { autoMode: value, status: pumpStatus };

    if (isNowOnline) {
      setLoading(true);
      try {
        await krishiApi.submitManualOverride(payload);
        Alert.alert('Status Updated', `System shifted to ${value ? 'Automatic Mode' : 'Manual Mode'}`);
      } catch (err) {
        console.error('Failed to submit manual override:', err);
      } finally {
        setLoading(false);
      }
    } else {
      // Queue offline in SQLite
      await database.addToQueue('/iot/manual-override', 'POST', payload);
      Alert.alert(
        'Offline Mode',
        'Your mode preference is queued locally and will sync when internet restores.'
      );
    }
  };

  const handleTogglePump = async (status: boolean) => {
    setPumpStatus(status);

    const isNowOnline = await offlineSync.isConnected();
    setIsOnline(isNowOnline);

    const payload = { autoMode: false, status };

    if (isNowOnline) {
      setLoading(true);
      try {
        await krishiApi.submitManualOverride(payload);
        Alert.alert('Pump Controlled', `Water irrigation pump switched ${status ? 'ON' : 'OFF'}`);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    } else {
      // Queue offline in SQLite
      await database.addToQueue('/iot/manual-override', 'POST', payload);
      Alert.alert(
        'Offline Mode',
        `Switching pump ${status ? 'ON' : 'OFF'} action queued locally.`
      );
    }
  };

  const handleSimulateTelemetry = async () => {
    // Generate logical microtelemetry for simulations
    const newReading = {
      temperature: parseFloat((28 + Math.random() * 8).toFixed(1)),
      humidity: Math.round(55 + Math.random() * 20),
      soil_moisture: Math.round(30 + Math.random() * 35),
      timestamp: new Date().toISOString(),
    };

    setLoading(true);
    try {
      await database.saveSensorDataOffline({
        temperature: newReading.temperature,
        humidity: newReading.humidity,
        soil_moisture: newReading.soil_moisture,
        timestamp: newReading.timestamp,
      });

      // Reload
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LoadingSpinner visible={loading} message="Refreshing IoT telemetry..." />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Offline Banner & Sync Header */}
        {!isOnline && telemetry && (
          <View style={[styles.syncHeader, { backgroundColor: '#fff7ed', padding: 10, borderRadius: 8, marginBottom: 16 }]}>
            <Text style={{ color: '#c2410c', fontSize: 12, fontWeight: '700' }}>
              📡 Offline — Showing last synced data from {new Date(telemetry.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        )}
        
        {!isOnline && !telemetry && (
          <View style={[styles.syncHeader, { backgroundColor: '#f1f5f9', padding: 10, borderRadius: 8, marginBottom: 16 }]}>
            <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
              No cached data. Connect to see readings.
            </Text>
          </View>
        )}

        {isOnline && telemetry && (
          <View style={styles.syncHeader}>
            <Text style={styles.lastUpdatedText}>
              ⏱ Last Sync: {new Date(telemetry.timestamp).toLocaleTimeString()}
            </Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={loadData}>
              <Ionicons name="refresh" size={16} color="#15803d" />
              <Text style={styles.refreshBtnText}>Fetch Live</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Neo Metrics Displays */}
        {telemetry ? (
          <>
          <View style={styles.metricsGrid}>
          {/* Temperature */}
          <View style={styles.metricCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#fee2e2' }]}>
              <Ionicons name="thermometer" size={24} color="#ef4444" />
            </View>
            <Text style={styles.metricLabel}>Air Temp</Text>
            <Text style={[styles.metricValue, { color: '#dc2626' }]}>
              {telemetry.temperature}°C
            </Text>
          </View>

          {/* Humidity */}
          <View style={styles.metricCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="water" size={24} color="#3b82f6" />
            </View>
            <Text style={styles.metricLabel}>Humidity</Text>
            <Text style={[styles.metricValue, { color: '#2563eb' }]}>
              {telemetry.humidity}%
            </Text>
          </View>
        </View>

        <View style={styles.fullWidthMetric}>
          <View style={[styles.iconCircle, { backgroundColor: '#dcfce7' }]}>
            <Ionicons name="speedometer" size={26} color="#16a34a" />
          </View>
          <View style={styles.fullWidthInfo}>
            <Text style={styles.metricLabel}>Soil Moisture Capacity</Text>
            <Text style={[styles.metricValue, { color: '#16a34a', fontSize: 32 }]}>
              {telemetry.soilMoisture}%
            </Text>
            <Text style={styles.moistureAdvisory}>
              {telemetry.soilMoisture < 40 ? '⚠️ Soil is dry! Irrigate now.' : '✅ Soil moisture levels are optimal.'}
            </Text>
          </View>
        </View>
        </>
        ) : (
          <View style={[styles.fullWidthMetric, { justifyContent: 'center' }]}>
            <Text style={styles.metricLabel}>Data unavailable</Text>
          </View>
        )}

        {/* Manual Override controls */}
        <View style={styles.controllerCard}>
          <Text style={styles.controllerTitle}>Irrigation Pump Controller</Text>
          <Text style={styles.controllerDesc}>
            Manage automatic thresholds or manually trigger your high-volume water pump.
          </Text>

          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Automatic AI Irrigation</Text>
              <Text style={styles.toggleSub}>Pumps activate based on active moisture readings</Text>
            </View>
            <Switch
              value={autoMode}
              onValueChange={handleToggleAutoMode}
              trackColor={{ false: '#767577', true: '#86efac' }}
              thumbColor={autoMode ? '#15803d' : '#f4f3f4'}
            />
          </View>

          {!autoMode && (
            <View style={styles.manualControlsRow}>
              <TouchableOpacity
                style={[styles.pumpBtn, pumpStatus ? styles.pumpBtnOn : styles.pumpBtnOff]}
                onPress={() => handleTogglePump(true)}
              >
                <Ionicons name="power" size={20} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.pumpBtnText}>Pump ON</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pumpBtnSecondary, !pumpStatus ? styles.pumpBtnSecondaryActive : null]}
                onPress={() => handleTogglePump(false)}
              >
                <Ionicons name="close-circle" size={20} color={!pumpStatus ? '#ffffff' : '#64748b'} style={{ marginRight: 6 }} />
                <Text style={[styles.pumpBtnTextSecondary, !pumpStatus ? { color: '#ffffff' } : null]}>Pump OFF</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Simulated Trigger Buttons */}
        <TouchableOpacity style={styles.simulationBtn} onPress={handleSimulateTelemetry}>
          <Ionicons name="analytics" size={18} color="#15803d" style={{ marginRight: 8 }} />
          <Text style={styles.simulationBtnText}>Simulate Live Sensor Readings</Text>
        </TouchableOpacity>

        {/* Local Logs History */}
        <View style={styles.historySection}>
          <Text style={styles.historyHeading}>Local Telemetry History Log</Text>
          {telemetryHistory.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>No telemetry cached offline.</Text>
            </View>
          ) : (
            <View style={styles.historyTable}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCol, { flex: 2 }]}>Timestamp</Text>
                <Text style={styles.tableCol}>Temp</Text>
                <Text style={styles.tableCol}>Humid</Text>
                <Text style={styles.tableCol}>Moisture</Text>
              </View>
              {telemetryHistory.slice(0, 10).map((row, idx) => (
                <View key={idx.toString()} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2, color: '#64748b' }]}>
                    {new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text style={styles.tableCell}>{row.temperature}°C</Text>
                  <Text style={styles.tableCell}>{row.humidity}%</Text>
                  <Text style={[styles.tableCell, { fontWeight: '700', color: '#16a34a' }]}>{row.soil_moisture}%</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  syncHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  lastUpdatedText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  refreshBtnText: {
    color: '#15803d',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
      android: {
        elevation: 2,
      },
    }),
  },
  fullWidthMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
  },
  fullWidthInfo: {
    flex: 1,
    marginLeft: 16,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 26,
    fontWeight: '900',
    marginTop: 4,
  },
  moistureAdvisory: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 4,
  },
  controllerCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  controllerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  controllerDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 16,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  toggleSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  manualControlsRow: {
    flexDirection: 'row',
    marginTop: 18,
  },
  pumpBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  pumpBtnOn: {
    backgroundColor: '#16a34a',
  },
  pumpBtnOff: {
    backgroundColor: '#ef4444',
  },
  pumpBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    height: 46,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    backgroundColor: '#ffffff',
  },
  pumpBtnSecondaryActive: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  pumpBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  pumpBtnTextSecondary: {
    color: '#64748b',
    fontWeight: '700',
    fontSize: 14,
  },
  simulationBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#15803d',
    flexDirection: 'row',
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  simulationBtnText: {
    color: '#15803d',
    fontWeight: '700',
    fontSize: 14,
  },
  historySection: {
    marginTop: 12,
  },
  historyHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  emptyHistory: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyHistoryText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  historyTable: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableCol: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  tableCell: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
  },
});

export default IoTScreen;
