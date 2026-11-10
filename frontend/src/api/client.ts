/**
 * WishWell Typed API Client
 *
 * Implements strict in-memory token storage (avoiding persistent localStorage)
 * with sessionStorage fallback for page refresh resilience during technical evaluation/demos.
 * Handles HTTP 409 Conflict, validation errors, and typed response extraction.
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

// In-Memory Token Reference (Kept out of localStorage per security brief)
let _inMemoryToken: string | null = null;

// Initialize from sessionStorage if available (tab-scoped, cleared on close)
try {
  _inMemoryToken = sessionStorage.getItem('wishwell_session_token');
} catch {
  _inMemoryToken = null;
}

export const getAuthToken = (): string | null => _inMemoryToken;

export const setAuthToken = (token: string | null): void => {
  _inMemoryToken = token;
  try {
    if (token) {
      sessionStorage.setItem('wishwell_session_token', token);
    } else {
      sessionStorage.removeItem('wishwell_session_token');
    }
  } catch {
    // Graceful fallback for restricted environments
  }
};

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export class DuplicateWishError extends ApiError {
  similarWishes: Array<{ id: number; title: string; item_name: string; similarity_score: number }>;

  constructor(message: string, similarWishes: any[]) {
    super(409, message, { similarWishes });
    this.name = 'DuplicateWishError';
    this.similarWishes = similarWishes;
  }
}

export class OverClaimError extends ApiError {
  constructor(message: string) {
    super(409, message);
    this.name = 'OverClaimError';
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...customConfig } = options;

  let url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const token = getAuthToken();
  const defaultHeaders: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (!(customConfig.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...customConfig,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
  });

  if (!response.ok) {
    let errorDetail = 'An unexpected error occurred.';
    let errorData: any = null;

    try {
      errorData = await response.json();
      if (errorData.detail) {
        if (typeof errorData.detail === 'string') {
          errorDetail = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          errorDetail = errorData.detail.map((err: any) => err.msg || JSON.stringify(err)).join(', ');
        } else if (typeof errorData.detail === 'object' && errorData.detail.warning) {
          errorDetail = errorData.detail.warning;
        }
      }
    } catch {
      errorDetail = response.statusText || errorDetail;
    }

    // Specific 409 Conflict Sub-Types
    if (response.status === 409) {
      if (errorData?.detail?.similar_wishes) {
        throw new DuplicateWishError(errorDetail, errorData.detail.similar_wishes);
      }
      throw new OverClaimError(errorDetail);
    }

    throw new ApiError(response.status, errorDetail, errorData);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

