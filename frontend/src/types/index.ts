export type UserRole = 'institution' | 'donor' | 'verifier' | 'admin';

export type InstitutionStatus = 'pending' | 'recommended' | 'verified' | 'rejected';

export type WishStatus = 'open' | 'partially_claimed' | 'claimed' | 'delivered' | 'expired' | 'cancelled';

export type ClaimStatus = 'active' | 'delivered' | 'released' | 'expired';

export type DeliveryStatus = 'in_transit' | 'delivered' | 'confirmed' | 'failed';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface Institution {
  id: number;
  user_id: number;
  name: string;
  registration_number: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  phone: string;
  website_url?: string;
  description?: string;
  status: InstitutionStatus;
  created_at?: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface Wish {
  id: number;
  institution_id: number;
  category_id: number;
  title: string;
  description: string;
  item_name: string;
  qty_requested: number;
  needed_by: string;
  status: WishStatus;
  created_at: string;
  updated_at?: string;
  category_name?: string;
  institution_name?: string;
}

export interface OpenWishViewItem {
  wish_id: number;
  wish_title: string;
  item_name: string;
  wish_description: string;
  qty_requested: number;
  qty_claimed: number;
  qty_remaining: number;
  needed_by: string;
  wish_status: WishStatus;
  category_id: number;
  category_name: string;
  institution_id: number;
  institution_name: string;
  institution_city: string;
  institution_state: string;
}

export interface WishClaim {
  id: number;
  wish_id: number;
  donor_id: number;
  qty: number;
  deadline: string;
  status: ClaimStatus;
  created_at: string;
  updated_at?: string;
  wish_title?: string;
  item_name?: string;
  institution_name?: string;
  institution_city?: string;
  needed_by?: string;
}

export interface Delivery {
  id: number;
  wish_claim_id: number;
  wish_id?: number;
  donor_id?: number;
  institution_id?: number;
  tracking_number?: string;
  proof_photo_blob_name?: string;
  proof_photo_sas_url?: string;
  status: 'pending_confirmation' | 'confirmed';
  created_at: string;
  confirmed_at?: string;
  item_name?: string;
  qty?: number;
  wish_title?: string;
}

export interface ThankYouNote {
  id: number;
  delivery_id: number;
  message: string;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface InstitutionDocument {
  id: number;
  institution_id: number;
  document_type: string;
  blob_name: string;
  original_filename: string;
  file_size_bytes: number;
  sas_url?: string;
  created_at: string;
}

export interface VerificationSummary {
  institution_id: number;
  name: string;
  registration_number: string;
  city: string;
  state: string;
  status: InstitutionStatus;
  documents: InstitutionDocument[];
  recommendation?: {
    recommended_by: number;
    recommended_at: string;
    reason: string;
  };
}

export interface DuplicateCheckWarning {
  warning: string;
  similar_wishes: Array<{
    id: number;
    title: string;
    item_name: string;
    similarity_score: number;
  }>;
}

export interface DonorImpactData {
  total_wishes_fulfilled: number;
  total_items_delivered: number;
  institutions_helped_count: number;
  items_by_category: Array<{
    category_id: number;
    category_name: string;
    total_quantity: number;
  }>;
  institutions_helped: Array<{
    institution_id: number;
    institution_name: string;
    city: string;
    state: string;
    items_received: number;
  }>;
  timeline: Array<{
    date: string;
    action: string;
    description: string;
    wish_title: string;
  }>;
}

export interface MonthlyWishTrend {
  month: string;
  wishes_posted: number;
  wishes_fulfilled: number;
  fulfillment_rate_percentage: number;
}

export interface DeliveryTimeMetric {
  average_hours: number;
  average_days: number;
  total_completed_deliveries: number;
}

export interface StaleClaimMetric {
  total_claims: number;
  active_claims: number;
  delivered_claims: number;
  released_claims: number;
  expired_claims: number;
  stale_claim_rate_percentage: number;
}

export interface InstitutionStatusCount {
  status: InstitutionStatus;
  count: number;
  percentage: number;
}

export interface CategoryPerformance {
  category_id: number;
  category_name: string;
  wishes_count?: number;
  total_items_requested?: number;
  total_items_delivered?: number;
  fulfillment_rate_percentage?: number;
  total_wishes?: number;
  fulfilled_wishes?: number;
  fulfillment_rate?: number;
}

export interface AdminAnalyticsOverview {
  generated_at?: string;
  monthly_wishes?: MonthlyWishTrend[];
  monthly_trends?: MonthlyWishTrend[];
  delivery_time: DeliveryTimeMetric;
  stale_claims: StaleClaimMetric;
  institutions_by_status?: InstitutionStatusCount[];
  institution_breakdown?: InstitutionStatusCount[];
  top_categories: CategoryPerformance[];
}

export interface AuditVerificationResponse {
  is_valid: boolean;
  total_records_checked: number;
  broken_link_index: number | null;
  tampered_row_id: number | null;
  message: string;
  checked_at: string;
}

export interface AuditLogRow {
  id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  old_status?: string | null;
  new_status?: string | null;
  changed_by?: number | null;
  details?: string | null;
  prev_hash?: string | null;
  record_hash?: string | null;
  created_at: string;
}
