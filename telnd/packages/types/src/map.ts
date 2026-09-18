export interface MapPin {
  id: string;
  targetType: MapPinType;
  targetId: string;
  lat: number;
  lng: number;
  address?: string;
  area?: string;
  city?: string;
  country: string;
  isExact: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type MapPinType = 'job' | 'merchant' | 'tutor' | 'creator' | 'company';

export interface MapFilters {
  type?: MapPinType[];
  city?: string;
  area?: string;
  radius?: number;
  category?: string;
  priceRange?: [number, number];
  rating?: number;
}

export interface MapSearchParams {
  query?: string;
  lat?: number;
  lng?: number;
  zoom?: number;
  filters?: MapFilters;
}

export interface GeocodingResult {
  address: string;
  lat: number;
  lng: number;
  country?: string;
  city?: string;
  area?: string;
  components?: Record<string, unknown>;
}

export interface MapCluster {
  id: string;
  lat: number;
  lng: number;
  count: number;
  pins: MapPin[];
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}
