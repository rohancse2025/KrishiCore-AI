/// <reference types="vite/client" />
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { Text } from '../components/Text';

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-slate-700 rounded ${className}`} />
);

// --- SMART MARKET HUB LOGIC ---
function getSmartCommodities(
  activeCrops: string[],
  location: string,
  month: number,
  rotationIndex: number = 0
): string[] {
  // Priority 1 — Active crops (if farmer has them)
  const userCrops = activeCrops.length > 0 ? activeCrops : [];
  
  // Priority 2 — Seasonal crops
  const SEASONAL: Record<number, string[]> = {
    0: ['Wheat', 'Potato', 'Mustard'],      // Jan
    1: ['Wheat', 'Potato', 'Chickpea'],     // Feb
    2: ['Onion', 'Tomato', 'Watermelon'],   // Mar
    3: ['Mango', 'Wheat', 'Onion'],         // Apr
    4: ['Mango', 'Watermelon', 'Rice'],     // May
    5: ['Rice', 'Cotton', 'Soybean'],       // Jun
    6: ['Rice', 'Cotton', 'Maize'],         // Jul
    7: ['Soybean', 'Cotton', 'Groundnut'],  // Aug
    8: ['Cotton', 'Soybean', 'Maize'],      // Sep
    9: ['Tomato', 'Cotton', 'Rice'],        // Oct
    10: ['Wheat', 'Tomato', 'Cabbage'],     // Nov
    11: ['Wheat', 'Potato', 'Chickpea']     // Dec
  };
  
  // Priority 3 — Location-specific crops
  const LOCATION_CROPS: Record<string, string[]> = {
    'Karnataka': ['Coffee', 'Ragi', 'Sugarcane', 'Arecanut'],
    'Bengaluru': ['Ragi', 'Tomato', 'Beans'],
    'Punjab': ['Wheat', 'Rice', 'Cotton'],
    'Maharashtra': ['Soybean', 'Cotton', 'Onion', 'Sugarcane'],
    'Tamil Nadu': ['Rice', 'Groundnut', 'Sugarcane', 'Banana'],
    'Andhra Pradesh': ['Rice', 'Cotton', 'Chilli', 'Turmeric'],
    'Uttar Pradesh': ['Wheat', 'Sugarcane', 'Potato', 'Rice'],
  };
  
  const stateKey = Object.keys(LOCATION_CROPS).find(key => 
    location.toLowerCase().includes(key.toLowerCase())
  );
  
  const localCrops = stateKey ? LOCATION_CROPS[stateKey] : [];
  const seasonalCrops = SEASONAL[month] || ['Tomato', 'Potato', 'Onion'];
  
  // Combine all into a pool (deduplicated)
  const pool = Array.from(new Set([...userCrops, ...seasonalCrops, ...localCrops]));
  
  // Rotate through the pool: pick 3 starting from rotationIndex
  const start = (rotationIndex * 3) % pool.length;
  let selected = pool.slice(start, start + 3);
  
  // Wrap around if pool is small
  if (selected.length < 3) {
    selected = [...selected, ...pool.slice(0, 3 - selected.length)];
  }
  
  return selected.slice(0, 3);
}

const ALL_TIPS = [
  // Weather-based
  { icon: "🌧️", text: "Rain expected — delay fertilizer application by 24 hours", type: "info", condition: "rain" },
  { icon: "☀️", text: "Clear sunny day — ideal for spraying pesticides", type: "good", condition: "sunny" },
  { icon: "🌫️", text: "High humidity — watch for fungal diseases on leaves", type: "warning", condition: "humid" },
  { icon: "🔥", text: "High temperature — water crops before 8 AM or after 6 PM", type: "warning", condition: "hot" },
  { icon: "❄️", text: "Cold weather — protect seedlings with mulch or cover", type: "warning", condition: "cold" },
  // Soil-based
  { icon: "💧", text: "Soil moisture is optimal — maintain current irrigation schedule", type: "good", condition: "any" },
  { icon: "🚰", text: "Soil is dry — start drip irrigation immediately", type: "warning", condition: "dry" },
  { icon: "🌊", text: "Soil is waterlogged — check drainage channels today", type: "warning", condition: "wet" },
  { icon: "🧪", text: "Test soil pH every 3 months for best crop yield", type: "info", condition: "any" },
  { icon: "🌱", text: "Add organic compost to improve soil structure and nutrients", type: "info", condition: "any" },
  // General farming
  { icon: "🐛", text: "Inspect crop leaves weekly for early pest detection", type: "info", condition: "any" },
  { icon: "✂️", text: "Prune dead leaves to improve air circulation and reduce disease", type: "info", condition: "any" },
  { icon: "📊", text: "Keep a farm diary — track what works best each season", type: "info", condition: "any" },
  { icon: "🌾", text: "Rotate crops each season to prevent soil nutrient depletion", type: "good", condition: "any" },
  { icon: "🐝", text: "Plant flowering border crops to attract pollinators", type: "good", condition: "any" },
  { icon: "💊", text: "Use neem oil spray for organic pest control — safe and effective", type: "info", condition: "any" },
  { icon: "🌿", text: "Inter-cropping legumes with cereals improves soil nitrogen", type: "good", condition: "any" },
  { icon: "📅", text: "Mark your harvest dates on calendar to plan market visits", type: "info", condition: "any" },
  { icon: "💰", text: "Sell at local mandi early morning for better prices", type: "good", condition: "any" },
  { icon: "☔", text: "Collect rainwater in farm ponds for dry season irrigation", type: "info", condition: "any" },
  { icon: "🌻", text: "Sunflower borders deter pests and improve field biodiversity", type: "good", condition: "any" },
  { icon: "🔬", text: "Scan crop leaves weekly using the Scan feature to catch disease early", type: "info", condition: "any" },
  { icon: "📱", text: "Check market prices before harvesting to time your sale perfectly", type: "info", condition: "any" },
  { icon: "⏰", text: "Morning is the best time to observe crop health — light is even", type: "info", condition: "any" },
  { icon: "🌱", text: "Thin out overcrowded seedlings so each plant gets enough nutrients", type: "info", condition: "any" },
  { icon: "💧", text: "Drip irrigation saves 40% water vs flood irrigation", type: "good", condition: "any" },
  { icon: "🧑🌾", text: "Join your local Krishi Vigyan Kendra for free training and seeds", type: "info", condition: "any" },
  { icon: "📦", text: "Proper storage in gunny bags at cool dry place extends shelf life", type: "info", condition: "any" },
  { icon: "🔄", text: "Good conditions — ideal time to apply fertilizers for better absorption", type: "good", condition: "any" },
  { icon: "🌈", text: "Cloudy day — good time to transplant seedlings or apply foliar spray", type: "info", condition: "cloudy" },
  // Profile-based
  { icon: "🏜️", text: "Sandy soil drains fast — consider more frequent, shorter irrigation", type: "info", condition: "sandy" },
  { icon: "🧱", text: "Clayey soil retains water — avoid over-irrigation to prevent root rot", type: "info", condition: "clayey" },
  { icon: "🧪", text: "Soil pH is low (Acidic) — consider adding lime to neutralize", type: "warning", condition: "low_ph" },
  { icon: "🧪", text: "Soil pH is high (Alkaline) — consider adding gypsum or sulfur", type: "warning", condition: "high_ph" },
];

export default function HomePage({ lang }: { lang: string }) {
  const navigate = useNavigate();
  const { t } = useTranslation(lang);
  const [isPageOnline, setIsPageOnline] = useState(navigator.onLine);
  const [showSyncMessage, setShowSyncMessage] = useState(false);

  const handleSync = () => {
    setShowSyncMessage(true);
    setTimeout(() => setShowSyncMessage(false), 3000);
  };
  
  // 1. Auth & Profile
  const isLoggedIn = !!localStorage.getItem('KrishiCore_farmer');
  const farmer = (() => {
    try {
      return JSON.parse(localStorage.getItem('KrishiCore_farmer') || 'null');
    } catch (e) {
      return null;
    }
  })();

  // 2. State for dashboard
  const [weatherData, setWeatherData] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [sensorData, setSensorData] = useState<any>({ temperature: null, humidity: null, soil_moisture: null });
  const [isLoading, setIsLoading] = useState(true);
  const [irrigation, setIrrigation] = useState<any>(null);
  const [marketPrice, setMarketPrice] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  
  const [recommendedCrop, setRecommendedCrop] = useState<any>(null);
  const [isRecLoading, setIsRecLoading] = useState(false);
  // Modal State for Quick Add Crop
  const [tipOffset, setTipOffset] = useState(0); 
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const [addingCropName, setAddingCropName] = useState('Rice');
  const [addingDate, setAddingDate] = useState(new Date().toISOString().split('T')[0]);

  const CROP_ICONS: any = {
    'Rice': "https://images.unsplash.com/photo-1536633100346-60803ee40713?w=200",
    'Wheat': "https://images.unsplash.com/photo-1542750617-2796c738521c?w=200",
    'Maize': "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=200",
    'Tomato': "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=200",
    'Potato': "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=200",
    'Onion': "https://images.unsplash.com/photo-1508747703725-719777637510?w=200",
    'Cotton': "https://images.unsplash.com/photo-1620912189865-1e8a33da4c59?w=200",
    'Sugarcane': "https://images.unsplash.com/photo-1614715838608-dd527c46231d?w=200",
    'Soybean': "https://images.unsplash.com/photo-1599307767316-776533bb941c?w=200",
    'Groundnut': "https://images.unsplash.com/photo-1595126732330-8919688a221f?w=200",
    'Mustard': "https://images.unsplash.com/photo-1510629730590-798539eaec32?w=200",
    'Sunflower': "https://images.unsplash.com/photo-1470509037663-253afd7f0f51?w=200",
    'Chana': "https://images.unsplash.com/photo-1606756790138-261d2b21cd75?w=200",
    'Grapes': "https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=200",
    'Mango': "https://images.unsplash.com/photo-1553279768-86518a220261?w=200",
    'Chili': "https://images.unsplash.com/photo-1588165171080-c89acfa5ee83?w=200",
    'Garlic': "https://images.unsplash.com/photo-1518977956812-cd3dbce33a0c?w=200",
    'Ginger': "https://images.unsplash.com/photo-1615485290382-aa350dda9e0a?w=200"
  };
 
  // State for Crop Modal View (List or Add)
  const [cropModalTab, setCropModalTab] = useState<'list' | 'add'>('list');
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);

  // 3. New Farm Stats & Actions Logic
  const [activeCropsList, setActiveCropsList] = useState<any[]>([]);
  const [coords, setCoords] = useState<{lat: number, lon: number} | null>(null);
  
  // High Accuracy Master Location Fetch
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => {
          if (!coords) setCoords({ lat: 30.9010, lon: 75.8573 });
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } else {
      setCoords({ lat: 30.9010, lon: 75.8573 });
    }
  }, []);

  const [isSyncing, setIsSyncing] = useState(false);

  const syncFarmerToBackend = async (updatedFarmer: any) => {
    const token = localStorage.getItem('KrishiCore_token');
    if (!token) return;

    setIsSyncing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: updatedFarmer.name,
          location: updatedFarmer.location,
          farm_size: updatedFarmer.farm_size,
          farm_size_unit: updatedFarmer.farm_size_unit || 'acres',
          soil_type: updatedFarmer.soil_type || '',
          primary_crop: updatedFarmer.primary_crop || '',
          active_crops: updatedFarmer.active_crops,
          irrigation_type: updatedFarmer.irrigation_type || '',
          soil_ph: updatedFarmer.soil_ph || 6.5,
          nitrogen: updatedFarmer.nitrogen || 50.0,
          potassium: updatedFarmer.potassium || 40.0,
          sms_alerts_enabled: updatedFarmer.sms_alerts_enabled || 'false',
          sms_phone: updatedFarmer.sms_phone || ''
        })
      });
      
      if (!res.ok) console.error("Failed to sync farmer data");
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const raw = farmer?.active_crops;
    let stored: any[] = [];
    if (Array.isArray(raw)) {
      stored = raw;
    } else if (typeof raw === 'string') {
      try { stored = JSON.parse(raw); } catch { stored = []; }
    }
    setActiveCropsList(Array.isArray(stored) ? stored : []);
  }, [farmer?.active_crops]);

  const addQuickCrop = () => {
    const newCrop = {
      id: Date.now(),
      crop_name: addingCropName,
      emoji: { 
        'Rice': '🌾', 'Wheat': '🌾', 'Maize': '🌽', 'Tomato': '🍅', 'Potato': '🥔', 
        'Onion': '🧅', 'Cotton': '☁️', 'Sugarcane': '🎋', 'Soybean': '🫘',
        'Groundnut': '🥜', 'Mustard': '🌼', 'Sunflower': '🌻', 'Chana': '🫘',
        'Grapes': '🍇', 'Mango': '🥭', 'Chili': '🌶️', 'Garlic': '🧄', 'Ginger': '🫚'
      }[addingCropName] || '🌱',
      planted_date: addingDate,
      area: farmer?.farm_size || 1
    };
    const updated = [newCrop, ...activeCropsList];
    setActiveCropsList(updated);
    
    // Update farmer in localStorage
    const updatedFarmer = { ...farmer, active_crops: JSON.stringify(updated) };
    localStorage.setItem('KrishiCore_farmer', JSON.stringify(updatedFarmer));
    setCropModalTab('list'); 
    
    // Sync to backend
    syncFarmerToBackend(updatedFarmer);
    
    // Force refresh
    window.dispatchEvent(new Event('storage'));
  };

  const deleteCrop = (id: number) => {
    if (!window.confirm("Are you sure you want to remove this crop from tracking?")) return;
    
    const updated = activeCropsList.filter(c => c.id !== id);
    setActiveCropsList(updated);
    
    // Update farmer in localStorage
    const updatedFarmer = { ...farmer, active_crops: JSON.stringify(updated) };
    localStorage.setItem('KrishiCore_farmer', JSON.stringify(updatedFarmer));
    
    // Sync to backend
    syncFarmerToBackend(updatedFarmer);
    
    // Force refresh
    window.dispatchEvent(new Event('storage'));
  };

  const getHarvestDate = (plantedDate: string, cropName: string) => {
    if (!plantedDate) return null;
    const planted = new Date(plantedDate);
    const cropDays: Record<string, number> = {
      'Rice': 120, 'Wheat': 130, 'Maize': 90, 'Tomato': 75, 'Potato': 90,
      'Onion': 100, 'Cotton': 160, 'Sugarcane': 365, 'Soybean': 100,
      'Groundnut': 110, 'Mustard': 90, 'Sunflower': 95, 'Chana': 100
    };
    const daysNeeded = cropDays[cropName] || 120;
    return new Date(planted.getTime() + daysNeeded * 24 * 60 * 60 * 1000);
  };

  const getDaysToHarvest = (plantedDate: string, cropName: string) => {
    if (!plantedDate) return null;
    const planted = new Date(plantedDate);
    const cropDays: Record<string, number> = {
      'Rice': 120, 'Wheat': 130, 'Maize': 90, 'Tomato': 75, 'Potato': 90,
      'Onion': 100, 'Cotton': 160, 'Sugarcane': 365, 'Soybean': 100,
      'Groundnut': 110, 'Mustard': 90, 'Sunflower': 95, 'Chana': 100
    };
    const daysNeeded = cropDays[cropName] || 120;
    const harvestDate = new Date(planted.getTime() + daysNeeded * 24 * 60 * 60 * 1000);
    const daysLeft = Math.ceil((harvestDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft;
  };

  // Effects
  useEffect(() => {
    const handleOnline = () => {
      setIsPageOnline(true);
      setShowSyncMessage(true);
      setTimeout(() => setShowSyncMessage(false), 5000);
    };
    const handleOffline = () => setIsPageOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [marketRegion, setMarketRegion] = useState<string>('');
  const [marketDistrict, setMarketDistrict] = useState<string>('');
  const [locationSource, setLocationSource] = useState<'GPS' | 'Profile' | 'Weather' | 'Default'>('Default');

  useEffect(() => {
    if (!coords) return;
    
    const fetchWeather = async () => {
      setWeatherLoading(true);
      try {
        let url = `${API_BASE_URL}/api/v1/weather?lat=${coords.lat}&lon=${coords.lon}`;
        
        // Use profile city only when user explicitly chose Profile as source.
        // For GPS users, prefer lat/lon to ensure exact locality.
        if (locationSource === 'Profile' && farmer?.location) {
          const cleanCity = farmer.location.split(',')[0].trim();
          url = `${API_BASE_URL}/api/v1/weather?city=${encodeURIComponent(cleanCity)}`;
        }
        
        const res = await axios.get(url);
        setWeatherData(res.data);
      } catch (err) {
        console.error("Weather fetch failed, falling back to coordinates", err);
        // Final fallback: use raw GPS coordinates if city-based failed
        try {
          const res = await axios.get(`${API_BASE_URL}/api/v1/weather?lat=${coords.lat}&lon=${coords.lon}`);
          setWeatherData(res.data);
        } catch (e) {
          console.error("Final weather fallback failed", e);
        }
      } finally {
        setWeatherLoading(false);
      }
    };
    fetchWeather();
  }, [coords, locationSource, marketDistrict]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/v1/iot/latest`);
        const data = res.data;
        
        setSensorData({
          temperature: data.temperature,
          humidity: data.humidity,
          soil_moisture: data.soil_moisture
        });
        
        setIrrigation({ 
          needed: data.irrigation_needed, 
          message: data.suggestion 
        });
        
        if (data.unix_timestamp && data.unix_timestamp > 0) {
          setLastUpdated(data.unix_timestamp);
        }
      } catch (err) {
        console.error("Dashboard data fetch failed", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);




  // SMART LOCATION HIERARCHY
  useEffect(() => {
    const resolveLocation = async () => {
      const preferred = localStorage.getItem('preferred_location_source');
      
      if (preferred === 'Profile' && isLoggedIn && farmer?.location) {
        const parts = farmer.location.split(',').map((p: string) => p.trim()).filter(Boolean);
        // Heuristic: detect a state name if present, otherwise assume last part is state.
        const INDIAN_STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu and Kashmir','Ladakh','Puducherry'];
        const foundState = parts.find((p: string) => INDIAN_STATES.some(s => s.toLowerCase() === p.toLowerCase()));
        const state = foundState || parts[parts.length - 1] || 'Punjab';
        // Prefer the most specific locality (first part) as district/locality
        const district = parts.find((p: string) => p !== state) || parts[0] || 'Ludhiana';
        setMarketRegion(state);
        setMarketDistrict(district);
        setLocationSource('Profile');
        return;
      }

      // 1. Use Coords if available (from high-accuracy GPS)
      if (coords && (coords.lat !== 30.9010 || coords.lon !== 75.8573)) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lon}&format=json&accept-language=en`);
          const data = await res.json();
          const state = data.address.state || 'Punjab';
          const locality = data.address.village || data.address.hamlet || data.address.suburb || data.address.town || data.address.neighbourhood || '';
          const dist = data.address.district || data.address.state_district || data.address.city || data.address.county || '';
          const city = (locality && dist && locality !== dist) ? `${locality}, ${dist}` : (locality || dist || 'Ludhiana');
          
          setMarketRegion(state);
          setMarketDistrict(city);
          setLocationSource('GPS');
          return;
        } catch (e) {
           console.error("Reverse geocoding failed", e);
        }
      }
      
      // 2. Fallback to Profile or Default
      if (isLoggedIn && farmer?.location) {
        const parts = farmer.location.split(',').map((p: string) => p.trim()).filter(Boolean);
        const INDIAN_STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu and Kashmir','Ladakh','Puducherry'];
        const foundState = parts.find((p: string) => INDIAN_STATES.some(s => s.toLowerCase() === p.toLowerCase()));
        const state = foundState || parts[parts.length - 1] || 'Punjab';
        const district = parts.find((p: string) => p !== state) || parts[0] || 'Ludhiana';
        setMarketRegion(state);
        setMarketDistrict(district);
        setLocationSource('Profile');
      } else {
        setMarketRegion('Punjab');
        setMarketDistrict('Ludhiana');
        setLocationSource('Default');
      }
    };
    resolveLocation();
  }, [coords, isLoggedIn, farmer?.location]);

  const [trendingCrops, setTrendingCrops] = useState<any[]>([]);
  const [marketLoading, setMarketLoading] = useState(false);
  const [refreshTimer, setRefreshTimer] = useState(60);
  const [rotationCounter, setRotationCounter] = useState(0);

  // SMART MARKET HUB FETCHING
  useEffect(() => {
    const fetchMarketTrends = async () => {
      if (!marketRegion) return;
      setMarketLoading(true);
      
      const activeCrops = farmer?.active_crops ? JSON.parse(farmer.active_crops).map((c: any) => c.crop_name) : [];
      const location = farmer?.location || marketRegion || 'Karnataka';
      const month = new Date().getMonth();
      
      const smartCommodities = getSmartCommodities(activeCrops, location, month, rotationCounter);
      
      try {
        const results = await Promise.allSettled(
          smartCommodities.map(c => axios.get(`${API_BASE_URL}/api/v1/market-prices?state=${marketRegion}&commodity=${c}`))
        );
        
        const trends = results.map((res, i) => {
          const data = (res.status === 'fulfilled' && res.value.data?.[0]) ? res.value.data[0] : null;
          const name = smartCommodities[i];
          
          // Price Change Logic (Persistent comparison)
          const lastPrices = JSON.parse(localStorage.getItem('last_market_prices') || '{}');
          const currentPrice = data?.max_price || (1200 + Math.floor(Math.random() * 500));
          const lastPrice = lastPrices[name];
          
          let changePercent = 0;
          if (lastPrice) {
            changePercent = Math.round(((currentPrice - lastPrice) / lastPrice) * 100);
          }
          
          lastPrices[name] = currentPrice;
          localStorage.setItem('last_market_prices', JSON.stringify(lastPrices));

          return { 
            name, 
            price: currentPrice,
            change: changePercent,
            quality: data?.grade || 'Standard',
            market: data?.market || `${marketDistrict} Mandi`,
            isLive: !!data
          };
        });

        setTrendingCrops(trends);
      } catch (err) {
        console.error("Market fetch failed", err);
      } finally {
        setTimeout(() => setMarketLoading(false), 800);
      }
    };

    fetchMarketTrends();
    
    const pollInterval = setInterval(() => {
      setRotationCounter(prev => prev + 1);
    }, 60000);

    const timerInterval = setInterval(() => {
      setRefreshTimer(prev => prev <= 1 ? 60 : prev - 1);
    }, 1000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(timerInterval);
    };
  }, [marketRegion, marketDistrict, rotationCounter]);

  const getWeatherEmoji = (condition: string, temp: number) => {
    const c = condition.toLowerCase();
    if (c.includes("rain")) return "🌧️";
    if (c.includes("cloud")) return "⛅";
    if (temp > 35) return "🌡️";
    return "☀️";
  };

  const getTrend = (val: number, type: 'temp' | 'hum' | 'moist') => {
    if (type === 'temp') return val > 30 ? "↑" : val < 20 ? "↓" : "→";
    if (type === 'hum') return val > 70 ? "↑" : val < 40 ? "↓" : "→";
    return val > 60 ? "↑" : val < 30 ? "↓" : "→";
  };

  const currentSensorData = isPageOnline ? sensorData : JSON.parse(
    localStorage.getItem('last_sensor') || 
    '{"temperature":28,"humidity":65,"soil_moisture":45}'
  );

  useEffect(() => {
    if (isPageOnline && sensorData.temperature !== null) {
      localStorage.setItem('last_sensor', JSON.stringify(sensorData));
    }
  }, [sensorData, isPageOnline]);

  // AI Recommendation Logic
  useEffect(() => {
    const fetchRecommendation = async () => {
      const existing = JSON.parse(localStorage.getItem('rec_crop_cache') || 'null');
      if (existing && existing.date !== new Date().toDateString()) {
        localStorage.removeItem('rec_crop_cache');
      }
      
      if (!isLoggedIn || (!sensorData.temperature && !weatherData)) return;

      const isSensorConnected = sensorData.temperature !== null && sensorData.temperature !== 0;
      
      // Cache logic
      const cached = JSON.parse(localStorage.getItem('rec_crop_cache') || 'null');
      const today = new Date().toDateString();
      if (cached && cached.date === today && (Date.now() - cached.ts) < 30 * 60 * 1000) {
        setRecommendedCrop(cached.crop);
        return;
      }
      
      // ALWAYS use weather data for recommendation as per user request (ignore sensors)
      const tempToUse = weatherData?.temperature || 25;
      const humToUse  = weatherData?.humidity   || 60;

      const getRainfallEstimate = (condition: string) => {
        const c = (condition || '').toLowerCase();
        if (c.includes('rain') || c.includes('shower')) return 150;
        if (c.includes('cloud') || c.includes('overcast')) return 80;
        if (c.includes('storm') || c.includes('thunder')) return 200;
        return 40; // sunny / clear
      };
      const rainfallToUse = getRainfallEstimate(weatherData?.condition || '');

      const nitrogenToUse   = farmer?.nitrogen   || 45;
      const phosphorusToUse = 40; // Default
      const potassiumToUse  = farmer?.potassium  || 40;

      setIsRecLoading(true);
      try {
        // Pass the top trending crop name as a bias hint if possible
        const topDemandCrop = trendingCrops.length > 0 ? trendingCrops[0].name : '';
        
        const res = await axios.post(`${API_BASE_URL}/api/v1/crops`, {
          nitrogen: nitrogenToUse,
          phosphorus: phosphorusToUse,
          potassium: potassiumToUse,
          temperature: tempToUse,
          humidity: humToUse,
          ph: 6.5,
          rainfall: rainfallToUse
        });
        
        if (res.data.crops && res.data.crops.length > 0) {
          // Priority logic: find a recommended crop that matches "demanding" crops first
          let finalCrop = res.data.crops[0];
          const matchesMarket = res.data.crops.find((c: any) => 
            trendingCrops.some((t: any) => t.name.toLowerCase() === c.name.toLowerCase())
          );
          if (matchesMarket) finalCrop = matchesMarket;
          
          setRecommendedCrop(finalCrop);
          localStorage.setItem('rec_crop_cache', JSON.stringify({ crop: finalCrop, ts: Date.now(), date: new Date().toDateString() }));
        }
      } catch (err) {
        console.error("Failed to fetch recommendation", err);
      } finally {
        setIsRecLoading(false);
      }
    };

    const timer = setTimeout(fetchRecommendation, 1500);
    return () => clearTimeout(timer);
  }, [sensorData.temperature, weatherData, isLoggedIn]);

  // Tip Rotation logic
  useEffect(() => {
    const timer = setInterval(() => {
      setTipOffset(prev => prev + 1); // increment by 1 for smoother rotation
    }, 45000); // rotate every 45 seconds
    return () => clearInterval(timer);
  }, []);

  const getSmartTips = (temp: number, hum: number, moist: number, condition: string, offset: number, farmer: any) => {
    const c = condition.toLowerCase();
    // Priority tips based on current conditions
    const priority: typeof ALL_TIPS = [];
    if (moist < 30) priority.push(...ALL_TIPS.filter(t => t.condition === 'dry'));
    if (moist > 75) priority.push(...ALL_TIPS.filter(t => t.condition === 'wet'));
    if (hum > 80) priority.push(...ALL_TIPS.filter(t => t.condition === 'humid'));
    if (temp > 35) priority.push(...ALL_TIPS.filter(t => t.condition === 'hot'));
    if (temp < 10) priority.push(...ALL_TIPS.filter(t => t.condition === 'cold'));
    if (c.includes('rain')) priority.push(...ALL_TIPS.filter(t => t.condition === 'rain'));
    if (c.includes('cloud')) priority.push(...ALL_TIPS.filter(t => t.condition === 'cloudy'));
    if (c.includes('sun') || c.includes('clear')) priority.push(...ALL_TIPS.filter(t => t.condition === 'sunny'));
    
    // Add Profile-based tips
    if (farmer) {
      if (farmer.soil_type === 'Sandy') priority.push(...ALL_TIPS.filter(t => t.condition === 'sandy'));
      if (farmer.soil_type === 'Clayey') priority.push(...ALL_TIPS.filter(t => t.condition === 'clayey'));
      if (farmer.soil_ph < 6.0) priority.push(...ALL_TIPS.filter(t => t.condition === 'low_ph'));
      if (farmer.soil_ph > 7.5) priority.push(...ALL_TIPS.filter(t => t.condition === 'high_ph'));
    }

    // Fill with general tips using offset for rotation
    const general = ALL_TIPS.filter(t => t.condition === 'any');
    const rotated = [...general.slice(offset % general.length), ...general.slice(0, offset % general.length)];
    
    const combined = [...priority, ...rotated];
    // Deduplicate by text
    const seen = new Set<string>();
    return combined.filter(t => { if (seen.has(t.text)) return false; seen.add(t.text); return true; }).slice(0, 3);
  };

  return (
    <div className="font-sans">
      
      {/* Offline Banner */}
      {!isPageOnline && (
        <div className="bg-amber-50 border-b-2 border-amber-500/30 py-3 px-6 text-amber-900 text-center font-black text-[10px] uppercase tracking-widest animate-pulse flex items-center justify-center gap-3 shadow-lg z-[200] sticky top-0 backdrop-blur-md">
          <span className="text-sm">📵</span> OFFLINE MODE: Showing Cached Data. IoT Control & Live Market Syncing Paused.
        </div>
      )}

      {/* Back Online Message */}
      {showSyncMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] bg-green-600 text-white py-2 px-6 rounded-full font-bold shadow-2xl animate-fade-in flex items-center gap-2">
          <span>🟢</span> Back online — Syncing latest data...
        </div>
      )}
      


      {/* 1. HERO SECTION */}
      <section className="relative min-h-[300px] sm:min-h-[450px] mb-8 sm:mb-12 flex items-center justify-center overflow-hidden rounded-2xl sm:rounded-[2rem] shadow-2xl mx-1">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&q=80" 
            alt="Rice field" 
            className="w-full h-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-green-900/40" />
        </div>

        <div className="relative z-10 px-4 py-8 sm:px-6 sm:py-12 flex flex-col items-center text-center max-w-4xl">
          {!isLoggedIn ? (
            <>
              <div className="inline-block bg-[#16a34a] text-white text-sm font-bold px-4 py-1 rounded-full mb-6 whitespace-nowrap shadow-lg animate-fade-in-up [animation-delay:100ms]">
                <img src="/KrishiCore_final_v12_zoom.png" alt="" className="w-5 h-5 inline-block mr-2 -mt-0.5 rounded-md" />
                AI Powered Farming
              </div>
              
              <h1 className="text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-6 tracking-tight drop-shadow-md animate-fade-in-up [animation-delay:300ms] break-words">
                Empowering Farmers with <br />
                <span className="text-[#4ade80]">Next-Gen AI & IoT</span>
              </h1>
              
              <p className="text-white/90 text-base sm:text-lg md:text-xl font-medium mb-10 leading-relaxed max-w-2xl drop-shadow-sm animate-fade-in-up [animation-delay:500ms] break-words">
                {t('hero_tagline')}
              </p>

              <div className="flex flex-col sm:flex-row gap-5 animate-fade-in-up [animation-delay:700ms]">
                <button 
                  onClick={() => navigate('/crops')}
                  className="bg-white text-[#16a34a] font-bold rounded-2xl py-3.5 px-10 text-lg transition-all hover:bg-green-50 active:scale-95 shadow-xl hover-lift ripple"
                >
                  {t('hero_get_crop')}
                </button>
                <button 
                  onClick={() => navigate('/scan')}
                  className="bg-transparent border-2 border-white text-white font-bold rounded-2xl py-3.5 px-10 text-lg transition-all hover:bg-white/10 active:scale-95 shadow-lg backdrop-blur-sm hover-lift ripple"
                >
                  {t('hero_scan')}
                </button>
              </div>

              {/* Login hint banner */}
              <div className="mt-6 bg-white/15 backdrop-blur-sm rounded-full px-6 py-2.5 flex items-center gap-3 animate-fade-in-up [animation-delay:900ms]">
                <span className="text-white/80 text-sm font-medium">
                  💡 Login to save crop history & control IoT remotely
                </span>
                <button
                  onClick={() => navigate('/login')}
                  className="text-green-300 font-black text-sm hover:text-white transition-colors whitespace-nowrap"
                >
                  Login →
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="inline-block bg-[#16a34a] text-white text-sm font-bold px-4 py-1 rounded-full mb-6 whitespace-nowrap shadow-lg animate-fade-in-up [animation-delay:100ms]">
                <img src="/KrishiCore_final_v12_zoom.png" alt="" className="w-5 h-5 inline-block mr-2 -mt-0.5 rounded-md" />
                KrishiCore AI V2.0
              </div>
              
              <h1 className="text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-6 tracking-tight drop-shadow-md animate-fade-in-up [animation-delay:300ms] break-words">
                Welcome back, <span className="text-[#4ade80]">{farmer.name}!</span> 👨‍🌾
              </h1>
              
              <p className="text-white/90 text-base sm:text-lg md:text-xl font-medium mb-10 leading-relaxed max-w-2xl drop-shadow-sm animate-fade-in-up [animation-delay:500ms] break-words">
                Your smart farming dashboard is updated with the latest sensor data and crop insights.
              </p>

              <div className="flex flex-col sm:flex-row gap-5 animate-fade-in-up [animation-delay:700ms]">
                <button 
                  onClick={() => navigate('/scan')}
                  className="bg-white text-[#16a34a] font-bold rounded-2xl py-3.5 px-10 text-lg transition-all hover:bg-green-50 active:scale-95 shadow-xl hover-lift ripple"
                >
                  📷 {t('hero_scan')}
                </button>
                <button 
                  onClick={() => navigate('/chat')}
                  className="bg-transparent border-2 border-white text-white font-bold rounded-2xl py-3.5 px-10 text-lg transition-all hover:bg-white/10 active:scale-95 shadow-lg backdrop-blur-sm hover-lift ripple"
                >
                  💬 Ask AI Expert
                </button>
              </div>
            </>
          )}
        </div>
      </section>


      {/* 2. WEATHER CARD */}
      <section className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-5 md:p-8 mb-10 shadow-sm border border-blue-200 dark:border-blue-800 animate-fade-in-up hover-lift overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base sm:text-xl text-gray-900 dark:text-white m-0 font-black flex items-center gap-2 uppercase tracking-widest opacity-50 break-words">🌤️ {t('home_weather')}</h2>
          <button 
            onClick={async () => {
              try {
                const res = await axios.get(`${API_BASE_URL}/api/v1/iot/test-alert`);
                alert("Test alert triggered! Check your WhatsApp.");
              } catch (e) {
                alert("Failed to trigger test. Ensure backend is running.");
              }
            }}
            className="text-[10px] font-black bg-green-600 text-white px-3 py-1.5 rounded-lg shadow-md hover:bg-green-700 transition-all active:scale-95"
          >
            📲 TEST WHATSAPP
          </button>
        </div>
        
        <div className="flex gap-4 sm:gap-8 items-center flex-wrap mb-6 w-full">
          <div className="w-full sm:min-w-[200px] sm:w-auto flex-shrink-0">
            <div className="flex flex-col gap-2">
              {weatherLoading ? (
                <>
                  <Skeleton className="h-16 w-32" />
                  <Skeleton className="h-8 w-48" />
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <span className="text-4xl sm:text-6xl font-black text-blue-900 dark:text-blue-300 leading-none tabular-nums">
                      {weatherData?.temperature !== undefined ? `${Math.round(weatherData.temperature * 10) / 10}°C` : "N/A"}
                    </span>
                    <span className="text-4xl sm:text-5xl">{getWeatherEmoji(weatherData?.condition || "", weatherData?.temperature || 25)}</span>
                  </div>
                  <p className="m-0 mt-1 text-blue-500 dark:text-blue-400 font-bold text-base sm:text-xl break-words leading-tight">
                    {weatherData?.condition || ""}
                  </p>
                  {marketDistrict && (
                    <p className="m-0 text-xs sm:text-sm text-blue-400 font-semibold italic flex items-center gap-2 break-words">
                      📍 {marketDistrict}, {marketRegion}
                      {locationSource === 'GPS' && (
                        <button 
                          onClick={() => {
                            const parts = (farmer?.location || 'Ludhiana, Punjab').split(',');
                            const city = parts[0]?.trim() || 'Ludhiana';
                            const state = parts.length > 1 ? parts[1].trim() : city;
                            setMarketRegion(state);
                            setMarketDistrict(city);
                            setLocationSource('Profile');
                            localStorage.setItem('preferred_location_source', 'Profile');
                          }}
                          className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full not-italic hover:bg-blue-200 transition-all font-black uppercase"
                        >
                          Use Profile Address instead?
                        </button>
                      )}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
          
          <div className="flex gap-5 flex-1 flex-wrap">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl flex-[1_1_150px] text-center shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
              <p className="m-0 mb-1 text-gray-400 text-[10px] sm:text-xs font-black uppercase tracking-widest break-words">{t('iot_hum')}</p>
              <p className="m-0 font-black text-gray-800 dark:text-white text-xl sm:text-2xl tabular-nums">
                {weatherLoading ? <Skeleton className="h-8 w-16 mx-auto" /> : weatherData?.humidity !== undefined ? `${weatherData.humidity}%` : "N/A"}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl flex-[1_1_150px] text-center shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
              <p className="m-0 mb-1 text-gray-400 text-[10px] sm:text-xs font-black uppercase tracking-widest break-words">{t('weather_wind')}</p>
              <p className="m-0 font-black text-gray-800 dark:text-white text-xl sm:text-2xl tabular-nums">
                {weatherLoading ? <Skeleton className="h-8 w-16 mx-auto" /> : weatherData?.wind_speed !== undefined ? `${weatherData.wind_speed} m/s` : "N/A"}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t-2 border-blue-200 dark:border-blue-800 pt-5 flex items-center justify-between gap-4 flex-wrap">
          <p className="m-0 text-green-700 dark:text-green-400 italic font-bold text-base sm:text-lg min-h-[28px] break-words leading-relaxed">
            {weatherLoading ? <Skeleton className="h-6 w-64" /> : weatherData?.farming_tip ? `💡 ${weatherData.farming_tip}` : "💡 Good farming today"}
          </p>
          
          {!weatherLoading && weatherData && (
            <button
              onClick={() => navigate('/chat', { 
                state: { 
                  prefill: `It is currently ${Math.round(weatherData.temperature * 10) / 10}°C with ${weatherData.condition} and ${weatherData.humidity}% humidity in ${weatherData.city || 'my area'}. What farming advice do you have for today?` 
                } 
              })}
              className="bg-white border-2 border-[#16a34a] text-[#16a34a] py-2 px-3.5 rounded-xl text-[13px] font-black cursor-pointer shadow-sm transition-all hover:bg-[#f0fdf4] active:scale-95 flex items-center gap-2"
            >
              🤖 Ask AI about today's weather
            </button>
          )}
        </div>
      </section>

      {/* 3. MY FARM PROFILE SECTION (New) */}
      {isLoggedIn && farmer && (
        <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 mb-10 shadow-sm border border-gray-100 dark:border-slate-700 hover-lift transition-all">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-base sm:text-xl text-gray-900 dark:text-white m-0 font-black flex items-center gap-2 uppercase tracking-widest opacity-50">
              🚜 {t('home_farm_profile')}
            </h2>
            <Link 
              to="/profile" 
              className="text-xs font-black text-green-600 hover:underline flex items-center gap-1"
            >
              {t('nav_profile')} →
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-gray-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-gray-100 dark:border-slate-700/50">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">{t('home_soil_type')}</p>
              <p className="text-lg font-black text-gray-700 dark:text-gray-200 m-0">
                {farmer.soil_type || 'Not Set'}
              </p>
              <div className="mt-2 text-[10px] text-green-600 font-bold bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full inline-block">
                {farmer.soil_type === 'Sandy' ? 'Fast Drainage' : farmer.soil_type === 'Clayey' ? 'High Retention' : 'General'}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-gray-100 dark:border-slate-700/50">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Farm Size</p>
              <p className="text-lg font-black text-gray-700 dark:text-gray-200 m-0">
                {farmer.farm_size} <span className="text-sm text-gray-400 font-bold">{farmer.farm_size_unit || 'Acres'}</span>
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-gray-100 dark:border-slate-700/50">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Location</p>
              <p className="text-sm font-black text-gray-700 dark:text-gray-200 m-0 truncate">
                {farmer.location || 'Unknown'}
              </p>
              <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase">{locationSource} SOURCE</p>
            </div>

            <div className="bg-green-50/50 dark:bg-green-900/10 p-5 rounded-2xl border border-green-100/50 dark:border-green-900/30">
              <p className="text-[10px] font-black text-green-700 dark:text-green-400 uppercase tracking-wider mb-2">{t('home_nutrients')}</p>
              <div className="flex gap-3 items-end">
                <div>
                  <span className="text-[10px] font-black text-gray-400">N:</span>
                  <span className="text-sm font-black ml-1">{farmer.nitrogen}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-gray-400">P:</span>
                  <span className="text-sm font-black ml-1">40</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-gray-400">K:</span>
                  <span className="text-sm font-black ml-1">{farmer.potassium}</span>
                </div>
              </div>
              <p className="text-[9px] text-gray-400 font-medium mt-2 italic leading-tight">
                {t('home_profile_hint')}
              </p>
            </div>
          </div>
        </section>
      )}


      {/* 4. SENSOR DATA SECTION */}
      <section className="mb-14">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-base sm:text-xl text-gray-900 dark:text-white font-black uppercase tracking-widest opacity-50 m-0 break-words">{t('home_sensor_data')}</h2>
          {lastUpdated && (Date.now() - lastUpdated < 60000) ? (
            <span className="bg-green-100 text-green-700 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-green-200 animate-pulse tracking-widest uppercase">ONLINE</span>
          ) : lastUpdated ? (
            <span className="bg-orange-100 text-orange-700 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-orange-200 tracking-widest uppercase">OFFLINE</span>
          ) : (
            <span className="bg-gray-100 text-gray-500 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-gray-200 tracking-widest uppercase">NO DATA</span>
          )}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {/* TEMPERATURE */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-7 min-h-[160px] shadow-sm border border-gray-100 dark:border-slate-700 border-t-4 border-t-[#ef4444] flex flex-col justify-between hover-lift overflow-hidden">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-red-50 dark:bg-red-900/20 rounded-full flex justify-center items-center font-bold text-xl">
              🌡️
            </div>
            <div className="mt-6">
              <div className="min-h-[44px] flex items-center gap-3">
                {isLoading ? <Skeleton className="h-9 w-24" /> : (
                  <>
                    <Text variant="number" className="m-0 mb-1 text-3xl sm:text-4xl font-black tracking-tighter text-gray-900 dark:text-white leading-none block tabular-nums">
                      {lastUpdated ? `${currentSensorData?.temperature || 0}°C` : "---"}
                    </Text>
                    <span className={`text-xl font-black tabular-nums ${getTrend(currentSensorData?.temperature || 25, 'temp') === '↑' ? 'text-red-500' : 'text-blue-500'}`}>
                      {getTrend(currentSensorData?.temperature || 25, 'temp')}
                    </span>
                  </>
                )}
              </div>
              <p className="m-0 text-[10px] sm:text-xs text-gray-400 font-black uppercase tracking-widest mt-1 break-words">{t('iot_temp')}</p>
            </div>
          </div>

          {/* HUMIDITY */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-7 min-h-[160px] shadow-sm border border-gray-100 dark:border-slate-700 border-t-4 border-t-[#3b82f6] flex flex-col justify-between hover-lift overflow-hidden">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-50 dark:bg-blue-900/20 rounded-full flex justify-center items-center font-bold text-xl">
              💧
            </div>
            <div className="mt-6">
              <div className="min-h-[44px] flex items-center gap-3">
                {isLoading ? <Skeleton className="h-9 w-24" /> : (
                  <>
                    <h3 className="m-0 mb-1 text-3xl sm:text-4xl font-black tracking-tighter text-gray-900 dark:text-white leading-none tabular-nums">
                      {lastUpdated ? `${currentSensorData?.humidity || 0}%` : "---"}
                    </h3>
                    <span className="text-xl font-black text-blue-500 tabular-nums">{getTrend(currentSensorData?.humidity || 50, 'hum')}</span>
                  </>
                )}
              </div>
              <p className="m-0 text-[10px] sm:text-xs text-gray-400 font-black uppercase tracking-widest mt-1 break-words">{t('iot_hum')}</p>
            </div>
          </div>

          {/* SOIL MOISTURE */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-7 min-h-[160px] shadow-sm border border-gray-100 dark:border-slate-700 border-t-4 border-t-[#16a34a] flex flex-col justify-between hover-lift overflow-hidden">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-50 dark:bg-green-900/20 rounded-full flex justify-center items-center font-bold text-xl">
              🌱
            </div>
            <div className="mt-6">
              <div className="min-h-[44px] flex items-center gap-3">
                {isLoading ? <Skeleton className="h-9 w-24" /> : (
                  <>
                    <h3 className="m-0 mb-1 text-3xl sm:text-4xl font-black tracking-tighter text-gray-900 dark:text-white leading-none tabular-nums">
                      {lastUpdated ? `${currentSensorData?.soil_moisture || 0}%` : "---"}
                    </h3>
                    <span className="text-xl font-black text-green-500 tabular-nums">{getTrend(currentSensorData?.soil_moisture || 50, 'moist')}</span>
                  </>
                )}
              </div>
              <p className="m-0 text-[10px] sm:text-xs text-gray-400 font-black uppercase tracking-widest mt-1 break-words">{t('iot_moisture')}</p>
            </div>
          </div>

          {/* IRRIGATION */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-7 min-h-[160px] shadow-sm border border-gray-100 dark:border-slate-700 border-t-4 border-t-[#f97316] flex flex-col justify-between hover-lift overflow-hidden">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-orange-50 dark:bg-orange-900/20 rounded-full flex justify-center items-center font-bold text-xl">
              🚰
            </div>
            <div className="mt-6">
              <div className="min-h-[44px]">
                {isLoading ? <Skeleton className="h-9 w-24" /> : (
                  <h3 className={`m-0 mb-1 text-3xl sm:text-4xl font-black tracking-tighter leading-none ${
                    !isPageOnline || !lastUpdated ? 'text-gray-400' :
                    irrigation?.needed ? "text-red-500" :
                    "text-green-600"
                  }`}>
                    {!isPageOnline || !lastUpdated ? "---" : (irrigation?.needed ? "ON" : "OFF")}
                  </h3>
                )}
              </div>
              <p className="m-0 text-[10px] sm:text-xs text-gray-400 font-black uppercase tracking-widest mt-1 break-words">
                {!isPageOnline ? `${t('home_irrigation')} (OFFLINE)` : t('home_irrigation')}
              </p>
            </div>
          </div>
        </div>

        {/* 4. FARMER STATS ROW */}
        {/* 4. SMART INTERACTIVE ACTION CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {/* CARD 1: MY CROPS */}
          <div 
            onClick={() => {
              if (isLoggedIn) {
                setIsAddModalOpen(true);
                setCropModalTab('list');
              } else navigate('/login');
            }}
            className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100 dark:border-slate-700 hover-lift cursor-pointer transition-all active:scale-95 flex flex-col justify-between min-h-[160px] overflow-hidden"
          >
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-sm">🌾</span>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest break-words">My Crops</span>
              </div>
              {isLoggedIn ? (
                <>
                  <h4 className="m-0 text-3xl sm:text-4xl font-black text-gray-900 dark:text-white leading-none mb-2 tabular-nums">
                    {activeCropsList.length}
                  </h4>
                  <p className="m-0 text-xs font-black text-gray-400 uppercase tracking-widest break-words leading-tight">Active Crops</p>
                  <p className="m-0 text-[10px] text-green-600 font-black mt-2 uppercase tracking-wide break-words">
                    {activeCropsList.length > 0 ? `Next Harvest: ${getHarvestDate(activeCropsList[0].planted_date, activeCropsList[0].crop_name)?.toLocaleDateString()}` : "No plantings tracked"}
                  </p>
                </>
              ) : (
                <>
                  <h4 className="m-0 text-lg sm:text-xl font-black text-gray-900 dark:text-white mb-1 break-words leading-tight">Track Your Crops</h4>
                  <p className="m-0 text-xs text-gray-500 font-medium italic break-words leading-relaxed">Login to add crops & get harvest alerts</p>
                </>
              )}
            </div>
            <button 
              className="m-0 text-xs font-black text-green-600 uppercase tracking-widest mt-4 text-left hover:underline break-words"
            >
              {isLoggedIn ? "Manage Crops →" : "Login →"}
            </button>
          </div>

          {/* CARD 2: MY FARM */}
          <div 
            onClick={() => isLoggedIn ? navigate('/profile') : navigate('/login')}
            className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100 dark:border-slate-700 hover-lift cursor-pointer transition-all active:scale-95 flex flex-col justify-between min-h-[160px] overflow-hidden"
          >
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-sm">🗺️</span>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest break-words">My Farm</span>
              </div>
              {isLoggedIn ? (
                <>
                  <h4 className="m-0 text-lg sm:text-xl font-black text-gray-900 dark:text-white mb-1 break-words tabular-nums">
                    {farmer.farm_size || 0} {farmer.farm_size_unit || 'acres'}
                  </h4>
                  <p className="m-0 text-xs text-gray-500 font-medium italic mb-1 break-words">
                    {recommendedCrop ? `Expected Yield: ~${(farmer.farm_size * 25).toFixed(0)} q` : `📍 ${farmer.location || 'Location not set'}`}
                  </p>
                  <p className="m-0 text-[10px] text-gray-400 font-bold uppercase tracking-tight break-words">pH: {farmer.soil_ph || '—'} · {farmer.soil_type || 'Soil type'}</p>
                </>
              ) : (
                <>
                  <h4 className="m-0 text-lg sm:text-xl font-black text-gray-900 dark:text-white mb-1 break-words leading-tight">Your Farm Profile</h4>
                  <p className="m-0 text-xs text-gray-500 font-medium italic break-words leading-relaxed">Store farm size, location, soil type</p>
                </>
              )}
            </div>
            <p className="m-0 text-xs font-black text-blue-600 uppercase tracking-widest mt-4 break-words">
              {isLoggedIn ? "Edit Profile →" : "Setup Farm →"}
            </p>
          </div>

          {/* CARD 3: FIELD HEALTH MODEL */}
          <div 
            onClick={() => !isLoggedIn && navigate('/login')}
            className={`bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100 dark:border-slate-700 transition-all flex flex-col justify-between min-h-[160px] relative overflow-hidden ${!isLoggedIn ? 'opacity-50 grayscale contrast-125' : 'hover-lift cursor-pointer active:scale-95'}`}
          >
             {!isLoggedIn && (
               <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/5 backdrop-blur-[2px]">
                  <span className="bg-white/90 text-black px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl">🔑 Login to Unlock</span>
               </div>
             )}
             <div className="flex justify-between items-start relative z-10">
                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center text-xl shadow-sm border border-emerald-100/50">🧬</div>
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Field Health</span>
             </div>
             
             <div className="mt-4 relative z-10">
                <div className="flex items-center gap-2">
                   <h3 className={`m-0 text-[42px] font-black tracking-widest leading-none ${!sensorData?.soil_moisture ? 'text-gray-300' : 'text-gray-900 dark:text-white'}`}>
                     {(() => {
                        if (!sensorData?.soil_moisture) return '---';
                        // AI HEALTH ALGORITHM: Weighted Fusion
                        const mScore = Math.min(100, Math.max(0, sensorData.soil_moisture * 1.4)); // Soil optimality
                        const tScore = (weatherData?.temperature > 20 && weatherData?.temperature < 35) ? 95 : 60; // Climate stress
                        const finalScore = Math.floor(mScore * 0.5 + tScore * 0.3 + 20); // 20 pts base for progress
                        return Math.min(99, finalScore);
                     })()}<span className="text-sm font-bold opacity-30">%</span>
                   </h3>
                </div>
                <div className="flex items-center gap-2 mt-2">
                   {!sensorData?.soil_moisture ? (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full bg-gray-300"></span>
                        <p className="m-0 text-[10px] text-gray-400 font-black uppercase tracking-widest">
                          ⚠️ Connect Sensor
                        </p>
                      </>
                   ) : (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <p className="m-0 text-[10px] text-emerald-600 font-black uppercase tracking-widest">
                          Condition: Optimal
                        </p>
                      </>
                   )}
                </div>
                <p className="m-0 text-[9px] text-gray-400 font-medium italic mt-1 leading-none">
                  {!sensorData?.soil_moisture ? 'Real-time IoT Hub Offline' : 'AI Model: Soil + Climate + Growth Sync'}
                </p>
             </div>

             <div className="mt-4 pt-3 border-t border-gray-50 dark:border-slate-700 relative z-10">
                <div className="w-full h-1.5 bg-gray-100 dark:bg-slate-900 rounded-full overflow-hidden">
                   <div 
                     className={`h-full rounded-full transition-all duration-1000 ${!sensorData?.soil_moisture ? 'bg-gray-200' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} 
                     style={{ width: !sensorData?.soil_moisture ? '10%' : '92%' }}
                   ></div>
                </div>
             </div>
          </div>

          {/* CARD 4: TOTAL FARM PROFIT / ROI WINNER */}
          <div 
            onClick={() => !isLoggedIn && navigate('/login')}
            className={`bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 transition-all flex flex-col justify-between min-h-[180px] relative overflow-hidden ${!isLoggedIn ? 'opacity-50 grayscale contrast-125' : 'hover-lift cursor-pointer active:scale-95'}`}
          >
             {!isLoggedIn && (
               <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/5 backdrop-blur-[2px]">
                  <span className="bg-white/90 text-black px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl">🔑 Login to Unlock</span>
               </div>
             )}
             <div className="flex justify-between items-start relative z-10">
                <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center text-xl shadow-sm border border-amber-100/50">💎</div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block">Total Farm Profit</span>
                  <span className="text-[9px] font-bold text-gray-400 block mt-0.5">Projected Net Income</span>
                </div>
             </div>
             
             {(() => {
                const CROP_FACTORS: Record<string, { yield: number, cost: number, price: number }> = {
                  'Rice': { yield: 22, cost: 28000, price: 2183 },
                  'Wheat': { yield: 20, cost: 22000, price: 2275 },
                  'Potato': { yield: 90, cost: 45000, price: 1500 },
                  'Tomato': { yield: 100, cost: 55000, price: 1800 },
                  'Onion': { yield: 80, cost: 40000, price: 1600 },
                  'Cotton': { yield: 10, cost: 35000, price: 7000 },
                  'Maize': { yield: 25, cost: 20000, price: 2000 },
                  'Groundnut': { yield: 12, cost: 30000, price: 6000 },
                  'Soybean': { yield: 10, cost: 22000, price: 4500 },
                  'Mustard': { yield: 8, cost: 18000, price: 5400 }
                };

                // Calculate profit for ALL crops
                const earners = activeCropsList.map(c => {
                  const factor = CROP_FACTORS[c.crop_name] || { yield: 15, cost: 20000, price: 2500 };
                  const area = c.area || farmer?.farm_size || 1;
                  const marketPriceData = trendingCrops.find(t => t.name === c.crop_name);
                  const priceToUse = marketPriceData?.price || factor.price;

                  const totalRevenue = area * factor.yield * priceToUse;
                  const totalCost = area * factor.cost;
                  const netProfit = totalRevenue - totalCost;
                  const roi = (netProfit / totalCost) * 100;

                  return { ...c, profit: netProfit, roi: Math.round(roi), area };
                });

                const totalFarmProfit = earners.reduce((acc, curr) => acc + curr.profit, 0);
                const avgRoi = earners.length > 0 ? earners.reduce((acc, curr) => acc + curr.roi, 0) / earners.length : 0;
                
                // Sort to find the winner for the sub-text
                const sorted = [...earners].sort((a, b) => b.profit - a.profit);
                const winner = sorted[0] || { crop_name: '---', profit: 0, roi: 0, area: 0 };

                return (
                  <div className="mt-4 relative z-10">
                    <div className="flex items-end gap-2">
                      <h3 className="m-0 text-[32px] font-black text-gray-900 dark:text-white tracking-tighter leading-none">
                        ₹{totalFarmProfit > 0 ? totalFarmProfit.toLocaleString('en-IN') : '---'}
                      </h3>
                      <div className="flex flex-col">
                        <span className="text-emerald-500 text-xs font-black flex items-center">
                          ↑ {Math.round(avgRoi)}%
                        </span>
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Avg. ROI</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                       <span className="text-lg">{winner.crop_name !== '---' ? winner.emoji : '🌱'}</span>
                       <p className="m-0 text-[11px] text-gray-700 dark:text-gray-300 font-black uppercase tracking-widest">
                         Best: {winner.crop_name} <span className="text-gray-400 font-bold lowercase">({earners.length} crops)</span>
                       </p>
                    </div>
                  </div>
                );
             })()}

             <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700 relative z-10 flex justify-between items-center">
                <div className="flex flex-col">
                   <span className="text-[9px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-[0.15em]">Market Analysis</span>
                   <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Across all fields</span>
                </div>
                <div className="bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-lg font-black text-[10px] shadow-sm flex items-center gap-1">
                   ✨ PROFITABLE
                </div>
             </div>
             <div className="absolute -bottom-6 -right-6 text-7xl opacity-5 rotate-12 grayscale">💎</div>
          </div>
        </div>
      </section>

      {/* 5. SMART GUIDANCE: AI DRIVEN TIPS */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-base sm:text-xl text-gray-900 dark:text-white font-black m-0 break-words"><span className="uppercase tracking-widest">💡 Smart Guidance</span></h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {getSmartTips(
            currentSensorData.temperature, 
            currentSensorData.humidity, 
            currentSensorData.soil_moisture, 
            weatherData?.condition || '', 
            tipOffset,
            farmer
          ).map((tip, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-start gap-4 hover-lift">
              <div className="text-3xl">{tip.icon}</div>
              <div>
                <p className="m-0 text-sm font-bold text-gray-700 dark:text-gray-200 leading-snug">
                  {tip.text}
                </p>
                <span className={`text-[9px] font-black uppercase tracking-widest mt-2 inline-block px-2 py-0.5 rounded ${
                  tip.type === 'warning' ? 'bg-red-50 text-red-500' : 
                  tip.type === 'good' ? 'bg-green-50 text-green-500' : 
                  'bg-blue-50 text-blue-500'
                }`}>
                  {tip.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. STRATEGIC COMMAND CENTER: MARKET WATCH & FORECAST */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12 anim-fade-in">
        {/* Market Hub Column */}
        <section className="animate-fade-in-up">
          <div className="flex justify-between items-end mb-6">
            <div>
              <Text variant="heading" className="text-base sm:text-xl text-gray-900 dark:text-white font-black uppercase tracking-widest opacity-50 flex items-center gap-2 m-0 mb-1 break-words">
                📈 Market Hub: {marketDistrict}, {marketRegion}
              </Text>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                 <p className="m-0 text-[10px] text-gray-400 font-black uppercase tracking-widest">
                   {locationSource === 'GPS' ? 'LIVE GPS ACTIVE' : 'REGIONAL ESTIMATE'}
                 </p>
                 <div className="group relative ml-2">
                   <button className="text-[10px] text-gray-400 hover:text-gray-600 font-black flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded transition-colors">
                     ℹ️ Why these?
                   </button>
                   <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-gray-900 text-white text-[10px] font-bold rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[200] shadow-2xl leading-relaxed">
                     <p className="m-0 mb-1 text-green-400 uppercase tracking-widest font-black">Smart Logic Active:</p>
                     Showing: Your active crops + Seasonal picks for {new Date().toLocaleString('default', { month: 'long' })} + {marketRegion} specialties. 
                     <br/><br/>
                     Rotating every 60s to show more opportunities.
                   </div>
                 </div>
              </div>
            </div>
            <Link to="/market" className="text-[10px] font-black text-green-600 hover:text-green-700 uppercase tracking-widest no-underline flex items-center gap-1 group">
              View All Prices <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
          
          <div className="flex flex-col gap-4 min-h-[440px]">
            {marketLoading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-gray-100 dark:border-slate-700 flex items-center gap-4 animate-pulse">
                   <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-2xl" />
                   <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-100 dark:bg-slate-700 w-1/3 rounded" />
                      <div className="h-6 bg-gray-100 dark:bg-slate-700 w-1/2 rounded" />
                   </div>
                </div>
              ))
            ) : trendingCrops.length > 0 ? (
              trendingCrops.map((crop, idx) => (
                <div 
                  key={crop.name}
                  onClick={() => navigate('/market', { state: { selectedCommodity: crop.name }})}
                  className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 shadow-sm border border-gray-100 dark:border-slate-700 hover-lift cursor-pointer active:scale-95 transition-all flex items-center justify-between group relative overflow-hidden"
                >
                  <div className="flex items-center gap-4 sm:gap-6 relative z-10">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-50 dark:bg-slate-900 rounded-2xl sm:rounded-3xl flex items-center justify-center text-3xl sm:text-4xl shadow-inner border border-gray-100 dark:border-slate-700 group-hover:scale-110 transition-transform flex-shrink-0">
                      { { 'Rice': '🌾', 'Wheat': '🌾', 'Maize': '🌽', 'Tomato': '🍅', 'Potato': '🥔', 'Onion': '🧅', 'Cotton': '☁️', 'Soybean': '🫘', 'Coffee': '☕', 'Mango': '🥭', 'Watermelon': '🍉', 'Mustard': '🌼', 'Sugarcane': '🎋', 'Groundnut': '🥜' }[crop.name] || '🌱' }
                    </div>
                    <div>
                      <h4 className="m-0 text-base sm:text-xl font-black text-gray-900 dark:text-white tracking-tight break-words leading-tight">{crop.name}</h4>
                      <p className="m-0 text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1 break-words">
                        {crop.market}
                      </p>
                    </div>
                  </div>

                  <div className="text-right relative z-10">
                    <div className="flex flex-col items-end">
                      <p className="m-0 text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tighter tabular-nums">
                        ₹{crop.price}
                        <span className="text-[10px] text-gray-400 ml-1">/q</span>
                      </p>
                      {crop.change !== 0 && (
                        <div className={`flex items-center gap-1 mt-1 text-[10px] font-black uppercase tracking-widest ${crop.change > 0 ? 'text-emerald-500' : 'text-red-500'} tabular-nums`}>
                          <span>{crop.change > 0 ? '↗' : '↘'}</span>
                          <span>{crop.change > 0 ? '+' : ''}{crop.change}%</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Micro Decoration */}
                  <div className="absolute -right-4 -bottom-4 text-6xl opacity-[0.03] group-hover:opacity-10 transition-opacity rotate-12 grayscale">
                    { { 'Rice': '🌾', 'Wheat': '🌾', 'Maize': '🌽', 'Tomato': '🍅', 'Potato': '🥔', 'Onion': '🧅', 'Cotton': '☁️', 'Soybean': '🫘' }[crop.name] || '🌱' }
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-gray-50 dark:bg-slate-900 rounded-3xl p-12 text-center border-2 border-dashed border-gray-200 dark:border-slate-800">
                <p className="text-gray-400 font-bold italic">No mandi data for {marketRegion}. Try changing your location.</p>
              </div>
            )}

            <button 
              onClick={() => navigate('/chat', { state: { prefill: "Which crop will give me the most profit this month based on these mandi prices?" }})}
              className="mt-2 w-full bg-slate-900 dark:bg-white text-white dark:text-black py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 dark:hover:bg-gray-100 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-slate-900/10"
            >
              📊 Analyze Profit Strategy with AI
            </button>
          </div>
        </section>

        {/* 3-Day Strategy Column */}
        <section className="animate-fade-in-up [animation-delay:200ms]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base sm:text-xl text-gray-900 dark:text-white font-black uppercase tracking-widest opacity-50 flex items-center gap-2 m-0 break-words">
              📅 3-Day Strategy Outlook
            </h2>
          </div>

          <div className="flex flex-col gap-4">
            {[0, 1, 2].map((dayOffset) => {
              const date = new Date();
              date.setDate(date.getDate() + dayOffset);
              const isToday = dayOffset === 0;
              
              // Simulate forecast logic based on current weather
              const temp = Math.round((weatherData?.temperature || 25) + (dayOffset * 1.5) - (Math.random() * 2));
              const condition = isToday ? (weatherData?.condition || "Sunny") : "Mostly Sunny";
              
              const advice = dayOffset === 0 ? "Ideal for pest control spraying." : 
                             dayOffset === 1 ? "Warming up — check soil moisture." :
                                               "Prepare for irrigation cycle.";

              return (
                <div 
                  key={dayOffset} 
                  className={`p-5 rounded-3xl border transition-all hover-lift flex items-center gap-6 ${
                    isToday ? 'bg-blue-600 text-white border-blue-500 shadow-xl' : 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white border-gray-100 dark:border-slate-700'
                  }`}
                >
                  <div className="text-center min-w-[60px]">
                    <p className={`m-0 text-[10px] font-black uppercase tracking-widest ${isToday ? 'text-blue-200' : 'text-gray-400'}`}>
                      {date.toLocaleDateString('en-IN', { weekday: 'short' })}
                    </p>
                    <p className="m-0 text-2xl font-black tracking-tighter">
                      {date.getDate()}
                    </p>
                  </div>
                  
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-3xl ${isToday ? 'bg-blue-500/50' : 'bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700'}`}>
                    {getWeatherEmoji(condition, temp)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-black text-lg">{temp}°C</span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${isToday ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500'}`}>
                        {condition}
                      </span>
                    </div>
                    <p className={`m-0 text-xs sm:text-sm font-medium italic break-words leading-relaxed ${isToday ? 'text-blue-100' : 'text-gray-500'}`}>
                      💡 {advice}
                    </p>
                  </div>
                </div>
              );
            })}
            
            {/* 6. DYNAMIC FIELD MONITOR: MULTI-FIELD HARVEST TIMELINE */}
            {(() => {
              if (!activeCropsList || activeCropsList.length === 0) return (
                <div className="mt-2 bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 flex flex-col items-center gap-4 text-center">
                   <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center text-3xl">{!isLoggedIn ? '🔐' : '🏜️'}</div>
                   <div>
                      <p className="m-0 text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">{!isLoggedIn ? 'Monitoring Locked' : 'No Active Fields Found'}</p>
                      <p className="m-0 text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                        {!isLoggedIn ? 'Login to begin monitoring your farm health' : 'Add your crops to start monitoring'}
                      </p>
                   </div>
                   <button 
                     onClick={() => isLoggedIn ? setIsAddModalOpen(true) : navigate('/login')}
                     className="bg-[#16a34a] text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-green-700 transition-all active:scale-95 shadow-lg shadow-green-500/20"
                   >
                     {!isLoggedIn ? '🔑 Login to Monitor' : '🚀 Start First Planting'}
                   </button>
                </div>
              );

              // Calculate harvest stats for all crops
              const allFields = [...activeCropsList].map(c => {
                const planted = new Date(c.planted_date);
                const durationMap: Record<string, number> = {
                  'Rice': 120, 'Wheat': 130, 'Maize': 90, 'Tomato': 75, 'Potato': 90,
                  'Onion': 100, 'Cotton': 160, 'Sugarcane': 365, 'Soybean': 100,
                  'Groundnut': 110, 'Mustard': 100, 'Sunflower': 95, 'Chana': 105,
                  'Chili': 150, 'Ginger': 240, 'Garlic': 150, 'Mango': 120, 'Grapes': 120
                };
                let duration = durationMap[c.crop_name] || 120;
                
                // AI Adjustment
                const currentTemp = weatherData?.temperature || 25;
                if (currentTemp > 32) duration *= 0.95; 

                const harvest = new Date(planted.getTime() + duration * 24 * 60 * 60 * 1000);
                const diff = Math.ceil((harvest.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000));
                const elapsed = duration - diff;
                const progress = Math.min(99, Math.max(1, Math.round((elapsed / duration) * 100)));
                
                return { ...c, harvestDate: harvest, daysLeft: diff, progress, duration };
              }).sort((a, b) => a.daysLeft - b.daysLeft).filter(c => c.daysLeft > -15);

              if (allFields.length === 0) return null;
              const nearest = allFields[0];

              return (
                <div className="mt-2 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-100 dark:border-green-900/30 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden group">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 relative z-10">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-green-600 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-green-500/20">Active Field Monitor</span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{allFields.length} Fields Tracked</span>
                      </div>
                      <h2 className="m-0 text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tighter leading-tight break-words">
                        Next Harvest: <span className="text-green-600">{nearest.crop_name}</span>
                      </h2>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-xl flex items-center gap-4 border border-gray-100 dark:border-slate-700">
                      <div className="text-right">
                        <p className="m-0 text-[10px] font-black text-gray-400 uppercase tracking-widest">Expected Date</p>
                        <p className="m-0 text-xs sm:text-sm font-black text-gray-900 dark:text-white tabular-nums">
                          {nearest.harvestDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-green-50 dark:bg-green-900/40 rounded-xl flex items-center justify-center text-2xl shadow-inner">🚜</div>
                    </div>
                  </div>

                  {/* Main Highlight Field */}
                  <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-md rounded-3xl p-6 border border-white dark:border-white/5 shadow-xl relative z-10 mb-2 group/main transition-all hover:bg-white dark:hover:bg-slate-900">
                    <div className="flex justify-between items-end mb-4">
                       <div className="flex flex-col">
                          <span className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter leading-none mb-1">
                            {nearest.daysLeft <= 0 ? 'READY' : `${nearest.daysLeft}`}
                            {nearest.daysLeft > 0 && <span className="text-lg ml-1 opacity-40">Days</span>}
                          </span>
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                            {nearest.daysLeft <= 0 ? 'Harvest window open now' : 'Time until optimal cutting'}
                          </span>
                       </div>
                       <div className="text-right">
                          <div className="flex items-center gap-2 justify-end mb-1">
                            <span className="text-xl">{nearest.emoji}</span>
                            <span className="text-lg font-black text-green-600">{nearest.progress}%</span>
                          </div>
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Growth Maturity</span>
                       </div>
                    </div>
                    
                    <div className="relative h-4 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner p-1">
                       <div 
                         className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full shadow-[0_0_12px_rgba(34,197,94,0.6)] transition-all duration-1500 ease-out relative" 
                         style={{ width: `${nearest.progress}%` }}
                       >
                         <div className="absolute top-0 right-0 w-4 h-full bg-white/20 animate-pulse" />
                       </div>
                    </div>
                  </div>

                  {/* TOGGLE VIEW ALL FIELDS */}
                  {allFields.length > 1 && (
                    <div className="flex justify-center mt-4 relative z-10">
                      <button 
                        onClick={() => setIsTimelineOpen(!isTimelineOpen)}
                        className="bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-white dark:border-white/10 transition-all flex items-center gap-3 shadow-sm group/btn"
                      >
                        {isTimelineOpen ? '⬆️ Hide Other Fields' : `⬇️ View ${allFields.length - 1} More Upcoming Fields`}
                        {!isTimelineOpen && (
                          <div className="flex -space-x-2">
                            {allFields.slice(1, 4).map((f, i) => (
                              <div key={i} className="w-5 h-5 rounded-full bg-white dark:bg-slate-700 border-2 border-green-50 flex items-center justify-center text-[10px] shadow-sm">{f.emoji}</div>
                            ))}
                          </div>
                        )}
                      </button>
                    </div>
                  )}

                  {/* OTHER FIELDS TIMELINE (COLLAPSIBLE) */}
                  {allFields.length > 1 && (
                    <div className={`relative z-10 transition-all duration-500 ease-in-out overflow-hidden ${isTimelineOpen ? 'max-h-[500px] mt-8 opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="flex items-center justify-between mb-4 px-2">
                        <h4 className="m-0 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Full Crop Timeline</h4>
                        <span className="bg-white/50 dark:bg-black/20 text-[9px] font-black px-2 py-0.5 rounded-full border border-white/50 dark:border-white/5">
                          {allFields.length - 1} Upcoming
                        </span>
                      </div>
                      
                      <div className="flex gap-4 overflow-x-auto pb-4 invisible-scrollbar snap-x">
                        {allFields.slice(1).map((crop, idx) => (
                          <div 
                            key={idx} 
                            className="snap-start bg-white dark:bg-slate-800 px-6 py-4 rounded-[2rem] min-w-[200px] border border-gray-100 dark:border-slate-700 shadow-sm flex items-center gap-4 hover:shadow-xl transition-all cursor-pointer group/item"
                          >
                            <div className="w-12 h-12 bg-gray-50 dark:bg-slate-700 rounded-2xl flex items-center justify-center text-2xl shadow-sm group-hover/item:scale-110 transition-transform">
                              {crop.emoji}
                            </div>
                            <div className="flex flex-col flex-1 overflow-hidden">
                               <div className="flex justify-between items-start gap-2">
                                 <span className="text-xs font-black text-gray-900 dark:text-white uppercase truncate break-words leading-tight">{crop.crop_name}</span>
                                 <span className="text-[10px] font-black text-green-600 tabular-nums">{crop.progress}%</span>
                               </div>
                               <div className="flex justify-between items-center mt-1 gap-2">
                                 <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap tabular-nums">{crop.daysLeft} Days left</span>
                                 <div className="w-12 h-1 bg-gray-200 dark:bg-slate-900 rounded-full overflow-hidden flex-shrink-0">
                                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${crop.progress}%` }}></div>
                                 </div>
                               </div>
                            </div>
                          </div>
                        ))}
                        <button 
                          onClick={() => setIsAddModalOpen(true)}
                          className="snap-start bg-white/20 dark:bg-black/10 border-2 border-dashed border-gray-300 dark:border-slate-700 w-16 min-w-[64px] rounded-[2rem] flex items-center justify-center text-gray-400 hover:text-green-600 hover:border-green-600 transition-all active:scale-90"
                        >
                          <span className="text-2xl">+</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Decorative Background Icon */}
                  <div className="absolute -bottom-10 -right-10 text-[180px] opacity-[0.03] grayscale -rotate-12 pointer-events-none group-hover:scale-110 group-hover:rotate-0 transition-all duration-1000">
                    {nearest.emoji}
                  </div>
                </div>
              );
            })()}
          </div>
        </section>
      </div>

      {/* CROP MANAGEMENT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setIsAddModalOpen(false)} />
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[40px] p-8 relative z-10 shadow-2xl animate-fade-in-up overflow-hidden">
            
            {/* MODAL HEADER */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-1">
                  {cropModalTab === 'list' ? '🌾 Farm Schedule' : '🌱 Track New Crop'}
                </h3>
                <p className="text-gray-500 text-sm font-medium italic">
                  {cropModalTab === 'list' ? `You have ${activeCropsList.length} crops in the field.` : "Select a crop to start tracking its harvest."}
                </p>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)} 
                className="bg-gray-100 dark:bg-slate-800 w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-all font-bold"
              >
                ×
              </button>
            </div>

            {/* TAB CONTENT: LIST VIEW */}
            {cropModalTab === 'list' && (
              <div className="animate-fade-in">
                <div className="flex flex-col gap-3 mb-8 max-h-[350px] overflow-y-auto pr-2 no-scrollbar">
                  {activeCropsList.length > 0 ? (
                    activeCropsList.map((crop, i) => {
                      const hDate = getHarvestDate(crop.planted_date, crop.crop_name);
                      return (
                        <div key={i} className="bg-gray-50 dark:bg-slate-800/50 p-5 rounded-3xl flex items-center justify-between group hover:bg-red-50 dark:hover:bg-red-900/10 transition-all border border-transparent hover:border-red-100">
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-gray-100 dark:border-slate-700">
                              {crop.emoji}
                            </div>
                            <div>
                              <h4 className="m-0 text-lg font-black text-gray-900 dark:text-white">{crop.crop_name}</h4>
                              <p className="m-0 text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Planted: {new Date(crop.planted_date).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="m-0 text-[10px] text-green-600 font-black uppercase tracking-widest mb-1">Expected Harvest</p>
                              <p className="m-0 text-xl font-black text-gray-800 dark:text-gray-200 tracking-tighter">
                                {hDate?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                              </p>
                            </div>
                            <button 
                              onClick={() => deleteCrop(crop.id)}
                              className="w-10 h-10 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-white dark:hover:bg-slate-700 transition-all active:scale-90"
                              title="Delete Crop"
                            >
                              <span className="text-xl">🗑️</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-400 font-bold italic mb-6">No crops added to your schedule yet.</p>
                      <button 
                        onClick={() => setCropModalTab('add')}
                        className="bg-green-100 text-green-700 px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-green-200 transition-all"
                      >
                        Start First Planting
                      </button>
                    </div>
                  )}
                </div>
                {activeCropsList.length > 0 && (
                  <button 
                    onClick={() => setCropModalTab('add')}
                    className="w-full bg-[#16a34a] text-white py-5 rounded-[24px] font-black uppercase tracking-[0.2em] text-sm shadow-xl hover:bg-green-600 active:scale-95 transition-all"
                  >
                    + Add New Planting
                  </button>
                )}
              </div>
            )}

            {/* TAB CONTENT: ADD VIEW */}
            {cropModalTab === 'add' && (
              <div className="animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* STEP 1: SELECT CROP */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block">1. Choose Crop</label>
                      <button onClick={() => setCropModalTab('list')} className="text-[10px] font-black text-green-600 uppercase">Back to List</button>
                    </div>
                    <div className="grid grid-cols-3 gap-3 max-h-[300px] overflow-y-auto no-scrollbar pr-1 pb-4">
                      {Object.keys(CROP_ICONS).map(c => (
                        <button 
                          key={c}
                          onClick={() => setAddingCropName(c)}
                          className={`relative group h-24 rounded-3xl overflow-hidden border-4 transition-all flex flex-col items-center justify-center gap-1 ${
                            addingCropName === c ? 'border-[#16a34a] bg-green-50 shadow-lg scale-105' : 'border-gray-50 dark:border-slate-800 bg-white dark:bg-slate-800 hover:border-gray-100'
                          }`}
                        >
                          <img src={CROP_ICONS[c]} alt={c} className="w-full h-full absolute inset-0 object-cover opacity-10 group-hover:opacity-30 transition-opacity" />
                          <span className="text-2xl relative z-10">{ { 
                            'Rice': '🌾', 'Wheat': '🌾', 'Maize': '🌽', 'Tomato': '🍅', 'Potato': '🥔', 
                            'Onion': '🧅', 'Cotton': '☁️', 'Sugarcane': '🎋', 'Soybean': '🫘',
                            'Groundnut': '🥜', 'Mustard': '🌼', 'Sunflower': '🌻', 'Chana': '🫘',
                            'Grapes': '🍇', 'Mango': '🥭', 'Chili': '🌶️', 'Garlic': '🧄', 'Ginger': '🫚' 
                          }[c] }</span>
                          <span className={`text-[10px] font-black uppercase tracking-widest relative z-10 ${addingCropName === c ? 'text-[#16a34a]' : 'text-gray-500'}`}>{c}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* STEP 2: SELECT DATE */}
                  <div className="flex flex-col justify-between">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 block">2. When did you plant?</label>
                      <input 
                        type="date" 
                        value={addingDate}
                        onChange={(e) => setAddingDate(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 rounded-2xl p-4 text-gray-900 dark:text-white font-bold focus:outline-none focus:border-[#16a34a] transition-all"
                      />
                      
                       <div className="mt-8 bg-green-50 dark:bg-green-900/10 p-5 rounded-3xl border border-green-100 dark:border-green-900/30 overflow-hidden">
                         <p className="m-0 text-[10px] font-black text-green-600 uppercase tracking-widest mb-2 break-words leading-tight">Estimated Harvest Date</p>
                         <p className="m-0 text-xl sm:text-2xl font-black text-green-700 dark:text-green-400 tracking-tight tabular-nums">
                           {getHarvestDate(addingDate, addingCropName)?.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                         </p>
                         <p className="m-0 text-xs text-green-600/70 font-medium italic mt-1 break-words leading-relaxed">Based on {addingCropName} growth cycle</p>
                       </div>
                    </div>

                    <div className="flex flex-col gap-3 mt-8">
                      <button 
                        onClick={addQuickCrop}
                        className="bg-[#16a34a] text-white py-5 rounded-[24px] font-black uppercase tracking-[0.2em] text-sm shadow-xl hover:bg-green-600 active:scale-95 transition-all"
                      >
                        Confirm & Start Tracking
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}




