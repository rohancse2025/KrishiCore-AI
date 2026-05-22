export interface FertilizerPlan {
  crop: string;
  recommendedN: number;
  recommendedP: number;
  recommendedK: number;
  schedule: string[];
  estimated_cost: string;
}

const FERTILIZER_DATABASE: Record<string, {N:number,P:number,K:number,notes?:string, costPerKg?:number}> = {
  Rice: { N: 100, P: 50, K: 50, notes: 'Split nitrogen into 3 applications', costPerKg: 40 },
  Wheat: { N: 80, P: 50, K: 50, notes: 'Split nitrogen into 2 applications', costPerKg: 35 },
  Maize: { N: 110, P: 45, K: 45, notes: 'Top dress at knee high', costPerKg: 38 },
  Tomato: { N: 100, P: 80, K: 80, notes: 'Use balanced NPK and micro-nutrients', costPerKg: 50 },
  Potato: { N: 120, P: 70, K: 120, notes: 'Higher potassium for tuber quality', costPerKg: 42 },
  Cotton: { N: 90, P: 60, K: 60, notes: 'Apply boron at boll formation', costPerKg: 44 },
  Maize_silage: { N: 90, P: 40, K: 60, costPerKg: 38 }
};

export function calculateFertilizerOffline(crop: string, area_acres = 1): FertilizerPlan {
  const rec = FERTILIZER_DATABASE[crop] || FERTILIZER_DATABASE['Maize'];
  const N = Math.round(rec.N * area_acres);
  const P = Math.round(rec.P * area_acres);
  const K = Math.round(rec.K * area_acres);

  const schedule = [
    `Basal: ${Math.round((N*0.4))}N + ${(P)}P + ${Math.round((K*0.3))}K`,
    `Top dress 1: ${Math.round((N*0.3))}N after 30 days`,
    `Top dress 2: ${Math.round((N*0.3))}N at flowering`
  ];

  const estimated_cost = rec.costPerKg ? `₹${Math.round((N+P+K) * rec.costPerKg)}` : 'Varies';

  return {
    crop,
    recommendedN: N,
    recommendedP: P,
    recommendedK: K,
    schedule,
    estimated_cost
  };
}
