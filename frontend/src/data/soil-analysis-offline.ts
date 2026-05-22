export interface SoilAnalysisResult {
  overall_health: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  health_score: number;
  ph_status: string;
  nitrogen_status: string;
  phosphorus_status: string;
  potassium_status: string;
  recommendations: string[];
  amendments: string[];
  suitable_crops: string[];
  avoid_crops: string[];
}

export function analyzeSoilOffline(
  N: number, P: number, K: number, pH: number
): SoilAnalysisResult {
  const getNitrogenScore = (n: number): number => {
    if (n < 20) return 5;
    if (n < 40) return 10;
    if (n >= 40 && n <= 80) return 25;
    if (n <= 120) return 20;
    return 10;
  };

  const getPhosphorusScore = (p: number): number => {
    if (p < 15) return 5;
    if (p < 30) return 10;
    if (p >= 30 && p <= 60) return 25;
    if (p <= 80) return 20;
    return 15;
  };

  const getPotassiumScore = (k: number): number => {
    if (k < 20) return 5;
    if (k < 40) return 10;
    if (k >= 40 && k <= 80) return 25;
    if (k <= 120) return 20;
    return 15;
  };

  const getPhScore = (ph: number): number => {
    if (ph < 4.5 || ph > 9.0) return 0;
    if (ph < 5.5 || ph > 8.0) return 5;
    if (ph < 6.0 || ph > 7.5) return 15;
    if (ph >= 6.0 && ph <= 7.5) return 25;
    return 10;
  };

  const score = getNitrogenScore(N) + getPhosphorusScore(P) +
                getPotassiumScore(K) + getPhScore(pH);

  const getNitrogenStatus = (n: number) =>
    n < 20 ? 'Very Low - add nitrogen fertilizer urgently' :
    n < 40 ? 'Low - needs nitrogen supplementation' :
    n <= 80 ? 'Optimal - good for most crops' :
    n <= 120 ? 'High - reduce nitrogen application' :
    'Very High - excess may burn plants';

  const getPhosphorusStatus = (p: number) =>
    p < 15 ? 'Very Low - add phosphorus fertilizer' :
    p < 30 ? 'Low - needs phosphorus' :
    p <= 60 ? 'Optimal - good phosphorus level' :
    'High - reduce phosphate application';

  const getPotassiumStatus = (k: number) =>
    k < 20 ? 'Very Low - add potash urgently' :
    k < 40 ? 'Low - needs potassium' :
    k <= 80 ? 'Optimal - good potassium' :
    'High - reduce MOP application';

  const getPhStatus = (ph: number) =>
    ph < 5.5 ? 'Acidic - apply lime to raise pH' :
    ph < 6.0 ? 'Slightly Acidic - suitable for tea, coffee' :
    ph <= 7.0 ? 'Neutral - ideal for most crops' :
    ph <= 7.5 ? 'Slightly Alkaline - suitable for most crops' :
    'Alkaline - apply sulfur or gypsum';

  const health: SoilAnalysisResult['overall_health'] =
    score >= 80 ? 'Excellent' :
    score >= 60 ? 'Good' :
    score >= 40 ? 'Fair' : 'Poor';

  const recs: string[] = [];
  if (N < 40) recs.push('Apply Urea or DAP to increase nitrogen');
  if (P < 30) recs.push('Apply Single Super Phosphate (SSP) @ 50kg/acre');
  if (K < 40) recs.push('Apply MOP (Muriate of Potash) @ 25kg/acre');
  if (pH < 5.5) recs.push('Apply agricultural lime @ 200kg/acre');
  if (pH > 8.0) recs.push('Apply gypsum or sulfur to reduce pH');
  if (N > 120) recs.push('Avoid nitrogen fertilizers for 1 season');
  if (score > 70) recs.push('Add FYM 2 tonnes/acre to maintain organic matter');

  const amendments: string[] = [];
  if (pH < 5.5) amendments.push('Lime: 200-400 kg/acre');
  if (pH > 8.0) amendments.push('Gypsum: 200 kg/acre');
  if (N < 40) amendments.push('Urea: 25-50 kg/acre');
  if (P < 30) amendments.push('DAP: 25-50 kg/acre');
  if (K < 40) amendments.push('MOP: 25 kg/acre');
  if (score < 60) amendments.push('FYM/Compost: 3-5 tonnes/acre');

  const suitable: string[] = [];
  const avoid: string[] = [];

  if (pH >= 5.5 && pH <= 7.0 && N >= 60) suitable.push('Rice', 'Maize');
  if (pH >= 6.0 && pH <= 7.5) suitable.push('Wheat', 'Onion', 'Garlic');
  if (pH >= 5.5 && pH <= 7.0 && K >= 40) suitable.push('Tomato', 'Potato');
  if (pH >= 5.5 && pH <= 7.0) suitable.push('Cotton', 'Soybean');
  if (pH < 5.5) { avoid.push('Wheat', 'Cotton'); suitable.push('Tea', 'Coffee'); }
  if (pH > 8.0) { avoid.push('Potato', 'Blueberry'); }
  if (N < 20) avoid.push('Heavy feeders like Maize, Sugarcane');

  return {
    overall_health: health,
    health_score: score,
    ph_status: getPhStatus(pH),
    nitrogen_status: getNitrogenStatus(N),
    phosphorus_status: getPhosphorusStatus(P),
    potassium_status: getPotassiumStatus(K),
    recommendations: recs.length > 0 ? recs : ['Soil is healthy, maintain current practices'],
    amendments: amendments.length > 0 ? amendments : ['No amendments needed'],
    suitable_crops: [...new Set(suitable)].slice(0, 6),
    avoid_crops: [...new Set(avoid)].slice(0, 4)
  };
}
