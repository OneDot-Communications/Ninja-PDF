// frontend/app/lib/api.ts

/**
 * API helper for the frontend.
 * It reads the backend base URL from the environment variable NEXT_PUBLIC_API_URL.
 * If the variable is not set, it falls back to the hard‑coded localhost URL.
 * All requests include credentials so HttpOnly JWT cookies are sent.
 */

const DEFAULT_BACKEND_URL = "http://localhost:8000"; // hard‑coded local backend

const getBaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  return envUrl ? envUrl.replace(/\/+$/, "") : DEFAULT_BACKEND_URL;
};

/**
 * Helper for file upload requests (multipart/form-data)
 */
const uploadFile = async (endpoint: string, file: File, additionalData?: Record<string, string>): Promise<any> => {
  const formData = new FormData();
  formData.append("file", file);
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  const response = await fetch(`${getBaseUrl()}${endpoint}`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API error ${response.status}: ${errorBody}`);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }
  // For file downloads, return blob
  if (contentType && (contentType.includes("application/pdf") || contentType.includes("application/octet-stream"))) {
    return response.blob();
  }
  return response.text();
};

export const api = {
  /**
   * Generic request helper for JSON endpoints.
   */
  request: async (method: string, endpoint: string, data?: any): Promise<any> => {
    const url = `${getBaseUrl()}${endpoint}`;
    const options: RequestInit = {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    };
    if (data) {
      options.body = JSON.stringify(data);
    }
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage = errorBody;
      try {
        const jsonError = JSON.parse(errorBody);
        // Handle Django Rest Framework standard error format
        if (jsonError.non_field_errors && Array.isArray(jsonError.non_field_errors)) {
          errorMessage = jsonError.non_field_errors.join(' ');
        } else if (jsonError.detail) {
          errorMessage = jsonError.detail;
        } else if (jsonError.error) {
          errorMessage = jsonError.error;
        } else if (typeof jsonError === 'object') {
          // Fallback for object errors (values)
          errorMessage = Object.values(jsonError).flat().join(' ');
        }
      } catch (e) {
        // Not JSON, keep text
      }
      throw new Error(errorMessage || `API error ${response.status}`);
    }
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return response.json();
    }
    return response.text();
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // AUTH ENDPOINTS (/api/auth/)
  // ─────────────────────────────────────────────────────────────────────────────
  signup: (email: string, password: string, first_name?: string, last_name?: string) =>
    api.request("POST", "/api/auth/signup/", { email, password, first_name, last_name }),
  verifyOtp: (email: string, otp: string) =>
    api.request("POST", "/api/auth/verify-otp/", { email, otp }),
  login: (email: string, password: string) =>
    api.request("POST", "/api/auth/login/", { email, password }),
  logout: () => api.request("POST", "/api/auth/logout/"),
  getUser: () => api.request("GET", "/api/auth/user/"),
  updateCurrentUser: (data: any) => api.request("PATCH", "/api/auth/user/", data),
  startGoogleLogin: () => `${getBaseUrl()}/api/auth/google/`,
  refreshToken: () => api.request("POST", "/api/auth/token/refresh/"),

  // User management (admin)
  // User management (admin) - moved to bottom
  // createUser: (data: any) => api.request("POST", "/api/auth/users/", data),


  // Session management
  getSessions: () => api.request("GET", "/api/auth/sessions/"),
  revokeSession: (sessionId: number) => api.request("DELETE", `/api/auth/sessions/${sessionId}/`),

  // ─────────────────────────────────────────────────────────────────────────────
  // BILLING ENDPOINTS (/api/billing/)
  // ─────────────────────────────────────────────────────────────────────────────
  getPlans: () => api.request("GET", "/api/billing/plans/"),
  getSubscription: () => api.request("GET", "/api/billing/subscription/"),
  updateSubscription: (planSlug: string) => api.request("POST", "/api/billing/subscription/", { plan_slug: planSlug }),
  getBusinessDetails: () => api.request("GET", "/api/billing/business-details/"),
  updateBusinessDetails: (data: any) => api.request("PUT", "/api/billing/business-details/", data),
  getInvoices: () => api.request("GET", "/api/billing/invoices/"),

  // ─────────────────────────────────────────────────────────────────────────────
  // SIGNATURE ENDPOINTS (/api/signatures/)
  // ─────────────────────────────────────────────────────────────────────────────
  getSignatureStats: () => api.request("GET", "/api/signatures/requests/stats/"),
  getSignatureRequests: (mode: string = "") => api.request("GET", `/api/signatures/requests/?mode=${mode}`),
  getSignatureTemplates: () => api.request("GET", "/api/signatures/templates/"),
  getSignatureContacts: () => api.request("GET", "/api/signatures/contacts/"),

  // ─────────────────────────────────────────────────────────────────────────────
  // WORKFLOW & TASKS ENDPOINTS (/api/workflows/)
  // ─────────────────────────────────────────────────────────────────────────────
  getWorkflows: () => api.request("GET", "/api/workflows/workflows/"),
  createWorkflow: (data: any) => api.request("POST", "/api/workflows/workflows/", data),
  getTasks: () => api.request("GET", "/api/workflows/tasks/"),

  // ─────────────────────────────────────────────────────────────────────────────
  // PDF CONVERSIONS - FROM PDF (/pdf-conversions/api/)
  // ─────────────────────────────────────────────────────────────────────────────
  pdfToJpg: (file: File) => uploadFile("/pdf-conversions/api/pdf-to-jpg/", file),
  pdfToExcel: (file: File) => uploadFile("/pdf-conversions/api/pdf-to-excel/", file),
  pdfToPowerpoint: (file: File) => uploadFile("/pdf-conversions/api/pdf-to-powerpoint/", file),
  pdfToWord: (file: File) => uploadFile("/pdf-conversions/api/pdf-to-word/", file),
  pdfToPdfa: (file: File) => uploadFile("/pdf-conversions/api/pdf-to-pdfa/", file),
  pdfToHtml: (file: File) => uploadFile("/pdf-conversions/api/pdf-to-html/", file),

  // ─────────────────────────────────────────────────────────────────────────────
  // PDF CONVERSIONS - TO PDF (/to_pdf/)
  // ─────────────────────────────────────────────────────────────────────────────
  wordToPdf: (file: File) => uploadFile("/to_pdf/word-to-pdf/", file),
  powerpointToPdf: (file: File) => uploadFile("/to_pdf/powerpoint-to-pdf/", file),
  excelToPdf: (file: File) => uploadFile("/to_pdf/excel-to-pdf/", file),
  jpgToPdf: (file: File) => uploadFile("/to_pdf/jpg-to-pdf/", file),
  htmlToPdf: (file: File) => uploadFile("/to_pdf/html-to-pdf/", file),
  markdownToPdf: (file: File) => uploadFile("/to_pdf/markdown-to-pdf/", file),

  // ─────────────────────────────────────────────────────────────────────────────
  // PDF SECURITY (/to_pdf/)
  // ─────────────────────────────────────────────────────────────────────────────
  protectPdf: (file: File, password: string, permissions: Record<string, boolean> = {}) =>
    uploadFile("/to_pdf/protect-pdf/", file, { password, ...Object.fromEntries(Object.entries(permissions).map(([k, v]) => [k, String(v)])) }),
  unlockPdf: (file: File, password: string) =>
    uploadFile("/to_pdf/unlock-pdf/", file, { password }),

  // ─────────────────────────────────────────────────────────────────────────────
  // PDF OPTIMIZER (/optimizer/)
  // ─────────────────────────────────────────────────────────────────────────────
  mergePdfs: (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    return fetch(`${getBaseUrl()}/optimizer/merge/`, { method: "POST", body: formData }).then(async res => {
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Merge failed");
      return res.blob();
    });
  },
  splitPdf: (file: File, selectedPages: number[], splitMode: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("selectedPages", JSON.stringify(selectedPages));
    formData.append("splitMode", splitMode);
    return fetch(`${getBaseUrl()}/optimizer/split/`, { method: "POST", body: formData }).then(async res => {
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Split failed");
      return res.blob();
    });
  },
  organizePdf: (file: File, pages: any[]) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("pages", JSON.stringify(pages));
    return fetch(`${getBaseUrl()}/optimizer/organize/`, { method: "POST", body: formData }).then(async res => {
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Organize failed");
      return res.blob();
    });
  },
  flattenPdf: (file: File) => uploadFile("/optimizer/flatten/", file),

  compressPdf: (file: File, level: string = "recommended") =>
    uploadFile("/optimizer/compress-pdf/", file, { level }),
  compressImage: (file: File, level: string = "recommended") =>
    uploadFile("/optimizer/compress-image/", file, { level }),
  // --- ADMIN ENDPOINTS ---
  getAdminStats: async () => {
    return api.request("GET", "/api/auth/admin/stats/");
  },
  getUsers: async (search?: string) => {
    let url = "/api/auth/admin/users/";
    if (search) url += `?search=${search}`;
    return api.request("GET", url);
  },
  updateUserRole: async (id: number, role: string) => {
    return api.request("PATCH", `/api/auth/admin/users/${id}/`, { role });
  },
  deleteUser: async (id: number) => {
    return api.request("DELETE", `/api/auth/admin/users/${id}/`);
  },

  // --- Core / Admin Logic ---
  getSystemSettings: () => api.request("GET", "/api/core/settings/"),
  updateSystemSetting: (key: string, value: any, file?: File) => {
    const formData = new FormData();
    formData.append('key', key);
    if (value) formData.append('value', value);
    if (file) formData.append('file', file);
    // Using generic update since we don't have key-specific endpoint, or assume PATCH on detail
    return api.request("PATCH", `/api/core/settings/${key}/`, formData);
  },
  getAdminRequests: () => api.request("GET", "/api/core/admin-requests/"),
  approveRequest: (id: number) => api.request("POST", `/api/core/admin-requests/${id}/approve/`),
  rejectRequest: (id: number, note: string) => api.request("POST", `/api/core/admin-requests/${id}/reject/`, { note }),

  // --- Features ---
  getFeatures: () => api.request("GET", "/api/billing/features/"),
  createFeature: (data: any) => api.request("POST", "/api/billing/features/", data),
  getFeatureOverrides: () => api.request("GET", "/api/billing/feature-overrides/"),
  setFeatureOverride: (userId: number, featureId: number, isEnabled: boolean) =>
    api.request("POST", "/api/billing/feature-overrides/", { user: userId, feature: featureId, is_enabled: isEnabled }),
};

