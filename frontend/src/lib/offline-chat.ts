/**
 * KrishiCore Offline Chat Engine
 * Keyword-based semantic matching — no TensorFlow needed.
 * Works fully offline with zero network dependency.
 */

interface QAPair {
  keywords: string[];
  q: string;
  a: string;
}

const FARMING_QA: QAPair[] = [
  // ── CROP SELECTION ──────────────────────────────────────
  {
    keywords: ['crop', 'grow', 'plant', 'cultivate', 'which crop', 'what crop', 'suggest crop'],
    q: 'which crop should i grow',
    a: `For Indian farming, choose based on your conditions:\n🌾 Rice — high rainfall, waterlogged soil (Kharif)\n🌾 Wheat — moderate water, cool weather (Rabi)\n🌿 Cotton — low water, well-drained soil (Kharif)\n🌽 Maize — versatile, grows in 70-80 days\n🫘 Soybean — good for dry land, nitrogen fixer\n\nCheck: soil type, local market demand, and nearest mandi before deciding.`
  },
  {
    keywords: ['rice', 'paddy', 'dhan'],
    q: 'rice cultivation tips',
    a: `Rice Cultivation Guide:\n📅 Season: Kharif (June–November)\n💧 Water: 1200–1500 mm/season — keep fields flooded 5cm\n🌱 Seed rate: 20–25 kg/acre (transplant) or 40 kg/acre (direct)\n🧪 Fertilizer: NPK 4:2:1 ratio — urea 120 kg/acre in 3 splits\n⏱️ Harvest: 100–150 days after sowing\n⚠️ Watch for: blast disease, stem borer, brown planthopper`
  },
  {
    keywords: ['wheat', 'gehu', 'rabi'],
    q: 'wheat farming guide',
    a: `Wheat Farming Guide:\n📅 Season: Rabi (October–March)\n💧 Water: 400–500 mm total — 4–6 irrigations critical\n🌱 Seed: HD-2781, PBW-343, GW-322 varieties\n🧪 Fertilizer: NPK 120:60:40 kg/hectare\n⏱️ Harvest: 110–130 days\n⚠️ Key irrigations: Crown root, tillering, jointing, grain fill`
  },
  {
    keywords: ['tomato', 'tamatar'],
    q: 'tomato growing tips',
    a: `Tomato Growing Guide:\n📅 Best season: Oct–Jan (winter), Jun–Aug (rainy)\n🌱 Spacing: 60×45 cm, transplant at 25–30 days\n💧 Water: Drip irrigation, 400–600 mm/season\n🧪 Fertilizer: DAP at planting + urea topdressing at flowering\n⚠️ Pests: Fruit borer (spray chlorpyrifos), early blight (mancozeb)\n💰 Yield: 25–40 tonnes/hectare`
  },
  {
    keywords: ['onion', 'pyaz', 'kanda'],
    q: 'onion cultivation',
    a: `Onion Growing Guide:\n📅 Kharif: Jun–Jul sowing | Rabi: Oct–Nov sowing\n🌱 Seed rate: 8–10 kg/hectare\n💧 Water: 350–500 mm — stop irrigation 10 days before harvest\n🧪 Fertilizer: NPK 100:50:50 + sulphur 25 kg/hectare\n⚠️ Disease: Purple blotch — spray mancozeb weekly during humid weather\n🧅 Storage: Cure in shade 2 weeks before storage`
  },
  {
    keywords: ['cotton', 'kapas', 'bt cotton'],
    q: 'cotton farming',
    a: `Cotton Farming Guide:\n📅 Season: Kharif (April–May sowing)\n🌱 Use Bt cotton hybrids — 750g seed packets/acre\n💧 Water: 600–700 mm — critical at flowering and boll formation\n🧪 Fertilizer: NPK 80:40:40 kg/hectare\n⚠️ Pests: Bollworm, whitefly, aphids — monitor weekly\n⏱️ Harvest: 150–180 days, pick every 3–4 weeks`
  },
  {
    keywords: ['potato', 'aalu', 'aloo'],
    q: 'potato cultivation',
    a: `Potato Cultivation:\n📅 Season: Oct–Nov planting (Rabi), harvest Feb–Mar\n🌱 Seed: 20–25 mm tubers, 1500–2000 kg/acre\n💧 Water: 500–700 mm — avoid waterlogging\n🧪 Fertilizer: NPK 180:80:100 kg/hectare\n⚠️ Late blight — spray mancozeb before disease appears\n⏱️ Harvest: 70–120 days depending on variety`
  },

  // ── SOIL ────────────────────────────────────────────────
  {
    keywords: ['soil ph', 'ph level', 'acid soil', 'alkaline', 'lime', 'acidic'],
    q: 'soil ph problem',
    a: `Soil pH Management:\n✅ Ideal range: 6.0–7.5 for most crops\n\n🔴 Too Acidic (pH < 6):\n  → Add agricultural lime (calcium carbonate)\n  → 2–4 tonnes/hectare based on severity\n  → Apply 2–3 months before sowing\n\n🔵 Too Alkaline (pH > 8):\n  → Add gypsum (25–50 kg/acre)\n  → Add organic compost or sulfur\n  → Grow green manure crops (dhaincha)\n\n📋 Test soil every 6 months at Krishi Vigyan Kendra`
  },
  {
    keywords: ['soil test', 'soil health', 'soil type', 'black soil', 'sandy soil', 'loam'],
    q: 'soil testing and health',
    a: `Soil Testing Guide:\n🏛️ Get free soil test at your nearest Soil Health Card center\n\nSoil Types:\n🖤 Black (Vertisol): Best for cotton, soybean, sorghum\n🟤 Red (Alfisol): Good for groundnut, pulses, millets\n🟡 Sandy (Entisol): Suitable for watermelon, groundnut\n🌱 Loam (Inceptisol): Best for wheat, vegetables\n\n📊 Key parameters to test: NPK, pH, organic carbon, micronutrients\n💡 Apply fertilizer only based on soil test results`
  },
  {
    keywords: ['organic matter', 'compost', 'vermicompost', 'organic farming', 'natural farming'],
    q: 'organic farming and compost',
    a: `Organic Farming Basics:\n\n🌿 Compost making:\n  → Mix green matter (leaves) + dry matter (stalks) 1:2\n  → Add cow dung slurry for microbial activity\n  → Ready in 45–60 days — dark, crumbly, earthy smell\n\n🪱 Vermicompost:\n  → Use earthworms (Eisenia fetida)\n  → 3× more nutrients than regular compost\n  → Apply 2–4 tonnes/hectare\n\n♻️ Benefits: Improves soil structure, water retention, reduces input cost by 30–40%`
  },

  // ── WATER & IRRIGATION ───────────────────────────────────
  {
    keywords: ['irrigate', 'irrigation', 'water', 'when to water', 'drip', 'sprinkler'],
    q: 'when and how to irrigate',
    a: `Irrigation Best Practices:\n⏰ Best time: Early morning (5–8 AM) or evening (5–7 PM)\n❌ Avoid midday irrigation — 30% water lost to evaporation\n\n🧪 Check soil: Insert finger 5cm deep — if dry, irrigate now\n\n💧 Methods:\n• Drip: Saves 40–50% water, best for vegetables & fruit\n• Sprinkler: Good for wheat, groundnut\n• Flood: Rice and sugarcane only\n\n📊 Water needs (mm/season):\n• Rice: 1200–1500 | Wheat: 400–500 | Cotton: 600–700\n• Vegetables: 300–500 | Sugarcane: 1500–2500`
  },
  {
    keywords: ['soil moisture', 'dry soil', 'water stress', 'wilting'],
    q: 'soil moisture management',
    a: `Soil Moisture Management:\n\n🔍 Signs of water stress:\n  • Wilting in afternoon\n  • Leaf rolling or curling\n  • Dry, cracked soil surface\n  • Yellowing lower leaves\n\n✅ Check: Push 5cm into soil — should feel moist but not wet\n\n💧 Critical irrigation stages:\n  Rice: Transplanting, tillering, flowering\n  Wheat: Crown root (21 days), jointing, grain fill\n  Cotton: Flowering, boll formation\n\n⚠️ Overwatering causes root rot and fungal disease`
  },

  // ── FERTILIZER ──────────────────────────────────────────
  {
    keywords: ['fertilizer', 'urea', 'npk', 'dap', 'nutrient', 'nitrogen', 'phosphorus'],
    q: 'fertilizer guidance',
    a: `Fertilizer Application Guide:\n\n🧪 NPK — the three essentials:\n  N (Nitrogen) = Leaf & stem growth → Urea (46%N)\n  P (Phosphorus) = Root & flower → DAP, SSP\n  K (Potassium) = Fruit quality → MOP (Muriate of Potash)\n\n📊 General rates (kg/hectare):\n  Rice: N-120, P-60, K-40\n  Wheat: N-120, P-60, K-40\n  Cotton: N-80, P-40, K-40\n  Vegetables: N-100, P-60, K-60\n\n⏱️ Split application — don't apply all at once:\n  1/2 at sowing + 1/4 at 30 days + 1/4 at flowering`
  },
  {
    keywords: ['rice fertilizer', 'paddy fertilizer', 'urea rice'],
    q: 'best fertilizer for rice',
    a: `Rice Fertilizer Schedule:\n\n🧪 Total requirement (kg/acre):\n  Urea: 55–60 kg | DAP: 27 kg | MOP: 17 kg\n\n📅 Application timing:\n  Basal (at transplanting): Full DAP + Full MOP + 1/3 Urea\n  Tillering (21–25 days): 1/3 Urea\n  Panicle initiation (45–50 days): 1/3 Urea\n\n🌿 Micronutrients:\n  Zinc sulfate 25 kg/hectare — critical for high yield\n  Apply 1 week before transplanting or as basal\n\n💡 FYM/compost 5 tonnes/hectare reduces chemical need by 25%`
  },

  // ── DISEASE & PESTS ─────────────────────────────────────
  {
    keywords: ['yellow leaves', 'yellowing', 'pale leaves', 'chlorosis'],
    q: 'yellow leaves on plants',
    a: `Yellow Leaves — Diagnosis:\n\n1️⃣ Nitrogen deficiency (most common)\n   → Starts from older/lower leaves upward\n   → Fix: Apply urea 20 kg/acre as topdressing\n\n2️⃣ Overwatering / waterlogging\n   → Roots can't absorb oxygen\n   → Fix: Improve drainage, reduce irrigation frequency\n\n3️⃣ Iron deficiency (interveinal chlorosis)\n   → Yellow between green veins on young leaves\n   → Fix: Ferrous sulfate 0.5% spray\n\n4️⃣ Disease (mosaic virus, blast)\n   → Irregular yellow patches with spots\n   → Fix: Remove infected plants, contact KVK\n\n5️⃣ Pest damage (mites, aphids)\n   → Yellow stippling or curling\n   → Fix: Neem oil spray weekly`
  },
  {
    keywords: ['pest', 'insect', 'bug', 'aphid', 'whitefly', 'borer', 'pest control'],
    q: 'pest control methods',
    a: `Integrated Pest Management (IPM):\n\n🌿 Organic/Biological methods:\n  → Neem oil 3–5 ml/litre — spray every 7–10 days\n  → Garlic-chili spray: 100g garlic + 50g chili in 10L water\n  → Marigold border planting repels pests naturally\n  → Release Trichogramma cards for borer control\n  → Yellow sticky traps for whitefly/aphid monitoring\n\n🧪 Chemical (use only when necessary):\n  → Chlorpyrifos for stem borers\n  → Imidacloprid for sucking pests\n  → Always follow label dose — less is more\n\n📋 Scout fields every week — early detection saves crops`
  },
  {
    keywords: ['fungal', 'blight', 'rust', 'mold', 'mildew', 'disease', 'spots on leaves'],
    q: 'fungal disease management',
    a: `Fungal Disease Management:\n\n🍄 Common fungal diseases:\n  Early Blight (Alternaria) — brown spots with rings\n  Late Blight — water-soaked gray-green patches\n  Powdery Mildew — white powder on leaves\n  Rust — orange/brown pustules\n\n🛡️ Prevention (most important):\n  → Avoid overhead irrigation — use drip\n  → Maintain plant spacing for air circulation\n  → Remove and burn infected plant material\n  → Rotate crops — don't grow same family twice\n\n💊 Treatment:\n  Mancozeb 75WP: 2.5 g/litre — broad spectrum\n  Carbendazim: 1 g/litre — systemic fungicide\n  Copper oxychloride: 3 g/litre — organic approved`
  },

  // ── HARVEST & STORAGE ───────────────────────────────────
  {
    keywords: ['harvest', 'when to harvest', 'maturity', 'ready to pick'],
    q: 'when to harvest crops',
    a: `Harvest Maturity Indicators:\n\n🌾 Grains (Rice/Wheat):\n  → 80–85% of grains golden/mature\n  → Moisture: 18–22% for harvest, dry to 12–14% for storage\n  → Test: Bite a grain — hard without milky substance\n\n🍅 Tomato/Vegetables:\n  → Harvest at "breaker stage" (turning color) for transport\n  → Full red for local market\n  → Morning harvest when temperatures are cool\n\n🧅 Onion:\n  → Tops fall over naturally (neck fall) — 70–80% fallen\n  → Lift and cure in shade for 2 weeks before storage\n\n🌽 Maize:\n  → Husk yellowing, silk drying, thumbnail test on grain`
  },
  {
    keywords: ['storage', 'store', 'godown', 'silo', 'grain storage', 'post harvest'],
    q: 'crop storage methods',
    a: `Post-Harvest Storage Guide:\n\n📦 Grain storage basics:\n  → Dry grain to <12% moisture before storage\n  → Clean and disinfect storage area (spray malathion)\n  → Use hermetic bags (PICS bags) — no insecticide needed\n  → Store in cool, dry, well-ventilated area\n\n🛡️ Pest prevention:\n  → Aluminum phosphide (celphos) tablets — 1 tablet per tonne\n  → Never mix old and new stock\n  → Check monthly for weevils, molds\n\n🥦 Vegetable storage:\n  → Cool chain: 2–8°C for most vegetables\n  → Onion/potato: 10–15°C, humidity 70–80%\n  → Use shade net covered storage in rural areas`
  },

  // ── WEATHER & SEASON ─────────────────────────────────────
  {
    keywords: ['monsoon', 'rain', 'kharif', 'rainy season'],
    q: 'kharif season monsoon farming',
    a: `Kharif Season Guide (June–November):\n\n📅 Sowing window: June 1st–July 15th (after first rain)\n\n🌱 Kharif crops:\n  Rice, Maize, Cotton, Soybean, Groundnut\n  Bajra, Jowar, Arhar (Tur Dal), Moong\n\n⚠️ Monsoon precautions:\n  → Ensure good drainage — waterlogging kills roots in 48 hours\n  → Pre-monsoon soil preparation is critical\n  → Avoid fertilizer application just before heavy rain\n  → Watch for fungal disease in high humidity\n  → Keep field bunds ready to retain water for rice\n\n💡 Store seeds and fertilizers in dry, elevated place before monsoon`
  },
  {
    keywords: ['rabi', 'winter', 'winter crop', 'cold'],
    q: 'rabi season farming',
    a: `Rabi Season Guide (October–March):\n\n📅 Sowing: October–November\n🌾 Crops: Wheat, Mustard, Gram (Chana), Peas, Potato, Sunflower\n\n💧 Irrigation critical — no monsoon rain:\n  Wheat: 4–6 irrigations at specific growth stages\n  Gram: 1–2 irrigations only (drought tolerant)\n\n🌡️ Temperature tips:\n  → Cold nights increase sugar in wheat — good for quality\n  → Frost risk: cover nurseries, irrigate before frost\n  → Watch for aphids in February on mustard\n\n📊 Wheat needs zero-till seeding for water saving`
  },

  // ── GOVERNMENT SCHEMES ──────────────────────────────────
  {
    keywords: ['pm kisan', 'subsidy', 'government scheme', 'msp', 'loan', 'kcc', 'kisan credit'],
    q: 'government schemes for farmers',
    a: `Key Government Schemes for Farmers:\n\n💰 PM-KISAN:\n  → ₹6,000/year in 3 installments\n  → Register at pmkisan.gov.in\n\n🏦 Kisan Credit Card (KCC):\n  → Loan up to ₹3 lakh at 4% interest\n  → Apply at nearest bank or cooperative\n\n📊 MSP (Minimum Support Price):\n  → Govt guaranteed price for 23 crops\n  → Sell at APMC mandi for MSP protection\n\n🌾 PM Fasal Bima Yojana:\n  → Crop insurance — premium 1.5–2% of sum insured\n  → Register before sowing through bank\n\n🌱 Soil Health Card: Free soil testing every 2 years\n📞 Helpline: 1800-180-1551 (Kisan Call Centre)`
  },

  // ── ORGANIC & NATURAL ────────────────────────────────────
  {
    keywords: ['organic', 'natural farming', 'jeevamrit', 'zero budget', 'zbnf'],
    q: 'organic and natural farming',
    a: `Zero Budget Natural Farming (ZBNF) / Organic:\n\n🐄 Jeevamrut (liquid biofertilizer):\n  → 10 kg desi cow dung + 10L cow urine\n  → 2 kg jaggery + 2 kg flour + 1 handful soil\n  → Mix in 200L water, ferment 48 hours\n  → Apply 200L/acre monthly\n\n🌿 Bijamrit (seed treatment):\n  → 5L water + 250g cow dung + 250ml cow urine\n  → Soak seeds for 6 hours before sowing\n\n🌱 Mulching:\n  → Cover soil with dry biomass/straw\n  → Reduces watering by 50%, prevents weeds\n\n🪱 Whapasa (moisture management):\n  → Maintain 50% water + 50% air in soil\n  → Never let soil go completely dry or waterlogged`
  },

  // ── SOIL & WEATHER ───────────────────────────────────────
  {
    keywords: ['temperature', 'hot weather', 'heat stress', 'summer farming'],
    q: 'managing heat stress in crops',
    a: `Heat Stress Management:\n\n🌡️ Signs: Wilting, leaf burn edges, blossom drop, small fruits\n\n✅ Immediate actions:\n  → Irrigate before 8 AM — not in afternoon heat\n  → Apply mulch to keep soil cool\n  → Spray kaolin clay or reflective mulch\n  → Apply potassium (K) fertilizer — improves heat tolerance\n\n🌱 Long-term:\n  → Choose heat-tolerant varieties\n  → Use shade nets (30–50%) for vegetables in summer\n  → Wind breaks to reduce hot wind damage\n  → Time planting to avoid peak heat periods`
  },
  {
    keywords: ['rain forecast', 'weather forecast', 'forecast', 'tomorrow weather'],
    q: 'weather forecast for farming',
    a: `Farm Weather Tips:\n\n📱 Online forecast sources:\n  → Meghdoot App (India Meteorological Dept) — 5-day forecast\n  → Mausam App — block level forecast\n  → KisanCall: 1800-180-1551\n\n🌡️ Key readings to watch:\n  → Humidity >80% + rain → fungal disease risk\n  → Wind >30 kmph → delay spraying\n  → Temperature <10°C → frost risk for vegetables\n  → Barometric pressure falling fast → storm coming\n\n⚠️ Don't spray pesticides/fertilizers:\n  → Within 48 hours of predicted rain\n  → In afternoon (evaporates fast)\n  → When wind speed >15 kmph`
  },

  // ── MARKET ──────────────────────────────────────────────
  {
    keywords: ['sell', 'market', 'price', 'mandi', 'sell crop', 'market rate'],
    q: 'where and when to sell crops',
    a: `Marketing Your Crop:\n\n🏪 Where to sell:\n  → APMC Mandi: Government regulated, transparent pricing\n  → eNAM: Online mandi — national.agrimarket.gov.in\n  → FPO: Farmer Producer Organizations — better collective bargaining\n  → Direct to buyer: Contract farming (pre-agreed price)\n\n⏰ When to sell:\n  → Avoid selling immediately after harvest (lowest prices)\n  → Wait 30–60 days if storage available\n  → Sell perishables within 2–3 days of harvest\n\n💡 Price check:\n  → Agmarknet.gov.in — live mandi prices\n  → WhatsApp group with local traders\n  → State government price helpline`
  },
  {
    keywords: ['fpo', 'farmer group', 'cooperative', 'kisan samiti'],
    q: 'farmer producer organizations',
    a: `Farmer Producer Organizations (FPOs):\n\n🤝 Benefits of joining FPO:\n  → Collective bargaining — better prices\n  → Shared equipment (tractors, threshers) — lower cost\n  → Bulk purchase of inputs at discount\n  → Access to credit and government schemes\n  → Market linkage to supermarkets, processors\n\n📋 How to join/form FPO:\n  → Minimum 10 farmers required to register\n  → Register under Companies Act or Cooperative Act\n  → NABARD provides ₹15 lakh grant support\n  → Contact your district agriculture officer`
  },

  // ── BASIC HELP ───────────────────────────────────────────
  {
    keywords: ['help', 'what can you do', 'what can you answer', 'topics', 'ask'],
    q: 'what can you help with',
    a: `I can help you with (offline mode):\n\n🌾 Crops: Rice, Wheat, Cotton, Tomato, Onion, Potato, Maize, Pulses\n🌱 Soil: pH, soil types, organic matter, soil testing\n💧 Water: Irrigation timing, drip, water stress\n🧪 Fertilizer: NPK, urea, DAP, application timing\n🐛 Pests: IPM, neem oil, biological control\n🍄 Disease: Fungal, bacterial, viral disease management\n🌡️ Weather: Heat stress, frost, monsoon farming\n🏛️ Schemes: PM-KISAN, KCC, MSP, Fasal Bima\n📦 Post-harvest: Storage, marketing, FPO\n\n⚠️ Connect to internet for: Live prices, AI conversation, disease image scan`
  }
];

// ── Keyword-based matching engine ──────────────────────────
function findBestMatch(userInput: string): QAPair | null {
  const input = userInput.toLowerCase().trim();
  
  let bestScore = 0;
  let bestMatch: QAPair | null = null;

  for (const qa of FARMING_QA) {
    let score = 0;
    for (const keyword of qa.keywords) {
      if (input.includes(keyword)) {
        // Longer keyword match = higher score
        score += keyword.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = qa;
    }
  }

  // Return match only if score is meaningful
  return bestScore >= 3 ? bestMatch : null;
}

export async function chatOffline(userQuestion: string): Promise<string> {
  const match = findBestMatch(userQuestion);
  
  if (match) {
    return match.a;
  }

  // Fallback with topic suggestions
  return `I don't have specific information on that in offline mode.\n\nTry asking about:\n• Crop selection (rice, wheat, cotton, tomato, onion)\n• Soil pH and soil health\n• Irrigation timing and methods\n• Fertilizer (urea, NPK, DAP)\n• Pest control and disease management\n• Government schemes (PM-KISAN, MSP, KCC)\n• Harvest timing and storage\n• Market prices and FPOs\n\n🌐 Connect to internet for full AI chat — I can answer anything when online!`;
}

export async function loadOfflineChat(): Promise<boolean> {
  // No model to load — keyword engine is instant
  return true;
}
