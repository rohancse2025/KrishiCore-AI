import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  BackHandler,
  Platform,
  StatusBar,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import NetInfo from '@react-native-community/netinfo';

// ====================================================
// 🔧 CHANGE THIS TO YOUR DEPLOYED WEBSITE URL
// ====================================================
const WEBSITE_URL = 'https://kisancore-ai.vercel.app';
// ====================================================

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Monitor network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  // Handle Android back button — go back in website history instead of closing app
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true; // Prevent app from closing
      }
      return false; // Let Android handle it (close app)
    });

    return () => backHandler.remove();
  }, [canGoBack]);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  }, []);

  // Loading screen while website loads
  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingCard}>
        <Text style={styles.loadingEmoji}>🌾</Text>
        <Text style={styles.loadingTitle}>KisanCore AI</Text>
        <ActivityIndicator size="large" color="#15803d" style={{ marginTop: 16 }} />
        <Text style={styles.loadingText}>Loading your farm dashboard...</Text>
      </View>
    </View>
  );

  // Error screen with retry button
  if (hasError) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#15803d" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>📡</Text>
          <Text style={styles.errorTitle}>Connection Issue</Text>
          <Text style={styles.errorText}>
            {isOffline
              ? 'You are offline. Please check your internet connection and try again.'
              : 'Could not load KisanCore AI. The server may be waking up (takes ~50 seconds on first load).'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry} activeOpacity={0.8}>
            <Text style={styles.retryText}>🔄 Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#15803d" />

      <WebView
        ref={webViewRef}
        source={{ uri: WEBSITE_URL }}
        style={styles.webview}
        // Navigation state tracking
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack);
        }}
        // Loading handlers
        onLoadProgress={({ nativeEvent }) => {
          // If the page is fully loaded, hide the loading screen
          if (nativeEvent.progress === 1) {
            setIsLoading(false);
          }
        }}
        onLoadEnd={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          if (nativeEvent.statusCode >= 500) {
            setHasError(true);
          }
        }}
        // Enable JavaScript, DOM storage, and geolocation
        javaScriptEnabled={true}
        domStorageEnabled={true}
        geolocationEnabled={true}
        // Allow camera and file uploads (for scan feature)
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        allowFileAccess={true}
        // Allow mixed content for development
        mixedContentMode="compatibility"
        // Cache settings for offline support
        cacheEnabled={true}
        cacheMode="LOAD_DEFAULT"
        // Pull to refresh
        pullToRefreshEnabled={true}
        // Prevent new windows from opening
        setSupportMultipleWindows={false}
        // User agent to identify app
        applicationNameForUserAgent="KisanCoreAI-App/1.0"
        // Start page in mobile view
        scalesPageToFit={true}
        // Allow back/forward gestures on iOS
        allowsBackForwardNavigationGestures={true}
      />

      {/* Loading overlay */}
      {isLoading && renderLoading()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#15803d',
  },
  webview: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  // Loading screen
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#15803d',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingCard: {
    alignItems: 'center',
    padding: 40,
  },
  loadingEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#bbf7d0',
    fontWeight: '600',
  },
  // Error screen
  errorContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    maxWidth: 300,
  },
  retryButton: {
    backgroundColor: '#15803d',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#15803d',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  retryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
