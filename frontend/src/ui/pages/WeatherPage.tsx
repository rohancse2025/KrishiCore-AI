import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config';
import { predictWeatherOffline, getDefaultWeatherParams } from '../../lib/offline-weather';

type WeatherData = {
  temperature: number;
  humidity: number;
  wind_speed: number;
  condition: string;
  city: string;
  farming_tip: string;
};

function getWeatherEmoji(condition: string): string {
  const c = condition.toLowerCase();
  if (c.includes('clear') || c.includes('sunny')) return '☀️';
  if (c.includes('cloud') || c.includes('overcast')) return '☁️';
  if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) return '🌧️';
  if (c.includes('storm') || c.includes('thunder')) return '⛈️';
  if (c.includes('snow') || c.includes('sleet')) return '❄️';
  if (c.includes('mist') || c.includes('fog') || c.includes('haze')) return '🌫️';
  if (c.includes('wind')) return '💨';
  return '🌤️';
}

function getTipEmoji(tip: string): string {
  const t = tip.toLowerCase();
  if (t.includes('rain') || t.includes('drainage')) return '🌧️';
  if (t.includes('wind') || t.includes('storm')) return '💨';
  if (t.includes('fungal') || t.includes('humidity')) return '🍄';
  if (t.includes('high temp') || t.includes('irrigation')) return '🌡️';
  if (t.includes('frost') || t.includes('low temp')) return '🥶';
  return '🌿';
}

export default function WeatherPage() {
  const navigate = useNavigate();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineForecast, setOfflineForecast] = useState<ReturnType<typeof predictWeatherOffline> | null>(null);
  const [locationSource, setLocationSource] = useState<'GPS'|'Profile'>(() => (localStorage.getItem('preferred_location_source') as 'GPS'|'Profile') || 'GPS');
  const [coords, setCoords] = useState<{lat:number, lon:number}|null>(null);

  useEffect(() => {
    const go = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', go);
    window.addEventListener('offline', go);
    return () => { window.removeEventListener('online', go); window.removeEventListener('offline', go); };
  }, []);

  useEffect(() => {
    if (!navigator.onLine) {
      // Offline: use rule-based forecast with default sensor values
      const params = getDefaultWeatherParams();
      setOfflineForecast(predictWeatherOffline(params));
      setLoading(false);
      return;
    }

    const farmer = (() => { try { return JSON.parse(localStorage.getItem('KrishiCore_farmer') || 'null'); } catch(e){return null;} })();

    const fetchByCity = async (cityName?: string) => {
      try {
        if (!cityName) throw new Error('No city');
        const res = await fetch(`${API_BASE_URL}/api/v1/weather?city=${encodeURIComponent(cityName)}`);
        if (!res.ok) throw new Error('Weather fetch failed');
        const data: WeatherData = await res.json();
        setWeather(data);
      } catch (e) {
        const params = getDefaultWeatherParams();
        setOfflineForecast(predictWeatherOffline(params));
      } finally { setLoading(false); }
    };

    const fetchByCoords = async (lat: number, lon: number) => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/weather?lat=${lat}&lon=${lon}`);
        if (!res.ok) throw new Error('Weather fetch failed');
        const data: WeatherData = await res.json();
        setWeather(data);
      } catch (e) {
        const params = getDefaultWeatherParams();
        setOfflineForecast(predictWeatherOffline(params));
      } finally { setLoading(false); }
    };

    // If user explicitly wants Profile, use profile city
    if (locationSource === 'Profile' && farmer?.location) {
      const parts = farmer.location.split(',').map((p: string) => p.trim()).filter(Boolean);
      const cityPart = parts[0] || parts[1] || 'Ludhiana';
      fetchByCity(cityPart);
      return;
    }

    // Default: use GPS coordinates
    if (!navigator.geolocation) {
      if (farmer?.location) { fetchByCity(farmer.location.split(',')[0].trim()); return; }
      setError('Your browser does not support location access. Please allow location to see weather.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lon: longitude });
        fetchByCoords(latitude, longitude);
      },
      (_err) => {
        if (locationSource === 'Profile' && farmer?.location) {
          fetchByCity(farmer.location.split(',')[0].trim());
          return;
        }
        setError('Location access denied. Please allow location in your browser to see weather.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [locationSource]);

  const handleAskAI = () => {
    if (!weather) return;
    const msg = `It is currently ${weather.temperature}°C with ${weather.condition} and ${weather.humidity}% humidity in ${weather.city}. What farming advice do you have for today?`;
    navigate('/chat', { state: { prefill: msg } });
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="text-5xl animate-spin text-green-600">🌿</div>
      <p className="text-gray-500 text-base italic">Detecting your location and fetching weather...</p>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="bg-white rounded-2xl p-10 text-center max-w-md w-full mx-4 shadow-xl shadow-gray-200/50 border border-gray-200">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-gray-900 mb-3 text-2xl font-bold">Weather Unavailable</h2>
        <p className="text-gray-500 leading-relaxed">{error}</p>
      </div>
    </div>
  );

  // ── OFFLINE FORECAST UI ──────────────────────────────────
  if (offlineForecast && !weather) return (
    <div className="max-w-4xl w-full px-4 sm:px-6 mx-auto flex flex-col gap-6 font-sans">
      <div>
        <h1 className="m-0 mb-1 text-2xl text-gray-900 font-bold">🌦️ Weather & Farm Advisor</h1>
        <p className="m-0 text-gray-500 text-sm">
          📡 Offline mode — rule-based forecast from sensor/seasonal patterns
        </p>
      </div>

      {/* Offline banner */}
      <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
        <span className="text-xl">📡</span>
        <div>
          <p className="m-0 text-amber-800 font-black text-sm">OFFLINE WEATHER ESTIMATE</p>
          <p className="m-0 text-amber-700 text-xs">Based on barometric pressure rules & Indian seasonal patterns. Connect internet for live forecast.</p>
        </div>
      </div>

      {/* Condition card */}
      <div className="bg-gradient-to-br from-green-600 via-green-700 to-green-800 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-5">
          <span className="text-7xl leading-none">{offlineForecast.conditionEmoji}</span>
          <div>
            <p className="m-0 text-base opacity-85 font-semibold mb-1">Predicted Condition</p>
            <h2 className="m-0 text-3xl font-black">{offlineForecast.condition}</h2>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {offlineForecast.alerts.length > 0 && (
        <div className="space-y-3">
          {offlineForecast.alerts.map((alert, i) => (
            <div key={i} className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-3">
              <p className="m-0 text-red-800 font-bold text-sm">{alert}</p>
            </div>
          ))}
        </div>
      )}

      {/* Forecast points */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <h3 className="m-0 mb-4 text-xs text-green-600 font-black uppercase tracking-widest">24-Hour Outlook</h3>
        <div className="space-y-3">
          {offlineForecast.forecast.map((f, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-green-500 font-black text-lg leading-none mt-0.5">•</span>
              <p className="m-0 text-gray-700 font-medium">{f}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Advice cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm border-l-4 border-l-green-500">
          <p className="m-0 mb-2 text-xs text-green-600 font-black uppercase tracking-wider">🌱 Farming Advice</p>
          <p className="m-0 text-gray-700 font-medium">{offlineForecast.farmingAdvice}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm border-l-4 border-l-blue-500">
          <p className="m-0 mb-2 text-xs text-blue-600 font-black uppercase tracking-wider">💧 Irrigation</p>
          <p className="m-0 text-gray-700 font-medium">{offlineForecast.irrigationAdvice}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm border-l-4 border-l-purple-500">
          <p className="m-0 mb-2 text-xs text-purple-600 font-black uppercase tracking-wider">🧪 Spray Safety</p>
          <p className="m-0 text-gray-700 font-medium">{offlineForecast.sprayAdvice}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm border-l-4 border-l-amber-500">
          <p className="m-0 mb-2 text-xs text-amber-600 font-black uppercase tracking-wider">📡 Source</p>
          <p className="m-0 text-gray-600 text-sm">Pressure rules + Indian seasonal patterns. For live weather, allow location & connect internet.</p>
        </div>
      </div>
    </div>
  );

  if (!weather) return null;

  const emoji = getWeatherEmoji(weather.condition);
  const tipEmoji = getTipEmoji(weather.farming_tip);

  return (
    <div className="max-w-4xl w-full px-4 sm:px-6 mx-auto flex flex-col gap-6 font-sans">

      {/* Header */}
      <div>
        <h1 className="m-0 mb-1 text-2xl text-gray-900 font-bold">🌦️ Weather & Farm Advisor</h1>
        <p className="m-0 text-gray-500 text-sm">Live local weather with farming insights</p>
      </div>

      <div className="flex items-center gap-3 justify-end">
        <div className="text-xs text-gray-500 mr-3">Source:</div>
        <div className="flex gap-2">
          <button
            onClick={() => { localStorage.setItem('preferred_location_source', 'GPS'); setLocationSource('GPS'); }}
            className={`px-3 py-1 rounded-full text-sm font-bold ${locationSource === 'GPS' ? 'bg-white/10 text-white' : 'bg-white text-gray-700 border'}`}
          >GPS</button>
          <button
            onClick={() => { localStorage.setItem('preferred_location_source', 'Profile'); setLocationSource('Profile'); }}
            className={`px-3 py-1 rounded-full text-sm font-bold ${locationSource === 'Profile' ? 'bg-white/10 text-white' : 'bg-white text-gray-700 border'}`}
          >Profile</button>
        </div>
        <div className="ml-4 text-sm text-gray-600">Location: <strong className="text-gray-800">{weather.city || (coords ? `${coords.lat.toFixed(3)}, ${coords.lon.toFixed(3)}` : 'Unknown')}</strong></div>
      </div>

      {/* Main Weather Card */}
      <div className="bg-gradient-to-br from-green-600 via-green-700 to-green-800 rounded-2xl p-6 sm:p-9 md:p-10 text-white flex flex-col md:flex-row justify-between items-center shadow-lg shadow-green-600/30">
        <div className="text-center md:text-left mb-6 md:mb-0">
          <p className="m-0 mb-1.5 text-sm sm:text-base opacity-85 font-semibold">📍 {weather.city}</p>
          <div className="flex items-baseline justify-center md:justify-start gap-2 sm:gap-3">
            <span className="text-6xl sm:text-7xl font-bold leading-none">{Math.round(weather.temperature)}°</span>
            <span className="text-xl sm:text-2xl mb-2 sm:mb-2.5 opacity-90">C</span>
          </div>
          <p className="m-0 mt-2 text-lg sm:text-xl opacity-95 font-semibold capitalize">
            {emoji} {weather.condition}
          </p>
        </div>
        <div className="flex flex-col gap-4 w-full md:w-auto">
          <div className="bg-white/15 rounded-xl p-4 md:px-6 backdrop-blur-md shadow-inner border border-white/10">
            <p className="m-0 mb-1 text-xs opacity-75 uppercase tracking-widest font-bold">Humidity</p>
            <p className="m-0 text-2xl font-black">💧 {weather.humidity}%</p>
          </div>
          <div className="bg-white/15 rounded-xl p-4 md:px-6 backdrop-blur-md shadow-inner border border-white/10">
            <p className="m-0 mb-1 text-xs opacity-75 uppercase tracking-widest font-bold">Wind Speed</p>
            <p className="m-0 text-2xl font-black">💨 {weather.wind_speed} m/s</p>
          </div>
        </div>
      </div>

      {/* Farming Tip Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 sm:px-8 border border-gray-200 shadow-sm border-l-[6px] border-l-green-600 md:animate-fade-in">
        <div className="flex items-start gap-4">
          <span className="text-3xl sm:text-4xl leading-none flex-shrink-0">{tipEmoji}</span>
          <div>
            <h3 className="m-0 mb-2 text-[10px] sm:text-xs text-green-600 font-black uppercase tracking-widest">
              Today's Farming Tip
            </h3>
            <p className="m-0 text-base sm:text-lg text-gray-800 leading-relaxed font-medium">{weather.farming_tip}</p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Temperature", value: `${Math.round(weather.temperature)}°C`, icon: "🌡️", sub: weather.temperature > 30 ? "Hot" : weather.temperature < 15 ? "Cool" : "Comfortable" },
          { label: "Humidity", value: `${weather.humidity}%`, icon: "💧", sub: weather.humidity > 80 ? "High — fungal risk" : weather.humidity < 40 ? "Low — dry stress" : "Moderate" },
          { label: "Wind Speed", value: `${weather.wind_speed} m/s`, icon: "💨", sub: weather.wind_speed > 10 ? "Strong winds" : weather.wind_speed > 5 ? "Breezy" : "Calm" }
        ].map(({ label, value, icon, sub }) => (
          <div key={label} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm transition-all hover:bg-gray-50/50">
            <p className="m-0 mb-2 text-[11px] text-gray-400 uppercase font-black">{icon} {label}</p>
            <p className="m-0 mb-1 text-2xl font-black text-gray-900">{value}</p>
            <p className="m-0 text-xs text-green-600 font-bold italic">{sub}</p>
          </div>
        ))}
      </div>

      {/* Ask AI Button */}
      <div className="flex justify-center pt-2 pb-4">
        <button
          onClick={handleAskAI}
          className="flex items-center gap-2.5 bg-green-600 text-white border-none rounded-xl py-4 px-10 text-base font-bold cursor-pointer shadow-lg shadow-green-600/30 transition-all hover:-translate-y-0.5 hover:shadow-green-600/40 active:scale-95"
        >
          🤖 Ask AI about this weather
        </button>
      </div>
    </div>
  );
}
