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
  | 'reserved'
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
  | 'referral'
  | 'reward_redeemed';

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
  whatsapp_number?: string;
  share_phone_with_exchange?: boolean;
  share_whatsapp_with_exchange?: boolean;
  role: UserRole;
  organization_name?: string;
  address?: string;
  district?: string;
  state: string;
  latitude?: number;
  longitude?: number;
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
  city?: string;
  state?: string;
  pincode?: string;
  formatted_address?: string;
  latitude: number;
  longitude: number;
  status: ListingStatus;
  ai_classified?: boolean;
  ai_confidence?: number;
  suggested_action?: string;
  expiry_date?: string;
  is_demo?: boolean;
  created_at: string;
  updated_at?: string;
  // Joins
  category?: WasteCategory;
  user?: UserProfile;
  images?: string[];
  is_ai_image?: boolean;
}

export interface ExchangeRequest {
  id: string;
  listing_id: string;
  requester_id: string;
  provider_id?: string;
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
  provider?: UserProfile;
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
  main_category?: string;
  subcategory?: string;
  confidence: number;
  is_discarded_waste?: boolean;
  item_type?: 'discarded_waste' | 'reusable_surplus' | 'new_product_or_ad' | 'active_use_item' | 'unclear';
  product_vs_waste_notes?: string;
  estimated_condition?: string;
  recovery_status?: 'reusable' | 'recyclable' | 'compostable' | 'non_recoverable' | 'not_waste';
  multiple_materials_detected?: boolean;
  material_breakdown?: Array<{ material: string; estimated_percentage: number }>;
  visible_characteristics?: string[];
  suggested_action: 'composting' | 'upcycling' | 'recycling' | 'safe_disposal' | 'bio_methanation';
  reasoning: string;
  recyclability_score: number;
  estimated_weight_range: string;
  reuse_recommendations?: string[];
  recycling_methods?: string[];
  safety_warnings?: string[];
  safety_guidance: string[];
  circular_value_tips: string[];
  potential_matches_summary: string;
  is_ambiguous?: boolean;
  ambiguity_reason?: string;
}

export interface ScanPrefillData {
  title: string;
  material_type: string;
  category_slug: string;
  category_name?: string;
  subcategory?: string;
  description: string;
  suggested_action?: string;
  recycling_method?: string;
  ai_classified: boolean;
  ai_confidence?: number;
  recyclability_score?: number;
  image_url?: string;
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

export type WasteLocationType = 'public_bin' | 'collection_centre';

export type LocationFacilityType =
  | 'mcf'
  | 'rrf'
  | 'haritha_karma_sena_hub'
  | 'segregated_smart_bin'
  | 'e_waste_kiosk'
  | 'public_litter_bin'
  | 'scrap_recycling_centre'
  | 'compost_station'
  | 'community_drop_point';

export type LocationVerificationStatus =
  | 'officially_verified'
  | 'community_verified'
  | 'community_reported'
  | 'pending_verification'
  | 'unverified';

export interface WasteLocation {
  id: string;
  name: string;
  location_type: WasteLocationType;
  facility_type: LocationFacilityType | string;
  accepted_waste_categories: string[];
  description?: string;
  address: string;
  district: string;
  municipality: string;
  pincode?: string;
  latitude: number;
  longitude: number;
  contact_number?: string;
  opening_hours?: string;
  source: string;
  source_reference?: string;
  source_information?: string;
  photo_url?: string;
  verification_status: LocationVerificationStatus;
  last_verified_at?: string;
  submitted_by?: string;
  created_at?: string;
  updated_at?: string;
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

export type EnvironmentalIssueType =
  | 'overflowing_bin'
  | 'illegal_dumping'
  | 'plastic_burning'
  | 'water_pollution'
  | 'other';

export interface EnvironmentalReport {
  id: string;
  ticket_number: string;
  reporter_id: string;
  reporter_name: string;
  issue_type: EnvironmentalIssueType;
  other_description?: string;
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

export interface Conversation {
  id: string;
  exchange_request_id: string;
  listing_id: string;
  requester_id: string;
  provider_id: string;
  status: 'active' | 'read_only' | 'archived';
  created_at: string;
  updated_at: string;
  last_message_at: string;
  listing?: WasteListing;
  requester?: UserProfile;
  provider?: UserProfile;
  exchange_request?: ExchangeRequest;
  last_message?: ChatMessage;
  unread_count?: number;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_text: string;
  message_type: 'text' | 'image' | 'system';
  created_at: string;
  updated_at?: string;
  is_edited?: boolean;
  deleted_at?: string | null;
  status?: 'sending' | 'sent' | 'failed';
  sender?: UserProfile;
}

export interface ParticipantContact {
  participant_id: string;
  phone: string | null;
  whatsapp: string | null;
  has_phone_consent: boolean;
  has_whatsapp_consent: boolean;
}


