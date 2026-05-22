import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { API_BASE_URL } from '../../config';

export default function LoginPage({ lang, onLogin }: { lang: string, onLogin?: (user: any) => void }) {
  const { t } = useTranslation(lang);
  const [isRegister, setIsRegister] = useState(false);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '', phone: '', password: '', location: '', farm_size: '0', whatsapp_enabled: true
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const STATES_DATA = [
    'Karnataka', 'Punjab', 'Maharashtra', 'Tamil Nadu', 'Gujarat', 'Uttar Pradesh', 'Rajasthan', 'Haryana', 'Andhra Pradesh', 'Telangana'
  ];

  const [isMobile, setIsMobile] = useState(() => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isSmallScreen = window.innerWidth < 1024;
    const isMobileDevice = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
    return isSmallScreen || isMobileDevice;
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const phoneParam = params.get('phone');
    const isRegParam = params.get('register');
    const whatsappParam = params.get('whatsapp');
    
    if (phoneParam) {
      setFormData(prev => ({ ...prev, phone: phoneParam }));
    }
    if (isRegParam === 'true') {
      setIsRegister(true);
    }
    if (whatsappParam === 'true') {
      setFormData(prev => ({ ...prev, whatsapp_enabled: true }));
    }

    const handleResize = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isSmallScreen = window.innerWidth < 1024;
      const isMobileDevice = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      setIsMobile(isSmallScreen || isMobileDevice);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const detectLocation = () => {
    setIsDetecting(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`);
          const data = await res.json();
          const state = data.address.state || 'Punjab';
          const locality = data.address.village || data.address.hamlet || data.address.suburb || data.address.town || data.address.neighbourhood || '';
          const dist = data.address.district || data.address.state_district || data.address.city || data.address.county || '';
          const city = (locality && dist && locality !== dist) ? `${locality}, ${dist}` : (locality || dist || 'Ludhiana');
          
          setFormData(prev => ({ 
            ...prev, 
            location: `${state}, ${city}`,
            lat: latitude,
            lon: longitude
          }));
        } catch (err) {
          setError("Detection failed. Please select manually.");
        } finally {
          setIsDetecting(false);
        }
      }, () => {
        setError("Location access denied.");
        setIsDetecting(false);
      }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    const cleanPhone = formData.phone.trim().replace(/\D/g, ''); // Strip all non-digits
    
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError("Please enter a valid 10-digit Indian phone number starting with 6-9.");
      setIsLoading(false);
      return;
    }

    const cleanPassword = formData.password.trim();

    const endpoint = isRegister ? `${API_BASE_URL}/api/v1/auth/register` : `${API_BASE_URL}/api/v1/auth/login`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          phone: cleanPhone,
          password: cleanPassword,
          farm_size: parseFloat(formData.farm_size) || 0
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to authenticate");
      
      localStorage.setItem('kisancore_token', data.token);
      localStorage.setItem('kisancore_farmer', JSON.stringify(data.farmer));
      
      if (onLogin) onLogin(data.farmer);

      if (isRegister && formData.whatsapp_enabled) {
        // Automatically open WhatsApp to "Verify" and "Join" the sandbox in one go
        window.open(`https://wa.me/14155238886?text=join%20tent-with`, '_blank');
        
        // Brief delay before redirecting to dashboard so they can see the WhatsApp popup
        setTimeout(() => navigate('/'), 1000);
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col items-center md:justify-center py-0 md:py-12 px-0 md:px-6 animate-fade-in bg-white dark:bg-slate-950">
      <div className="max-w-md w-full flex flex-col shadow-none md:shadow-2xl rounded-none md:rounded-[2.5rem] overflow-hidden border-b border-gray-100 dark:border-slate-800">
        {/* Reverted Header: Simple Green Banner */}
        <div className="bg-green-600 w-full p-8 md:p-10 text-white text-center shadow-lg relative overflow-hidden">
          {/* Decorative background shape */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          
          <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/30 backdrop-blur-sm overflow-hidden shadow-xl relative z-10">
            <img src="/kisancore_final_v12_zoom.png" alt="Logo" className="w-14 h-14 object-contain" />
          </div>
          <h1 className="text-3xl font-black m-0 mb-2 relative z-10 tracking-tight">KrishiCore AI</h1>
          <p className="opacity-90 font-bold m-0 uppercase tracking-widest text-[10px] relative z-10">Smart Farming for Indian Farmers</p>
        </div>
        
        {/* Reversion: Simple White Card */}
        <div className="bg-white dark:bg-slate-800 w-full flex flex-col flex-1">
          <div className="flex border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50">
            <button 
              type="button"
              className={`flex-1 py-5 font-black text-xs tracking-widest transition-all ${!isRegister ? 'text-green-600 bg-white dark:bg-slate-800 border-b-4 border-green-600' : 'text-gray-400'}`} 
              onClick={() => setIsRegister(false)}
            >
              {t('auth_login').toUpperCase()}
            </button>
            <button 
              type="button"
              className={`flex-1 py-5 font-black text-xs tracking-widest transition-all ${isRegister ? 'text-green-600 bg-white dark:bg-slate-800 border-b-4 border-green-600' : 'text-gray-400'}`} 
              onClick={() => setIsRegister(true)}
            >
              {t('auth_register').toUpperCase()}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 md:p-10 pb-20" autoComplete="off">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl text-xs font-bold mb-6 text-center border border-red-100 dark:border-red-900/30">
              ⚠️ {error}
            </div>
          )}

          <div className="space-y-4">
            {isRegister && (
              <div>
                 <input 
                  type="text"
                  placeholder={t('auth_full_name')} 
                  required 
                  autoComplete="name"
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 px-5 py-4 rounded-xl font-bold focus:border-green-500 outline-none transition-all text-base text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 caret-green-600" 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                />
              </div>
            )}

            <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                  <span className="text-gray-400 font-bold text-sm border-r border-gray-200 dark:border-slate-700 pr-3">+91</span>
                </div>
                <input 
                 placeholder={t('auth_phone')} 
                 type="tel"
                 inputMode="numeric"
                 pattern="[0-9]*"
                 required 
                 autoComplete="tel"
                 name="kisancore_phone_field"
                 className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 pl-20 pr-5 py-4 rounded-xl font-bold focus:border-green-500 outline-none transition-all text-base text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 caret-green-600" 
                 onChange={(e) => {
                   let val = e.target.value.replace(/\D/g, '');
                   if (val.startsWith('91') && val.length > 10) val = val.substring(2);
                   if (val.length > 10) val = val.substring(0, 10);
                   setFormData({...formData, phone: val});
                 }} 
                 value={formData.phone}
               />
               <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-xl transition-all ${/^[6-9]\d{9}$/.test(formData.phone) ? 'opacity-100' : 'opacity-20 grayscale'}`}>
                  {/^[6-9]\d{9}$/.test(formData.phone) ? '✅' : '🟢'}
               </span>
            </div>

            <div className="relative">
                <input 
                 placeholder={t('auth_password')} 
                 type={showPassword ? "text" : "password"} 
                 required 
                 autoComplete="current-password"
                 className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 px-5 py-4 rounded-xl font-bold focus:border-green-500 outline-none transition-all text-base text-gray-900 dark:text-white pr-12 placeholder:text-gray-400 dark:placeholder:text-slate-500 caret-green-600" 
                 onChange={(e) => setFormData({...formData, password: e.target.value})} 
               />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-green-600 transition-colors"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                )}
              </button>
            </div>

            {isRegister && (
              <div className="space-y-4">
                <div className="flex gap-4">
                     <select 
                      className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 px-5 py-4 rounded-xl font-bold focus:border-green-500 outline-none transition-all text-base text-gray-900 dark:text-white"
                      onChange={(e) => setFormData({...formData, location: `${e.target.value}, ${formData.location.split(', ')[1] || ''}`})}
                      value={formData.location.split(', ')[0] || ''}
                    >
                    <option value="">Select State</option>
                    {STATES_DATA.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                                    <input 
                    placeholder="Enter District" 
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 px-5 py-4 rounded-xl font-bold focus:border-green-500 outline-none transition-all text-base text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 caret-green-600" 
                    value={formData.location.split(', ')[1] || ''}
                    onChange={(e) => setFormData({...formData, location: `${formData.location.split(', ')[0] || ''}, ${e.target.value}`})} 
                  />
                </div>
                
                <button 
                  type="button" 
                  onClick={detectLocation}
                  className="w-full bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 py-3 rounded-xl border border-blue-100 dark:border-blue-800 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  {isDetecting ? 'Detecting...' : '📍 Auto-Detect My Location'}
                </button>
                <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/10 p-4 rounded-xl border border-green-100 dark:border-green-800">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🟢</span>
                    <div>
                      <p className="text-[10px] font-black text-green-700 dark:text-green-400 uppercase tracking-wider m-0">WhatsApp Alerts</p>
                      <p className="text-[9px] text-green-600/70 dark:text-green-500/70 font-bold m-0 italic">Enable AI Chat & IoT Alerts</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, whatsapp_enabled: !formData.whatsapp_enabled})}
                    className={`w-12 h-6 rounded-full transition-all relative ${formData.whatsapp_enabled ? 'bg-green-600' : 'bg-gray-300 dark:bg-slate-700'}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${formData.whatsapp_enabled ? 'left-6.5' : 'left-0.5'}`}></div>
                  </button>
                </div>

                <input 
                  placeholder={t('auth_farm_size')} 
                  type="number" step="0.1" 
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 px-5 py-4 rounded-xl font-bold focus:border-green-500 outline-none transition-all text-base text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 caret-green-600" 
                  onChange={(e) => setFormData({...formData, farm_size: e.target.value})} 
                />
              </div>
            )}
          </div>

          <button 
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-black py-5 rounded-[1.5rem] shadow-xl shadow-green-600/30 transition-all active:scale-[0.98] mt-8 text-sm uppercase tracking-widest flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              isRegister ? t('auth_create_account') : t('auth_access_dashboard')
            )}
          </button>
          
          <div className="mt-8 text-center">
            <button 
              type="button" 
              onClick={() => navigate('/')} 
              className="text-gray-400 hover:text-green-600 font-black text-[10px] uppercase tracking-[0.2em] bg-transparent border-none transition-colors"
            >
               ← {t('app_continue_as_guest')}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
  );
}
// v1.2.1 - Deployment Fix

