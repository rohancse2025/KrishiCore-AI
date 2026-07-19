import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

interface SensorData {
  temperature: number | null;
  humidity: number | null;
  soil_moisture: number | null;
  timestamp: string | null;
  irrigation_needed: boolean;
  manual_override: string | null;
  isOnline: boolean;
  lastUpdateDate: number | null;
  clearSensorData: () => Promise<void>;
  refreshSensorData: () => Promise<void>;
  queueCommand: (command: string, minutes?: number, seconds?: number) => void;
  pendingCommandsCount: number;
}

const SensorContext = createContext<SensorData | undefined>(undefined);

export const SensorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sensorData, setSensorData] = useState<Omit<SensorData, 'clearSensorData' | 'refreshSensorData' | 'queueCommand' | 'pendingCommandsCount'>>({
    temperature: null,
    humidity: null,
    soil_moisture: null,
    timestamp: null,
    irrigation_needed: false,
    manual_override: "OFF",
    isOnline: false,
    lastUpdateDate: null,
  });

  const [pendingCommandsCount, setPendingCommandsCount] = useState(0);

  // Sync effect: Try to drain command queue when online
  useEffect(() => {
    const drainQueue = async () => {
      if (!navigator.onLine) return;
      
      const queueJson = localStorage.getItem('iot_command_queue');
      if (!queueJson) {
        setPendingCommandsCount(0);
        return;
      }

      let queue: { command: string, minutes?: number, seconds?: number, id: string }[] = JSON.parse(queueJson);
      if (queue.length === 0) {
        setPendingCommandsCount(0);
        return;
      }

      console.log(`📡 Online! Draining ${queue.length} queued IoT commands...`);
      const remaining = [...queue];
      
      for (const item of queue) {
        try {
          if (item.command === "AUTO") {
            await fetch(`${API_BASE_URL}/api/v1/iot/override`, { method: 'DELETE' });
          } else {
            await fetch(`${API_BASE_URL}/api/v1/iot/override`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                command: item.command, 
                duration_minutes: item.minutes || 0,
                duration_seconds: item.seconds || 0 
              })
            });
          }
          // Success -> remove from remaining
          const idx = remaining.findIndex(r => r.id === item.id);
          if (idx > -1) remaining.splice(idx, 1);
        } catch (err) {
          console.error("Sync failed for command, will retry later:", err);
          break; // Stop draining if network fails again
        }
      }

      localStorage.setItem('iot_command_queue', JSON.stringify(remaining));
      setPendingCommandsCount(remaining.length);
    };

    const interval = setInterval(drainQueue, 10000); // Check every 10s
    drainQueue(); // Also run on mount
    return () => clearInterval(interval);
  }, []);

  const queueCommand = (command: string, minutes?: number, seconds?: number) => {
    const queueJson = localStorage.getItem('iot_command_queue');
    const queue = queueJson ? JSON.parse(queueJson) : [];
    
    queue.push({ command, minutes, seconds, id: Date.now().toString() });
    localStorage.setItem('iot_command_queue', JSON.stringify(queue));
    setPendingCommandsCount(queue.length);
    
    console.log(`📦 Command '${command}' queued for later sync.`);
  };

  const clearSensorData = async () => {
    try {
      // Wipe the backend cache first so the poller doesn't immediately refill
      await fetch(`${API_BASE_URL}/api/v1/iot/clear`, { method: 'DELETE' });
    } catch (err) {
      console.error("Clear IoT cache error:", err);
    }
    setSensorData({
      temperature: null,
      humidity: null,
      soil_moisture: null,
      timestamp: null,
      isOnline: false,
      lastUpdateDate: null,
    });
  };

  const refreshSensorData = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/iot/latest`);
      if (res.ok) {
        const data = await res.json();
        if (data.temperature !== undefined) {
          // Backend returns unix_timestamp in seconds — convert to ms for Date.now() comparisons
          const ts = data.unix_timestamp && data.unix_timestamp > 0 ? data.unix_timestamp * 1000 : null;
          setSensorData(prev => ({
            ...prev,
            temperature: data.temperature,
            humidity: data.humidity,
            soil_moisture: data.soil_moisture,
            irrigation_needed: data.irrigation_needed,
            manual_override: data.manual_override,
            timestamp: data.timestamp,
            lastUpdateDate: ts,
          }));
        }
      }
    } catch (err) {
      console.error("IoT Fetch Error:", err);
    }
  };

  useEffect(() => {
    refreshSensorData();
    const interval = setInterval(refreshSensorData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkOnlineStatus = () => {
      setSensorData(prev => {
        const isOnline = prev.lastUpdateDate !== null && (Date.now() - prev.lastUpdateDate < 30000);
        if (prev.isOnline !== isOnline) {
          return { ...prev, isOnline };
        }
        return prev;
      });
    };

    checkOnlineStatus();
    const interval = setInterval(checkOnlineStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SensorContext.Provider value={{ ...sensorData, clearSensorData, refreshSensorData, queueCommand, pendingCommandsCount }}>
      {children}
    </SensorContext.Provider>
  );
};

export const useSensor = () => {
  const context = useContext(SensorContext);
  if (context === undefined) {
    throw new Error('useSensor must be used within a SensorProvider');
  }
  return context;
};
