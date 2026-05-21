import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { krishiApi, MandiPrice } from '../services/api';
import { localStore } from '../services/storage';
import offlineSync from '../utils/offline';
import LoadingSpinner from '../components/LoadingSpinner';

const STATES = ['Punjab', 'Haryana', 'Uttar Pradesh', 'Maharashtra', 'Karnataka', 'Gujarat'];
const COMMODITIES = ['Wheat', 'Paddy', 'Potato', 'Onion', 'Tomato', 'Cotton'];

export const MarketScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [selectedState, setSelectedState] = useState('Punjab');
  const [selectedCommodity, setSelectedCommodity] = useState('Wheat');
  const [mandiRates, setMandiRates] = useState<MandiPrice[]>([]);
  const [lastCachedTime, setLastCachedTime] = useState<string | null>(null);

  const loadCachedRates = async () => {
    try {
      const cacheStr = await localStore.getData<string>('@mandi_cache_time');
      const cacheRates = await localStore.getData<MandiPrice[]>('@mandi_rates');
      if (cacheRates) {
        setMandiRates(cacheRates);
      }
      if (cacheStr) {
        setLastCachedTime(cacheStr);
      }
    } catch (e) {
      console.error('Failed to load cached mandi rates:', e);
    }
  };

  const checkConnectivity = async () => {
    const online = await offlineSync.isConnected();
    setIsOnline(online);
  };

  useEffect(() => {
    checkConnectivity();
    loadCachedRates();
  }, []);

  const handleSearch = async () => {
    setLoading(true);
    await checkConnectivity();

    try {
      const isOnlineNow = await offlineSync.isConnected();
      setIsOnline(isOnlineNow);

      const rates = await krishiApi.getMandiPrices(selectedState, selectedCommodity);
      setMandiRates(rates);

      // Save to cache for offline availability
      const timestamp = new Date().toLocaleString();
      await localStore.saveData('@mandi_rates', rates);
      await localStore.saveData('@mandi_cache_time', timestamp);
      setLastCachedTime(timestamp);
    } catch (error) {
      console.warn('Market prices search failed, rendering cached records:', error);
      Alert.alert(
        'Offline Mode',
        'Could not fetch live rates. Showing cached market values.'
      );
      await loadCachedRates();
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <Ionicons name="trending-up" size={16} color="#16a34a" />;
    if (trend === 'down') return <Ionicons name="trending-down" size={16} color="#dc2626" />;
    return <Ionicons name="remove" size={16} color="#64748b" />;
  };

  return (
    <View style={styles.container}>
      <LoadingSpinner visible={loading} message="Searching Mandi Rates..." />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Filters Card */}
        <View style={styles.filtersCard}>
          <Text style={styles.heading}>Indian Mandi Price Board</Text>
          <Text style={styles.subheading}>Filter by state and crop commodity to check live market trends.</Text>

          {/* State selector chips */}
          <Text style={styles.filterLabel}>Select State</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {STATES.map((st) => (
              <TouchableOpacity
                key={st}
                style={[styles.chip, selectedState === st && styles.chipActive]}
                onPress={() => setSelectedState(st)}
              >
                <Text style={[styles.chipText, selectedState === st && styles.chipTextActive]}>{st}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Commodity selector chips */}
          <Text style={styles.filterLabel}>Select Commodity</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {COMMODITIES.map((cd) => (
              <TouchableOpacity
                key={cd}
                style={[styles.chip, selectedCommodity === cd && styles.chipActive]}
                onPress={() => setSelectedCommodity(cd)}
              >
                <Text style={[styles.chipText, selectedCommodity === cd && styles.chipTextActive]}>{cd}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
            <Ionicons name="search" size={18} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.searchBtnText}>Search Market Rates</Text>
          </TouchableOpacity>
        </View>

        {/* Cache status info */}
        {lastCachedTime && (
          <View style={styles.cacheNotice}>
            <Ionicons name="time-outline" size={14} color="#64748b" />
            <Text style={styles.cacheNoticeText}>Rates Cached at: {lastCachedTime}</Text>
          </View>
        )}

        {/* Mandi Rates Table Display */}
        <View style={styles.tableSection}>
          <Text style={styles.tableHeading}>Mandi Market Rates</Text>
          {mandiRates.length === 0 ? (
            <View style={styles.emptyTable}>
              <Ionicons name="cart-outline" size={44} color="#cbd5e1" />
              <Text style={styles.emptyText}>No rates found. Perform a search to sync data.</Text>
            </View>
          ) : (
            mandiRates.map((item, idx) => (
              <View key={item.id || idx.toString()} style={styles.rateCard}>
                <View style={styles.rateCardHeader}>
                  <View>
                    <Text style={styles.rateCropName}>{item.crop_name}</Text>
                    <Text style={styles.rateMarket}>
                      📍 {item.market_name}, {item.state}
                    </Text>
                  </View>
                  <View style={styles.trendContainer}>
                    {getTrendIcon(item.trend || 'stable')}
                    <Text style={[styles.trendText, item.trend === 'up' ? { color: '#16a34a' } : item.trend === 'down' ? { color: '#dc2626' } : { color: '#64748b' }]}>
                      {item.trend === 'up' ? 'Upward' : item.trend === 'down' ? 'Downward' : 'Stable'}
                    </Text>
                  </View>
                </View>

                <View style={styles.priceGrid}>
                  <View style={styles.priceItem}>
                    <Text style={styles.priceLabel}>Min Rate</Text>
                    <Text style={styles.priceValue}>₹{item.min_price}</Text>
                  </View>
                  <View style={[styles.priceItem, styles.modalPriceBorder]}>
                    <Text style={[styles.priceLabel, { color: '#15803d', fontWeight: '800' }]}>Modal Rate</Text>
                    <Text style={[styles.priceValue, { color: '#15803d', fontSize: 18 }]}>₹{item.modal_price}</Text>
                  </View>
                  <View style={styles.priceItem}>
                    <Text style={styles.priceLabel}>Max Rate</Text>
                    <Text style={styles.priceValue}>₹{item.max_price}</Text>
                  </View>
                </View>
                
                <Text style={styles.quintalUnit}>Rates shown in ₹ per Quintal (100 kg)</Text>
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
  filtersCard: {
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
    lineHeight: 16,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 6,
  },
  chipScroll: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: {
    backgroundColor: '#15803d',
    borderColor: '#15803d',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  searchBtn: {
    backgroundColor: '#15803d',
    flexDirection: 'row',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  searchBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  cacheNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  cacheNoticeText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginLeft: 6,
  },
  tableSection: {
    marginTop: 24,
  },
  tableHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  emptyTable: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
  },
  rateCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
      android: {
        elevation: 1,
      },
    }),
  },
  rateCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10,
  },
  rateCropName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  rateMarket: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  priceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  priceItem: {
    flex: 1,
    alignItems: 'center',
  },
  modalPriceBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#f1f5f9',
  },
  priceLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#334155',
    marginTop: 4,
  },
  quintalUnit: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
  },
});

export default MarketScreen;
