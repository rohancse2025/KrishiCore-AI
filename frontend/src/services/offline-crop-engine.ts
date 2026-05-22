import { CROP_DATABASE, CropData } from '../data/offline-crop-database';

export interface Recommendation {
  crop: string;
  score: number; // 0-100
  reason: string[];
}

function normalizeRange(value: number, range: [number, number]) {
  const [min, max] = range;
  if (value <= min) return 0;
  if (value >= max) return 1;
  return (value - min) / (max - min);
}

export function recommendCropsOffline(input: {
  soilN: number; soilP: number; soilK: number; pH: number;
  temperature?: number; humidity?: number; rainfall?: number;
  preferred_seasons?: string[];
}): Recommendation[] {
  const { soilN, soilP, soilK, pH, temperature = 25, humidity = 60, rainfall = 100, preferred_seasons = [] } = input;

  const scored: Recommendation[] = CROP_DATABASE.map((c: CropData) => {
    let score = 0;
    const reasons: string[] = [];

    // NPK matching: each weighted 30%
    const nScore = normalizeRange(soilN, c.conditions.N);
    const pScore = normalizeRange(soilP, c.conditions.P);
    const kScore = normalizeRange(soilK, c.conditions.K);
    const nkScore = (nScore + pScore + kScore) / 3;
    score += nkScore * 60; // 60 points
    reasons.push(`NPK match ${(nkScore*100).toFixed(0)}%`);

    // pH match 15%
    const phRange = c.conditions.pH;
    const phScore = normalizeRange(pH, phRange);
    score += phScore * 15;
    reasons.push(`pH match ${(phScore*100).toFixed(0)}%`);

    // climate match 15%: temperature/humidity/rainfall
    const tScore = normalizeRange(temperature, c.conditions.temperature);
    const hScore = normalizeRange(humidity, c.conditions.humidity);
    const rScore = normalizeRange(rainfall, c.conditions.rainfall);
    const climateScore = (tScore + hScore + rScore) / 3;
    score += climateScore * 15;
    reasons.push(`Climate match ${(climateScore*100).toFixed(0)}%`);

    // season preference boost
    const seasonBoost = preferred_seasons.some(s => c.season.includes(s)) ? 5 : 0;
    score += seasonBoost;
    if (seasonBoost) reasons.push('Season matches preference');

    // cap and convert
    const finalScore = Math.round(Math.min(100, score));
    return { crop: c.name, score: finalScore, reason: reasons };
  });

  // sort desc
  scored.sort((a,b) => b.score - a.score);
  return scored.slice(0, 10);
}
