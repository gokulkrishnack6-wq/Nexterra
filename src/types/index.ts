// ==============================================================================
// GREENLOOP TYPE DEFINITIONS
// ==============================================================================

export type UserRole = 
  | 'individual'
  | 'business'
  | 'farmer'
  | 'recycler'
  | 'ngo'
  | 'admin';

export type ListingStatus = 
  | 'active'
  | 'pending'
  | 'completed'
  | 'cancelled'
  | 'expired';

export type ListingPricing = 
  | 'free'
  | 'exchange'
  | 'sale';

export type ExchangeStatus = 
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'completed';

export type EcoPointsAction = 
  | 'signup_bonus'
  | 'listing_created'
  | 'exchange_completed'
  | 'challenge_completed'
  | 'verified_donation'
  | 'daily_streak'
  | 'referral';

export type OperatorType = 
  | 'haritha_karma_sena'
  | 'clean_kerala_company'
  | 'municipality_mcf'
  | 'private_recycler'
  | 'ngo_collection_hub';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: UserRole;
  organization_name?: string;
  address?: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  avatar_url?: string;
  bio?: string;
  eco_points_balance: number;
  is_verified: boolean;
  created_at: string;
  updated_at?: string;
}

export interface WasteCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  is_organic: boolean;
  recyclability_score: number;
  standard_unit: string;
  default_co2_factor: number;
  default_landfill_factor: number;
}

export interface ListingImage {
  id: string;
  listing_id: string;
  image_url: string;
  is_primary: boolean;
}

export interface WasteListing {
  id: string;
  user_id: string;
  category_id: string;
  title: string;
  description: string;
  material_type: string;
  quantity: number;
  unit: string;
  listing_type: ListingPricing;
  price?: number;
  condition: string;
  district: string;
  locality: string;
  address?: string;
  latitude: number;
  longitude: number;
  status: ListingStatus;
  ai_classified?: boolean;
  ai_confidence?: number;
  suggested_action?: string;
  expiry_date?: string;
  created_at: string;
  updated_at?: string;
  // Joins
  category?: WasteCategory;
  user?: UserProfile;
  images?: string[];
}

export interface ExchangeRequest {
  id: string;
  listing_id: string;
  requester_id: string;
  proposed_action: string;
  requested_quantity: number;
  message?: string;
  status: ExchangeStatus;
  pickup_date?: string;
  completion_code: string;
  created_at: string;
  updated_at?: string;
  // Joins
  listing?: WasteListing;
  requester?: UserProfile;
}

export interface Transaction {
  id: string;
  listing_id: string;
  exchange_request_id: string;
  generator_id: string;
  recipient_id: string;
  category_id: string;
  quantity: number;
  unit: string;
  co2_saved_kg: number;
  landfill_saved_kg: number;
  eco_points_awarded: number;
  verified_by_recipient: boolean;
  notes?: string;
  completed_at: string;
  // Joins
  listing?: WasteListing;
  generator?: UserProfile;
  recipient?: UserProfile;
  category?: WasteCategory;
}

export interface EcoPointRecord {
  id: string;
  user_id: string;
  points: number;
  action_type: EcoPointsAction;
  reference_id?: string;
  description: string;
  created_at: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  target_kg: number;
  current_kg: number;
  category_id?: string;
  reward_points: number;
  start_date: string;
  end_date: string;
  banner_url?: string;
  district: string;
  status: 'active' | 'upcoming' | 'completed';
  created_by?: string;
  created_at: string;
  category?: WasteCategory;
  is_participating?: boolean;
  user_progress_kg?: number;
}

export interface RecyclingCentre {
  id: string;
  name: string;
  operator_type: OperatorType;
  district: string;
  locality: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  email?: string;
  accepted_categories: string[];
  operating_hours: string;
  is_verified: boolean;
  rating: number;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'request' | 'match' | 'system' | 'points' | 'challenge';
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface AIScanResult {
  detected_material: string;
  category_slug: string;
  category_name: string;
  confidence: number;
  suggested_action: 'composting' | 'upcycling' | 'recycling' | 'safe_disposal' | 'bio_methanation';
  reasoning: string;
  recyclability_score: number;
  estimated_weight_range: string;
  safety_guidance: string[];
  circular_value_tips: string[];
  potential_matches_summary: string;
}

export interface SmartMatchResult {
  listing: WasteListing;
  match_score: number; // 0 - 100
  distance_km: number;
  factors: {
    category_fit: number;
    location_proximity: number;
    quantity_suitability: number;
    circular_impact: number;
  };
  recommendation_reason: string;
}

export interface PublicWasteBin {
  id: string;
  name: string;
  bin_type: 'organic_bio' | 'plastic_bottle' | 'e_waste_kiosk' | 'segregated_smart';
  district: string;
  locality: string;
  address: string;
  latitude: number;
  longitude: number;
  fill_percentage: number;
  last_serviced: string;
  status: 'active' | 'full' | 'maintenance';
  managed_by: string;
}

export interface EnvironmentalReport {
  id: string;
  ticket_number: string;
  reporter_id: string;
  reporter_name: string;
  issue_type: 'overflowing_bin' | 'illegal_dumping' | 'plastic_burning' | 'water_pollution';
  title: string;
  description: string;
  district: string;
  ward: string;
  locality: string;
  landmark: string;
  latitude: number;
  longitude: number;
  photo_url?: string;
  status: 'pending' | 'in_progress' | 'resolved';
  assigned_team?: string;
  assigned_vehicle?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SustainabilityMetrics {
  total_waste_diverted_kg: number;
  total_co2e_avoided_kg: number;
  total_methane_avoided_kg: number;
  total_landfill_area_saved_sqm: number;
  total_active_listings: number;
  total_completed_exchanges: number;
  total_ecopoints_circulated: number;
  category_breakdown: {
    category_name: string;
    diverted_kg: number;
    percentage: number;
  }[];
  monthly_trend: {
    month: string;
    diverted_kg: number;
    co2e_saved_kg: number;
  }[];
}

