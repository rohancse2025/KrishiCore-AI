export interface DiseaseSymptomRecord {
  disease: string;
  crop: string;
  symptoms: string[]; // free-text symptoms
  questions: string[]; // short questions for the questionnaire flow
  severity_score: number; // base severity for ranking
  recommended_action: string;
}

export const DISEASE_SYMPTOM_DATABASE: DiseaseSymptomRecord[] = [
  {
    disease: 'Late Blight',
    crop: 'Tomato',
    symptoms: ['Dark brown lesions on leaves', 'Water-soaked spots', 'White fungal growth under leaf in humid conditions', 'Fruit rot'],
    questions: ['Are there dark brown lesions on leaves?', 'Do you see white fuzzy growth on the underside of leaves?', 'Are fruits showing rot or water-soaked spots?'],
    severity_score: 90,
    recommended_action: 'Remove infected plants, improve drainage, use copper-based fungicide or recommended local fungicide.'
  },
  {
    disease: 'Early Blight',
    crop: 'Tomato',
    symptoms: ['Concentric rings on leaf spots', 'Yellowing leaves', 'Stem lesions'],
    questions: ['Do leaves have concentric ring shaped spots?', 'Are lower leaves yellowing and falling?'],
    severity_score: 70,
    recommended_action: 'Remove affected leaves, apply fungicide, rotate crops.'
  },
  {
    disease: 'Blast',
    crop: 'Rice',
    symptoms: ['Diamond shaped lesions on leaves', 'Neck rot on panicle', 'Seedling blight'],
    questions: ['Are there diamond shaped lesions on leaves?', 'Is grain formation affected?'],
    severity_score: 85,
    recommended_action: 'Use resistant varieties, timely fungicide, maintain balanced nutrition.'
  },
  {
    disease: 'Brown Plant Hopper',
    crop: 'Rice',
    symptoms: ['Stunted growth', 'Yellowing and wilting', 'BPH insects visible on leaf undersides'],
    questions: ['Do you see small brown insects on plants?', 'Are plants showing hopper burn (yellowing then wilting)?'],
    severity_score: 80,
    recommended_action: 'Flood fields, use trap plants, apply approved insecticide based on threshold.'
  },
  {
    disease: 'Rust',
    crop: 'Wheat',
    symptoms: ['Orange/brown pustules on leaves', 'Reduced tillering', 'Premature leaf senescence'],
    questions: ['Do leaves have orange or brown pustules?', 'Is there premature yellowing or leaf death?'],
    severity_score: 75,
    recommended_action: 'Plant resistant varieties, apply fungicides at early signs.'
  },
  {
    disease: 'Powdery Mildew',
    crop: 'Wheat',
    symptoms: ['White powdery patches on leaves', 'Leaf curling', 'Reduced grain fill'],
    questions: ['Are there white powdery patches on leaves?', 'Are leaves curled or distorted?'],
    severity_score: 65,
    recommended_action: 'Reduce humidity, remove affected tissues, apply sulfur or fungicide.'
  }
];
