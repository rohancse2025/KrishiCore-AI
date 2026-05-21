import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { database } from '../services/database';
import { localStore } from '../services/storage';
import { krishiApi } from '../services/api';
import { Farmer } from '../types';
import offlineSync from '../utils/offline';
import LoadingSpinner from '../components/LoadingSpinner';

interface ProfileScreenProps {
  onLogout: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onLogout }) => {
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [cropCount, setCropCount] = useState(0);
  const [scanCount, setScanCount] = useState(0);

  // Edit Profile Form State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editFarmSize, setEditFarmSize] = useState('');

  const loadProfile = async () => {
    setLoading(true);
    try {
      const online = await offlineSync.isConnected();
      setIsOnline(online);

      // Load cached profile
      const localProfile = await localStore.getFarmerProfile();
      if (localProfile) {
        setFarmer(localProfile);
        setEditName(localProfile.name);
        setEditLocation(localProfile.location);
        setEditFarmSize(localProfile.farm_size.toString());
      }

      // Counts directly from SQLite offline databases
      const crops = await database.getCropsOffline();
      setCropCount(crops.length);

      const scans = await database.getScansOffline();
      setScanCount(scans.length);

      if (online && localProfile) {
        try {
          // Fetch fresh details from API
          const fresh = await krishiApi.getFarmerProfile();
          setFarmer(fresh);
          await localStore.saveFarmerProfile(fresh);
        } catch (apiErr) {
          console.warn('Could not sync with online profile endpoint:', apiErr);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleUpdateProfile = async () => {
    if (!editName.trim() || !editLocation.trim() || !editFarmSize.trim()) {
      Alert.alert('Incomplete Form', 'Please provide values for name, location, and farm dimensions.');
      return;
    }

    const payload = {
      name: editName.trim(),
      location: editLocation.trim(),
      farm_size: parseFloat(editFarmSize) || 0,
    };

    const isNowOnline = await offlineSync.isConnected();
    setIsOnline(isNowOnline);

    if (isNowOnline) {
      setLoading(true);
      try {
        const updated = await krishiApi.updateFarmerProfile(payload);
        setFarmer(updated);
        await localStore.saveFarmerProfile(updated);
        setEditModalVisible(false);
        Alert.alert('Success', 'Profile updated successfully.');
      } catch (err) {
        console.error(err);
        Alert.alert('Update Failed', 'Could not sync update with server.');
      } finally {
        setLoading(false);
      }
    } else {
      // Offline mode -> Queue edit in SQLite and update local cache for instant UI feedback
      if (farmer) {
        const localUpdated: Farmer = {
          ...farmer,
          name: payload.name,
          location: payload.location,
          farm_size: payload.farm_size,
        };
        setFarmer(localUpdated);
        await localStore.saveFarmerProfile(localUpdated);
      }

      await database.addToQueue('/farmers/me', 'PUT', payload);
      setEditModalVisible(false);
      Alert.alert(
        'Offline Mode',
        'Profile modifications saved locally. Changes will sync when online.'
      );
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Database Cache',
      'This will erase all cached crops, diagnoses logs, and sensor telemetry from local databases. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              // Clear SQLite tables
              await database.clearQueue();
              // Re-run DB setup to ensure fresh schemas
              await database.initDatabase();
              
              // Clear AsyncStorage caching items except profiles
              await localStore.clearOfflineScans();
              
              await loadProfile();
              Alert.alert('Cache Cleared', 'All local cached data has been successfully erased.');
            } catch (err) {
              console.error(err);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleLogoutPress = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to end your current session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await localStore.clearSession();
              onLogout();
            } catch (err) {
              console.error(err);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (!farmer) return null;

  return (
    <View style={styles.container}>
      <LoadingSpinner visible={loading} message="Processing profile..." />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Top Avatar Banner */}
        <View style={styles.bannerCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarBorder}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarLetter}>
                  {farmer.name.substring(0, 1).toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.avatarInfo}>
              <Text style={styles.farmerName}>{farmer.name}</Text>
              <Text style={styles.farmerPhone}>📞 {farmer.phone}</Text>
            </View>
          </View>

          <View style={styles.locationDetails}>
            <Ionicons name="location" size={16} color="#15803d" />
            <Text style={styles.locationText}>Farm Location: <Text style={styles.bold}>{farmer.location}</Text></Text>
          </View>
        </View>

        {/* Dynamic Multi Metric Counter Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.badgeIcon, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="leaf" size={20} color="#15803d" />
            </View>
            <Text style={styles.statNumber}>{cropCount}</Text>
            <Text style={styles.statLabel}>Active Crops</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.badgeIcon, { backgroundColor: '#fee2e2' }]}>
              <Ionicons name="scan" size={20} color="#ef4444" />
            </View>
            <Text style={styles.statNumber}>{scanCount}</Text>
            <Text style={styles.statLabel}>Leaf Scans</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.badgeIcon, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="resize" size={20} color="#3b82f6" />
            </View>
            <Text style={styles.statNumber}>{farmer.farm_size}</Text>
            <Text style={styles.statLabel}>Farm Acres</Text>
          </View>
        </View>

        {/* Actions panel */}
        <View style={styles.actionsPanel}>
          <Text style={styles.panelTitle}>Profile & Storage Controls</Text>

          <TouchableOpacity style={styles.panelBtn} onPress={() => setEditModalVisible(true)}>
            <View style={styles.btnLeft}>
              <Ionicons name="create-outline" size={20} color="#15803d" />
              <Text style={styles.btnLabel}>Edit Profile Details</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.panelBtn} onPress={handleClearCache}>
            <View style={styles.btnLeft}>
              <Ionicons name="trash-bin-outline" size={20} color="#dc2626" />
              <Text style={[styles.btnLabel, { color: '#dc2626' }]}>Clear Database Cache</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.panelBtn, { borderBottomWidth: 0 }]} onPress={handleLogoutPress}>
            <View style={styles.btnLeft}>
              <Ionicons name="log-out-outline" size={20} color="#64748b" />
              <Text style={styles.btnLabel}>Log Out Session</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal animationType="slide" transparent={true} visible={editModalVisible} onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modify Profile Details</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <Text style={styles.fieldLabel}>Farmer Full Name</Text>
              <TextInput style={styles.modalInput} value={editName} onChangeText={setEditName} placeholder="Enter Name" />

              <Text style={styles.fieldLabel}>Farm Location (State/District)</Text>
              <TextInput style={styles.modalInput} value={editLocation} onChangeText={setEditLocation} placeholder="Enter Location" />

              <Text style={styles.fieldLabel}>Farm Dimension (Acres)</Text>
              <TextInput style={styles.modalInput} keyboardType="numeric" value={editFarmSize} onChangeText={setEditFarmSize} placeholder="Enter Farm Size" />

              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleUpdateProfile}>
                <Text style={styles.modalSubmitBtnText}>Save Profile Modifications</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  bannerCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 22,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: {
        elevation: 2,
      },
    }),
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBorder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#86efac',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#15803d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
  },
  avatarInfo: {
    marginLeft: 16,
    flex: 1,
  },
  farmerName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  farmerPhone: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 4,
  },
  locationDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  locationText: {
    fontSize: 13,
    color: '#475569',
    marginLeft: 6,
    fontWeight: '600',
  },
  bold: {
    fontWeight: '700',
    color: '#0f172a',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  badgeIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  actionsPanel: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
    marginLeft: 4,
  },
  panelBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingHorizontal: 4,
  },
  btnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginLeft: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalForm: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    height: 48,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalSubmitBtn: {
    backgroundColor: '#15803d',
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  modalSubmitBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
});

export default ProfileScreen;
