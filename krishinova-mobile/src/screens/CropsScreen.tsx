import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { database } from '../services/database';
import { localStore } from '../services/storage';
import { krishiApi } from '../services/api';
import { Crop } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import offlineSync from '../utils/offline';

export const CropsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ml' | 'active' | 'calc'>('active');
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [lang, setLang] = useState('en');

  // Active Crops Form State
  const [newCropName, setNewCropName] = useState('');
  const [plantedDate, setPlantedDate] = useState(new Date().toISOString().split('T')[0]);
  const [area, setArea] = useState('');

  // ML Rec Form State
  const [n, setN] = useState('60');
  const [p, setP] = useState('45');
  const [k, setK] = useState('40');
  const [temp, setTemp] = useState('28');
  const [humidity, setHumidity] = useState('70');
  const [ph, setPh] = useState('6.5');
  const [rainfall, setRainfall] = useState('150');
  const [recommendation, setRecommendation] = useState<{ cropName: string; confidence: number; reason: string } | null>(null);

  // Fertilizer Calc State
  const [calcCrop, setCalcCrop] = useState('Wheat');
  const [calcArea, setCalcArea] = useState('2');
  const [calcResult, setCalcResult] = useState<{ n: number; p: number; k: number } | null>(null);

  const loadCrops = async () => {
    setLoading(true);
    try {
      const storedLang = await localStore.getLanguage();
      setLang(storedLang);
      const dbCrops = await database.getCropsOffline();
      setCrops(dbCrops);
    } catch (error) {
      console.error('Failed to load crops:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCrops();
  }, []);

  const handleAddCrop = async () => {
    if (!newCropName.trim() || !plantedDate.trim() || !area.trim()) {
      Alert.alert('Incomplete Form', 'Please fill out all fields.');
      return;
    }

    const newCrop: Crop = {
      id: Math.random().toString(36).substring(7),
      crop_name: newCropName.trim(),
      planted_date: plantedDate.trim(),
      area: parseFloat(area) || 0,
    };

    setLoading(true);
    try {
      await database.saveCropOffline(newCrop);
      
      // Update local storage farmer profile representation
      const profile = await localStore.getFarmerProfile();
      if (profile) {
        profile.active_crops = [...profile.active_crops, newCrop];
        await localStore.saveFarmerProfile(profile);
      }

      setNewCropName('');
      setArea('');
      setModalVisible(false);
      await loadCrops();
      
      Alert.alert('Success', 'New crop added to your portfolio.');
    } catch (e) {
      console.error('Error saving crop:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCrop = async (id: string) => {
    Alert.alert(
      'Remove Crop',
      'Are you sure you want to remove this crop from your portfolio?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await database.deleteCropOffline(id);
              
              // Sync local store
              const profile = await localStore.getFarmerProfile();
              if (profile) {
                profile.active_crops = profile.active_crops.filter(c => c.id !== id);
                await localStore.saveFarmerProfile(profile);
              }
              
              await loadCrops();
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

  // ML Rec handler
  const handleGetRecommendation = async () => {
    setLoading(true);
    setRecommendation(null);
    const params = {
      n: parseFloat(n) || 0,
      p: parseFloat(p) || 0,
      k: parseFloat(k) || 0,
      temp: parseFloat(temp) || 0,
      humidity: parseFloat(humidity) || 0,
      ph: parseFloat(ph) || 0,
      rainfall: parseFloat(rainfall) || 0,
    };

    try {
      const isOnline = await offlineSync.isConnected();
      if (isOnline) {
        const result = await krishiApi.getCropRecommendation(params);
        setRecommendation({
          cropName: result.crop_name,
          confidence: result.confidence,
          reason: result.reason,
        });
      } else {
        throw new Error('OFFLINE_MODE');
      }
    } catch (error) {
      console.warn('Recommendation API offline, executing smart rule-based local model');
      // Rule-based logic
      let cropName = 'Maize (Corn)';
      let reason = 'Suitable for moderate temperatures with balanced NPK levels and standard watering.';
      let confidence = 0.85;

      const rainVal = params.rainfall;
      const phVal = params.ph;
      const nVal = params.n;

      if (rainVal > 200) {
        cropName = 'Rice (Paddy)';
        reason = 'Rice requires high water retention and heavy rainfall (>200mm).';
        confidence = 0.96;
      } else if (rainVal < 80) {
        cropName = 'Millet (Bajra)';
        reason = 'Arid soil with low rainfall (<80mm) is extremely ideal for drought-resistant Millets.';
        confidence = 0.91;
      } else if (phVal < 5.5) {
        cropName = 'Tea (Chai)';
        reason = 'Acidic soils with pH under 5.5 favor high-quality highland tea foliage.';
        confidence = 0.89;
      } else if (nVal > 80) {
        cropName = 'Cotton (Kapas)';
        reason = 'Cotton is a heavy feeder requiring high soil nitrogen concentrations (>80).';
        confidence = 0.93;
      } else if (rainVal >= 100 && rainVal <= 200) {
        cropName = 'Wheat (Kanak)';
        reason = 'Moderate moisture and rich loam characteristics are prime indicators for spring wheat.';
        confidence = 0.95;
      }

      setRecommendation({ cropName, confidence, reason });
    } finally {
      setLoading(false);
    }
  };

  // Fertilizer Calculator dosage rules
  const handleCalculateDosage = () => {
    const areaAcres = parseFloat(calcArea) || 0;
    if (areaAcres <= 0) {
      Alert.alert('Invalid Area', 'Please enter a valid farm area in acres.');
      return;
    }

    // Average NPK recommended standard ratios per acre (in kg)
    let nPerAcre = 50;
    let pPerAcre = 25;
    let kPerAcre = 20;

    switch (calcCrop) {
      case 'Rice':
        nPerAcre = 48; pPerAcre = 24; kPerAcre = 24;
        break;
      case 'Wheat':
        nPerAcre = 50; pPerAcre = 25; kPerAcre = 15;
        break;
      case 'Sugarcane':
        nPerAcre = 100; pPerAcre = 32; kPerAcre = 32;
        break;
      case 'Cotton':
        nPerAcre = 60; pPerAcre = 30; kPerAcre = 30;
        break;
      case 'Potato':
        nPerAcre = 60; pPerAcre = 40; kPerAcre = 50;
        break;
    }

    setCalcResult({
      n: Math.round(nPerAcre * areaAcres),
      p: Math.round(pPerAcre * areaAcres),
      k: Math.round(kPerAcre * areaAcres),
    });
  };

  const getEstimatedGrowth = (planted: string) => {
    const plantedMs = new Date(planted).getTime();
    const todayMs = new Date().getTime();
    const diffDays = Math.max(0, Math.floor((todayMs - plantedMs) / (1000 * 60 * 60 * 24)));
    const cycle = 120; // 120-day standard cycle
    const pct = Math.min(100, Math.floor((diffDays / cycle) * 100));
    const harvestDays = Math.max(0, cycle - diffDays);
    return { pct, days: diffDays, harvestDays };
  };

  return (
    <View style={styles.container}>
      <LoadingSpinner visible={loading} message="Processing..." />
      
      {/* Top Tab Bar Navigation */}
      <View style={styles.tabsHeader}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'active' && styles.tabBtnActive]}
          onPress={() => setActiveTab('active')}
        >
          <Ionicons name="leaf-outline" size={16} color={activeTab === 'active' ? '#15803d' : '#64748b'} />
          <Text style={[styles.tabBtnText, activeTab === 'active' && styles.tabBtnTextActive]}>Active Crops</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'ml' && styles.tabBtnActive]}
          onPress={() => setActiveTab('ml')}
        >
          <Ionicons name="git-network-outline" size={16} color={activeTab === 'ml' ? '#15803d' : '#64748b'} />
          <Text style={[styles.tabBtnText, activeTab === 'ml' && styles.tabBtnTextActive]}>ML Advice</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'calc' && styles.tabBtnActive]}
          onPress={() => setActiveTab('calc')}
        >
          <Ionicons name="calculator-outline" size={16} color={activeTab === 'calc' ? '#15803d' : '#64748b'} />
          <Text style={[styles.tabBtnText, activeTab === 'calc' && styles.tabBtnTextActive]}>NPK Calc</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Contents */}
      {activeTab === 'active' && (
        <View style={{ flex: 1 }}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionHeading}>My Active Crops</Text>
            <TouchableOpacity style={styles.headerAddBtn} onPress={() => setModalVisible(true)}>
              <Ionicons name="add" size={16} color="#ffffff" />
              <Text style={styles.headerAddBtnText}>Add Crop</Text>
            </TouchableOpacity>
          </View>

          {crops.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="leaf" size={56} color="#cbd5e1" />
              <Text style={styles.emptyText}>No active crops registered yet.</Text>
              <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setModalVisible(true)}>
                <Text style={styles.emptyAddBtnText}>Add Your First Crop</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={crops}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
              renderItem={({ item }) => {
                const { pct, days, harvestDays } = getEstimatedGrowth(item.planted_date);
                return (
                  <View style={styles.cropCard}>
                    <View style={styles.cropCardHeader}>
                      <View style={styles.cropIconName}>
                        <View style={styles.leafCircle}>
                          <Ionicons name="leaf" size={16} color="#15803d" />
                        </View>
                        <Text style={styles.cropName}>{item.crop_name}</Text>
                      </View>
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteCrop(item.id)}>
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.cropDetailsRow}>
                      <Text style={styles.detailsText}>📏 Area: <Text style={styles.bold}>{item.area} Acres</Text></Text>
                      <Text style={styles.detailsText}>📅 Planted: <Text style={styles.bold}>{item.planted_date}</Text></Text>
                    </View>

                    <View style={styles.progressContainer}>
                      <View style={styles.progressLabelRow}>
                        <Text style={styles.progressLabel}>Estimated Progress</Text>
                        <Text style={styles.progressPercent}>{pct}%</Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressIndicator, { width: `${pct}%` }]} />
                      </View>
                      <Text style={styles.countdownText}>
                        🌱 {days} days in soil • ⏳ <Text style={styles.harvestHighlight}>{harvestDays} days to harvest</Text>
                      </Text>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
      )}

      {activeTab === 'ml' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContainer}>
          <Text style={styles.tabHeading}>ML Soil Suitability</Text>
          <Text style={styles.tabSubheading}>Provide your soil analysis credentials to check recommended crops.</Text>

          <View style={styles.gridContainer}>
            <View style={styles.gridItem}>
              <Text style={styles.inputLabel}>Nitrogen (N)</Text>
              <TextInput style={styles.gridInput} keyboardType="numeric" value={n} onChangeText={setN} />
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.inputLabel}>Phosphorus (P)</Text>
              <TextInput style={styles.gridInput} keyboardType="numeric" value={p} onChangeText={setP} />
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.inputLabel}>Potassium (K)</Text>
              <TextInput style={styles.gridInput} keyboardType="numeric" value={k} onChangeText={setK} />
            </View>
          </View>

          <View style={styles.gridContainer}>
            <View style={styles.gridItem}>
              <Text style={styles.inputLabel}>Temperature (°C)</Text>
              <TextInput style={styles.gridInput} keyboardType="numeric" value={temp} onChangeText={setTemp} />
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.inputLabel}>Humidity (%)</Text>
              <TextInput style={styles.gridInput} keyboardType="numeric" value={humidity} onChangeText={setHumidity} />
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.inputLabel}>Soil pH</Text>
              <TextInput style={styles.gridInput} keyboardType="numeric" value={ph} onChangeText={setPh} />
            </View>
          </View>

          <View style={styles.fullWidthItem}>
            <Text style={styles.inputLabel}>Rainfall (mm)</Text>
            <TextInput style={styles.gridInput} keyboardType="numeric" value={rainfall} onChangeText={setRainfall} />
          </View>

          <TouchableOpacity style={styles.recBtn} onPress={handleGetRecommendation}>
            <Ionicons name="rocket-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.recBtnText}>Get Recommendation</Text>
          </TouchableOpacity>

          {recommendation && (
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Ionicons name="sparkles" size={20} color="#15803d" />
                <Text style={styles.resultTitle}>Best Recommended Crop</Text>
              </View>
              <Text style={styles.resultCropName}>{recommendation.cropName}</Text>
              
              <View style={styles.confidenceRow}>
                <Text style={styles.confidenceLabel}>Confidence Match Rate: </Text>
                <Text style={styles.confidenceValue}>{(recommendation.confidence * 100).toFixed(0)}%</Text>
              </View>
              
              <Text style={styles.resultReasonLabel}>Ecological Justification:</Text>
              <Text style={styles.resultReason}>{recommendation.reason}</Text>
            </View>
          )}
        </ScrollView>
      )}

      {activeTab === 'calc' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContainer}>
          <Text style={styles.tabHeading}>NPK Dosage Calculator</Text>
          <Text style={styles.tabSubheading}>Calculate perfect mineral quantities for your farm dimensions offline.</Text>

          <Text style={styles.inputLabel}>Select Target Crop</Text>
          <View style={styles.dropdownContainer}>
            {['Wheat', 'Rice', 'Sugarcane', 'Cotton', 'Potato'].map(crop => (
              <TouchableOpacity
                key={crop}
                style={[styles.chip, calcCrop === crop && styles.chipActive]}
                onPress={() => setCalcCrop(crop)}
              >
                <Text style={[styles.chipText, calcCrop === crop && styles.chipTextActive]}>{crop}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>Farm Land Area (Acres)</Text>
          <TextInput
            style={styles.gridInput}
            keyboardType="numeric"
            placeholder="Enter Acres"
            value={calcArea}
            onChangeText={setCalcArea}
          />

          <TouchableOpacity style={styles.recBtn} onPress={handleCalculateDosage}>
            <Ionicons name="calculator" size={20} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.recBtnText}>Calculate Mineral Dosage</Text>
          </TouchableOpacity>

          {calcResult && (
            <View style={styles.dosageCard}>
              <Text style={styles.dosageTitle}>Required Nutrition Breakdown</Text>
              <Text style={styles.dosageSubTitle}>For {calcArea} Acres of {calcCrop}</Text>
              
              <View style={styles.mineralRow}>
                <View style={[styles.mineralBadge, { backgroundColor: '#fee2e2' }]}>
                  <Text style={[styles.mineralCode, { color: '#ef4444' }]}>N</Text>
                </View>
                <Text style={styles.mineralName}>Nitrogen</Text>
                <Text style={styles.mineralWeight}>{calcResult.n} kg</Text>
              </View>

              <View style={styles.mineralRow}>
                <View style={[styles.mineralBadge, { backgroundColor: '#dbeafe' }]}>
                  <Text style={[styles.mineralCode, { color: '#3b82f6' }]}>P</Text>
                </View>
                <Text style={styles.mineralName}>Phosphorus</Text>
                <Text style={styles.mineralWeight}>{calcResult.p} kg</Text>
              </View>

              <View style={styles.mineralRow}>
                <View style={[styles.mineralBadge, { backgroundColor: '#fef3c7' }]}>
                  <Text style={[styles.mineralCode, { color: '#f59e0b' }]}>K</Text>
                </View>
                <Text style={styles.mineralName}>Potassium</Text>
                <Text style={styles.mineralWeight}>{calcResult.k} kg</Text>
              </View>

              <View style={styles.calcAdvisory}>
                <Ionicons name="information-circle-outline" size={16} color="#64748b" style={{ marginRight: 6 }} />
                <Text style={styles.advisoryText}>Apply Nitrogen in 3 split doses for optimized absorption.</Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Add Crop Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register New Crop</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <Text style={styles.fieldLabel}>Crop Name (e.g. Rice, Sugarcane)</Text>
              <TextInput style={styles.modalInput} placeholder="Enter Crop" value={newCropName} onChangeText={setNewCropName} />

              <Text style={styles.fieldLabel}>Planted Date (YYYY-MM-DD)</Text>
              <TextInput style={styles.modalInput} value={plantedDate} onChangeText={setPlantedDate} />

              <Text style={styles.fieldLabel}>Land Area (Acres)</Text>
              <TextInput style={styles.modalInput} keyboardType="numeric" placeholder="Enter Area" value={area} onChangeText={setArea} />

              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleAddCrop}>
                <Text style={styles.modalSubmitBtnText}>Save Crop Info</Text>
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
  tabsHeader: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: '#dcfce7',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginLeft: 6,
  },
  tabBtnTextActive: {
    color: '#15803d',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#15803d',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  headerAddBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 120,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 12,
    fontWeight: '600',
  },
  emptyAddBtn: {
    marginTop: 16,
    backgroundColor: '#dcfce7',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  emptyAddBtnText: {
    color: '#15803d',
    fontWeight: '700',
    fontSize: 14,
  },
  cropCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cropCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cropIconName: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leafCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cropName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  deleteBtn: {
    padding: 4,
  },
  cropDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10,
  },
  detailsText: {
    fontSize: 13,
    color: '#64748b',
  },
  bold: {
    fontWeight: '700',
    color: '#334155',
  },
  progressContainer: {
    marginTop: 12,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressIndicator: {
    height: '100%',
    backgroundColor: '#16a34a',
  },
  countdownText: {
    fontSize: 11,
    color: '#475569',
    marginTop: 8,
    fontWeight: '500',
  },
  harvestHighlight: {
    color: '#c2410c',
    fontWeight: '700',
  },
  formContainer: {
    padding: 20,
  },
  tabHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  tabSubheading: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 18,
  },
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  gridItem: {
    flex: 1,
    marginHorizontal: 4,
  },
  fullWidthItem: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  gridInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
  },
  recBtn: {
    backgroundColor: '#15803d',
    flexDirection: 'row',
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  recBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  resultCard: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#dcfce7',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803d',
    marginLeft: 6,
  },
  resultCropName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#166534',
    marginBottom: 8,
  },
  confidenceRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  confidenceLabel: {
    fontSize: 13,
    color: '#475569',
  },
  confidenceValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803d',
  },
  resultReasonLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
  },
  resultReason: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  dropdownContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    margin: 4,
  },
  chipActive: {
    backgroundColor: '#15803d',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  dosageCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
  },
  dosageTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  dosageSubTitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 16,
  },
  mineralRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  mineralBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  mineralCode: {
    fontWeight: '900',
    fontSize: 14,
  },
  mineralName: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
  mineralWeight: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  calcAdvisory: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  advisoryText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
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

export default CropsScreen;
