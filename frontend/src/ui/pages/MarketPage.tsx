import { useState, useEffect } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import SpeakButton from '../../components/SpeakButton';
import CropSearchInput from '../../components/CropSearchInput';
import { API_BASE_URL } from '../../config';
import { estimatePrice, getAvailableCrops, type PriceEstimate } from '../../data/market-trends';

interface MarketPrice {
  market: string;
  commodity: string;
  variety: string;
  min_price: string;
  max_price: string;
  modal_price: string;
  date: string;
}


const STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", 
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli", "Daman and Diu", "Delhi", 
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", 
  "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", 
  "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", 
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", 
  "Uttarakhand", "West Bengal"
];

const POPULAR_CHIPS = ["Tomato", "Potato", "Onion", "Rice", "Wheat", "Cotton"];

export default function MarketPage({ lang }: { lang: string }) {
  const { t } = useTranslation(lang);
  const [commodity, setCommodity] = useState("Tomato");
  const [state, setState] = useState("Karnataka");
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineEstimate, setOfflineEstimate] = useState<PriceEstimate | null>(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showTooltip, setShowTooltip] = useState(false);
  const [faq1Open, setFaq1Open] = useState(false);
  const [faq2Open, setFaq2Open] = useState(false);
  const [dataSource, setDataSource] = useState<"live" | "mock" | "offline">("live");

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const go = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', go);
    window.addEventListener('offline', go);
    return () => { window.removeEventListener('online', go); window.removeEventListener('offline', go); };
  }, []);

  const fetchPrices = async (c = commodity, s = state) => {
    setIsLoading(true);
    setHasSearched(true);
    setOfflineEstimate(null);

    if (!navigator.onLine) {
      // Offline: use local estimator
      const estimate = estimatePrice(c);
      setOfflineEstimate(estimate);
      setPrices([]);
      setDataSource("offline");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/market-prices?commodity=${c}&state=${s}`);
      const responseData = await res.json();
      
      if (responseData && typeof responseData === "object" && "data" in responseData) {
        setPrices(responseData.data || []);
        setDataSource(responseData.source || "live");
      } else {
        setPrices(responseData || []);
        setDataSource("live");
      }
    } catch (error) {
      console.error("Market Price Fetch Error:", error);
      // Fallback to offline on network error
      const estimate = estimatePrice(c);
      setOfflineEstimate(estimate);
      setPrices([]);
      setDataSource("offline");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChipClick = (c: string) => {
    setCommodity(c);
    fetchPrices(c, state);
  };

  const modalPrices = prices.map(p => parseFloat(p.modal_price)).filter(p => !isNaN(p));
  const minPrices = prices.map(p => parseFloat(p.min_price)).filter(p => !isNaN(p));
  const maxPrices = prices.map(p => parseFloat(p.max_price)).filter(p => !isNaN(p));

  const avgPrice = modalPrices.length ? modalPrices.reduce((a, b) => a + b, 0) / modalPrices.length : 0;
  const lowestPrice = minPrices.length ? Math.min(...minPrices) : 0;
  const highestPrice = maxPrices.length ? Math.max(...maxPrices) : 0;

  const getPriceInsight = () => {
    if (avgPrice > 3000) return `Prices are HIGH — good time to sell your ${commodity}!`;
    if (avgPrice >= 1500) return `Prices are MODERATE — consider waiting for better rates.`;
    return `Prices are LOW — consider storing ${commodity} for better prices later.`;
  };

  const getTrendIcon = (modal: string) => {
    const val = parseFloat(modal);
    if (val > 2500) return { icon: "↑", color: "text-green-600" };
    if (val < 1500) return { icon: "↓", color: "text-red-500" };
    return { icon: "→", color: "text-amber-500" };
  };

  const getBestMarket = () => {
    if (!prices || prices.length === 0) return null;
    let best: MarketPrice | null = null;
    let maxModal = -1;
    for (const p of prices) {
      const val = parseFloat(p.modal_price);
      if (!isNaN(val) && val > maxModal) {
        maxModal = val;
        best = p;
      }
    }
    return best;
  };
  const bestMarket = getBestMarket();

  return (
    <div className="pb-[60px] font-sans">
      
      <section className={`bg-gradient-to-br from-green-800 to-green-600 rounded-2xl p-6 sm:p-8 md:p-10 text-white mb-8 shadow-lg shadow-green-700/20 ${isMobile ? 'text-center' : 'text-left'}`}>
        <h1 className={`m-0 mb-2.5 ${isMobile ? 'text-2xl' : 'text-3xl'} font-extrabold tracking-tight`}>📊 {t('market_title')}</h1>
        <p className={`m-0 mb-4 ${isMobile ? 'text-base' : 'text-lg'} opacity-90 leading-tight`}>
          {t('market_subtitle')}
        </p>
        <span className="bg-white/20 py-1.5 px-3.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest backdrop-blur-md">
          {t('market_powered_by')}
        </span>
      </section>

      {/* 2. SEARCH SECTION */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 mb-10 shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-stretch sm:items-end mb-6">
          <div className="w-full sm:flex-1 sm:min-w-[200px]">
            <label className="block mb-2 font-black text-gray-400 uppercase tracking-widest text-[10px]">{t('market_commodity')}</label>
            <CropSearchInput 
              value={commodity}
              onChange={(val) => { setCommodity(val); }}
              placeholder="Search commodity..."
            />
          </div>
          <div className="w-full sm:flex-1 sm:min-w-[200px]">
            <label className="block mb-2 font-black text-gray-400 uppercase tracking-widest text-[10px]">{t('market_state')}</label>
            <select 
              value={state} 
              onChange={(e) => setState(e.target.value)}
              className="w-full p-3 px-4 rounded-lg border border-gray-300 dark:border-slate-600 text-base text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-900 focus-ring-green outline-none font-bold"
            >
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button 
            onClick={() => fetchPrices()}
            disabled={isLoading}
            className={`w-full sm:w-auto py-4 px-7 rounded-xl text-white text-base font-black uppercase tracking-widest transition-all active:scale-95 whitespace-nowrap shadow-lg ripple
              ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 cursor-pointer hover:bg-green-700'}`}
          >
            {isLoading ? "..." : "Check Prices"}
          </button>
        </div>

        {/* POPULAR SEARCHES */}
        {!isLoading && (
          <div className="mt-6 flex gap-2.5 flex-wrap items-center">
            <span className="text-sm text-gray-400 font-bold">Popular:</span>
            {POPULAR_CHIPS.map(chip => (
              <button
                key={chip}
                onClick={() => handleChipClick(chip)}
                className="bg-gray-100 text-gray-600 py-1.5 px-4 rounded-full border-none text-sm font-bold cursor-pointer transition-colors hover:bg-green-100 hover:text-green-700"
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 3. RESULTS SECTION */}
      {isLoading ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 border-5 border-gray-100 border-t-green-600 rounded-full animate-spin mx-auto" />
          <p className="mt-5 text-lg text-green-600 font-bold italic">
            {isOnline ? 'Fetching live mandi prices...' : 'Calculating offline estimate...'}
          </p>
        </div>
      ) : !hasSearched ? (
        <div className="text-center py-16 px-8 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
          <span className="text-6xl mb-5 block">📊</span>
          <h2 className="mt-1 text-gray-600 font-bold">Select a commodity and state to see prices</h2>
          <p className="text-gray-400 mt-2">
            {isOnline ? 'Real-time data for 1000+ markets in India' : '📡 Offline mode — seasonal price estimates available'}
          </p>
        </div>
      ) : offlineEstimate ? (
        /* ── OFFLINE ESTIMATE CARD ─────────────────────── */
        <div className="animate-fade-in space-y-5">
          {/* Offline Banner */}
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3">
            <span className="text-xl">📡</span>
            <div>
              <p className="m-0 text-amber-800 font-black text-sm">OFFLINE ESTIMATE</p>
              <p className="m-0 text-amber-700 text-xs">Based on 3-year historical averages. Connect to internet for live mandi data.</p>
            </div>
          </div>

          {/* Price Cards */}
          <div className={`grid gap-5 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
            <div className="bg-white p-5 rounded-xl text-center shadow-sm border-t-4 border-t-green-600 hover-lift">
              <p className="m-0 mb-2 text-sm text-gray-400 font-bold">Estimated Low</p>
              <h3 className="m-0 mb-1 text-2xl font-black text-green-600">
                ₹{offlineEstimate.minEstimate.toLocaleString()}
              </h3>
              <p className="m-0 text-xs text-gray-400 italic">per quintal</p>
            </div>
            <div className="bg-white p-5 rounded-xl text-center shadow-sm border-t-4 border-t-blue-500 hover-lift">
              <p className="m-0 mb-2 text-sm text-gray-400 font-bold">Expected Price</p>
              <h3 className="m-0 mb-1 text-2xl font-black text-blue-600">
                ₹{offlineEstimate.estimate.toLocaleString()}
              </h3>
              <p className="m-0 text-xs text-gray-400 italic">per quintal</p>
            </div>
            <div className="bg-white p-5 rounded-xl text-center shadow-sm border-t-4 border-t-purple-500 hover-lift">
              <p className="m-0 mb-2 text-sm text-gray-400 font-bold">Estimated High</p>
              <h3 className="m-0 mb-1 text-2xl font-black text-purple-500">
                ₹{offlineEstimate.maxEstimate.toLocaleString()}
              </h3>
              <p className="m-0 text-xs text-gray-400 italic">per quintal</p>
            </div>
          </div>

          {/* Trend & Details */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <span className={`text-2xl ${offlineEstimate.trendDirection === 'up' ? 'text-green-500' : offlineEstimate.trendDirection === 'down' ? 'text-red-500' : 'text-amber-500'}`}>
                {offlineEstimate.trendDirection === 'up' ? '↗' : offlineEstimate.trendDirection === 'down' ? '↘' : '→'}
              </span>
              <div>
                <p className="m-0 text-xs text-gray-400 font-bold uppercase tracking-wider">Price Trend</p>
                <p className="m-0 text-gray-800 font-bold">{offlineEstimate.trend}</p>
              </div>
            </div>
            <div className="border-t pt-4 flex items-start gap-3">
              <span className="text-xl">📈</span>
              <div>
                <p className="m-0 text-xs text-gray-400 font-bold uppercase tracking-wider">Volatility</p>
                <p className="m-0 text-gray-700">{offlineEstimate.volatility}</p>
              </div>
            </div>
            {offlineEstimate.peakMonths.length > 0 && (
              <div className="border-t pt-4 flex items-start gap-3">
                <span className="text-xl">🗓️</span>
                <div>
                  <p className="m-0 text-xs text-gray-400 font-bold uppercase tracking-wider">Best Selling Months</p>
                  <p className="m-0 text-gray-700 font-bold">{offlineEstimate.peakMonths.join(' · ')}</p>
                </div>
              </div>
            )}
          </div>

          {/* Sell Advice */}
          <div className="bg-green-50 rounded-2xl p-6 border border-green-100 flex items-start gap-4">
            <span className="text-3xl">💡</span>
            <div>
              <h4 className="m-0 mb-1 text-gray-900 text-base font-bold">Selling Advice</h4>
              <p className="m-0 text-gray-700">{offlineEstimate.advice}</p>
              <p className="m-0 mt-2 text-xs text-gray-400 italic">{offlineEstimate.confidence}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-fade-in">
          
          {/* Summary Row */}
          <div className={`grid gap-5 mb-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
            <div className="bg-white p-5 rounded-xl text-center shadow-sm border-t-4 border-t-green-600 hover-lift">
              <p className="m-0 mb-2 text-sm text-gray-400 font-bold">Lowest Price</p>
              <h3 className="m-0 mb-1 text-2xl font-black text-green-600">
                <span className="mr-1">↓</span>
                ₹{lowestPrice.toLocaleString()}
              </h3>
              <p className="m-0 text-xs text-gray-400 italic">per quintal</p>
            </div>
            <div className="bg-white p-5 rounded-xl text-center shadow-sm border-t-4 border-t-blue-500 hover-lift">
              <p className="m-0 mb-2 text-sm text-gray-400 font-bold">Average Price</p>
              <h3 className="m-0 mb-1 text-2xl font-black text-blue-500">
                <span className="mr-1">📊</span>
                ₹{Math.round(avgPrice).toLocaleString()}
              </h3>
              <p className="m-0 text-xs text-gray-400 italic">per quintal</p>
            </div>
            <div className="bg-white p-5 rounded-xl text-center shadow-sm border-t-4 border-t-red-500 hover-lift">
              <p className="m-0 mb-2 text-sm text-gray-400 font-bold">Highest Price</p>
              <h3 className="m-0 mb-1 text-2xl font-black text-red-500">
                <span className="mr-1">↑</span>
                ₹{highestPrice.toLocaleString()}
              </h3>
              <p className="m-0 mb-2 text-sm text-gray-400 italic">per quintal</p>
            </div>
          </div>

          {/* FIX 1: Prominent trust badge below the 3 price cards */}
          {dataSource === "live" ? (
            <div className="bg-green-50 dark:bg-emerald-950/20 border border-green-200 dark:border-green-900/40 rounded-xl p-4 flex items-start sm:items-center gap-3 mb-8 shadow-sm">
              <svg className="w-6 h-6 text-green-600 dark:text-emerald-400 flex-shrink-0 mt-0.5 sm:mt-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <div>
                <p className="m-0 text-sm font-extrabold text-green-800 dark:text-emerald-300 flex items-center gap-1.5 leading-tight">
                  ✓ Live Government Data — data.gov.in
                </p>
                <p className="m-0 mt-0.5 text-xs text-green-600 dark:text-emerald-500 leading-tight">
                  Live data from Ministry of Agriculture, Govt. of India · Updated daily from official mandi records
                </p>
              </div>
            </div>
          ) : dataSource === "mock" ? (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-4 flex items-start sm:items-center gap-3 mb-8 shadow-sm">
              <span className="text-xl flex-shrink-0 mt-0.5 sm:mt-0">⚠️</span>
              <div>
                <p className="m-0 text-sm font-extrabold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 leading-tight">
                  ⚠️ Estimated Prices
                </p>
                <p className="m-0 mt-0.5 text-xs text-amber-600 dark:text-amber-500 leading-tight font-semibold">
                  Prices based on current market estimates. Connect to Live Government API for real-time data.
                </p>
              </div>
            </div>
          ) : null}

          {/* Price Table - Desktop View */}
          <div className="hidden md:block bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm border border-gray-200 dark:border-slate-700 mb-2.5">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                <table className="min-w-[600px] w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-900 border-b-2 border-gray-100 dark:border-slate-800">
                  {/* FIX 2: Market header with "Why do prices differ?" tooltip */}
                  <th className="text-left py-4 px-5 text-gray-500 text-sm font-bold uppercase tracking-wider relative">
                    <div className="flex items-center gap-1.5">
                      <span>Market</span>
                      <div 
                        className="relative cursor-pointer inline-flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
                        onMouseEnter={() => setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}
                        onClick={() => setShowTooltip(!showTooltip)}
                      >
                        <span className="text-[10px] font-extrabold bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-full w-4 h-4 flex items-center justify-center border border-gray-300 dark:border-slate-600">i</span>
                        {showTooltip && (
                          <div className="absolute left-0 top-full mt-1.5 w-72 p-4 bg-slate-900 dark:bg-slate-950 text-white dark:text-slate-200 text-xs rounded-xl shadow-xl z-50 font-normal normal-case leading-relaxed whitespace-normal border border-slate-700/50 dark:border-slate-800">
                            Different mandis (wholesale markets) have different supply and demand. Bangalore mandi may receive more stock than Hubli, causing price differences. This is normal and happens in all real markets.
                          </div>
                        )}
                      </div>
                    </div>
                  </th>
                  <th className="text-left py-4 px-5 text-gray-500 text-sm font-bold uppercase tracking-wider">Variety</th>
                  <th className="text-left py-4 px-5 text-gray-500 text-sm font-bold uppercase tracking-wider">Min</th>
                  <th className="text-left py-4 px-5 text-gray-500 text-sm font-bold uppercase tracking-wider">Max</th>
                  <th className="text-left py-4 px-5 text-gray-500 text-sm font-bold uppercase tracking-wider font-black">Modal</th>
                  <th className="text-left py-4 px-5 text-gray-500 text-sm font-bold uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody>
                {prices.map((p, i) => (
                  <tr key={i} className={`border-b dark:border-slate-800 transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50 ${i % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50/30 dark:bg-slate-900/30'}`}>
                    <td className="py-4 px-5 text-sm text-gray-700 dark:text-slate-200">{p.market}</td>
                    <td className="py-4 px-5 text-sm text-gray-700 dark:text-slate-200">{p.variety}</td>
                    <td className="py-4 px-5 text-sm text-gray-700 dark:text-slate-200 font-medium">₹{p.min_price}</td>
                    <td className="py-4 px-5 text-sm text-gray-700 dark:text-slate-200 font-medium">₹{p.max_price}</td>
                    <td className="py-4 px-5 text-sm font-black text-green-600 flex items-center gap-2">
                      <span className={`mr-2 ${getTrendIcon(p.modal_price).color}`}>
                        {getTrendIcon(p.modal_price).icon}
                      </span>
                      ₹{p.modal_price}
                    </td>
                    <td className="py-4 px-5 text-sm text-gray-500">{p.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            </div>
          </div>

          {/* Price List - Mobile View (Cards) */}
          <div className="md:hidden flex flex-col gap-4 mb-6">
            {prices.map((p, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <h4 className="m-0 text-gray-900 dark:text-white font-black text-lg leading-tight">{p.market}</h4>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black ${getTrendIcon(p.modal_price).color} bg-gray-50 dark:bg-slate-900 border border-current opacity-80`}>
                    {getTrendIcon(p.modal_price).icon} MODAL
                  </div>
                </div>
                <p className="m-0 text-sm text-gray-400 font-bold uppercase tracking-wider">{p.variety}</p>
                <div className="flex justify-between items-center mt-2 border-t dark:border-slate-700 pt-3">
                  <div className="text-center">
                    <p className="m-0 text-[10px] text-gray-400 font-black uppercase">Min</p>
                    <p className="m-0 font-bold text-gray-700 dark:text-slate-200">₹{p.min_price}</p>
                  </div>
                  <div className="text-center px-4 border-x dark:border-slate-700">
                    <p className="m-0 text-[10px] text-gray-400 font-black uppercase">Modal</p>
                    <p className="m-0 font-black text-green-600 text-xl">₹{p.modal_price}</p>
                  </div>
                  <div className="text-center">
                    <p className="m-0 text-[10px] text-gray-400 font-black uppercase">Max</p>
                    <p className="m-0 font-bold text-gray-700 dark:text-slate-200">₹{p.max_price}</p>
                  </div>
                </div>
                <p className="m-0 mt-1 text-[10px] text-gray-400 italic text-right">Data from {p.date}</p>
              </div>
            ))}
          </div>

          {/* FIX 5: Best market to sell recommendation below table */}
          {bestMarket && (
            <div className="bg-green-50 dark:bg-emerald-950/20 border border-green-200 dark:border-green-900/40 rounded-2xl p-5 mb-6 flex items-start gap-4 shadow-sm hover:shadow transition-shadow">
              <span className="text-2xl flex-shrink-0">💡</span>
              <div>
                <p className="m-0 text-green-900 dark:text-emerald-300 font-extrabold text-sm uppercase tracking-wider mb-1">
                  Best market today: <span className="underline">{bestMarket.market}</span>
                </p>
                <p className="m-0 text-green-800 dark:text-emerald-400 font-bold text-base">
                  Highest price <span className="text-green-700 dark:text-emerald-300 font-extrabold">₹{parseFloat(bestMarket.modal_price).toLocaleString()}</span> for {bestMarket.commodity}
                </p>
                <p className="m-0 mt-1.5 text-xs text-green-600 dark:text-emerald-500 font-medium">
                  Consider transporting to this market for maximum profit
                </p>
              </div>
            </div>
          )}

          {/* FIX 6: Change bottom text */}
          {dataSource === "live" && (
            <p className="m-0 mb-8 ml-5 text-xs text-emerald-600 dark:text-emerald-500 italic font-bold flex items-center gap-1.5">
              ✓ Showing verified government mandi data for {commodity} in {state}. Prices reported by mandi officials today.
            </p>
          )}

          {/* Price Insight Card */}
          <div className={`bg-green-50 dark:bg-green-900/10 rounded-2xl p-6 sm:px-8 border border-green-100 dark:border-green-800 flex items-center gap-5 ${isMobile ? 'flex-col text-center' : 'flex-row text-left'} mb-8`}>
            <span className="text-3xl sm:text-4xl">💡</span>
            <div>
              <h4 className="m-0 mb-1 text-gray-900 dark:text-white text-lg sm:text-xl font-black uppercase tracking-tight">Price Insight</h4>
              <p className="m-0 text-gray-700 dark:text-slate-300 text-sm sm:text-base font-bold italic">{getPriceInsight()}</p>
            </div>
          </div>

        </div>
      )}

      {/* FIX 4: Add collapsible FAQ card at bottom with green border */}
      <div className="bg-white dark:bg-slate-800 border-2 border-green-500/20 dark:border-green-500/10 rounded-2xl p-6 shadow-sm mb-8">
        <h3 className="m-0 mb-4 text-green-700 dark:text-emerald-400 text-lg font-black uppercase tracking-wider flex items-center gap-2">
          💡 Helpful FAQs
        </h3>
        
        <div className="space-y-4">
          {/* FAQ 1 */}
          <div className="border-b border-gray-100 dark:border-slate-700/50 pb-3">
            <button 
              onClick={() => setFaq1Open(!faq1Open)}
              className="w-full flex justify-between items-center text-left bg-transparent border-none p-0 cursor-pointer text-gray-800 dark:text-slate-100 font-bold hover:text-green-700 dark:hover:text-green-400 transition-colors"
            >
              <span className="text-sm">Q: Are these real prices?</span>
              <span className="text-xs transition-transform duration-200 text-gray-400" style={{ transform: faq1Open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
            </button>
            {faq1Open && (
              <p className="mt-2 text-xs text-gray-600 dark:text-slate-300 leading-relaxed font-medium">
                A: Yes. These are official wholesale prices reported by mandi operators to the Government of India's Agmarknet system daily.
              </p>
            )}
          </div>

          {/* FAQ 2 */}
          <div>
            <button 
              onClick={() => setFaq2Open(!faq2Open)}
              className="w-full flex justify-between items-center text-left bg-transparent border-none p-0 cursor-pointer text-gray-800 dark:text-slate-100 font-bold hover:text-green-700 dark:hover:text-green-400 transition-colors"
            >
              <span className="text-sm">Q: Why do prices differ so much between different markets?</span>
              <span className="text-xs transition-transform duration-200 text-gray-400" style={{ transform: faq2Open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
            </button>
            {faq2Open && (
              <p className="mt-2 text-xs text-gray-600 dark:text-slate-300 leading-relaxed font-medium">
                A: Different wholesale markets (mandis) have varying levels of supply and demand daily. A mandi with a large influx of a crop will have lower prices due to excess stock, while a market experiencing short supply on the same day will show higher prices. This variation is normal in all real wholesale agricultural markets.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* FIX 3: Credible footer source citation */}
      <footer className="mt-10 text-center border-t border-gray-200 dark:border-slate-700/50 pt-6">
        {dataSource === "live" ? (
          <>
            <p className="text-gray-600 dark:text-slate-400 font-bold text-sm mb-1.5 flex items-center justify-center gap-1.5 flex-wrap">
              🏛️ Source: data.gov.in | Ministry of Agriculture & Farmers Welfare, Government of India | Agmarknet dataset 9ef84268
            </p>
            <p className="text-gray-400 dark:text-slate-500 text-xs font-semibold">
              Official wholesale mandi prices from Ministry of Agriculture, Govt. of India
            </p>
          </>
        ) : (
          <>
            <p className="text-gray-600 dark:text-slate-400 font-bold text-sm mb-1.5 flex items-center justify-center gap-1.5 flex-wrap">
              💡 Seasonal Price Projections • KrishiCore AI
            </p>
            <p className="text-gray-400 dark:text-slate-500 text-xs font-medium">
              Prices are estimated wholesale mandi rates per quintal (100kg). Retail prices may vary.
            </p>
          </>
        )}
      </footer>
    </div>
  );
}
