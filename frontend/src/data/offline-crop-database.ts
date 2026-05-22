export interface CropData {
  name: string;
  kannada: string;
  hindi: string;
  conditions: {
    N: [number, number];
    P: [number, number];
    K: [number, number];
    temperature: [number, number];
    humidity: [number, number];
    pH: [number, number];
    rainfall: [number, number];
  };
  season: string[];
  duration_days: number;
  yield_per_acre: string;
  water_need: 'Low' | 'Medium' | 'High';
  soil_type: string[];
  fertilizer: {
    base: string;
    top_dress: string;
    schedule: string;
  };
  diseases: string[];
  market_price_range: string;
}

export const CROP_DATABASE: CropData[] = [
  {
    name: 'Rice',
    kannada: 'ಭತ್ತ',
    hindi: 'चावल',
    conditions: {
      N: [60, 100], P: [40, 60], K: [40, 60],
      temperature: [20, 35], humidity: [70, 90],
      pH: [5.5, 7.0], rainfall: [150, 300]
    },
    season: ['Kharif', 'Rabi'],
    duration_days: 120,
    yield_per_acre: '20-25 quintals',
    water_need: 'High',
    soil_type: ['Clay', 'Loamy'],
    fertilizer: {
      base: 'NPK 17:17:17 @ 50kg/acre before transplanting',
      top_dress: 'Urea 25kg/acre at 30 days after transplanting',
      schedule: 'Apply urea in 3 splits: basal, tillering, panicle initiation'
    },
    diseases: ['Blast', 'Brown Plant Hopper', 'Sheath Blight'],
    market_price_range: '₹1800-2200/quintal'
  },
  {
    name: 'Wheat',
    kannada: 'ಗೋಧಿ',
    hindi: 'गेहूं',
    conditions: {
      N: [60, 120], P: [40, 80], K: [40, 80],
      temperature: [10, 25], humidity: [40, 70],
      pH: [6.0, 7.5], rainfall: [50, 100]
    },
    season: ['Rabi'],
    duration_days: 120,
    yield_per_acre: '15-20 quintals',
    water_need: 'Medium',
    soil_type: ['Loamy', 'Clay Loam'],
    fertilizer: {
      base: 'DAP 50kg/acre + MOP 25kg/acre at sowing',
      top_dress: 'Urea 30kg/acre at crown root initiation',
      schedule: 'Apply nitrogen in 2 splits for best results'
    },
    diseases: ['Rust', 'Smut', 'Powdery Mildew'],
    market_price_range: '₹2000-2500/quintal'
  },
  {
    name: 'Tomato',
    kannada: 'ಟೊಮ್ಯಾಟೊ',
    hindi: 'टमाटर',
    conditions: {
      N: [80, 120], P: [60, 100], K: [60, 100],
      temperature: [18, 30], humidity: [50, 75],
      pH: [6.0, 7.0], rainfall: [60, 120]
    },
    season: ['Kharif', 'Rabi', 'Zaid'],
    duration_days: 75,
    yield_per_acre: '80-120 quintals',
    water_need: 'Medium',
    soil_type: ['Sandy Loam', 'Loamy'],
    fertilizer: {
      base: 'FYM 4 tonnes + NPK 19:19:19 @ 25kg/acre',
      top_dress: 'Urea 20kg + MOP 15kg at flowering',
      schedule: 'Fertigation preferred, 3-4 day intervals'
    },
    diseases: ['Early Blight', 'Late Blight', 'Leaf Curl'],
    market_price_range: '₹800-2000/quintal (seasonal)'
  },
  {
    name: 'Potato',
    kannada: 'ಆಲೂಗಡ್ಡೆ',
    hindi: 'आलू',
    conditions: {
      N: [80, 120], P: [60, 80], K: [80, 100],
      temperature: [15, 25], humidity: [60, 80],
      pH: [5.5, 6.5], rainfall: [50, 75]
    },
    season: ['Rabi'],
    duration_days: 90,
    yield_per_acre: '80-100 quintals',
    water_need: 'Medium',
    soil_type: ['Sandy Loam', 'Loamy'],
    fertilizer: {
      base: 'NPK 17:17:17 @ 60kg/acre + FYM 3 tonnes',
      top_dress: 'Urea 25kg/acre at earthing up',
      schedule: 'Apply potash for tuber development'
    },
    diseases: ['Late Blight', 'Early Blight', 'Scab'],
    market_price_range: '₹600-1200/quintal'
  },
  {
    name: 'Maize',
    kannada: 'ಮೆಕ್ಕೆ ಜೋಳ',
    hindi: 'मक्का',
    conditions: {
      N: [80, 120], P: [40, 70], K: [40, 70],
      temperature: [20, 35], humidity: [50, 80],
      pH: [5.8, 7.0], rainfall: [50, 100]
    },
    season: ['Kharif', 'Rabi'],
    duration_days: 90,
    yield_per_acre: '25-35 quintals',
    water_need: 'Medium',
    soil_type: ['Loamy', 'Sandy Loam'],
    fertilizer: {
      base: 'DAP 50kg/acre at sowing',
      top_dress: 'Urea 30kg/acre at knee-high stage',
      schedule: '3 split doses of nitrogen for best yield'
    },
    diseases: ['Downy Mildew', 'Rust', 'Blight'],
    market_price_range: '₹1500-1900/quintal'
  },
  {
    name: 'Cotton',
    kannada: 'ಹತ್ತಿ',
    hindi: 'कपास',
    conditions: {
      N: [60, 100], P: [40, 60], K: [40, 80],
      temperature: [25, 40], humidity: [40, 70],
      pH: [6.0, 7.5], rainfall: [50, 100]
    },
    season: ['Kharif'],
    duration_days: 150,
    yield_per_acre: '8-12 quintals',
    water_need: 'Medium',
    soil_type: ['Black Cotton Soil', 'Loamy'],
    fertilizer: {
      base: 'DAP 25kg + MOP 25kg/acre at sowing',
      top_dress: 'Urea 30kg/acre at squaring stage',
      schedule: 'Micronutrients (Boron) at boll formation'
    },
    diseases: ['Bollworm', 'White Fly', 'Leaf Curl'],
    market_price_range: '₹5500-7000/quintal'
  },
  {
    name: 'Sugarcane',
    kannada: 'ಕಬ್ಬು',
    hindi: 'गन्ना',
    conditions: {
      N: [100, 150], P: [60, 80], K: [60, 100],
      temperature: [25, 38], humidity: [60, 90],
      pH: [6.0, 7.5], rainfall: [100, 200]
    },
    season: ['Annual'],
    duration_days: 360,
    yield_per_acre: '200-300 quintals',
    water_need: 'High',
    soil_type: ['Loamy', 'Clay Loam'],
    fertilizer: {
      base: 'FYM 6 tonnes + NPK 17:17:17 @ 50kg/acre',
      top_dress: 'Urea 40kg/acre at 3 and 6 months',
      schedule: 'Fertigation with drip for 30% saving'
    },
    diseases: ['Red Rot', 'Smut', 'Leaf Scorch'],
    market_price_range: '₹280-350/quintal (govt. fixed)'
  },
  {
    name: 'Onion',
    kannada: 'ಈರುಳ್ಳಿ',
    hindi: 'प्याज',
    conditions: {
      N: [60, 100], P: [40, 60], K: [60, 80],
      temperature: [13, 28], humidity: [50, 80],
      pH: [6.0, 7.5], rainfall: [25, 75]
    },
    season: ['Rabi', 'Kharif'],
    duration_days: 100,
    yield_per_acre: '60-80 quintals',
    water_need: 'Low',
    soil_type: ['Sandy Loam', 'Loamy'],
    fertilizer: {
      base: 'FYM 3 tonnes + DAP 25kg/acre',
      top_dress: 'Urea 20kg/acre at bulb formation',
      schedule: 'Sulfur 10kg/acre improves pungency'
    },
    diseases: ['Purple Blotch', 'Stemphylium Blight', 'Thrips'],
    market_price_range: '₹800-2500/quintal (seasonal)'
  },
  {
    name: 'Groundnut',
    kannada: 'ಕಡಲೆ',
    hindi: 'मूंगफली',
    conditions: {
      N: [20, 40], P: [40, 60], K: [40, 60],
      temperature: [25, 35], humidity: [45, 70],
      pH: [6.0, 7.0], rainfall: [50, 125]
    },
    season: ['Kharif', 'Rabi'],
    duration_days: 110,
    yield_per_acre: '10-15 quintals',
    water_need: 'Low',
    soil_type: ['Sandy Loam', 'Red Soil'],
    fertilizer: {
      base: 'SSP 50kg/acre + Gypsum 100kg/acre',
      top_dress: 'Gypsum 50kg/acre at pegging stage',
      schedule: 'Rhizobium seed treatment for nitrogen fixation'
    },
    diseases: ['Tikka', 'Rust', 'Bud Necrosis'],
    market_price_range: '₹4500-6000/quintal'
  },
  {
    name: 'Soybean',
    kannada: 'ಸೋಯಾಬೀನ್',
    hindi: 'सोयाबीन',
    conditions: {
      N: [20, 40], P: [40, 80], K: [40, 60],
      temperature: [20, 32], humidity: [60, 85],
      pH: [6.0, 7.0], rainfall: [75, 150]
    },
    season: ['Kharif'],
    duration_days: 90,
    yield_per_acre: '8-12 quintals',
    water_need: 'Medium',
    soil_type: ['Black', 'Loamy'],
    fertilizer: {
      base: 'DAP 25kg + MOP 20kg/acre at sowing',
      top_dress: 'MOP 15kg/acre at flowering',
      schedule: 'Rhizobium + PSB seed treatment'
    },
    diseases: ['Yellow Mosaic', 'Charcoal Rot', 'Rust'],
    market_price_range: '₹3500-4500/quintal'
  },
  {
    name: 'Banana',
    kannada: 'ಬಾಳೆ',
    hindi: 'केला',
    conditions: {
      N: [100, 150], P: [40, 60], K: [100, 200],
      temperature: [20, 35], humidity: [70, 90],
      pH: [6.0, 7.5], rainfall: [100, 200]
    },
    season: ['Annual'],
    duration_days: 300,
    yield_per_acre: '120-150 quintals',
    water_need: 'High',
    soil_type: ['Loamy', 'Clay Loam'],
    fertilizer: {
      base: 'FYM 10 tonnes/acre + NPK 17:17:17',
      top_dress: 'MOP 100g/plant at bunch formation',
      schedule: 'Monthly fertigation for best results'
    },
    diseases: ['Panama Wilt', 'Sigatoka', 'Bunchy Top'],
    market_price_range: '₹800-1500/quintal'
  },
  {
    name: 'Turmeric',
    kannada: 'ಅರಿಶಿನ',
    hindi: 'हल्दी',
    conditions: {
      N: [60, 100], P: [40, 60], K: [80, 120],
      temperature: [20, 30], humidity: [70, 90],
      pH: [5.5, 7.0], rainfall: [100, 200]
    },
    season: ['Kharif'],
    duration_days: 270,
    yield_per_acre: '40-60 quintals',
    water_need: 'Medium',
    soil_type: ['Loamy', 'Red Loam'],
    fertilizer: {
      base: 'FYM 8 tonnes + NPK split application',
      top_dress: 'Urea 25kg/acre at 45 and 90 days',
      schedule: 'Mulching conserves moisture and reduces weeds'
    },
    diseases: ['Rhizome Rot', 'Leaf Blotch', 'Nematodes'],
    market_price_range: '₹6000-12000/quintal'
  }
];
