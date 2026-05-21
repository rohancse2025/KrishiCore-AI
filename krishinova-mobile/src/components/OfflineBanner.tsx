import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

export const OfflineBanner: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [visible, setVisible] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [isOnlineBanner, setIsOnlineBanner] = useState(false);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const currentStatus = !!state.isConnected && !!state.isInternetReachable;
      
      if (isFirstLoad.current) {
        setIsConnected(currentStatus);
        if (!currentStatus) {
          setVisible(true);
          setIsOnlineBanner(false);
          setStatusText('📡 Offline - Showing cached data');
        }
        isFirstLoad.current = false;
        return;
      }

      if (isConnected !== currentStatus) {
        setIsConnected(currentStatus);
        if (currentStatus) {
          // Transitioned to online
          setIsOnlineBanner(true);
          setStatusText('✅ Online - Connection restored');
          setVisible(true);
          
          // Auto-hide online banner after 2 seconds
          const timer = setTimeout(() => {
            setVisible(false);
          }, 2000);
          return () => clearTimeout(timer);
        } else {
          // Transitioned to offline
          setIsOnlineBanner(false);
          setStatusText('📡 Offline - Showing cached data');
          setVisible(true);
        }
      }
    });

    return () => unsubscribe();
  }, [isConnected]);

  if (!visible) return null;

  return (
    <View style={[styles.banner, isOnlineBanner ? styles.onlineBg : styles.offlineBg]}>
      <Text style={styles.text}>{statusText}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    zIndex: 9999,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
      },
      android: {
        elevation: 3,
      },
    }),
  },
  onlineBg: {
    backgroundColor: '#16a34a', // Darker green for readability
  },
  offlineBg: {
    backgroundColor: '#dc2626', // Vibrant premium red
  },
  text: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default OfflineBanner;
