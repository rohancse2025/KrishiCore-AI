import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { useSensor } from '../../context/SensorContext';
import SpeakButton from '../../components/SpeakButton';
import CropSearchInput from '../../components/CropSearchInput';
import { recommendCropsOffline } from '../../services/offline-crop-engine';
import { API_BASE_URL } from '../../config';
import { analyzeSoilOffline } from '../../data/soil-analysis-offline';
import { calculateFertilizerOffline } from '../../data/fertilizer-offline';

// Helper for farmer-friendly hints
const getSliderHint = (name: string, value: number) => {
  if (name === "N") {
    if (value < 20) return "âš ï¸ Too low â€” apply urea or compost";
    if (value > 120) return "âš ï¸ Too high â€” reduce chemical fertilizer";
  } else if (name === "P") {
    if (value < 15) return "âš ï¸ Too low â€” add DAP fertilizer";
    if (value > 100) return "âš ï¸ Too high â€” skip phosphorus fertilizer";
  } else if (name === "K") {
    if (value < 20) return "âš ï¸ Too low â€” apply potash fertilizer";
    if (value > 150) return "âš ï¸ Too high â€” reduce potash use";
  } else if (name === "temperature") {
    if (value < 10) return "âš ï¸ Too cold â€” consider greenhouse farming";
    if (value > 40) return "âš ï¸ Too hot â€” use shade nets and extra irrigation";
  } else if (name === "humidity") {
    if (value < 30) return "âš ï¸ Too dry â€” increase irrigation frequency";
    if (value > 90) return "âš ï¸ Very humid â€” watch out for fungal diseases";
  } else if (name === "ph") {
    if (value < 5.5) return "âš ï¸ Too acidic â€” add lime to soil";
    if (value > 8) return "âš ï¸ Too alkaline â€” add sulfur or organic matter";
  } else if (name === "rainfall") {
    if (value < 30) return "âš ï¸ Very dry area â€” choose drought resistant crops";
    if (value > 250) return "âš ï¸ Very wet area â€” ensure proper drainage";
  }
  return null;
};


export default function CropsPage({ lang }: { lang: string }) {
  const { t } = useTranslation(lang);
  const [activeTab, setActiveTab] = useState<'crop' | 'fertilizer' | 'soil'>('crop');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { temperature, humidity, isOnline } = useSensor();

  useEffect(() => {
    // Always auto-fill from the last known IoT data regardless of online status
    if (temperature !== null && humidity !== null) {
      setInputs(prev => ({
        ...prev,
        temperature: temperature,
        humidity: humidity
      }));
    }
  }, [temperature, humidity]);

  // --- CROP RECOMMENDATION STATE ---
  const [inputs, setInputs] = useState({
    N: 65, P: 40, K: 40,
    temperature: 25, humidity: 80,
    ph: 6.5, rainfall: 100
  });

  type AICrop = {
    name: string; emoji: string; reason: string;
    water_needed: string; best_season: string; profit_potential: string;
    offline?: boolean;
  };
  const [aiCrops, setAiCrops] = useState<AICrop[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // --- SOIL ANALYSIS STATE ---
  const [soilInputs, setSoilInputs] = useState({ ph: 6.5, nitrogen: 45, moisture: 50 });
  const [soilResult, setSoilResult] = useState<{ score: number; status: string; badge: string; suggestion: string } | null>(null);
  const [soilLoading, setSoilLoading] = useState(false);

  const analyzeSoil = async () => {
    if (soilLoading) return;
    setSoilLoading(true);
    setSoilResult(null);

    const { ph, nitrogen, moisture } = soilInputs;

    // Local scoring logic
    const phScore = ph >= 6 && ph <= 7.5 ? 4 : ph >= 5.5 && ph <= 8 ? 2 : 1;
    const nScore  = nitrogen >= 30 && nitrogen <= 80 ? 3 : nitrogen >= 15 ? 2 : 1;
    const mScore  = moisture >= 40 && moisture <= 70 ? 3 : moisture >= 25 ? 2 : 1;
    const total   = phScore + nScore + mScore;
    const status  = total >= 8 ? 'Good' : total >= 5 ? 'Fair' : 'Poor';
    const badge   = total >= 8 ? 'bg-green-100 text-green-700 border-green-300'
                  : total >= 5 ? 'bg-amber-100 text-amber-700 border-amber-300'
                  : 'bg-red-100 text-red-700 border-red-300';

    let suggestion = '';
    
    if (!navigator.onLine) {
      // Descriptive offline fallback for soil analysis
      if (ph < 6) {
        suggestion = `Your soil is acidic (pH ${ph}). Apply lime or wood ash to raise pH. Nitrogen levels are ${nitrogen > 60 ? 'good' : 'low'}.`;
      } else if (ph > 7.5) {
        suggestion = `Your soil is alkaline (pH ${ph}). Apply gypsum or organic compost to lower pH and improve nutrient availability.`;
      } else if (nitrogen < 30) {
        suggestion = `Soil pH is optimal, but nitrogen is low (${nitrogen} mg/kg). Apply Urea or Neem-coated urea before the next watering.`;
      } else if (moisture < 30) {
        suggestion = `Soil is very dry (${moisture}%). Irrigate immediately to prevent crop wilting and allow nutrient absorption.`;
      } else if (moisture > 75) {
        suggestion = `Soil is waterlogged (${moisture}%). Stop irrigation and ensure proper drainage to prevent root rot.`;
      } else {
        suggestion = "Your soil health looks excellent! Maintain organic matter levels and follow your regular crop rotation.";
      }
      
      setSoilResult({ score: total, status, badge, suggestion: suggestion + " (ðŸ“¡ Offline Analysis)" });
      setSoilLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `My soil has pH ${ph}, Nitrogen ${nitrogen} mg/kg, and Moisture ${moisture}%. In 2 short sentences, tell me if this is healthy and the single most important action I should take now. Reply in English only.`,
          history: []
        })
      });
      const data = await res.json();
      suggestion = data.reply || '';
    } catch {
      // Fallback logic for network error
      if (ph < 6) suggestion = 'Add lime to raise soil pH to optimal range.';
      else if (nitrogen < 30) suggestion = 'Apply urea or compost to boost nitrogen levels.';
      else if (moisture < 40) suggestion = 'Increase irrigation frequency for better crop growth.';
      else suggestion = 'Soil conditions look healthy. Maintain current practices.';
    } finally {
      setSoilResult({ score: total, status, badge, suggestion });
      setSoilLoading(false);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputs(prev => ({ ...prev, [name]: parseFloat(value) }));
  };

  const getMLRecommendation = async () => {
    setIsLoading(true);
    setAiCrops([]);
    setError(null);

    // Check if offline
    if (!navigator.onLine) {
      const offline = recommendCropsOffline(inputs.N, inputs.P, inputs.K, inputs.temperature, inputs.humidity, inputs.ph, inputs.rainfall);
      setTimeout(() => {
        setAiCrops([{
          name: offline.crop,
          emoji: 'ðŸŒ±',
          reason: offline.reason,
          water_needed: inputs.rainfall > 150 ? 'High' : 'Moderate',
          best_season: 'Current',
          profit_potential: 'High',
          offline: true
        }]);
        setIsLoading(false);
      }, 800); // Simulate local processing
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/crops`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nitrogen: inputs.N, phosphorus: inputs.P, potassium: inputs.K,
          temperature: inputs.temperature, humidity: inputs.humidity,
          ph: inputs.ph, rainfall: inputs.rainfall
        }),
        signal: controller.signal
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Request failed");
      }
      const data = await res.json();
      setAiCrops(data.crops || []);
    } catch (err: any) {
      // Fallback to offline rule-based system on network error
      const offline = recommendCropsOffline(inputs.N, inputs.P, inputs.K, inputs.temperature, inputs.humidity, inputs.ph, inputs.rainfall);
      setAiCrops([
        {
          name: offline.crop,
          emoji: 'ðŸŒ±',
          reason: offline.reason,
          water_needed: inputs.rainfall > 150 ? 'High' : 'Moderate',
          best_season: 'Current',
          profit_potential: 'High',
          offline: true
        }
      ]);
      
      if (err.name === 'AbortError') {
        console.warn("Recommendation timed out, using offline fallback.");
      } else {
        console.error("API failed, using offline fallback:", err.message);
      }
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  const sliders = [
    { name: "N", label: "Nitrogen (N)", min: 0, max: 140, step: 1, hint: "Soil Health Card N value" },
    { name: "P", label: "Phosphorus (P)", min: 0, max: 140, step: 1, hint: "Soil Health Card P value" },
    { name: "K", label: "Potassium (K)", min: 0, max: 200, step: 1, hint: "Soil Health Card K value" },
    { name: "temperature", label: "Temperature (Â°C)", min: 0, max: 50, step: 0.1, hint: "Auto-filled from ESP32" },
    { name: "humidity", label: "Humidity (%)", min: 0, max: 100, step: 1, hint: "Auto-filled from ESP32" },
    { name: "ph", label: "Soil pH", min: 0, max: 14, step: 0.1, hint: "Optimal range: 6.0-7.5" },
    { name: "rainfall", label: "Rainfall (mm)", min: 0, max: 300, step: 1, hint: "Avg annual rainfall" },
  ];

  // --- FERTILIZER RECOMMENDATION STATE ---
  const [fertInputs, setFertInputs] = useState({
    crop: 'Rice', soil: 'Loamy',
    N: 60, P: 40, K: 40
  });
  
  const [fertResult, setFertResult] = useState<string | null>(null);
  const [fertLoading, setFertLoading] = useState(false);

  const handleFertChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFertInputs(prev => ({ ...prev, [name]: value }));
  };

  const getFertilizerRecommendation = async () => {
    if (fertLoading) return;
    setFertLoading(true);
    setFertResult(null);

    // Offline calculation (area assumed 1 acre)
    const result = calculateFertilizerOffline(fertInputs.crop, 1);
    const formatted = `Crop: ${result.crop}
Area: ${result.area} acre(s)
Total N: ${result.total_n} kg
Total P: ${result.total_p} kg
Total K: ${result.total_k} kg
Estimated Cost: ${result.estimated_cost}
Schedule:
${result.schedule.map(s => `- ${s.stage}: ${s.timing} -> ${s.fertilizers.map(f => `${f.name} (${f.quantity})`).join(', ')}`).join('\n')}
Tips: ${result.tips.join(', ')}

(ðŸ“¡ Offline Calculation)`;

    setFertResult(formatted);
    setFertLoading(false);
  };



  return (
    <>
      {isOnline ? (
        <div className="w-full bg-green-50 text-green-700 p-2 text-center font-medium">
          ðŸŒ Connected - Using AI recommendations
        </div>
      ) : (
        <div className="w-full bg-gray-200 text-gray-800 p-2 text-center font-medium">
          ðŸ’¾ Offline Mode - Using local data
        </div>
      )}
      {/* TABS HEADER */}
      <div className="flex border-b-2 border-gray-200 mb-6 sm:mb-8 gap-1 sm:gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        <button 
          onClick={() => setActiveTab('crop')}
          className={`px-4 py-3 sm:px-6 sm:py-4 text-sm sm:text-base md:text-lg font-black transition-all border-t border-x rounded-t-xl relative -bottom-[2px] cursor-pointer whitespace-nowrap
            ${activeTab === 'crop' ? 'bg-green-50 border-green-600 text-green-600' : 'bg-transparent border-transparent text-gray-400 hover:text-green-600'}`}
        >
          ðŸŒ± {t('crops_ml_tab')}
        </button>
        <button 
          onClick={() => setActiveTab('fertilizer')}
          className={`px-4 py-3 sm:px-6 sm:py-4 text-sm sm:text-base md:text-lg font-black transition-all border-t border-x rounded-t-xl relative -bottom-[2px] cursor-pointer whitespace-nowrap
            ${activeTab === 'fertilizer' ? 'bg-green-50 border-green-600 text-green-600' : 'bg-transparent border-transparent text-gray-400 hover:text-green-600'}`}
        >
          ðŸ§ª Fertilizer
        </button>
        <button 
          onClick={() => setActiveTab('soil')}
          className={`px-4 py-3 sm:px-6 sm:py-4 text-sm sm:text-base md:text-lg font-black transition-all border-t border-x rounded-t-xl relative -bottom-[2px] cursor-pointer whitespace-nowrap
            ${activeTab === 'soil' ? 'bg-green-50 border-green-600 text-green-600' : 'bg-transparent border-transparent text-gray-400 hover:text-green-600'}`}
        >
          ðŸ”¬ Soil Analysis
        </button>
      </div>

      {activeTab === 'crop' && (
     
          {/* HERO HEADER */}
          <section className="bg-gradient-to-br from-green-800 to-green-600 rounded-2xl p-6 sm:p-8 md:p-10 text-white mb-8 shadow-lg shadow-green-700/20 text-center md:text-left">
            <h1 className="m-0 mb-2.5 text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">ðŸŒ¾ {t('crops_title')}</h1>
            <p className="m-0 text-sm sm:text-base md:text-lg opacity-90 font-medium">{t('crops_subtitle')}</p>
          </section>

          <div className="flex flex-col gap-8 mb-10">
            {/* Input Form Card */}
            <div className="bg-white rounded-2xl p-5 sm:p-8 shadow-sm border border-gray-100 border-t-4 border-t-green-600">
              <h2 className="m-0 mb-6 text-lg sm:text-xl text-gray-900 font-black flex items-center gap-2">
                ðŸ“‚ {t('crops_farm_params')}
              </h2>
              
              <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 text-sm text-blue-800 mb-8 leading-relaxed font-medium">
                â„¹ï¸ <strong>{t('crops_soil_note_title')}:</strong> {t('crops_soil_note_desc')}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-x-10 mb-8">
                {sliders.map(slider => {
                  const currentValue = inputs[slider.name as keyof typeof inputs];
                  return (
                    <div key={slider.name}>
                      <div className="flex justify-between mb-2 items-start">
                        <div>
                          <label className="font-bold text-gray-700 text-sm flex items-center">
                            {slider.label}
                            {(slider.name === "temperature" || slider.name === "humidity") && (
                              isOnline ? (
                                <span className="ml-2 text-green-600 text-xs font-black uppercase flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                  <span className="text-xs animate-pulse">ðŸ”´</span> {t('crops_live')}
                                </span>
                              ) : (
                                <span className="ml-2 text-orange-600 text-xs font-black uppercase flex items-center gap-1 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                                  {t('crops_offline')}
                                </span>
                              )
                            )}
                          </label>
                          <p className="text-xs text-gray-400 italic mt-0.5 font-medium">{slider.hint}</p>
                        </div>
                        <span className="font-black text-green-700 text-xl">{currentValue}</span>
                      </div>
                      
                      <input
                        type="range" name={slider.name} min={slider.min} max={slider.max} step={slider.step}
                        value={currentValue} onChange={handleSliderChange}
                        className="w-full accent-green-600 cursor-pointer h-1.5 rounded-full mb-1"
                      />
                      
                      <div className="flex justify-between text-xs text-gray-300 font-black uppercase tracking-tighter">
                        <span>{t('crops_min')} {slider.min}</span>
                        <span>{t('crops_max')} {slider.max}</span>
                      </div>
                      
                      {getSliderHint(slider.name, currentValue) && (
                        <p className="text-xs text-amber-600 mt-2 font-bold italic">{getSliderHint(slider.name, currentValue)}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={getMLRecommendation} disabled={isLoading}
                className={`w-full py-4.5 rounded-xl text-lg font-black transition-all tracking-tight active:scale-[0.98] mt-2
                  ${isLoading ? 'bg-gray-400 cursor-not-allowed shadow-none' : 'bg-green-600 text-white cursor-pointer hover:bg-green-700 shadow-lg shadow-green-600/30'}`}
              >
                {isLoading ? t('crops_loading') : t('crops_add_crop')}
              </button>
            </div>

            {/* ERROR MESSAGE */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-800 text-center font-bold animate-shake">
                âš ï¸ {error}
              </div>
            )}

            {/* RESULTS SECTION */}
{(isLoading || aiCrops.length > 0) && (
  <div className="animate-fade-in">
    <h2 className="text-xl text-gray-900 mb-6 text-center font-black tracking-tight">
      🟢 {t('crops_ai_results')}
    </h2>
    {isLoading ? (
      <div className="flex justify-center p-12">
        <div className="w-12 h-12 border-5 border-gray-100 border-t-green-600 rounded-full animate-spin" />
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {aiCrops.slice(0, 5).map((crop, idx) => {
          const colors = [
            { b: "border-t-green-600", s: "shadow-green-600/10", t: "text-green-700" },
            { b: "border-t-blue-500", s: "shadow-blue-600/10", t: "text-blue-700" },
            { b: "border-t-amber-500", s: "shadow-amber-600/10", t: "text-amber-700" },
            { b: "border-t-purple-500", s: "shadow-purple-600/10", t: "text-purple-700" },
            { b: "border-t-pink-500", s: "shadow-pink-600/10", t: "text-pink-700" }
          ];
          const c = colors[idx] || colors[0];
          const profit = {
            Low: "bg-red-50 text-red-700",
            Medium: "bg-orange-50 text-orange-700",
            High: "bg-green-50 text-green-700"
          }[crop.profit_potential as 'Low'|'Medium'|'High'] || "bg-gray-50 text-gray-700";
          const confidence = crop.confidence !== undefined ? crop.confidence : 1;
          return (
            <div key={idx} className={`bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 border-t-6 ${c.b} flex flex-col gap-3 sm:gap-4 text-center transition-all hover:-translate-y-1 hover:shadow-xl ${c.s}`}>
              <div className="flex justify-between items-start">
                <div className="text-4xl sm:text-5xl mt-2">{crop.emoji}</div>
                <SpeakButton text={`${crop.name}. ${crop.reason}`} lang={lang} />
              </div>
              <h3 className={`text-xl sm:text-2xl font-black ${c.t} tracking-tight m-0`}>{crop.name}</h3>
              {crop.offline && (
                <div className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-black uppercase self-center border border-amber-200">
                  ⚡ Offline Mode
                </div>
              )}
              <p className="text-sm text-gray-500 italic m-0 leading-relaxed font-medium">{crop.reason}</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${confidence * 100}%` }} />
              </div>
              <div className="flex justify-center gap-4 text-sm font-medium mb-2">
                <span className={`px-2 py-1 rounded ${inputs.N >= 20 && inputs.N <= 120 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>N: {inputs.N}</span>
                <span className={`px-2 py-1 rounded ${inputs.P >= 15 && inputs.P <= 100 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>P: {inputs.P}</span>
                <span className={`px-2 py-1 rounded ${inputs.K >= 20 && inputs.K <= 150 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>K: {inputs.K}</span>
              </div>
              <div className="flex flex-col gap-3 mt-4 text-left border-t border-gray-50 pt-5">
                <div className="flex items-center gap-2.5 text-sm sm:text-base font-medium text-gray-700">
                  <span>💧</span> <span className="text-gray-400 font-bold">{t('crops_water')}:</span> {crop.water_needed}
                </div>
                <div className="flex items-center gap-2.5 text-sm sm:text-base font-medium text-gray-700">
                  <span>📅</span> <span className="text-gray-400 font-bold">{t('crops_season')}:</span> {crop.best_season}
                </div>
                <div className="flex items-center gap-2.5 text-sm sm:text-base font-medium text-gray-700">
                  <span>💰</span> <span className="text-gray-400 font-bold">{t('crops_profit')}:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${profit}`}>{crop.profit_potential}</span>
                </div>
              </div>
              <button onClick={() => navigate('/chat', { state: { prefill: `Tell me more about growing ${crop.name} — best practices and fertilizer tips.` } })} className="mt-4 bg-green-50 text-green-600 border border-green-200 rounded-xl py-3 text-sm font-bold transition-colors hover:bg-green-100 cursor-pointer">
                {t('crops_ask_expert')} →
              </button>
            </div>
          );
        })}
      </div>
    )}
  </div>
)}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { n: "N", l: "Nitrogen", m: 140 },
                { n: "P", l: "Phosphorus", m: 140 },
                { n: "K", l: "Potassium", m: 200 }
              ].map(item => (
                <div key={item.n} className="flex flex-col gap-2">
                  <label className="font-bold text-gray-500 text-sm">{item.l} (PPM)</label>
                  <input 
                    type="number" name={item.n} min="0" max={item.m} 
                    value={fertInputs[item.n as keyof typeof fertInputs]} 
                    onChange={handleFertChange}
                    className="p-3.5 rounded-xl border border-gray-200 font-bold outline-none focus-ring-green focus:bg-white transition-all text-center"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={getFertilizerRecommendation}
              disabled={fertLoading}
              className={`mt-4 py-4.5 rounded-xl text-lg font-black shadow-lg shadow-green-600/30 transition-all active:scale-95 cursor-pointer ripple flex items-center justify-center gap-3
                ${fertLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
            >
              {fertLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('crops_analyzing')}...
                </>
              ) : t('crops_get_recommendation')}
            </button>

            {fertResult && (
              <div className="mt-4 p-8 rounded-2xl border-2 border-green-600 bg-green-50 dark:bg-green-900/10 shadow-sm animate-fade-in hover-lift">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="m-0 text-2xl font-black text-green-800 dark:text-green-400 flex items-center gap-2">
                    âœ… {t('crops_fert_result_title')}
                  </h3>
                  <SpeakButton text={fertResult} lang={lang} />
                </div>
                
                <div className="m-0 mb-8 flex flex-col gap-5">
                  {fertResult.split(". ").filter(s => s.trim().length > 0).slice(0, 3).map((sentence, idx) => {
                    const words = sentence.trim().split(" ");
                    const head = words.slice(0, 2).join(" ");
                    const tail = words.slice(2).join(" ");
                    return (
                      <div key={idx} className="flex gap-3 items-start bg-green-100/30 p-4 rounded-xl border-l-4 border-green-600 animate-fade-in">
                        <span className="text-green-600 font-bold mt-1">â—</span>
                        <p className="m-0 text-gray-700 dark:text-slate-300 text-lg font-medium leading-relaxed">
                          <span className="font-black text-gray-900 dark:text-white uppercase text-sm sm:text-base">{head}</span> {tail}{!sentence.endsWith(".") && "."}
                        </p>
                      </div>
                    );
                  })}
                </div>
                
                <div className="flex flex-col gap-4">
                  <div className="bg-amber-100/50 border-l-4 border-amber-500 p-4 rounded-lg flex gap-3 items-center">
                    <span className="text-xl">âš ï¸</span>
                    <p className="m-0 text-amber-800 text-[13px] font-bold leading-relaxed">
                      Consult your district agri-officer for regional soil variations before application.
                    </p>
                  </div>

                  <button
                    onClick={() => navigate('/chat', { state: { prefill: `I just got this fertilizer advice for my ${fertInputs.crop} crop: "${fertResult.substring(0, 50)}...". I have more questions about application techniques.` } })}
                    className="w-full bg-white text-green-600 border-2 border-green-600 rounded-xl py-3.5 text-base font-black hover:bg-green-50 transition-all ripple"
                  >
                    ðŸ’¬ Ask More Questions
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* â”€â”€ SOIL ANALYSIS TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {activeTab === 'soil' && (
        <div className="max-w-[700px] mx-auto flex flex-col gap-6 animate-fade-in">
          <section className="bg-gradient-to-br from-amber-700 to-amber-500 rounded-2xl p-8 md:p-10 text-white shadow-lg">
            <h1 className="m-0 mb-2 text-2xl md:text-3xl font-extrabold tracking-tight">ðŸ”¬ Soil Analysis</h1>
            <p className="m-0 text-base opacity-90">Enter your soil parameters to get a health report and AI action plan.</p>
          </section>

          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 border-t-4 border-t-amber-500 flex flex-col gap-6">
            {/* Input Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="flex flex-col gap-2">
                <label className="font-bold text-gray-500 text-sm">Soil pH (4.0â€“9.0)</label>
                <input
                  type="number" min="4" max="9" step="0.1"
                  value={soilInputs.ph}
                  onChange={e => setSoilInputs(p => ({ ...p, ph: parseFloat(e.target.value) || 6.5 }))}
                  className="p-3.5 rounded-xl border border-gray-200 bg-gray-50 font-bold outline-none focus-ring-green focus:bg-white transition-all text-center text-lg"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-bold text-gray-500 text-sm">Nitrogen (mg/kg, 0â€“200)</label>
                <input
                  type="number" min="0" max="200" step="1"
                  value={soilInputs.nitrogen}
                  onChange={e => setSoilInputs(p => ({ ...p, nitrogen: parseInt(e.target.value) || 0 }))}
                  className="p-3.5 rounded-xl border border-gray-200 bg-gray-50 font-bold outline-none focus-ring-green focus:bg-white transition-all text-center text-lg"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-bold text-gray-500 text-sm">Soil Moisture % (0â€“100)</label>
                <input
                  type="number" min="0" max="100" step="1"
                  value={soilInputs.moisture}
                  onChange={e => setSoilInputs(p => ({ ...p, moisture: parseInt(e.target.value) || 0 }))}
                  className="p-3.5 rounded-xl border border-gray-200 bg-gray-50 font-bold outline-none focus-ring-green focus:bg-white transition-all text-center text-lg"
                />
              </div>
            </div>

            {/* Analyze Button */}
            <button
              onClick={analyzeSoil}
              disabled={soilLoading}
              className={`py-4 rounded-xl text-lg font-black shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3
                ${soilLoading ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-amber-500 hover:bg-amber-600 text-white cursor-pointer shadow-amber-500/30'}`}
            >
              {soilLoading ? (
                <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Analyzing...</>
              ) : 'Analyze Soil'}
            </button>

            {/* Results */}
            {soilResult && (
              <div className="mt-2 p-6 rounded-2xl border-2 border-amber-400 bg-amber-50 animate-fade-in flex flex-col gap-5">
                {/* Health Badge */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <h3 className="m-0 text-xl font-black text-gray-800">Soil Health</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-black border ${soilResult.badge}`}>
                      {soilResult.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500 font-black text-sm">Score:</span>
                    <span className={`text-2xl font-black ${
                      soilResult.score >= 8 ? 'text-green-600' :
                      soilResult.score >= 5 ? 'text-amber-600' : 'text-red-600'
                    }`}>{soilResult.score}/10</span>
                  </div>
                </div>

                {/* Score Bar */}
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-700 ${
                      soilResult.score >= 8 ? 'bg-green-500' :
                      soilResult.score >= 5 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${(soilResult.score / 10) * 100}%` }}
                  />
                </div>

                {/* AI Suggestion */}
                <div className="bg-white rounded-xl p-4 border border-amber-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-amber-700 uppercase tracking-widest flex items-center gap-1">
                      ðŸ¤– AI Suggestion
                    </span>
                    <SpeakButton
                      text={`Soil health is ${soilResult.status}. Score ${soilResult.score} out of 10. ${soilResult.suggestion}`}
                      lang={lang.toUpperCase()}
                    />
                  </div>
                  <div className="flex items-center">
                    <p className="m-0 text-gray-700 text-base font-medium leading-relaxed italic">
                      "{soilResult.suggestion}"
                    </p>
                    <SpeakButton text={soilResult.suggestion} lang={lang} className="ml-2" />
                  </div>
                </div>

                {/* Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  {[
                    { label: 'pH', val: soilInputs.ph, ok: soilInputs.ph >= 6 && soilInputs.ph <= 7.5 },
                    { label: 'Nitrogen', val: `${soilInputs.nitrogen} mg`, ok: soilInputs.nitrogen >= 30 && soilInputs.nitrogen <= 80 },
                    { label: 'Moisture', val: `${soilInputs.moisture}%`, ok: soilInputs.moisture >= 40 && soilInputs.moisture <= 70 }
                  ].map(item => (
                    <div key={item.label} className={`p-3 rounded-xl border ${
                      item.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-orange-50 border-orange-200 text-orange-700'
                    }`}>
                      <p className="m-0 text-xs font-black uppercase tracking-wider opacity-60 mb-1">{item.label}</p>
                      <p className="m-0 text-lg font-black">{item.val}</p>
                      <p className="m-0 text-xs font-bold mt-1">{item.ok ? 'âœ“ Optimal' : 'âš  Adjust'}</p>
                    </div>
                  ))}
                </div>

                {/* Ask AI More */}
                <button
                  onClick={() => navigate('/chat', { state: { prefill: `My soil has pH ${soilInputs.ph}, Nitrogen ${soilInputs.nitrogen} mg/kg, Moisture ${soilInputs.moisture}%. Health score: ${soilResult.score}/10 (${soilResult.status}). What crops should I grow and what should I fix first?` } })}
                  className="w-full bg-white text-amber-600 border-2 border-amber-500 rounded-xl py-3 text-sm font-black hover:bg-amber-50 transition-all cursor-pointer"
                >
                  ðŸ’¬ Ask AI for Crop Recommendations â†’
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
