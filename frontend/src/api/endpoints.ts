import { apiRequest } from './client';
import {
  User,
  Institution,
  Category,
  Wish,
  OpenWishViewItem,
  WishClaim,
  Delivery,
  ThankYouNote,
  Notification,
  VerificationSummary,
  DonorImpactData,
  AdminAnalyticsOverview,
  MonthlyWishTrend,
  DeliveryTimeMetric,
  StaleClaimMetric,
  InstitutionStatusCount,
  CategoryPerformance,
  AuditVerificationResponse,
  AuditLogRow,
} from '../types';

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in_minutes: number;
  user: User;
}

export interface WishesListResponse {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  items: OpenWishViewItem[];
}

export interface WishCreatePayload {
  category_id: number;
  title: string;
  description: string;
  item_name: string;
  qty_requested: number;
  needed_by: string;
  confirm_duplicate?: boolean;
}

export const api = {
  // --- AUTH ---
  auth: {
    login: (email: string, password: string) =>
      apiRequest<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    register: (payload: {
      email: string;
      password: string;
      full_name: string;
      role: 'donor' | 'institution';
      institution_name?: string;
      registration_number?: string;
      address?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      phone?: string;
    }) =>
      apiRequest<User>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    getMe: () => apiRequest<User>('/auth/me'),
  },

  // --- WISHES ---
  wishes: {
    list: (params: {
      page?: number;
      limit?: number;
      category_id?: number;
      institution_id?: number;
      search?: string;
      needed_by_before?: string;
      needed_by_after?: string;
    }) => apiRequest<WishesListResponse>('/wishes', { params }),

    getById: (id: number) => apiRequest<Wish>(`/wishes/${id}`),

    create: (payload: WishCreatePayload) =>
      apiRequest<Wish>('/wishes', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    update: (id: number, payload: Partial<WishCreatePayload>) =>
      apiRequest<Wish>(`/wishes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),

    cancel: (id: number) =>
      apiRequest<Wish>(`/wishes/${id}`, {
        method: 'DELETE',
      }),

    getCategories: () => apiRequest<Category[]>('/categories'),
  },

  // --- CLAIMS ---
  claims: {
    claim: (wishId: number, qty: number) =>
      apiRequest<WishClaim>(`/wishes/${wishId}/claim`, {
        method: 'POST',
        body: JSON.stringify({ qty }),
      }),

    release: (claimId: number) =>
      apiRequest<WishClaim>(`/claims/${claimId}/release`, {
        method: 'POST',
      }),

    getMyClaims: () => apiRequest<WishClaim[]>('/claims/my'),
  },

  // --- DELIVERIES & NOTIFICATIONS ---
  deliveries: {
    markDelivered: (claimId: number, trackingNumber?: string) =>
      apiRequest<Delivery>(`/claims/${claimId}/deliver`, {
        method: 'POST',
        body: JSON.stringify({ tracking_number: trackingNumber || null }),
      }),

    confirmReceipt: (deliveryId: number, photoFile: File) => {
      const formData = new FormData();
      formData.append('photo', photoFile);
      return apiRequest<Delivery>(`/deliveries/${deliveryId}/confirm`, {
        method: 'POST',
        body: formData,
      });
    },

    createThankYou: (deliveryId: number, message: string) =>
      apiRequest<ThankYouNote>(`/deliveries/${deliveryId}/thank-you`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      }),

    getNotifications: () => apiRequest<Notification[]>('/notifications'),

    markNotificationRead: (id: number) =>
      apiRequest<{ message: string }>(`/notifications/${id}/read`, {
        method: 'PUT',
      }),

    getImpact: () => apiRequest<DonorImpactData>('/impact/donor'),

    getPendingDeliveriesForInstitution: () =>
      apiRequest<Delivery[]>('/deliveries/institution/pending'),
  },

  // --- VERIFICATION (Verifier & Institution Onboarding) ---
  verifications: {
    getMyInstitution: () => apiRequest<Institution>('/institutions/me'),

    uploadDocument: (file: File, documentType: string) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', documentType);
      return apiRequest<any>('/verifications/documents', {
        method: 'POST',
        body: formData,
      });
    },

    submitForVerification: () =>
      apiRequest<{ message: string }>('/verifications/submit', {
        method: 'POST',
      }),

    getPendingInstitutions: () =>
      apiRequest<VerificationSummary[]>('/verifications/pending'),

    getRecommendedInstitutions: () =>
      apiRequest<VerificationSummary[]>('/verifications/recommended'),

    recommend: (institutionId: number, reason: string) =>
      apiRequest<{ message: string }>(`/verifications/${institutionId}/recommend`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),

    approve: (institutionId: number, decision: 'verified' | 'rejected', reason: string) =>
      apiRequest<{ message: string }>(`/verifications/${institutionId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ decision, reason }),
      }),
  },

  // --- ADMIN ANALYTICS & AUDIT ---
  admin: {
    getOverview: () => apiRequest<AdminAnalyticsOverview>('/admin/analytics/overview'),
    getMonthlyTrends: () => apiRequest<MonthlyWishTrend[]>('/admin/analytics/wishes-monthly'),
    getDeliveryTimes: () => apiRequest<DeliveryTimeMetric>('/admin/analytics/delivery-times'),
    getStaleRates: () => apiRequest<StaleClaimMetric>('/admin/analytics/stale-rates'),
    getInstitutionsStatus: () => apiRequest<InstitutionStatusCount[]>('/admin/analytics/institutions-status'),
    getTopCategories: () => apiRequest<CategoryPerformance[]>('/admin/analytics/top-categories'),
    verifyAuditChain: () => apiRequest<AuditVerificationResponse>('/admin/audit/verify'),
    getAuditLogs: (limit = 50, offset = 0) =>
      apiRequest<AuditLogRow[]>('/admin/audit/logs', { params: { limit, offset } }),
    triggerStaleClaimRelease: () =>
      apiRequest<{ message: string }>('/admin/claims/release-stale', { method: 'POST' }),
  },
};

