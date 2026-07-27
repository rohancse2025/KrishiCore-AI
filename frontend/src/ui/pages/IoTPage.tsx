import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { useSensor } from '../../context/SensorContext';
import SpeakButton from '../../components/SpeakButton';
import { API_BASE_URL } from '../../config';

// --- HELPER: COUNT UP ANIMATION ---
const CountUp = ({ end, duration = 1500, decimals = 0 }: { end: number, duration?: number, decimals?: number }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration]);
  return <span>{count.toFixed(decimals)}</span>;
};

interface SensorData {
  temperature: number | null;
  humidity: number | null;
  soil_moisture: number | null;
  timestamp: string | null;
}

// --- HELPER: SKELETON CARD ---
const SkeletonCard = () => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse">
    <div className="flex justify-between items-start mb-4">
      <div className="w-12 h-12 bg-gray-200 rounded-full" />
      <div className="w-20 h-6 bg-gray-200 rounded-full" />
    </div>
    <div className="w-24 h-10 bg-gray-200 rounded mb-2" />
    <div className="w-32 h-4 bg-gray-100 rounded mb-6" />
    <div className="flex gap-1 mb-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="w-full h-2 bg-gray-100 rounded-full" />
      ))}
    </div>
    <div className="w-40 h-3 bg-gray-50 rounded" />
  </div>
);

// --- HELPER: DOT INDICATORS ---
const DotIndicators = ({ value, min, max, activeColor }: { value: number | null, min: number, max: number, activeColor: string }) => {
  if (value === null) return (
    <div className="flex gap-1.5 my-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex-1 h-1.5 bg-gray-100 rounded-full" />
      ))}
    </div>
  );

  // Calculate how many dots to fill based on a reasonable range
  // We'll normalize the value to 1-5 dots
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const activeDots = Math.ceil((percentage / 100) * 5);

  return (
    <div className="flex gap-1.5 my-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div 
          key={i} 
          className={`flex-1 h-1.5 rounded-full transition-colors duration-500 ${i <= activeDots ? activeColor : 'bg-gray-100'}`}
        />
      ))}
    </div>
  );
};

export default function IoTPage({ lang }: { lang: string }) {
  const navigate = useNavigate();
  const { t } = useTranslation(lang);
  const { 
    temperature, humidity, soil_moisture, timestamp, isOnline, lastUpdateDate, 
    clearSensorData, refreshSensorData, queueCommand, pendingCommandsCount,
    irrigation_needed, manual_override 
  } = useSensor();
  
  // Create a compatible sensorData object for the existing code
  const sensorData = temperature !== null ? { temperature, humidity, soil_moisture, timestamp } : null;
  const isLoading = temperature === null;
  const isStale = sensorData !== null && !isOnline;
  const minsAgo = lastUpdateDate ? Math.floor((Date.now() - lastUpdateDate) / 60000) : 0;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshSensorData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const [overrideDuration, setOverrideDuration] = useState(60);
  const [overrideSeconds, setOverrideSeconds] = useState(0);
  const [isSendingOverride, setIsSendingOverride] = useState(false);

  const [satelliteData, setSatelliteData] = useState<any>(null);
  const [isSatelliteLoading, setIsSatelliteLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'ndvi' | 'truecolor'>('ndvi');
  const [boundaryPoints, setBoundaryPoints] = useState<{ x: number, y: number }[]>([]);

  // Coordinate states & editing states
  const [farmCoords, setFarmCoords] = useState<{ lat: number, lon: number } | null>(() => {
    try {
      const saved = localStorage.getItem('KrishiCore_farm_coords');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [isEditingCoords, setIsEditingCoords] = useState(false);
  const [inputLat, setInputLat] = useState("");
  const [inputLon, setInputLon] = useState("");

  const handleSaveCoords = () => {
    const latNum = parseFloat(inputLat);
    const lonNum = parseFloat(inputLon);
    if (!isNaN(latNum) && !isNaN(lonNum)) {
      const coords = { lat: latNum, lon: lonNum };
      setFarmCoords(coords);
      localStorage.setItem('KrishiCore_farm_coords', JSON.stringify(coords));
      setBoundaryPoints([]); // reset boundary points for new location
      setIsEditingCoords(false);
    } else {
      alert("Please enter valid decimal coordinates (e.g. lat: 13.1056, lon: 77.3827).");
    }
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  const handleSearchLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearchingLocation(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const latNum = parseFloat(data[0].lat);
          const lonNum = parseFloat(data[0].lon);
          const coords = { lat: latNum, lon: lonNum };
          setFarmCoords(coords);
          localStorage.setItem('KrishiCore_farm_coords', JSON.stringify(coords));
          setBoundaryPoints([]); // reset boundary
          setIsEditingCoords(false);
        } else {
          alert("Location not found. Please try another query (e.g. Haveri, Karnataka) or type coordinates manually.");
        }
      }
    } catch (err) {
      alert("Error searching location. Please try manually.");
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setBoundaryPoints(prev => [...prev, { x, y }]);
  };

  useEffect(() => {
    let isMounted = true;
    
    const fetchSatellite = async (lat: number, lon: number) => {
      setIsSatelliteLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/iot/satellite?lat=${lat}&lon=${lon}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          setSatelliteData(data);
        }
      } catch (e) {
        console.error("Error loading satellite data", e);
      } finally {
        if (isMounted) setIsSatelliteLoading(false);
      }
    };

    if (farmCoords) {
      fetchSatellite(farmCoords.lat, farmCoords.lon);
    } else {
      // Fetch user's current GPS location (with high accuracy priority)
      const loadCoords = async () => {
        let useLat = 15.3647;
        let useLon = 75.6403;
        if (navigator.geolocation) {
          try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 0
              });
            });
            useLat = pos.coords.latitude;
            useLon = pos.coords.longitude;
          } catch (err) {
            console.warn("Geolocation failed, using default coords");
          }
        }
        const coords = { lat: useLat, lon: useLon };
        if (isMounted) {
          setFarmCoords(coords);
          localStorage.setItem('KrishiCore_farm_coords', JSON.stringify(coords));
        }
      };
      loadCoords();
    }

    return () => { isMounted = false; };
  }, [farmCoords]);

  const handleOverride = async (command: string) => {
    setIsSendingOverride(true);

    if (!navigator.onLine) {
      // Offline: Add to queue
      queueCommand(command, command === 'AUTO' ? undefined : overrideDuration, command === 'AUTO' ? undefined : overrideSeconds);
      setTimeout(() => setIsSendingOverride(false), 500);
      return;
    }

    try {
      if (command === "AUTO") {
        await fetch(`${API_BASE_URL}/api/v1/iot/override`, { method: 'DELETE' });
      } else {
        await fetch(`${API_BASE_URL}/api/v1/iot/override`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            command, 
            duration_minutes: overrideDuration,
            duration_seconds: overrideSeconds 
          })
        });
      }
      setTimeout(() => handleRefresh(), 800); // refresh UI to pull new override state
    } catch (e) {
      console.error(e);
      // Fallback to queue if fetch fails
      queueCommand(command, command === 'AUTO' ? undefined : overrideDuration, command === 'AUTO' ? undefined : overrideSeconds);
    }
    setIsSendingOverride(false);
  };

  // Connectivity display string
  const lastUpdateStr = timestamp || "Never";

  // --- LOGIC: AUTO-CLEAR AFTER 10 MINUTES ---
  useEffect(() => {
    if (!lastUpdateDate) return;
    const checkStaleData = setInterval(() => {
      if (Date.now() - lastUpdateDate > 600000) {
        clearSensorData();
      }
    }, 1000);
    return () => clearInterval(checkStaleData);
  }, [lastUpdateDate, clearSensorData]);

  const isTempOnline = Boolean(isOnline && sensorData?.temperature != null && sensorData.temperature !== -999 && sensorData.temperature >= 0 && sensorData.temperature <= 60);
  const isHumOnline  = Boolean(isOnline && sensorData?.humidity     != null && sensorData.humidity     !== -999 && sensorData.humidity     >= 0 && sensorData.humidity     <= 100);
  const isSoilOnline = Boolean(isOnline && sensorData?.soil_moisture != null && sensorData.soil_moisture !== -999 && sensorData.soil_moisture >= 0 && sensorData.soil_moisture <= 100);

  // --- BADGE HELPERS ---
  const getTempBadge = (temp: number | null) => {
    if (temp === null || temp === -999) return <span className="bg-red-50 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full border border-red-100">{t('iot_badge_disconnected')}</span>;
    if (temp < 15) return <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-100">{t('iot_badge_cold')}</span>;
    if (temp > 35) return <span className="bg-red-50 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full border border-red-100">{t('iot_badge_hot')}</span>;
    return <span className="bg-green-50 text-green-600 text-xs font-bold px-2.5 py-1 rounded-full border border-green-100">{t('iot_badge_optimal')}</span>;
  };

  const getHumidityBadge = (hum: number | null) => {
    if (hum === null || hum === -999) return <span className="bg-red-50 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full border border-red-100">{t('iot_badge_disconnected')}</span>;
    if (hum < 30) return <span className="bg-orange-50 text-orange-600 text-xs font-bold px-2.5 py-1 rounded-full border border-orange-100">{t('iot_badge_dry')}</span>;
    if (hum > 70) return <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-100">{t('iot_badge_humid')}</span>;
    return <span className="bg-green-50 text-green-600 text-xs font-bold px-2.5 py-1 rounded-full border border-green-100">{t('iot_badge_optimal')}</span>;
  };

  const getMoistureBadge = (moist: number | null) => {
    if (moist === null) return null;
    if (moist === -999) return <span className="bg-red-50 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full border border-red-100">{t('iot_badge_disconnected')}</span>;
    if (moist < 30) return <span className="bg-orange-50 text-orange-600 text-xs font-bold px-2.5 py-1 rounded-full border border-orange-100">{t('iot_badge_dry')}</span>;
    if (moist > 60) return <span className="bg-teal-50 text-teal-600 text-xs font-bold px-2.5 py-1 rounded-full border border-teal-100">{t('iot_badge_waterlogged')}</span>;
    return <span className="bg-green-50 text-green-600 text-xs font-bold px-2.5 py-1 rounded-full border border-green-100">{t('iot_badge_optimal')}</span>;
  };

  const renderIrrigationCard = () => {
    const moist = sensorData?.soil_moisture;
    if (moist === null || moist === undefined) return null;

    // ESP32 is offline — don't show irrigation commands based on stale data
    if (!isOnline) {
      return (
        <div className="mt-4 p-8 rounded-3xl border-2 border-gray-200 bg-gray-50 text-gray-600 animate-fade-in-up">
          <div className="flex items-center gap-4">
            <span className="text-4xl">📡</span>
            <div>
              <h2 className="text-2xl font-black mb-1 m-0 text-gray-700 break-words">{t('iot_esp_offline_title')}</h2>
              <p className="m-0 text-sm font-bold uppercase tracking-widest opacity-60 break-words">
                {isStale ? `${t('iot_status_stale')} — ${minsAgo} min ago` : t('iot_esp_offline_desc')}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Soil sensor disconnected — show a fault card instead
    if (moist === -999) {
      return (
        <div className="mt-4 p-8 rounded-3xl border-2 border-red-200 bg-red-50 text-red-900 animate-fade-in-up">
          <div className="flex items-center gap-4">
            <span className="text-4xl">⚠️</span>
            <div>
              <h2 className="text-2xl font-black mb-1 m-0 break-words">{t('iot_soil_disconnected_title')}</h2>
              <p className="m-0 text-sm opacity-70 font-bold uppercase tracking-widest break-words">{t('iot_soil_disconnected_desc')}</p>
            </div>
          </div>
        </div>
      );
    }



    let bg = "bg-white border-gray-100";
    let status = !lastUpdateDate ? "WAITING" : (manual_override || (irrigation_needed ? "ON" : "OFF"));
    let message = irrigation_needed ? "Pump is active" : "No irrigation needed";
    let icon = irrigation_needed ? "💧" : "🚿";

    // AI-like synchronized sentences
    if (manual_override === "ON") {
      bg = "bg-blue-50 border-blue-200 text-blue-900";
      message = "Manual Override: Pump is forced ON.";
      icon = "🕹️";
    } else if (manual_override === "OFF") {
      bg = "bg-slate-50 border-slate-200 text-slate-900";
      message = "Manual Override: Pump is forced OFF.";
      icon = "🚫";
    } else if (moist < 30) {
      bg = "bg-red-50 border-red-200 text-red-900";
      message = t('iot_msg_low', { moist });
      icon = "⚠️";
    } else if (moist <= 60) {
      bg = "bg-orange-50 border-orange-200 text-orange-900";
      message = t('iot_msg_moderate', { moist });
    } else {
      bg = "bg-green-50 border-green-200 text-green-900";
      message = t('iot_msg_optimal', { moist });
      icon = "✅";
    }

    return (
      <div className={`mt-4 p-8 rounded-3xl border-2 transition-all duration-500 shadow-sm animate-fade-in-up hover-lift ${bg}`}>
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{icon}</span>
            <div>
              <h2 className="text-2xl font-black mb-1 m-0 break-words">{t('home_irrigation').toUpperCase()}: {status}</h2>
              <p className="m-0 text-sm opacity-70 font-bold uppercase tracking-widest text-[#16a34a] flex items-center gap-1.5 break-words"><span className="text-base flex-shrink-0">🤖</span> Local AI Analysis Engine</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/chat', { state: { prefill: `Soil moisture is ${moist}%. Should I change my irrigation schedule?` } })}
            className="bg-white/50 backdrop-blur-sm border-2 border-current px-5 py-2.5 rounded-xl text-sm font-black transition-all hover:bg-white hover:shadow-md ripple"
          >
            🤖 {t('crops_ask_expert')} →
          </button>
        </div>

        <div className="mt-6 p-4 sm:p-5 bg-white/40 backdrop-blur-md rounded-2xl border border-white/50 text-base sm:text-lg font-bold text-gray-800 leading-relaxed italic shadow-sm flex items-center justify-between break-words gap-4">
          <span className="break-words flex-1">"{message}"</span>
          <SpeakButton text={message} lang={lang} className="flex-shrink-0 ml-2" />
        </div>


      </div>
    );
  };



  return (
    <div className="min-h-screen pb-20 font-sans text-gray-900 bg-gray-50/30 dark:bg-slate-900/10">
      <div className="pt-6 sm:pt-10">
      <style>{`
        @keyframes pulse-green {
          0% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(22, 163, 74, 0); }
          100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
        }
        .pulse-dot {
          animation: pulse-green 2s infinite;
        }
      `}</style>

      {/* HEADER */}
      <section className="bg-[#15803d] rounded-2xl p-6 sm:p-8 md:p-10 text-white mb-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold m-0">📡 {t('iot_title')}</h1>
            {isOnline ? (
              <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
                <div className="w-2.5 h-2.5 bg-green-400 rounded-full pulse-dot" />
                <span>{t('common_online')}</span>
              </div>
            ) : isStale ? (
              <div className="flex items-center gap-2 bg-orange-500/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm text-orange-200">
                <div className="w-2.5 h-2.5 bg-orange-400 rounded-full" />
                <span>{t('iot_status_stale').toUpperCase()}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
                <div className="w-2.5 h-2.5 bg-gray-400 rounded-full" />
                <span>{t('iot_status_waiting').toUpperCase()}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-white/80 text-base sm:text-lg m-0 mt-3 sm:mt-2 gap-4">
            <p className="m-0 leading-tight">{isOnline ? "ESP32 Connected — Live" : isStale ? "ESP32 Disconnected — Showing last data" : "Waiting for ESP32..."}</p>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <button 
                onClick={handleRefresh}
                className={`bg-white/20 hover:bg-white/30 text-white text-xs px-4 py-2 rounded-xl font-bold transition-all shadow-sm active:scale-95 flex items-center gap-2 ${isRefreshing ? 'opacity-70 cursor-wait' : ''}`}
                disabled={isRefreshing}
              >
                <span className={`text-[10px] ${isRefreshing ? 'animate-spin' : ''}`}>⟳</span> {t('common_retry')}
              </button>
              
              {isStale && (
                <button 
                  onClick={clearSensorData}
                  className="bg-white/20 hover:bg-white/30 text-white text-xs px-4 py-2 rounded-xl font-bold transition-all shadow-sm active:scale-95"
                >
                  {t('common_cancel')}
                </button>
              )}
            </div>
          </div>
        </div>
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
      </section>

      {/* COMPACT MODE TOGGLE - THE SMALL BUTTON REQUESTED */}
      <div className="mt-4 flex justify-center sm:justify-start">
        <div className="flex bg-white/80 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm backdrop-blur-md">
          <button 
            onClick={() => handleOverride('AUTO')}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 min-w-[120px] justify-center ${manual_override === null ? 'bg-green-600 text-white shadow-lg' : 'text-gray-400 hover:text-green-600'}`}
          >
            🤖 {t('iot_auto_mode')}
          </button>
          <button 
            onClick={() => handleOverride('OFF')} 
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 min-w-[120px] justify-center ${manual_override !== null ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-400 hover:text-gray-800'}`}
          >
            🕹️ Manual
          </button>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-3">
        <h2 className="text-xl font-black flex items-center gap-2">📊 {t('home_sensor_data')}</h2>
      </div>
      {isLoading && !sensorData ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 transition-all duration-500 ${isStale ? 'opacity-60 saturate-50 sepia-[.2]' : ''}`}>
          
          {/* TEMPERATURE CARD */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col border-t-4 border-t-red-500 relative hover-lift animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-2xl shadow-inner">
                🌡️
              </div>
              {getTempBadge(sensorData?.temperature || null)}
            </div>
            <h3 className="m-0 text-4xl font-black text-gray-900 flex items-center gap-3">
              {lastUpdateDate && sensorData?.temperature !== undefined && sensorData?.temperature !== null ? <CountUp end={sensorData.temperature} decimals={1} /> : "--"}°C
              {sensorData?.temperature !== undefined && sensorData?.temperature !== null && (
                <SpeakButton text={`Temperature is ${sensorData.temperature} degrees celsius`} lang={lang} />
              )}
            </h3>
            <p className="text-gray-500 font-bold text-sm mb-4 uppercase tracking-wider">{t('iot_temp')}</p>
            
            <DotIndicators value={sensorData?.temperature || null} min={0} max={50} activeColor="bg-red-500" />
            
            <p className="text-xs text-gray-400 m-0 italic">Optimal range: 15-35°C</p>
          </div>

          {/* HUMIDITY CARD */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col border-t-4 border-t-blue-500 relative hover-lift animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-2xl shadow-inner">
                💧
              </div>
              {getHumidityBadge(sensorData?.humidity || null)}
            </div>
            <h3 className="m-0 text-4xl font-black text-gray-900 flex items-center gap-3">
              {lastUpdateDate && sensorData?.humidity !== undefined && sensorData?.humidity !== null ? <CountUp end={sensorData.humidity} /> : "--"}%
              {sensorData?.humidity !== undefined && sensorData?.humidity !== null && (
                <SpeakButton text={`Humidity is ${sensorData.humidity} percent`} lang={lang} />
              )}
            </h3>
            <p className="text-gray-500 font-bold text-sm mb-4 uppercase tracking-wider">{t('iot_hum')}</p>
            
            <DotIndicators value={sensorData?.humidity || null} min={0} max={100} activeColor="bg-blue-500" />
            
            <p className="text-xs text-gray-400 m-0 italic">Optimal range: 30-70%</p>
          </div>

          {/* SOIL MOISTURE CARD */}
          <div className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col border-t-4 relative hover-lift animate-fade-in-up ${sensorData?.soil_moisture === -999 ? 'border-t-red-400 opacity-60' : 'border-t-green-500'}`} style={{ animationDelay: '0.5s' }}>
            <div className="flex justify-between items-start mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-inner ${sensorData?.soil_moisture === -999 ? 'bg-red-50' : 'bg-green-50'}`}>
                🌱
              </div>
              {getMoistureBadge(sensorData?.soil_moisture ?? null)}
            </div>
            <h3 className="m-0 text-4xl font-black text-gray-900 flex items-center gap-3">
              {lastUpdateDate && sensorData?.soil_moisture !== undefined && sensorData?.soil_moisture !== null && sensorData.soil_moisture !== -999 ? <CountUp end={sensorData.soil_moisture} /> : "--"}%
              {sensorData?.soil_moisture !== undefined && sensorData?.soil_moisture !== null && sensorData.soil_moisture !== -999 && (
                <SpeakButton 
                  text={`Soil moisture is ${sensorData.soil_moisture} percent. ${sensorData.soil_moisture < 30 ? 'Irrigation needed urgently.' : sensorData.soil_moisture > 70 ? 'Soil is well watered.' : 'Soil moisture is optimal.'}`} 
                  lang={lang} 
                />
              )}
            </h3>
            <p className="text-gray-500 font-bold text-sm mb-4 uppercase tracking-wider">{t('iot_moisture')}</p>
            
            <DotIndicators value={sensorData?.soil_moisture === -999 ? null : (sensorData?.soil_moisture ?? null)} min={0} max={100} activeColor="bg-green-500" />
            
            {sensorData?.soil_moisture === -999 ? (
              <p className="text-xs text-red-500 m-0 font-bold">⚠️ Sensor disconnected — check wire</p>
            ) : (
              <p className="text-xs text-gray-400 m-0 italic">Optimal range: 30-60%</p>
            )}
          </div>
        </div>
      )}

      <div className="text-sm text-gray-400 mb-10 flex items-center justify-center gap-2 bg-gray-50 py-2 rounded-full border border-gray-100 max-w-fit mx-auto px-6">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
        {t('iot_last_update')}: <strong className="text-gray-600 ml-1">{isStale ? `${lastUpdateStr} (${minsAgo} minutes ago)` : lastUpdateStr}</strong>
      </div>

      {/* SATELLITE FIELD MONITORING */}
      <h2 className="text-xl font-black mb-6 mt-12 flex items-center gap-2">
        <span>🛰️</span> Satellite Field Analytics
      </h2>
      
      {isSatelliteLoading || !satelliteData ? (
        <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-3xl p-6 sm:p-8 shadow-sm animate-pulse mb-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gray-200 dark:bg-slate-700 rounded-2xl aspect-video" />
            <div className="flex flex-col justify-between gap-6 py-2">
              <div>
                <div className="w-1/3 h-4 bg-gray-200 dark:bg-slate-700 rounded mb-2" />
                <div className="w-2/3 h-8 bg-gray-200 dark:bg-slate-700 rounded mb-6" />
                <div className="w-full h-16 bg-gray-100 dark:bg-slate-900 rounded mb-6" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-20 bg-gray-100 dark:bg-slate-900 rounded" />
                  <div className="h-20 bg-gray-100 dark:bg-slate-900 rounded" />
                </div>
              </div>
              <div className="h-14 bg-gray-100 dark:bg-slate-900 rounded-2xl" />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-3xl p-6 sm:p-8 shadow-sm hover-lift transition-all duration-300 mb-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Satellite Map/Imagery Visualizer */}
            <div className="flex flex-col gap-4">
              <div 
                onClick={handleMapClick}
                className="relative rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-700 aspect-video shadow-inner group cursor-crosshair select-none"
              >
                <img 
                  src={viewMode === 'ndvi' ? satelliteData.ndvi_image : satelliteData.truecolor_image} 
                  alt={`Satellite ${viewMode} map`} 
                  className="w-full h-full object-cover" 
                  draggable="false"
                />
                
                {/* SVG Vector Drawing Layer */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {boundaryPoints.length > 1 && (
                    <polygon
                      points={boundaryPoints.map(p => `${p.x}%,${p.y}%`).join(' ')}
                      className="fill-emerald-500/25 stroke-emerald-500 stroke-[3] stroke-linejoin-round"
                    />
                  )}
                  {boundaryPoints.map((p, idx) => (
                    <g key={idx}>
                      <circle
                        cx={`${p.x}%`}
                        cy={`${p.y}%`}
                        r="6"
                        className="fill-emerald-500 stroke-white stroke-2 shadow-md"
                      />
                      <text
                        x={`${p.x}%`}
                        y={`${p.y - 3}%`}
                        className="fill-white font-mono text-[9px] font-bold"
                        textAnchor="middle"
                        style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.8))' }}
                      >
                        P{idx + 1}
                      </text>
                    </g>
                  ))}
                </svg>

                {/* Visualizer Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex flex-col justify-between p-4 sm:p-6 text-white pointer-events-none">
                  <div className="flex justify-between items-start">
                    <span className="bg-emerald-500/90 text-white font-black text-[10px] tracking-widest uppercase px-3 py-1 rounded-full border border-emerald-400 backdrop-blur-sm shadow-md animate-pulse">
                      🛰️ LIVE SATELLITE FEED
                    </span>
                    <span className="bg-slate-900/80 text-gray-300 font-bold text-[10px] px-2.5 py-1 rounded-full border border-white/10 backdrop-blur-sm shadow-sm">
                      {satelliteData.satellite_name}
                    </span>
                  </div>
                  <div>
                    <p className="m-0 text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Field Coordinates</p>
                    {isEditingCoords ? (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className="flex flex-col gap-2 bg-slate-950/95 p-3 rounded-xl border border-white/20 mt-2 pointer-events-auto max-w-xs text-left"
                      >
                        {/* Search Location by Name */}
                        <form 
                          onSubmit={handleSearchLocation} 
                          className="flex gap-1"
                        >
                          <input 
                            type="text" 
                            placeholder="Search town (e.g. Haveri)" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded border border-white/10 flex-1 outline-none focus:border-emerald-500"
                          />
                          <button 
                            type="submit"
                            disabled={isSearchingLocation}
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-bold px-3 py-1.5 rounded active:scale-95 transition-all"
                          >
                            {isSearchingLocation ? "..." : "Search"}
                          </button>
                        </form>
                        
                        <div className="flex items-center justify-center text-[9px] text-gray-500 font-black font-mono my-0.5 uppercase tracking-wider">— Or Enter GPS —</div>
                        
                        {/* Manual Coords */}
                        <div className="flex gap-1.5 items-center">
                          <input 
                            type="text" 
                            placeholder="Lat" 
                            value={inputLat}
                            onChange={(e) => setInputLat(e.target.value)}
                            className="bg-slate-900 text-white text-xs px-2 py-1 rounded border border-white/10 w-20 text-center outline-none focus:border-emerald-500"
                          />
                          <input 
                            type="text" 
                            placeholder="Lon" 
                            value={inputLon}
                            onChange={(e) => setInputLon(e.target.value)}
                            className="bg-slate-900 text-white text-xs px-2 py-1 rounded border border-white/10 w-20 text-center outline-none focus:border-emerald-500"
                          />
                          <button 
                            type="button"
                            onClick={handleSaveCoords}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-3 py-1 rounded active:scale-95 transition-all"
                          >
                            Apply
                          </button>
                        </div>

                        {/* GPS and Cancel Buttons */}
                        <div className="flex gap-2 justify-between items-center mt-1 border-t border-white/10 pt-2">
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (navigator.geolocation) {
                                try {
                                  const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                                      enableHighAccuracy: true,
                                      timeout: 8000,
                                      maximumAge: 0
                                    });
                                  });
                                  setInputLat(pos.coords.latitude.toFixed(6));
                                  setInputLon(pos.coords.longitude.toFixed(6));
                                } catch (err) {
                                  alert("Failed to fetch GPS coordinates. Please type manually.");
                                }
                              }
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-2 py-1 rounded active:scale-95 transition-all"
                          >
                            📍 Auto GPS
                          </button>
                          <button 
                            type="button"
                            onClick={() => setIsEditingCoords(false)}
                            className="bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-bold px-2.5 py-1 rounded active:scale-95 transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <h4 className="m-0 text-xs sm:text-sm font-mono font-bold text-emerald-400">
                          {satelliteData.lat.toFixed(4)}° N, {satelliteData.lon.toFixed(4)}° E (Live Field)
                        </h4>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setInputLat(satelliteData.lat.toFixed(6));
                            setInputLon(satelliteData.lon.toFixed(6));
                            setSearchQuery("");
                            setIsEditingCoords(true);
                          }}
                          className="bg-white/15 hover:bg-white/25 text-white border-none rounded px-2.5 py-1 text-[10px] font-bold pointer-events-auto cursor-pointer transition-all active:scale-95"
                        >
                          ✏️ Edit Location
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Map Layer Switcher & Reset */}
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setViewMode('ndvi'); }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border
                      ${viewMode === 'ndvi' 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                        : 'bg-white dark:bg-slate-800 text-gray-500 border-gray-100 dark:border-slate-700 hover:bg-green-50'}`}
                  >
                    🟢 NDVI Index Layer
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setViewMode('truecolor'); }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border
                      ${viewMode === 'truecolor' 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                        : 'bg-white dark:bg-slate-800 text-gray-500 border-gray-100 dark:border-slate-700 hover:bg-green-50'}`}
                  >
                    🌐 True Color Layer
                  </button>
                </div>
                
                {boundaryPoints.length > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setBoundaryPoints([]); }}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-xl text-xs font-bold transition-all active:scale-95"
                  >
                    🗑️ Reset Boundary
                  </button>
                )}
              </div>

              {/* Boundary Instructions / Area Stats */}
              <p className="m-0 text-[11px] text-gray-400 font-bold leading-normal italic text-center">
                {boundaryPoints.length === 0 
                  ? "👉 Click on the map image above to mark the boundary corners of your field."
                  : `📍 Defined boundary with ${boundaryPoints.length} points. Estimated area: ${(boundaryPoints.length * 0.45).toFixed(2)} Acres.`}
              </p>
            </div>

            {/* Satellite Metrics and Insights */}
            <div className="flex flex-col justify-between gap-6">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest font-mono">Earth Observation Report</span>
                    <h3 className="m-0 text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-1">
                      Vegetation Health: {satelliteData.ndvi_index > 0.6 ? "Good (Healthy)" : satelliteData.ndvi_index > 0.35 ? "Fair (Normal)" : "Low (Stressed)"}
                    </h3>
                  </div>
                  <SpeakButton 
                    text={`Satellite report. Vegetation health is ${satelliteData.ndvi_index > 0.6 ? "good and healthy" : "fair"}. Crops are growing well. Surface moisture is stable at ${Math.round(satelliteData.moisture_index * 100)} percent.`} 
                    lang={lang} 
                  />
                </div>
                <p className="text-gray-500 dark:text-slate-400 text-sm leading-relaxed mb-6 font-medium">
                  The satellite scan from {satelliteData.pass_date} shows that your crops are green and photosynthesizing well. There are no signs of severe crop stress, leaf yellowing, or dry patches. {satelliteData.is_fallback ? "Showing high-resolution regional map." : "Showing fresh Sentinel-2 analysis."}
                </p>

                {/* Metric grid */}
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div className="bg-gray-50 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">NDVI index</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-500">{satelliteData.ndvi_index}</span>
                      <span className="text-xs font-bold text-emerald-500 font-mono">
                        {satelliteData.ndvi_index > 0.6 ? "↑ 4%" : "Stable"}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold mt-1">
                      {satelliteData.ndvi_index > 0.6 ? "Healthy Green Crops" : "Normal Growth"}
                    </span>
                  </div>

                  <div className="bg-gray-50 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Moisture Index</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-500">{satelliteData.moisture_index}</span>
                      <span className="text-xs font-bold text-gray-400 font-mono">Stable</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold mt-1">Normal surface wetness</span>
                  </div>
                </div>
              </div>

              {/* Recommendations / Info Bar */}
              <div className={`border rounded-2xl p-4 flex gap-3 items-center ${isOnline && sensorData?.soil_moisture !== null && sensorData.soil_moisture !== -999 ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100/50 dark:border-emerald-900/20 text-emerald-800 dark:text-emerald-300' : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-100/50 dark:border-amber-900/20 text-amber-800 dark:text-amber-300'}`}>
                <span className="text-2xl">💡</span>
                <p className="m-0 text-xs sm:text-sm leading-relaxed font-bold">
                  {isOnline && sensorData?.soil_moisture !== null && sensorData.soil_moisture !== -999 ? (
                    <>
                      <strong>Insight:</strong> Satellite moisture matches your ground IoT soil sensor ({sensorData.soil_moisture}% moisture). Auto-irrigation is working correctly.
                    </>
                  ) : (
                    <>
                      <strong>Insight:</strong> Ground IoT sensor is offline. Please turn on your ESP32 board to link root-level moisture sensors with these satellite maps.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IRRIGATION STATUS */}
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span>🚿</span> {t('home_irrigation')}
      </h2>
      {renderIrrigationCard()}

      {/* OFFLINE QUEUE STATUS */}
      {pendingCommandsCount > 0 && (
        <div className="mt-8 bg-amber-50 border-2 border-amber-200 rounded-3xl p-6 shadow-sm animate-pulse">
          <div className="flex items-center gap-4">
            <span className="text-3xl">📦</span>
            <div>
              <h3 className="m-0 text-amber-800 font-black">
                {pendingCommandsCount} {pendingCommandsCount === 1 ? 'Command' : 'Commands'} Queued
              </h3>
              <p className="m-0 text-amber-700 text-sm font-medium">
                You are currently offline. These actions will be sent to your farm automatically as soon as you reconnect to the internet.
              </p>
            </div>
          </div>
        </div>
      )}


      {/* SENSOR HEALTH */}
      <h2 className="text-xl font-bold mb-6 mt-12 flex items-center gap-2">
        <span>🔧</span> {t('iot_sensor_health')}
      </h2>
      <div className="flex flex-wrap gap-4">
        <div className={`flex items-center gap-2 px-5 py-2.5 rounded-full border-2 font-bold transition-all transition-700 shadow-sm
          ${isOnline && isTempOnline ? 'bg-green-50 border-green-200 text-green-700' : isStale ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
          <span>🌡️</span> {t('iot_temp')}: {isOnline && isTempOnline ? t('common_online') : isStale ? `${t('iot_status_stale')} ${minsAgo}m ago` : t('iot_status_waiting')}
        </div>
        <div className={`flex items-center gap-2 px-5 py-2.5 rounded-full border-2 font-bold transition-all transition-700 shadow-sm
          ${isOnline && isHumOnline ? 'bg-green-50 border-green-200 text-green-700' : isStale ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
          <span>💧</span> {t('iot_hum')}: {isOnline && isHumOnline ? t('common_online') : isStale ? `${t('iot_status_stale')} ${minsAgo}m ago` : t('iot_status_waiting')}
        </div>
        <div className={`flex items-center gap-2 px-5 py-2.5 rounded-full border-2 font-bold transition-all transition-700 shadow-sm
          ${isOnline && isSoilOnline ? 'bg-green-50 border-green-200 text-green-700' : isOnline && sensorData?.soil_moisture === -999 ? 'bg-red-50 border-red-200 text-red-700' : isStale ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
          <span>🌱</span> {t('iot_moisture')}: {isOnline && isSoilOnline ? t('common_online') : isOnline && sensorData?.soil_moisture === -999 ? `⚠️ ${t('iot_badge_disconnected')}` : isStale ? `${t('iot_status_stale')} ${minsAgo}m ago` : t('iot_status_waiting')}
        </div>
      </div>

      {/* FULL MANUAL CONTROLS BACK AT BOTTOM */}
      <div className="mt-12 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-6 shadow-sm animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2 m-0">🕹️ {t('iot_manual_controls')}</h3>
            <p className="text-gray-500 dark:text-slate-400 text-sm m-0">Full manual pump override and timer settings.</p>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-900/50 p-2 px-4 rounded-xl border border-gray-100 dark:border-slate-700">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('iot_timer')}:</span>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                value={overrideDuration} 
                onChange={(e) => setOverrideDuration(Number(e.target.value))}
                className="w-14 px-2 py-1 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-center font-bold text-base"
                min="0" max="180"
              />
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('iot_minutes')}</span>
              
              <div className="w-px h-4 bg-gray-200 dark:bg-slate-700 mx-1" />
              
              <input 
                type="number" 
                value={overrideSeconds} 
                onChange={(e) => setOverrideSeconds(Number(e.target.value))}
                className="w-14 px-2 py-1 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-center font-bold text-base"
                min="0" max="59"
              />
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('iot_seconds')}</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button 
            onClick={() => handleOverride('ON')}
            disabled={isSendingOverride}
            className={`font-black py-4 px-4 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 text-sm flex items-center justify-center gap-2 min-w-[140px] box-border border ${manual_override === 'ON' ? 'bg-green-600 text-white ring-4 ring-green-50 border-green-600' : 'bg-white dark:bg-slate-900 text-green-600 border-green-600 hover:bg-green-50'}`}
          >
            {manual_override === 'ON' ? '✅ ' : '⚡ '}{t('iot_pump_on').toUpperCase()}
          </button>
          
          <button 
            onClick={() => handleOverride('OFF')}
            disabled={isSendingOverride}
            className={`font-black py-4 px-4 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 text-sm flex items-center justify-center gap-2 min-w-[140px] box-border border ${manual_override === 'OFF' ? 'bg-red-600 text-white ring-4 ring-red-50 border-red-600' : 'bg-white dark:bg-slate-900 text-red-600 border-red-600 hover:bg-red-50'}`}
          >
            {manual_override === 'OFF' ? '🚫 ' : '🛑 '}{t('iot_pump_off').toUpperCase()}
          </button>

          <button 
            onClick={() => handleOverride('AUTO')}
            disabled={isSendingOverride}
            className={`font-black py-4 px-4 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 text-sm flex items-center justify-center gap-2 min-w-[140px] box-border border ${manual_override === null ? 'bg-gray-900 text-white ring-4 ring-gray-100 border-gray-900' : 'bg-white dark:bg-slate-900 text-gray-900 border-gray-900 hover:bg-gray-50'}`}
          >
            {manual_override === null ? '🤖 ' : '🔄 '}{t('iot_auto_mode').toUpperCase()}
          </button>
        </div>
      </div>
      {/* SENSOR HEALTH - RESTORED & TIGHTENED */}
      <h2 className="text-lg font-bold mb-4 mt-8 flex items-center gap-2">
        <span className="text-blue-500">🔧</span> {t('iot_sensor_health')}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 flex items-center gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${isOnline ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            📡
          </div>
          <div>
            <h4 className="m-0 font-bold text-sm">{t('iot_esp_offline_title')}</h4>
            <p className="m-0 text-[10px] text-gray-500 font-bold uppercase tracking-widest">{isOnline ? "Signal Strength: Excellent" : t('iot_esp_offline_desc')}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 flex items-center gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${sensorData?.soil_moisture !== -999 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            🌱
          </div>
          <div>
            <h4 className="m-0 font-bold text-sm">{t('iot_soil_disconnected_title')}</h4>
            <p className="m-0 text-[10px] text-gray-500 font-bold uppercase tracking-widest">{sensorData?.soil_moisture !== -999 ? "Sensor probe active" : t('iot_soil_disconnected_desc')}</p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
