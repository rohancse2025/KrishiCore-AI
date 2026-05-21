import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { localStore } from '../services/storage';
import { Farmer } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (farmer: Farmer) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [farmSize, setFarmSize] = useState('');
  const [lang, setLang] = useState('en');

  const handleLogin = async () => {
    if (!name.trim() || !phone.trim() || !location.trim() || !farmSize.trim()) {
      Alert.alert(
        lang === 'en' ? 'Missing Fields' : 'अपूर्ण जानकारी',
        lang === 'en'
          ? 'Please fill in all agricultural registration fields.'
          : 'कृपया सभी पंजीकरण फ़ील्ड भरें।'
      );
      return;
    }

    if (phone.length < 10) {
      Alert.alert(
        lang === 'en' ? 'Invalid Phone' : 'अमान्य फोन नंबर',
        lang === 'en'
          ? 'Please enter a valid 10-digit mobile number.'
          : 'कृपया एक मान्य 10-अंकीय मोबाइल नंबर दर्ज करें।'
      );
      return;
    }

    const mockFarmer: Farmer = {
      id: Math.random().toString(36).substring(7),
      name: name.trim(),
      phone: phone.trim(),
      location: location.trim(),
      farm_size: parseFloat(farmSize) || 0,
      active_crops: [
        { id: '1', crop_name: 'Wheat (गेहूं)', planted_date: '2026-03-10', area: parseFloat(farmSize) * 0.6 },
        { id: '2', crop_name: 'Rice (धान)', planted_date: '2026-04-15', area: parseFloat(farmSize) * 0.4 },
      ],
    };

    await localStore.saveFarmerProfile(mockFarmer);
    await localStore.saveAuthToken('mock_jwt_token_krishinova');
    await localStore.saveLanguage(lang);

    onLoginSuccess(mockFarmer);
  };

  const toggleLanguage = async (selectedLang: string) => {
    setLang(selectedLang);
    await localStore.saveLanguage(selectedLang);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Language Selector */}
        <View style={styles.langContainer}>
          <TouchableOpacity
            style={[styles.langButton, lang === 'en' && styles.activeLangButton]}
            onPress={() => toggleLanguage('en')}
          >
            <Text style={[styles.langText, lang === 'en' && styles.activeLangText]}>English</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langButton, lang === 'hi' && styles.activeLangButton]}
            onPress={() => toggleLanguage('hi')}
          >
            <Text style={[styles.langText, lang === 'hi' && styles.activeLangText]}>हिन्दी</Text>
          </TouchableOpacity>
        </View>

        {/* Branding Logo & Title */}
        <View style={styles.logoContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="leaf" size={60} color="#ffffff" />
          </View>
          <Text style={styles.title}>KhrishiCore AI</Text>
          <Text style={styles.subtitle}>
            {lang === 'en'
              ? 'Empowering Indian Farmers with Smart AI & IoT'
              : 'स्मार्ट एआई और आईओटी के साथ भारतीय किसानों को सशक्त बनाना'}
          </Text>
        </View>

        {/* Form Fields */}
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>
            {lang === 'en' ? 'Farmer Registration' : 'किसान पंजीकरण'}
          </Text>

          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={20} color="#15803d" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={lang === 'en' ? "Farmer's Full Name" : "किसान का पूरा नाम"}
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="call-outline" size={20} color="#15803d" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={lang === 'en' ? 'Mobile Number' : 'मोबाइल नंबर'}
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="location-outline" size={20} color="#15803d" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={lang === 'en' ? 'Village / District, State' : 'गांव / जिला, राज्य'}
              placeholderTextColor="#94a3b8"
              value={location}
              onChangeText={setLocation}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="resize-outline" size={20} color="#15803d" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={lang === 'en' ? 'Farm Size (Acres)' : 'खेत का आकार (एकड़)'}
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={farmSize}
              onChangeText={setFarmSize}
            />
          </View>

          {/* Login Button */}
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin} activeOpacity={0.8}>
            <Text style={styles.loginButtonText}>
              {lang === 'en' ? 'Get Started' : 'शुरू करें'}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Footer Info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {lang === 'en' ? 'Secure • Digital India' : 'सुरक्षित • डिजिटल इंडिया'}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  langContainer: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    marginTop: 20,
    marginBottom: 10,
    backgroundColor: '#e2e8f0',
    borderRadius: 20,
    padding: 3,
  },
  langButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 17,
  },
  activeLangButton: {
    backgroundColor: '#15803d',
  },
  langText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  activeLangText: {
    color: '#ffffff',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#15803d',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 6,
    shadowColor: '#15803d',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
  },
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    elevation: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 15,
    color: '#0f172a',
  },
  loginButton: {
    flexDirection: 'row',
    backgroundColor: '#15803d',
    borderRadius: 12,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    elevation: 4,
    shadowColor: '#15803d',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    marginRight: 8,
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    letterSpacing: 1.2,
  },
});

export default LoginScreen;
