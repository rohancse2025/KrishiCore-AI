import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient'; // beautiful background gradients
import { localStore } from '../services/storage';
import { krishiApi, WeatherForecast } from '../services/api';
import { Farmer } from '../types';

export const HomeScreen: React.FC = () => {
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState('en');

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const storedLang = await localStore.getLanguage();
        setLang(storedLang);

        const profile = await localStore.getFarmerProfile();
        setFarmer(profile);

        // Fetch weather for farmer location
        const locationStr = profile?.location || 'Punjab, IN';
        const weatherData = await krishiApi.getWeatherForecast(locationStr);
        setWeather(weatherData);
      } catch (err) {
        console.error('Error loading home data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#15803d" />
      </View>
    );
  }

  // Language mapping
  const t = {
    greeting: lang === 'en' ? 'Namaste' : 'नमस्ते',
    subtitle: lang === 'en' ? 'Here is your farm summary' : 'यह आपके खेत का विवरण है',
    weatherTitle: lang === 'en' ? 'Weather Forecast' : 'मौसम पूर्वानुमान',
    soilMoisture: lang === 'en' ? 'Soil Moisture' : 'मिट्टी की नमी',
    humidity: lang === 'en' ? 'Humidity' : 'हवा में नमी',
    temp: lang === 'en' ? 'Temperature' : 'तापमान',
    wind: lang === 'en' ? 'Wind Speed' : 'हवा की गति',
    activeCrops: lang === 'en' ? 'Active Crops' : 'सक्रिय फसलें',
    acres: lang === 'en' ? 'acres' : 'एकड़',
    scanshortcut: lang === 'en' ? 'AI Disease Scan' : 'एआई रोग जांच',
    scanbtn: lang === 'en' ? 'Scan Now' : 'अभी स्कैन करें',
    advisory: lang === 'en' ? 'KrishiNova AI Advisory' : 'कृषिनोवा एआई सलाह',
    tipTitle: lang === 'en' ? 'Crop Care Tip' : 'फसल देखभाल टिप',
    tipText: lang === 'en' 
      ? 'High temperature expected. Irrigating your Rice crop in the early hours is recommended to minimize water loss.'
      : 'उच्च तापमान की संभावना है। पानी के नुकसान को कम करने के लिए सुबह के समय धान की फसल की सिंचाई करने की सलाह दी जाती है।',
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Dynamic Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{t.greeting}, {farmer?.name || 'Kisan'} 👋</Text>
          <Text style={styles.locationSub}>
            <Ionicons name="location" size={14} color="#15803d" /> {farmer?.location || 'India'}
          </Text>
        </View>
        <View style={styles.profileBadge}>
          <Ionicons name="person" size={22} color="#15803d" />
        </View>
      </View>

      {/* Advisory Banner (Linear Gradient) */}
      <View style={styles.gradientContainer}>
        <LinearGradient
          colors={['#15803d', '#166534']}
          style={styles.advisoryCard}
        >
          <View style={styles.advisoryHeader}>
            <Ionicons name="sparkles" size={20} color="#fef08a" />
            <Text style={styles.advisoryTitle}>{t.advisory}</Text>
          </View>
          <Text style={styles.advisorySubtitle}>{t.tipTitle}</Text>
          <Text style={styles.advisoryBody}>{t.tipText}</Text>
        </LinearGradient>
      </View>

      {/* IoT Quick Summary Grid */}
      <Text style={styles.sectionTitle}>{lang === 'en' ? 'Live Farm Telemetry' : 'लाइव फार्म टेलीमेट्री'}</Text>
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Ionicons name="water" size={28} color="#0284c7" />
          <Text style={styles.metricLabel}>{t.soilMoisture}</Text>
          <Text style={styles.metricVal}>42%</Text>
          <Text style={[styles.metricAlert, { color: '#16a34a' }]}>
            {lang === 'en' ? '● Optimal' : '● उत्तम'}
          </Text>
        </View>

        <View style={styles.metricCard}>
          <Ionicons name="thermometer" size={28} color="#dc2626" />
          <Text style={styles.metricLabel}>{t.temp}</Text>
          <Text style={styles.metricVal}>{weather?.temp}°C</Text>
          <Text style={[styles.metricAlert, { color: '#d97706' }]}>
            {lang === 'en' ? '● Warm' : '● गर्म'}
          </Text>
        </View>

        <View style={styles.metricCard}>
          <Ionicons name="cloudy" size={28} color="#0d9488" />
          <Text style={styles.metricLabel}>{t.humidity}</Text>
          <Text style={styles.metricVal}>{weather?.humidity}%</Text>
          <Text style={[styles.metricAlert, { color: '#16a34a' }]}>
            {lang === 'en' ? '● Good' : '● अच्छा'}
          </Text>
        </View>
      </View>

      {/* Weather Forecast Widget */}
      <View style={styles.weatherCard}>
        <View style={styles.weatherHeader}>
          <Text style={styles.weatherTitle}>{t.weatherTitle}</Text>
          <Text style={styles.weatherCondition}>{weather?.condition}</Text>
        </View>

        <View style={styles.weatherRow}>
          <View style={styles.weatherItem}>
            <Ionicons name="speedometer-outline" size={20} color="#475569" />
            <Text style={styles.weatherLabel}>{t.wind}</Text>
            <Text style={styles.weatherSubVal}>{weather?.wind_speed} km/h</Text>
          </View>
          <View style={styles.weatherItemDivider} />
          <View style={styles.weatherItem}>
            <Ionicons name="rainy-outline" size={20} color="#475569" />
            <Text style={styles.weatherLabel}>{lang === 'en' ? 'Rain Chance' : 'बारिश की संभावना'}</Text>
            <Text style={styles.weatherSubVal}>12%</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.forecastScroll}>
          {weather?.forecast.map((item, index) => (
            <View key={index} style={styles.forecastItem}>
              <Text style={styles.forecastDay}>{item.day}</Text>
              <Ionicons 
                name={item.condition.includes('Rain') ? 'rainy' : 'sunny'} 
                size={20} 
                color={item.condition.includes('Rain') ? '#0284c7' : '#eab308'} 
                style={styles.forecastIcon}
              />
              <Text style={styles.forecastTemp}>{item.temp}°C</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Crops Overview */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t.activeCrops}</Text>
        <Text style={styles.acresTotal}>
          {farmer?.farm_size} {t.acres} {lang === 'en' ? 'total' : 'कुल'}
        </Text>
      </View>

      <View style={styles.cropsList}>
        {farmer?.active_crops.map((crop) => (
          <View key={crop.id} style={styles.cropCard}>
            <View style={styles.cropIconWrapper}>
              <Ionicons name="leaf" size={22} color="#15803d" />
            </View>
            <View style={styles.cropInfo}>
              <Text style={styles.cropName}>{crop.crop_name}</Text>
              <Text style={styles.cropPlanted}>
                {lang === 'en' ? 'Planted' : 'बोया गया'}: {crop.planted_date}
              </Text>
            </View>
            <View style={styles.cropAcreage}>
              <Text style={styles.cropSizeVal}>{crop.area}</Text>
              <Text style={styles.cropSizeUnit}>{lang === 'en' ? 'Acres' : 'एकड़'}</Text>
            </View>
          </View>
        ))}
      </View>
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  locationSub: {
    fontSize: 14,
    color: '#475569',
    marginTop: 4,
    fontWeight: '500',
  },
  profileBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#15803d',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  advisoryCard: {
    backgroundColor: '#15803d',
    padding: 20,
  },
  advisoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  advisoryTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  advisorySubtitle: {
    color: '#bbf7d0',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  advisoryBody: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  metricCard: {
    width: '31%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginVertical: 4,
  },
  metricAlert: {
    fontSize: 10,
    fontWeight: '700',
  },
  weatherCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  weatherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  weatherTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  weatherCondition: {
    fontSize: 14,
    color: '#15803d',
    fontWeight: '600',
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
  },
  weatherItem: {
    alignItems: 'center',
    flex: 1,
  },
  weatherItemDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#cbd5e1',
  },
  weatherLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 4,
  },
  weatherSubVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  forecastScroll: {
    flexDirection: 'row',
  },
  forecastItem: {
    alignItems: 'center',
    marginRight: 16,
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    width: 65,
  },
  forecastDay: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  forecastIcon: {
    marginVertical: 6,
  },
  forecastTemp: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  acresTotal: {
    fontSize: 13,
    color: '#15803d',
    fontWeight: '700',
  },
  cropsList: {
    marginBottom: 16,
  },
  cropCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cropIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cropInfo: {
    flex: 1,
  },
  cropName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  cropPlanted: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  cropAcreage: {
    alignItems: 'flex-end',
  },
  cropSizeVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#15803d',
  },
  cropSizeUnit: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
});

export default HomeScreen;
