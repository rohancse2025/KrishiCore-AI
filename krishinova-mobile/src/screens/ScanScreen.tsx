import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { database } from '../services/database';
import { krishiApi } from '../services/api';
import offlineSync from '../utils/offline';
import LoadingSpinner from '../components/LoadingSpinner';

interface ScanHistoryItem {
  id: number;
  disease_name: string;
  confidence: number;
  description: string;
  solutions: string[];
  image_uri: string;
  timestamp: string;
}

export const ScanScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  const loadHistory = async () => {
    try {
      const scans = await database.getScansOffline();
      setHistory(scans);
    } catch (err) {
      console.error('Failed to load scans history:', err);
    }
  };

  const checkConnectivity = async () => {
    const online = await offlineSync.isConnected();
    setIsOnline(online);
  };

  useEffect(() => {
    loadHistory();
    checkConnectivity();
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
      const galleryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (cameraStatus.status !== 'granted' || galleryStatus.status !== 'granted') {
        Alert.alert(
          'Permissions Required',
          'We require camera and library accesses to diagnose crops leaves.'
        );
        return false;
      }
    }
    return true;
  };

  // Launch Camera
  const handleTakePhoto = async () => {
    await checkConnectivity();
    if (!isOnline) {
      Alert.alert('Offline Mode', 'Disease leaf scanning requires active internet connection.');
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setImageUri(uri);
        await runDiagnosis(uri);
      }
    } catch (err) {
      console.error('Error taking photo:', err);
      Alert.alert('Camera Error', 'Could not open camera.');
    }
  };

  // Launch Gallery
  const handleSelectPhoto = async () => {
    await checkConnectivity();
    if (!isOnline) {
      Alert.alert('Offline Mode', 'Disease leaf scanning requires active internet connection.');
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setImageUri(uri);
        await runDiagnosis(uri);
      }
    } catch (err) {
      console.error('Error picking image:', err);
      Alert.alert('Gallery Error', 'Could not open photo library.');
    }
  };

  // Perform leaf diagnosis
  const runDiagnosis = async (uri: string) => {
    setLoading(true);
    setAnalysisResult(null);

    try {
      // Analyze leaf via API
      const result = await krishiApi.analyzeCropLeaf(uri);
      
      // Save result locally in SQLite
      await database.saveScanOffline(
        result.disease_name,
        result.confidence,
        result.description,
        [result.treatment, result.prevention],
        uri
      );

      setAnalysisResult({
        diseaseName: result.disease_name,
        confidence: result.confidence,
        severity: result.severity || 'Moderate',
        treatment: result.treatment,
        prevention: result.prevention,
        description: result.description,
      });

      // Reload local scans history
      await loadHistory();
    } catch (err) {
      console.error('Analysis failed:', err);
      Alert.alert(
        'Analysis Error',
        'Could not complete leaf scanning. Please try again when server is active.'
      );
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (sev: string) => {
    if (sev === 'Mild') return '#16a34a';
    if (sev === 'Moderate') return '#f59e0b';
    return '#dc2626';
  };

  return (
    <View style={styles.container}>
      <LoadingSpinner visible={loading} message="Analyzing Crop Leaf..." />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Connection Notice */}
        {!isOnline && (
          <View style={styles.alertBanner}>
            <Ionicons name="cloud-offline-outline" size={18} color="#b91c1c" />
            <Text style={styles.alertBannerText}>Disease scan requires active internet</Text>
          </View>
        )}

        {/* Top Scanner viewfinder mock */}
        <View style={styles.scanHeaderCard}>
          <Text style={styles.heading}>AI Crop Diagnostician</Text>
          <Text style={styles.subheading}>Instant disease detection & plant remediation advisory.</Text>

          <View style={styles.viewfinderContainer}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.capturedImage as any} />
            ) : (
              <View style={styles.cameraPlaceholder}>
                <Ionicons name="camera-outline" size={48} color="#15803d" />
                <Text style={styles.placeholderLabel}>Place leaf here</Text>
                <Text style={styles.placeholderSub}>Ensure proper lighting & focused leaf surface</Text>
              </View>
            )}
            
            {/* Viewfinder borders */}
            <View style={[styles.cornerBorder, styles.topLeft]} />
            <View style={[styles.cornerBorder, styles.topRight]} />
            <View style={[styles.cornerBorder, styles.bottomLeft]} />
            <View style={[styles.cornerBorder, styles.bottomRight]} />
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, !isOnline && styles.actionBtnDisabled]}
              onPress={handleTakePhoto}
              disabled={!isOnline}
            >
              <Ionicons name="camera" size={20} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtnSecondary, !isOnline && styles.actionBtnDisabled]}
              onPress={handleSelectPhoto}
              disabled={!isOnline}
            >
              <Ionicons name="image" size={20} color="#15803d" style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnTextSecondary}>Upload Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Diagnosis Result Card */}
        {analysisResult && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeaderRow}>
              <View style={styles.headerInfo}>
                <Text style={styles.resultBadge}>DIAGNOSIS REPORT</Text>
                <Text style={styles.diseaseName}>{analysisResult.diseaseName}</Text>
              </View>
              <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(analysisResult.severity) + '20' }]}>
                <Text style={[styles.severityText, { color: getSeverityColor(analysisResult.severity) }]}>
                  {analysisResult.severity}
                </Text>
              </View>
            </View>

            <View style={styles.confidenceGaugeRow}>
              <Text style={styles.confidenceLabel}>Confidence Score: </Text>
              <Text style={styles.confidenceVal}>{(analysisResult.confidence * 100).toFixed(0)}%</Text>
            </View>

            <Text style={styles.descHeading}>Pathological Profile:</Text>
            <Text style={styles.descText}>{analysisResult.description}</Text>

            <View style={styles.adviceContainer}>
              <View style={styles.adviceItem}>
                <Ionicons name="checkmark-circle" size={18} color="#16a34a" style={{ marginRight: 8, marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.adviceLabel}>Remedial Treatment</Text>
                  <Text style={styles.adviceContent}>{analysisResult.treatment}</Text>
                </View>
              </View>

              <View style={styles.adviceItem}>
                <Ionicons name="shield-checkmark" size={18} color="#3b82f6" style={{ marginRight: 8, marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.adviceLabel}>Preventative Strategy</Text>
                  <Text style={styles.adviceContent}>{analysisResult.prevention}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Diagnosis History list */}
        <View style={styles.historySection}>
          <Text style={styles.historyHeading}>Diagnoses History ({history.length})</Text>
          {history.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>Your scan diagnoses will be saved here offline.</Text>
            </View>
          ) : (
            history.map((item) => (
              <View key={item.id.toString()} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyDisease}>{item.disease_name}</Text>
                  <Text style={styles.historyDate}>
                    {new Date(item.timestamp).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.historyDesc} numberOfLines={2}>{item.description}</Text>
                <View style={styles.historySubRow}>
                  <Text style={styles.historyConfidence}>
                    Match Score: <Text style={{ fontWeight: '700' }}>{(item.confidence * 100).toFixed(0)}%</Text>
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                </View>
              </View>
            ))
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
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  alertBannerText: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
  scanHeaderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  heading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  subheading: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 16,
  },
  viewfinderContainer: {
    height: 220,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  cameraPlaceholder: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  placeholderLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 8,
  },
  placeholderSub: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
  capturedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cornerBorder: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#15803d',
  },
  topLeft: {
    top: 12,
    left: 12,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 12,
    right: 12,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 12,
    left: 12,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 12,
    right: 12,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 48,
    borderRadius: 12,
    backgroundColor: '#15803d',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#15803d',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  actionBtnDisabled: {
    backgroundColor: '#cbd5e1',
    borderColor: '#cbd5e1',
  },
  actionBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  actionBtnTextSecondary: {
    color: '#15803d',
    fontWeight: '700',
    fontSize: 14,
  },
  resultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    borderWidth: 1.5,
    borderColor: '#dcfce7',
  },
  resultHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerInfo: {
    flex: 1,
    marginRight: 8,
  },
  resultBadge: {
    fontSize: 10,
    fontWeight: '900',
    color: '#15803d',
    letterSpacing: 1,
  },
  diseaseName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  severityBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '800',
  },
  confidenceGaugeRow: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 16,
  },
  confidenceLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  confidenceVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803d',
  },
  descHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  descText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 16,
  },
  adviceContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
  },
  adviceItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  adviceLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1e293b',
  },
  adviceContent: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
    lineHeight: 18,
  },
  historySection: {
    marginTop: 24,
  },
  historyHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  emptyHistory: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyHistoryText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyDisease: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  historyDate: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  historyDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  historySubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
    paddingTop: 8,
  },
  historyConfidence: {
    fontSize: 11,
    color: '#64748b',
  },
});

export default ScanScreen;
