/**
 * KrishiCore Offline Weather Forecaster
 * Rule-based prediction from sensor readings + Indian seasonal patterns.
 * No internet required — uses barometric pressure, temperature, humidity.
 */

export interface OfflineWeatherResult {
  forecast: string[];          // 1–3 forecast statements
  farmingAdvice: string;       // Actionable advice for today
  sprayAdvice: string;         // Is it safe to spray?
  irrigationAdvice: string;    // Irrigation recommendation
  alerts: string[];            // Any weather warnings
  condition: string;           // Summary condition label
  conditionEmoji: string;
}

const MONSOON_MONTHS = [5, 6, 7, 8];         // Jun–Sep (0-indexed)
const PRE_MONSOON_MONTHS = [4];              // May
const RABI_MONTHS = [10, 11, 0, 1];         // Nov–Feb
const SUMMER_MONTHS = [2, 3];               // Mar–Apr

export function predictWeatherOffline(params: {
  pressure: number;         // hPa (typical: 950–1050)
  pressureChange: number;   // Change in last 3 hours (hPa). Negative = dropping
  temperature: number;      // °C
  humidity: number;         // %
  month?: number;           // 0-11, defaults to current month
}): OfflineWeatherResult {
  const {
    pressure,
    pressureChange,
    temperature,
    humidity,
    month = new Date().getMonth()
  } = params;

  const forecast: string[] = [];
  const alerts: string[] = [];
  let condition = 'Clear';
  let conditionEmoji = '☀️';

  // ── PRESSURE-BASED FORECAST ─────────────────────────────
  if (pressureChange < -4) {
    forecast.push('Rapid pressure drop — storm or heavy rain very likely within 6 hours');
    alerts.push('⛈️ Storm warning — secure crops, close greenhouse vents');
    condition = 'Storm Approaching';
    conditionEmoji = '⛈️';
  } else if (pressureChange < -2) {
    forecast.push('Pressure falling — rain likely in next 12–18 hours');
    condition = 'Rain Expected';
    conditionEmoji = '🌧️';
  } else if (pressureChange < -0.5) {
    forecast.push('Pressure slightly falling — possible rain or clouds in 24 hours');
    condition = 'Partly Cloudy';
    conditionEmoji = '⛅';
  } else if (pressureChange > 3) {
    forecast.push('Rising pressure — clearing skies, sunny weather ahead');
    condition = 'Clearing';
    conditionEmoji = '🌤️';
  } else if (pressureChange > 1) {
    forecast.push('Stable/rising pressure — fair weather expected');
    condition = 'Fair';
    conditionEmoji = '☀️';
  } else {
    forecast.push('Stable pressure — no major weather change in next 24 hours');
    condition = 'Stable';
    conditionEmoji = '🌤️';
  }

  // ── ABSOLUTE PRESSURE ────────────────────────────────────
  if (pressure < 980) {
    forecast.push('Very low pressure zone — severe weather possible');
    alerts.push('🚨 Low pressure system — risk of cyclonic weather');
  } else if (pressure < 1000) {
    forecast.push('Below-normal pressure — unsettled weather conditions');
  } else if (pressure > 1025) {
    forecast.push('High pressure dominant — sunny and dry weather expected');
    condition = 'Clear & Dry';
    conditionEmoji = '☀️';
  }

  // ── HUMIDITY-BASED FORECAST ─────────────────────────────
  if (humidity > 90) {
    forecast.push('Very high humidity — heavy dew, morning fog likely');
    alerts.push('🍄 Very high humidity — risk of fungal disease. Check crops today.');
    conditionEmoji = conditionEmoji === '☀️' ? '🌫️' : conditionEmoji;
    condition = 'Foggy / Humid';
  } else if (humidity > 75) {
    forecast.push('High humidity — humid conditions, morning mist possible');
  } else if (humidity < 30) {
    forecast.push('Very low humidity — hot and dry conditions');
    if (temperature > 35) {
      alerts.push('🌡️ Extreme heat + low humidity — severe crop stress risk');
    }
  }

  // ── TEMPERATURE ALERTS ───────────────────────────────────
  if (temperature > 42) {
    alerts.push('🔴 Extreme heat (>42°C) — critical crop stress, irrigate immediately');
    condition = 'Extreme Heat';
    conditionEmoji = '🔥';
  } else if (temperature > 37) {
    alerts.push('🌡️ High heat stress — irrigate before 8 AM, add mulch');
  } else if (temperature < 4) {
    alerts.push('❄️ Frost risk — cover nurseries and frost-sensitive crops tonight');
    condition = 'Frost Risk';
    conditionEmoji = '🌨️';
  } else if (temperature < 8 && RABI_MONTHS.includes(month)) {
    alerts.push('🥶 Cold wave — protect wheat and vegetables from cold damage');
  }

  // ── SEASONAL CONTEXT ────────────────────────────────────
  if (MONSOON_MONTHS.includes(month)) {
    if (humidity > 65) {
      forecast.push('Monsoon season — rain activity expected, typical for this time of year');
      conditionEmoji = pressureChange < -1 ? '⛈️' : '🌧️';
    }
  } else if (PRE_MONSOON_MONTHS.includes(month)) {
    if (humidity > 55 && temperature > 30) {
      forecast.push('Pre-monsoon conditions — convective showers possible in afternoon');
    }
  } else if (SUMMER_MONTHS.includes(month)) {
    if (temperature > 35) {
      forecast.push('Peak summer conditions — hot and dry, typical for March–April');
    }
  } else if (RABI_MONTHS.includes(month)) {
    if (temperature < 12) {
      forecast.push('Winter season — cold mornings normal, good for Rabi crops');
    }
  }

  // ── SPRAY SAFETY ────────────────────────────────────────
  let sprayAdvice: string;
  const rainRisk = pressureChange < -1.5;
  const highWind = temperature > 38; // Proxy for hot windy conditions

  if (rainRisk) {
    sprayAdvice = '❌ Do NOT spray — rain expected. Wait for dry weather to avoid wash-off.';
  } else if (humidity > 85) {
    sprayAdvice = '⚠️ Spray only if necessary — high humidity may cause fungicide phytotoxicity.';
  } else if (highWind) {
    sprayAdvice = '⚠️ Spray early morning only (before 8 AM) — afternoon too hot, evaporation high.';
  } else {
    sprayAdvice = '✅ Good conditions for spraying — apply in morning (7–10 AM) for best results.';
  }

  // ── IRRIGATION ADVICE ────────────────────────────────────
  let irrigationAdvice: string;
  if (pressureChange < -2) {
    irrigationAdvice = '⏸️ Hold irrigation — rain coming in 12–18 hours.';
  } else if (temperature > 38 && humidity < 40) {
    irrigationAdvice = '🚨 Irrigate today before 8 AM — extreme heat, crops in stress.';
  } else if (temperature > 32 && humidity < 55) {
    irrigationAdvice = '💧 Irrigate early morning — hot day ahead, moisture will help.';
  } else if (humidity > 80 || pressureChange < -0.5) {
    irrigationAdvice = '→ Skip irrigation — adequate moisture from humidity or expected rain.';
  } else {
    irrigationAdvice = '→ Check soil moisture manually before irrigating. Conditions are neutral.';
  }

  // ── FARMING ADVICE ───────────────────────────────────────
  let farmingAdvice: string;
  if (pressureChange < -3) {
    farmingAdvice = '⚠️ Stay off the field — storm approaching. Secure farm equipment and check drainage channels to prevent waterlogging.';
  } else if (pressureChange < -1.5) {
    farmingAdvice = '🌧️ Rain expected — delay fertilizer and chemical application. Good time for transplanting if you have seedlings ready.';
  } else if (temperature > 38) {
    farmingAdvice = '🌡️ Extreme heat — do field work only in early morning (5–9 AM). Protect livestock and nursery seedlings with shade.';
  } else if (humidity > 85 && MONSOON_MONTHS.includes(month)) {
    farmingAdvice = '🍄 Very humid — inspect crops for fungal disease. Ensure good air circulation and avoid overhead irrigation.';
  } else if (temperature < 8) {
    farmingAdvice = '❄️ Cold weather — cover nurseries with polythene. Delay seedling transplanting. Irrigate before expected frost.';
  } else if (condition.includes('Clear') || condition.includes('Fair') || condition.includes('Stable')) {
    farmingAdvice = '✅ Good day for field work — ideal for weeding, harvesting, drying grain, or applying fertilizer.';
  } else {
    farmingAdvice = '→ Moderate conditions — normal farm activities can proceed. Monitor for afternoon weather changes.';
  }

  return {
    forecast: forecast.slice(0, 3),
    farmingAdvice,
    sprayAdvice,
    irrigationAdvice,
    alerts,
    condition,
    conditionEmoji
  };
}

/** Use BME280 / DHT22 last cached data or supply manual values */
export function getDefaultWeatherParams() {
  return {
    pressure: 1013,
    pressureChange: 0,
    temperature: 28,
    humidity: 65,
    month: new Date().getMonth()
  };
}
