export interface Farmer {
  id: string;
  name: string;
  phone: string;
  location: string;
  farm_size: number;
  active_crops: Crop[];
}

export interface Crop {
  id: string;
  crop_name: string;
  planted_date: string;
  area: number;
}

export interface SensorData {
  temperature: number;
  humidity: number;
  soil_moisture: number;
  timestamp: string;
}
