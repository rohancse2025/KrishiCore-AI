import NetInfo from '@react-native-community/netinfo';
import { ToastAndroid, Platform, Alert } from 'react-native';
import { database } from '../services/database';
import api from '../services/api';

export const offlineSync = {
  // Check if device is connected to the internet
  isConnected: async (): Promise<boolean> => {
    const state = await NetInfo.fetch();
    return !!state.isConnected && !!state.isInternetReachable;
  },

  // Monitor network status changes and trigger sync automatically
  monitorConnection: (onNetworkChange?: (isConnected: boolean) => void) => {
    let lastState: boolean | null = null;
    
    return NetInfo.addEventListener(state => {
      const isConnected = !!state.isConnected && !!state.isInternetReachable;
      
      // Only invoke callback if status actually changed
      if (lastState === null || lastState !== isConnected) {
        lastState = isConnected;
        if (onNetworkChange) {
          onNetworkChange(isConnected);
        }
        
        if (isConnected) {
          // Automatically sync queued items when back online
          offlineSync.syncOfflineData().catch(err => {
            console.error('Failed to sync offline data:', err);
          });
        }
      }
    });
  },

  // Synchronize cached local data with the remote server
  syncOfflineData: async (): Promise<void> => {
    const isOnline = await offlineSync.isConnected();
    if (!isOnline) {
      console.log('Device is offline. Skipping synchronization.');
      return;
    }

    try {
      // Retrieve queued actions from SQLite database
      const queue = await database.getQueue();
      if (queue.length === 0) {
        console.log('No queued offline operations to sync.');
        return;
      }

      console.log(`Syncing ${queue.length} queued offline action(s) to server...`);
      let successCount = 0;

      for (const action of queue) {
        try {
          const { id, endpoint, method, body } = action;
          
          // Dynamically perform network request based on queued endpoint & body
          if (method.toUpperCase() === 'POST') {
            await api.post(endpoint, body);
          } else if (method.toUpperCase() === 'PUT') {
            await api.put(endpoint, body);
          } else if (method.toUpperCase() === 'DELETE') {
            await api.delete(endpoint, { data: body });
          }
          
          // On success, delete from queue
          await database.removeFromQueue(id);
          successCount++;
        } catch (err) {
          // Check if it's a server/validation error (e.g., 400 Bad Request, 500 Server Error)
          // If it's a server error rather than network connection error, remove from queue to prevent infinite loop
          const axiosErr = err as any;
          if (axiosErr.response) {
            console.error(`API processing error (${axiosErr.response.status}) for action ${action.id}, dropping from queue.`);
            await database.removeFromQueue(action.id);
          } else {
            console.warn(`Sync failed for action ${action.id} due to network timeout/unreachability, retaining in queue.`);
            // Break loop to retry later when connection stabilizes
            break;
          }
        }
      }

      // Display user notification when actions sync successfully
      if (successCount > 0) {
        const message = `✅ Synced ${successCount} action${successCount > 1 ? 's' : ''} to server`;
        if (Platform.OS === 'android') {
          ToastAndroid.show(message, ToastAndroid.SHORT);
        } else {
          Alert.alert('Data Synced', message, [{ text: 'OK' }]);
        }
      }
    } catch (error) {
      console.error('Failed to execute offline sync pipeline:', error);
    }
  },
};

export default offlineSync;
