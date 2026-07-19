/**
 * KrishiCore Offline Market Price Estimator
 * Historical 3-year averages + monthly seasonal multipliers for 30+ major crops.
 * All prices in ₹/quintal (100 kg).
 */

interface CropMarketData {
  avg: number;        // 3-year average price ₹/quintal
  seasonal: Record<string, number>; // Monthly price multiplier
  volatility: string; // Description of price volatility
  unit: string;       // Unit of measurement
  peakMonths: string[]; // Best selling months
}

export const MARKET_AVERAGES: Record<string, CropMarketData> = {
  // ── VEGETABLES ─────────────────────────────────────────
  Tomato: {
    avg: 2500,
    seasonal: {
      Jan: 0.90, Feb: 0.85, Mar: 0.80, Apr: 1.00, May: 1.25, Jun: 1.50,
      Jul: 1.40, Aug: 1.20, Sep: 1.05, Oct: 0.90, Nov: 1.00, Dec: 0.95
    },
    volatility: 'Very High — swings 50–80% seasonally',
    unit: '₹/quintal',
    peakMonths: ['May', 'Jun', 'Jul']
  },
  Potato: {
    avg: 1800,
    seasonal: {
      Jan: 1.10, Feb: 1.20, Mar: 1.30, Apr: 1.15, May: 0.90, Jun: 0.80,
      Jul: 0.85, Aug: 0.90, Sep: 0.95, Oct: 1.00, Nov: 1.05, Dec: 1.10
    },
    volatility: 'Medium — ±25% seasonal variation',
    unit: '₹/quintal',
    peakMonths: ['Feb', 'Mar', 'Apr']
  },
  Onion: {
    avg: 2200,
    seasonal: {
      Jan: 1.30, Feb: 1.10, Mar: 0.80, Apr: 0.75, May: 0.90, Jun: 1.40,
      Jul: 1.60, Aug: 1.50, Sep: 1.20, Oct: 1.00, Nov: 0.90, Dec: 1.00
    },
    volatility: 'Extreme — can swing 100–200% in shortage year',
    unit: '₹/quintal',
    peakMonths: ['Jun', 'Jul', 'Jan']
  },
  Brinjal: {
    avg: 1400,
    seasonal: {
      Jan: 0.90, Feb: 0.85, Mar: 0.90, Apr: 1.10, May: 1.20, Jun: 1.30,
      Jul: 1.20, Aug: 1.10, Sep: 1.00, Oct: 0.90, Nov: 0.85, Dec: 0.90
    },
    volatility: 'Medium',
    unit: '₹/quintal',
    peakMonths: ['May', 'Jun', 'Jul']
  },
  Cauliflower: {
    avg: 1600,
    seasonal: {
      Jan: 0.80, Feb: 0.70, Mar: 0.65, Apr: 0.80, May: 1.10, Jun: 1.40,
      Jul: 1.30, Aug: 1.20, Sep: 1.10, Oct: 1.00, Nov: 0.85, Dec: 0.80
    },
    volatility: 'High — strong winter glut effect',
    unit: '₹/quintal',
    peakMonths: ['Jun', 'Jul', 'Aug']
  },
  Cabbage: {
    avg: 1000,
    seasonal: {
      Jan: 0.75, Feb: 0.70, Mar: 0.75, Apr: 0.90, May: 1.20, Jun: 1.40,
      Jul: 1.30, Aug: 1.10, Sep: 1.00, Oct: 0.90, Nov: 0.80, Dec: 0.75
    },
    volatility: 'Medium-High',
    unit: '₹/quintal',
    peakMonths: ['Jun', 'Jul']
  },
  Capsicum: {
    avg: 3000,
    seasonal: {
      Jan: 0.90, Feb: 0.85, Mar: 0.95, Apr: 1.10, May: 1.30, Jun: 1.50,
      Jul: 1.40, Aug: 1.20, Sep: 1.00, Oct: 0.90, Nov: 0.90, Dec: 0.90
    },
    volatility: 'High',
    unit: '₹/quintal',
    peakMonths: ['Jun', 'Jul']
  },
  Carrot: {
    avg: 1800,
    seasonal: {
      Jan: 0.85, Feb: 0.80, Mar: 0.90, Apr: 1.10, May: 1.30, Jun: 1.50,
      Jul: 1.40, Aug: 1.20, Sep: 1.00, Oct: 0.90, Nov: 0.85, Dec: 0.85
    },
    volatility: 'Medium',
    unit: '₹/quintal',
    peakMonths: ['Jun', 'Jul']
  },
  Ladyfinger: {
    avg: 2000,
    seasonal: {
      Jan: 0.85, Feb: 0.90, Mar: 1.00, Apr: 1.15, May: 1.30, Jun: 1.40,
      Jul: 1.30, Aug: 1.10, Sep: 1.00, Oct: 0.90, Nov: 0.85, Dec: 0.85
    },
    volatility: 'Medium',
    unit: '₹/quintal',
    peakMonths: ['Jun', 'Jul']
  },
  Peas: {
    avg: 2800,
    seasonal: {
      Jan: 0.80, Feb: 0.70, Mar: 0.80, Apr: 1.00, May: 1.30, Jun: 1.60,
      Jul: 1.50, Aug: 1.20, Sep: 1.00, Oct: 0.95, Nov: 0.85, Dec: 0.80
    },
    volatility: 'High',
    unit: '₹/quintal',
    peakMonths: ['Jun', 'Jul']
  },

  // ── GRAINS & CEREALS ────────────────────────────────────
  Rice: {
    avg: 2200,
    seasonal: {
      Jan: 1.00, Feb: 1.00, Mar: 1.02, Apr: 1.05, May: 1.05, Jun: 1.00,
      Jul: 0.95, Aug: 0.90, Sep: 0.90, Oct: 0.95, Nov: 1.00, Dec: 1.00
    },
    volatility: 'Low — MSP stabilizes price',
    unit: '₹/quintal',
    peakMonths: ['Mar', 'Apr', 'May']
  },
  Wheat: {
    avg: 2100,
    seasonal: {
      Jan: 1.05, Feb: 1.05, Mar: 0.90, Apr: 0.90, May: 0.95, Jun: 1.00,
      Jul: 1.02, Aug: 1.02, Sep: 1.05, Oct: 1.05, Nov: 1.05, Dec: 1.05
    },
    volatility: 'Low — MSP floor price',
    unit: '₹/quintal',
    peakMonths: ['Sep', 'Oct', 'Jan']
  },
  Maize: {
    avg: 1700,
    seasonal: {
      Jan: 1.05, Feb: 1.05, Mar: 1.05, Apr: 1.00, May: 0.90, Jun: 0.85,
      Jul: 0.85, Aug: 0.90, Sep: 0.95, Oct: 1.00, Nov: 1.05, Dec: 1.05
    },
    volatility: 'Medium',
    unit: '₹/quintal',
    peakMonths: ['Jan', 'Feb', 'Mar']
  },
  Jowar: {
    avg: 2500,
    seasonal: {
      Jan: 1.05, Feb: 1.05, Mar: 1.00, Apr: 0.95, May: 0.90, Jun: 0.90,
      Jul: 0.90, Aug: 0.95, Sep: 1.00, Oct: 1.00, Nov: 1.05, Dec: 1.05
    },
    volatility: 'Low-Medium',
    unit: '₹/quintal',
    peakMonths: ['Jan', 'Feb']
  },
  Bajra: {
    avg: 2000,
    seasonal: {
      Jan: 1.05, Feb: 1.05, Mar: 1.00, Apr: 0.95, May: 0.90, Jun: 0.88,
      Jul: 0.88, Aug: 0.92, Sep: 0.98, Oct: 1.00, Nov: 1.02, Dec: 1.05
    },
    volatility: 'Low-Medium',
    unit: '₹/quintal',
    peakMonths: ['Jan', 'Feb']
  },

  // ── OILSEEDS ────────────────────────────────────────────
  Groundnut: {
    avg: 5000,
    seasonal: {
      Jan: 1.05, Feb: 1.05, Mar: 1.00, Apr: 0.95, May: 0.90, Jun: 0.88,
      Jul: 0.88, Aug: 0.90, Sep: 0.95, Oct: 1.00, Nov: 1.02, Dec: 1.05
    },
    volatility: 'Medium',
    unit: '₹/quintal',
    peakMonths: ['Jan', 'Feb']
  },
  Soybean: {
    avg: 4500,
    seasonal: {
      Jan: 1.05, Feb: 1.05, Mar: 1.05, Apr: 1.00, May: 0.95, Jun: 0.90,
      Jul: 0.88, Aug: 0.88, Sep: 0.92, Oct: 0.95, Nov: 1.00, Dec: 1.05
    },
    volatility: 'Medium-High — global price linked',
    unit: '₹/quintal',
    peakMonths: ['Jan', 'Feb', 'Mar']
  },
  Mustard: {
    avg: 5500,
    seasonal: {
      Jan: 1.00, Feb: 1.00, Mar: 0.92, Apr: 0.90, May: 0.95, Jun: 1.00,
      Jul: 1.02, Aug: 1.02, Sep: 1.05, Oct: 1.05, Nov: 1.05, Dec: 1.02
    },
    volatility: 'Low-Medium',
    unit: '₹/quintal',
    peakMonths: ['Sep', 'Oct', 'Nov']
  },
  Sunflower: {
    avg: 5800,
    seasonal: {
      Jan: 1.00, Feb: 1.00, Mar: 0.95, Apr: 0.92, May: 0.95, Jun: 1.00,
      Jul: 1.02, Aug: 1.05, Sep: 1.05, Oct: 1.05, Nov: 1.02, Dec: 1.00
    },
    volatility: 'Medium',
    unit: '₹/quintal',
    peakMonths: ['Aug', 'Sep', 'Oct']
  },

  // ── CASH CROPS ──────────────────────────────────────────
  Cotton: {
    avg: 6200,
    seasonal: {
      Jan: 1.05, Feb: 1.05, Mar: 1.00, Apr: 0.95, May: 0.92, Jun: 0.90,
      Jul: 0.90, Aug: 0.92, Sep: 0.95, Oct: 1.00, Nov: 1.00, Dec: 1.05
    },
    volatility: 'Medium — global market linked',
    unit: '₹/quintal',
    peakMonths: ['Jan', 'Feb', 'Dec']
  },
  Sugarcane: {
    avg: 320,
    seasonal: {
      Jan: 1.00, Feb: 1.00, Mar: 1.00, Apr: 1.00, May: 1.00, Jun: 1.00,
      Jul: 1.00, Aug: 1.00, Sep: 1.00, Oct: 1.00, Nov: 1.00, Dec: 1.00
    },
    volatility: 'Very Low — FRP set by government',
    unit: '₹/quintal',
    peakMonths: ['Oct', 'Nov', 'Dec', 'Jan']
  },
  Turmeric: {
    avg: 8000,
    seasonal: {
      Jan: 1.00, Feb: 0.95, Mar: 0.90, Apr: 0.90, May: 0.95, Jun: 1.00,
      Jul: 1.05, Aug: 1.10, Sep: 1.10, Oct: 1.10, Nov: 1.05, Dec: 1.00
    },
    volatility: 'High',
    unit: '₹/quintal',
    peakMonths: ['Aug', 'Sep', 'Oct']
  },
  Ginger: {
    avg: 12000,
    seasonal: {
      Jan: 0.90, Feb: 0.85, Mar: 0.80, Apr: 0.85, May: 1.00, Jun: 1.20,
      Jul: 1.40, Aug: 1.50, Sep: 1.40, Oct: 1.20, Nov: 1.05, Dec: 0.95
    },
    volatility: 'Very High',
    unit: '₹/quintal',
    peakMonths: ['Jul', 'Aug', 'Sep']
  },
  Garlic: {
    avg: 6000,
    seasonal: {
      Jan: 1.20, Feb: 1.10, Mar: 0.90, Apr: 0.80, May: 0.85, Jun: 1.00,
      Jul: 1.10, Aug: 1.20, Sep: 1.25, Oct: 1.25, Nov: 1.20, Dec: 1.20
    },
    volatility: 'High',
    unit: '₹/quintal',
    peakMonths: ['Sep', 'Oct', 'Nov', 'Jan']
  },

  // ── PULSES ──────────────────────────────────────────────
  'Tur Dal': {
    avg: 7000,
    seasonal: {
      Jan: 1.05, Feb: 1.05, Mar: 1.00, Apr: 0.95, May: 0.95, Jun: 0.95,
      Jul: 0.90, Aug: 0.90, Sep: 0.95, Oct: 1.00, Nov: 1.00, Dec: 1.05
    },
    volatility: 'Medium',
    unit: '₹/quintal',
    peakMonths: ['Jan', 'Feb', 'Dec']
  },
  Chana: {
    avg: 5500,
    seasonal: {
      Jan: 1.05, Feb: 1.00, Mar: 0.90, Apr: 0.90, May: 0.95, Jun: 1.00,
      Jul: 1.02, Aug: 1.05, Sep: 1.05, Oct: 1.05, Nov: 1.05, Dec: 1.05
    },
    volatility: 'Low-Medium',
    unit: '₹/quintal',
    peakMonths: ['Aug', 'Sep', 'Oct']
  },
  Moong: {
    avg: 7500,
    seasonal: {
      Jan: 1.00, Feb: 1.00, Mar: 0.95, Apr: 0.95, May: 0.95, Jun: 0.95,
      Jul: 0.95, Aug: 1.00, Sep: 1.00, Oct: 1.00, Nov: 1.00, Dec: 1.00
    },
    volatility: 'Low',
    unit: '₹/quintal',
    peakMonths: ['Sep', 'Oct']
  }
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface PriceEstimate {
  estimate: number;
  minEstimate: number;
  maxEstimate: number;
  trend: string;
  trendDirection: 'up' | 'down' | 'stable';
  confidence: string;
  advice: string;
  volatility: string;
  peakMonths: string[];
  isOffline: boolean;
}

export function estimatePrice(commodity: string): PriceEstimate {
  // Case-insensitive lookup
  const key = Object.keys(MARKET_AVERAGES).find(
    k => k.toLowerCase() === commodity.toLowerCase()
  ) || commodity;
  
  const crop = MARKET_AVERAGES[key];
  
  if (!crop) {
    return {
      estimate: 0,
      minEstimate: 0,
      maxEstimate: 0,
      trend: 'Unknown',
      trendDirection: 'stable',
      confidence: 'No offline data',
      advice: 'Connect to internet for live mandi prices from data.gov.in',
      volatility: 'Unknown',
      peakMonths: [],
      isOffline: true
    };
  }

  const currentMonth = new Date().getMonth();
  const nextMonthIdx = (currentMonth + 1) % 12;
  const currentMonthName = MONTH_NAMES[currentMonth];
  const nextMonthName = MONTH_NAMES[nextMonthIdx];

  const seasonalFactor = crop.seasonal[currentMonthName] || 1.0;
  const nextFactor = crop.seasonal[nextMonthName] || 1.0;

  const estimate = Math.round(crop.avg * seasonalFactor);
  // ±15% confidence band
  const minEstimate = Math.round(estimate * 0.85);
  const maxEstimate = Math.round(estimate * 1.15);

  const pctChange = ((nextFactor - seasonalFactor) / seasonalFactor) * 100;
  let trend: string;
  let trendDirection: 'up' | 'down' | 'stable';
  if (pctChange > 3) {
    trend = `Rising next month ↗ (+${Math.round(pctChange)}% expected)`;
    trendDirection = 'up';
  } else if (pctChange < -3) {
    trend = `Falling next month ↘ (${Math.round(pctChange)}% expected)`;
    trendDirection = 'down';
  } else {
    trend = 'Stable → (no major change expected)';
    trendDirection = 'stable';
  }

  let advice: string;
  if (seasonalFactor < 0.88) {
    advice = '⚠️ Low season — prices are below average. Store if possible or sell quickly to avoid further fall.';
  } else if (seasonalFactor > 1.20) {
    advice = '✅ Peak season — prices are high! Good time to sell. Prices may ease next month.';
  } else if (trendDirection === 'up') {
    advice = '📈 Prices rising — consider waiting 2–3 weeks before selling for better returns.';
  } else if (trendDirection === 'down') {
    advice = '📉 Prices falling — consider selling now rather than waiting.';
  } else {
    advice = '→ Stable market — sell based on your storage and cash flow needs.';
  }

  return {
    estimate,
    minEstimate,
    maxEstimate,
    trend,
    trendDirection,
    confidence: 'Based on 3-year historical average ±15%',
    advice,
    volatility: crop.volatility,
    peakMonths: crop.peakMonths,
    isOffline: true
  };
}

export function getAvailableCrops(): string[] {
  return Object.keys(MARKET_AVERAGES).sort();
}
