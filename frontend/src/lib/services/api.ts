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

const pollTask = async (taskId: string): Promise<any> => {
  const maxAttempts = 60; // 2 minutes (assuming 2s interval)
  const interval = 2000;

  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(`${getBaseUrl()}/api/core/tasks/${taskId}/`, {
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      throw new Error("Failed to poll task status");
    }

    const data = await response.json();
    // OS State Machine support: 'COMPLETED' is the new 'SUCCESS'
    if (data.status === 'SUCCESS' || data.status === 'COMPLETED') {
      // Task Done!
      if (data.result && data.result.output_url) {
        // Fetch the actual file
        const fileRes = await fetch(data.result.output_url);
        return fileRes.blob();
      }
      return data.result;
    } else if (data.status === 'FAILURE' || data.status === 'FAILED') {
      throw new Error(data.error || "Task failed");
    }
    // Continue polling if PENDING, STARTED, QUEUED, PROCESSING, VALIDATED
    // ...

    // Wait
    await new Promise(r => setTimeout(r, interval));
  }
  throw new Error("Task timed out");
};


/**
 * Helper for file upload requests (multipart/form-data)
 * Automatically handles Async Task Polling if backend returns task_id
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
    // Handle Specific Quota Error Codes
    if (response.status === 403) {
      try {
        const jsonError = JSON.parse(errorBody);
        // Standardize Quota Error for UI
        if (jsonError.error && (jsonError.error.includes("limit reached") || jsonError.error.includes("Upgrade"))) {
          throw new Error(`QUOTA_EXCEEDED: ${jsonError.error}`);
        }
      } catch (e) { }
    }
    throw new Error(`API error ${response.status}: ${errorBody}`);
  }

  const contentType = response.headers.get("content-type");

  // If JSON, might be a TASK ID
  if (contentType && contentType.includes("application/json")) {
    const data = await response.json();

    if (data.task_id && (data.status === 'processing' || data.status === 'pending' || data.status === 'queued')) {
      // Enter Polling Loop
      return pollTask(data.task_id);
    }

    return data;
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
      headers: {},
    };

    if (data instanceof FormData) {
      options.body = data;
      // Do NOT set Content-Type header; browser sets it with boundary
    } else {
      // Default to JSON
      options.headers = { "Content-Type": "application/json" };
      if (data) {
        options.body = JSON.stringify(data);
      }
    }
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage = errorBody;
      let parsedBody: any = null;
      try {
        const jsonError = JSON.parse(errorBody);
        parsedBody = jsonError;
        // Handle Django Rest Framework standard error format
        if (jsonError.non_field_errors && Array.isArray(jsonError.non_field_errors)) {
          errorMessage = jsonError.non_field_errors.join(' ');
        } else if (jsonError.detail) {
          errorMessage = jsonError.detail;
        } else if (jsonError.error && typeof jsonError.error === 'string') {
          errorMessage = jsonError.error;
        } else if (jsonError.error && typeof jsonError.error === 'object' && jsonError.error.message) {
          errorMessage = jsonError.error.message;
        } else if (typeof jsonError === 'object') {
          // Fallback for object errors (values)
          errorMessage = Object.values(jsonError).flat().join(' ');
        }
      } catch (e) {
        // Not JSON, keep text
      }
      const err = new Error(errorMessage || `API error ${response.status}`) as any;
      err.status = response.status;
      err.body = parsedBody || errorBody;
      throw err;
    }
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return response.json();
    }
    return response.text();
  },

  /**
   * Generic request helper for public JSON endpoints (no credentials).
   */
  publicRequest: async (method: string, endpoint: string, data?: any): Promise<any> => {
    const url = `${getBaseUrl()}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (data) {
      options.body = JSON.stringify(data);
    }
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage = errorBody;
      let parsedBody: any = null;
      try {
        const jsonError = JSON.parse(errorBody);
        parsedBody = jsonError;
        // Handle Django Rest Framework standard error format
        if (jsonError.non_field_errors && Array.isArray(jsonError.non_field_errors)) {
          errorMessage = jsonError.non_field_errors.join(' ');
        } else if (jsonError.detail) {
          errorMessage = jsonError.detail;
        } else if (jsonError.error && typeof jsonError.error === 'string') {
          errorMessage = jsonError.error;
        } else if (jsonError.error && typeof jsonError.error === 'object' && jsonError.error.message) {
          errorMessage = jsonError.error.message;
        } else if (typeof jsonError === 'object') {
          // Fallback for object errors (values)
          errorMessage = Object.values(jsonError).flat().join(' ');
        }
      } catch (e) {
        // Not JSON, keep text
      }
      const err = new Error(errorMessage || `API error ${response.status}`) as any;
      err.status = response.status;
      err.body = parsedBody || errorBody;
      throw err;
    }
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return response.json();
    }
    return response.text();
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // HTTP HELPER METHODS
  // ─────────────────────────────────────────────────────────────────────────────
  get: (endpoint: string, data?: any) => api.request("GET", endpoint, data),
  post: (endpoint: string, data?: any) => api.request("POST", endpoint, data),
  put: (endpoint: string, data?: any) => api.request("PUT", endpoint, data),
  patch: (endpoint: string, data?: any) => api.request("PATCH", endpoint, data),
  delete: (endpoint: string, data?: any) => api.request("DELETE", endpoint, data),

  // ─────────────────────────────────────────────────────────────────────────────
  // AUTH ENDPOINTS (/api/auth/)
  // ─────────────────────────────────────────────────────────────────────────────
  signup: (email: string, password: string, confirmPassword?: string, first_name?: string, last_name?: string, referral_code?: string) =>
    api.request("POST", "/api/auth/signup/", {
      email,
      password1: password,
      password2: confirmPassword || password, // Fallback if confirmation not provided/needed by frontend validation, but backend expects it
      first_name,
      last_name,
      referral_code
    }),
  verifyEmail: (key: string) =>
    api.request("POST", "/api/auth/registration/verify-email/", { key }),
  resendVerificationEmail: (email: string) =>
    api.request("POST", "/api/auth/registration/resend-email/", { email }),
  googleLogin: (code: string) =>
    api.request("POST", "/api/auth/google/token/", { code }),
  // otp_token is optional: include it when completing 2FA
  login: (email: string, password: string, otp_token?: string) =>
    api.request("POST", "/api/auth/login/", otp_token ? { email, password, otp_token } : { email, password }),
  logout: () => api.request("POST", "/api/auth/logout/"),
  getUser: () => api.request("GET", "/api/auth/user/"),
  getUserDetails: (id?: string | number) => (!id || id === 'me') ? api.getUser() : api.request("GET", `/api/auth/users/${id}/`),
  updateCurrentUser: (data: any) => api.request("PATCH", "/api/auth/user/", data),
  updateAvatar: (formData: FormData) => api.request("PATCH", "/api/auth/users/me/avatar/", formData),
  deleteAvatar: () => api.request("DELETE", "/api/auth/users/me/avatar/"),
  startGoogleLogin: () => `${getBaseUrl()}/api/auth/google/`,
  requestPasswordReset: (email: string) =>
    api.request("POST", "/api/auth/password/reset/", { email }),
  resetPasswordConfirm: (uid: string, token: string, new_password1: string, new_password2: string) =>
    api.request("POST", "/api/auth/password/reset/confirm/", { uid, token, new_password1, new_password2 }),
  changePassword: (data: any) =>
    api.request("POST", "/api/auth/password/change/", data),

  refreshToken: () => api.request("POST", "/api/auth/token/refresh/"),

  // Session management
  getSessions: () => api.request("GET", "/api/auth/sessions/"),
  revokeSession: (sessionId: string) => api.request("DELETE", `/api/auth/sessions/${sessionId}/`),
  revokeAllOtherSessions: () => api.request("POST", "/api/auth/sessions/revoke_others/"),

  // 2FA
  getTwoFactorStatus: () => api.request("GET", "/api/auth/2fa/status/"),
  setupTwoFactor: () => api.request("GET", "/api/auth/2fa/setup/"),
  enableTwoFactor: (token: string) => api.request("POST", "/api/auth/2fa/enable/", { token }),
  disableTwoFactor: () => api.request("POST", "/api/auth/2fa/disable/"),
  verifyTwoFactor: (token: string, backup_code?: string) => api.request("POST", "/api/auth/2fa/verify/", backup_code ? { backup_code } : { token }),
  getTwoFactorBackupCodes: () => api.request("GET", "/api/auth/2fa/backup_codes/"),
  regenerateTwoFactorBackupCodes: (password: string) => api.request("POST", "/api/auth/2fa/backup_codes/regenerate/", { password }),

  // API Keys
  getAPIKeys: () => api.request("GET", "/api/auth/api-keys/"),
  createAPIKey: (name: string, scopes?: string[]) => api.request("POST", "/api/auth/api-keys/", { name, scopes }),
  deleteAPIKey: (id: string | number) => api.request("DELETE", `/api/auth/api-keys/${id}/`),

  // ─────────────────────────────────────────────────────────────────────────────
  // BILLING ENDPOINTS (/api/billing/)
  // ─────────────────────────────────────────────────────────────────────────────
  getPlans: () => api.publicRequest("GET", "/api/billing/plans/"),
  updatePlan: (id: number, data: any) => api.request("PATCH", `/api/billing/plans/${id}/`, data),
  getSubscription: async () => {
    const res = await api.request("GET", "/api/billing/subscriptions/");
    // If result is array, take first (assuming user has one active subscription)
    return Array.isArray(res) ? res[0] : res;
  },
  updateSubscription: (planSlug: string) => api.request("POST", "/api/billing/subscriptions/assign_plan/", { plan_slug: planSlug }),
  getBusinessDetails: async () => {
    const res = await api.request("GET", "/api/billing/business-details/");
    return Array.isArray(res) ? res[0] : res;
  },
  updateBusinessDetails: (data: any) => api.request("PUT", "/api/billing/business-details/", data),
  getInvoices: () => api.request("GET", "/api/billing/invoices/"),
  regenerateInvoice: (id: number | string) => api.request("POST", `/api/billing/invoices/${id}/regenerate/`),
  emailInvoice: (id: number | string) => api.request("POST", `/api/billing/invoices/${id}/send_email/`),
  deleteInvoice: (id: number | string) => api.request("DELETE", `/api/billing/invoices/${id}/`),

  // Job Endpoints
  retryJob: (id: number | string) => api.request("POST", `/api/jobs/${id}/retry/`),
  getJobLogs: (id: number | string) => api.request("GET", `/api/jobs/${id}/logs/`),

  // Admin Reports & Payments methods moved to relevant sections below to avoid duplicates
  exportPayments: () => api.request("POST", "/api/billing/payments/export/"),
  refundPayment: (id: number | string) => api.request("POST", `/api/billing/payments/${id}/refund/`),
  chargebackPayment: (id: number | string) => api.request("POST", `/api/billing/payments/${id}/chargeback/`),

  // ─────────────────────────────────────────────────────────────────────────────
  // SIGNATURE ENDPOINTS (/api/signatures/)
  // ─────────────────────────────────────────────────────────────────────────────
  getSignatureStats: () => api.request("GET", "/api/signatures/requests/stats/"),
  getTrash: () => api.request("GET", "/api/signatures/requests/?mode=trash"),
  revokeSignatureRequest: (id: number) => api.request("POST", `/api/signatures/requests/${id}/revoke/`),
  restoreSignature: (id: number) => api.request("POST", `/api/signatures/requests/${id}/restore/`),
  getSignatureRequests: (mode: 'inbox' | 'sent' | 'signed' | 'trash' = 'sent') => api.request("GET", `/api/signatures/requests/?mode=${mode}`),
  getSignatureRequest: (id: string) => api.request("GET", `/api/signatures/requests/${id}/`),
  createSignatureRequest: (data: FormData) => api.request("POST", "/api/signatures/requests/", data),
  signRequest: (id: string, data: { signature: string }) => api.request("POST", `/api/signatures/requests/${id}/sign/`, data),
  getSignatureTemplates: () => api.request("GET", "/api/signatures/templates/"),
  getSignatureContacts: () => api.request("GET", "/api/signatures/contacts/"),
  createSignatureTemplate: (data: FormData) => api.request("POST", "/api/signatures/templates/", data),
  createSignatureContact: (data: { name: string; email: string }) => api.request("POST", "/api/signatures/contacts/", data),
  deleteSignatureContact: (id: number) => api.request("DELETE", `/api/signatures/contacts/${id}/`),

  // Saved Signatures
  getSavedSignatures: () => api.request("GET", "/api/signatures/saved/"),
  getDefaultSignature: () => api.request("GET", "/api/signatures/saved/default/"),
  createSavedSignature: (formData: FormData) => api.request("POST", "/api/signatures/saved/", formData),
  deleteSavedSignature: (id: number) => api.request("DELETE", `/api/signatures/saved/${id}/`),
  setDefaultSignature: (id: number) => api.request("PATCH", `/api/signatures/saved/${id}/`, { is_default: true }),

  // ─────────────────────────────────────────────────────────────────────────────
  // MY FILES (Secure Storage)
  // ─────────────────────────────────────────────────────────────────────────────
  getFiles: () => api.request("GET", "/api/files/"),
  uploadFileAsset: (file: File, password?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (password) formData.append("password", password);
    return api.request("POST", "/api/files/", formData);
  },
  deleteFile: (id: number) => api.request("DELETE", `/api/files/${id}/`),
  getFileUrl: (id: number) => api.request("GET", `/api/files/${id}/`),
  updateFilePassword: (id: number, password?: string) => {
    if (!password) return api.request("POST", `/api/files/${id}/remove_password/`);
    return api.request("POST", `/api/files/${id}/set_password/`, { password });
  },

  // Public Share Access
  getPublicFileInfo: (token: string) => api.publicRequest("GET", `/api/files/share/info/${token}/`),
  accessPublicFile: (token: string, password?: string) => api.publicRequest("POST", `/api/files/share/access/${token}/`, { password }),

  // ─────────────────────────────────────────────────────────────────────────────
  // PDF TOOLS - CONVERSION TO PDF (/api/tools/)
  // ─────────────────────────────────────────────────────────────────────────────
  wordToPdf: (file: File) => uploadFile("/api/tools/word-to-pdf/", file),
  powerpointToPdf: (file: File) => uploadFile("/api/tools/powerpoint-to-pdf/", file),
  excelToPdf: (file: File) => uploadFile("/api/tools/excel-to-pdf/", file),
  jpgToPdf: (file: File) => uploadFile("/api/tools/jpg-to-pdf/", file),
  htmlToPdf: (file: File) => uploadFile("/api/tools/html-to-pdf/", file),
  markdownToPdf: (file: File) => uploadFile("/api/tools/markdown-to-pdf/", file),

  // ─────────────────────────────────────────────────────────────────────────────
  // PDF TOOLS - CONVERSION FROM PDF (/api/tools/)
  // ─────────────────────────────────────────────────────────────────────────────
  pdfToJpg: (file: File) => uploadFile("/api/tools/pdf-to-jpg/", file),
  pdfToExcel: (file: File) => uploadFile("/api/tools/pdf-to-excel/", file),
  pdfToPowerpoint: (file: File) => uploadFile("/api/tools/pdf-to-powerpoint/", file),
  pdfToWord: (file: File) => uploadFile("/api/tools/pdf-to-word/", file),
  pdfToPdfa: (file: File) => uploadFile("/api/tools/pdf-to-pdfa/", file),
  pdfToHtml: (file: File) => uploadFile("/api/tools/pdf-to-html/", file),

  // ─────────────────────────────────────────────────────────────────────────────
  // PDF TOOLS - OPTIMIZATION (/api/tools/)
  // ─────────────────────────────────────────────────────────────────────────────
  mergePdfs: (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    return fetch(`${getBaseUrl()}/api/tools/merge/`, { method: "POST", body: formData, credentials: "include" }).then(async res => {
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Merge failed");
      return res.blob();
    });
  },
  splitPdf: (file: File, selectedPages: number[], splitMode: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("selectedPages", JSON.stringify(selectedPages));
    formData.append("splitMode", splitMode);
    return fetch(`${getBaseUrl()}/api/tools/split/`, { method: "POST", body: formData, credentials: "include" }).then(async res => {
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Split failed");
      return res.blob();
    });
  },
  organizePdf: (file: File, pages: any[]) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("pages", JSON.stringify(pages));
    return fetch(`${getBaseUrl()}/api/tools/organize/`, { method: "POST", body: formData, credentials: "include" }).then(async res => {
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Organize failed");
      return res.blob();
    });
  },
  flattenPdf: (file: File) => uploadFile("/api/tools/flatten/", file),
  compressPdf: (file: File, level: string = "recommended") =>
    uploadFile("/api/tools/compress-pdf/", file, { level }),
  compressImage: (file: File, level: string = "recommended") =>
    uploadFile("/api/tools/compress-image/", file, { level }),

  // ─────────────────────────────────────────────────────────────────────────────
  // PDF TOOLS - SECURITY (/api/tools/)
  // ─────────────────────────────────────────────────────────────────────────────
  protectPdf: (file: File, password: string, permissions: Record<string, boolean> = {}) =>
    uploadFile("/api/tools/protect-pdf/", file, { password, ...Object.fromEntries(Object.entries(permissions).map(([k, v]) => [k, String(v)])) }),
  unlockPdf: (file: File, password: string) =>
    uploadFile("/api/tools/unlock-pdf/", file, { password }),

  // ─────────────────────────────────────────────────────────────────────────────
  // ADMIN ENDPOINTS
  // ─────────────────────────────────────────────────────────────────────────────
  getAdminStats: async () => {
    return api.request("GET", "/api/auth/admin/stats/");
  },
  getAdminActivity: async () => {
    return api.request("GET", "/api/auth/admin/activity/");
  },
  getAdminDatabase: async () => {
    return api.request("GET", "/api/auth/admin/database/");
  },
  getAuditLogs: (page: number = 1, action?: string) => {
    let url = `/api/core/audit-logs/?page=${page}`;
    if (action && action !== 'ALL') url += `&action=${action}`;
    return api.request("GET", url);
  },
  getUsers: async (search?: string, page: number = 1) => {
    let url = `/api/auth/admin/users/?page=${page}`;
    if (search) url += `&search=${search}`;
    return api.request("GET", url);
  },
  updateUserRole: async (id: number, role: string) => {
    return api.request("PATCH", `/api/auth/admin/users/${id}/`, { role });
  },
  deleteUser: async (id: number) => {
    return api.request("DELETE", `/api/auth/admin/users/${id}/`);
  },
  assignUserPlan: async (userId: number, planSlug: string) => {
    return api.request("POST", "/api/billing/admin/subscriptions/assign_plan/", { user_id: userId, plan_slug: planSlug });
  },
  impersonateUser: (id: number) => api.request("POST", `/api/auth/super-admin/users/${id}/impersonate/`),
  forceLogout: (id: number) => api.request("POST", `/api/auth/super-admin/users/${id}/force-logout/`),
  banUser: (id: number) => api.request("POST", `/api/auth/super-admin/users/${id}/ban/`),
  reset2FA: (id: number) => api.request("POST", `/api/auth/super-admin/users/${id}/reset-2fa/`),
  forcePasswordReset: (id: number) => api.request("POST", `/api/auth/super-admin/users/${id}/force-password-reset/`),

  // ─────────────────────────────────────────────────────────────────────────────
  // CONTENT MANAGEMENT (Announcements, FAQs)
  // ─────────────────────────────────────────────────────────────────────────────
  getAnnouncements: async (activeOnly: boolean = false) => {
    let url = "/api/core/announcements/";
    if (activeOnly) url += "?is_active=true";
    return api.request("GET", url);
  },
  createAnnouncement: (data: any) => api.request("POST", "/api/core/announcements/", data),
  updateAnnouncement: (id: number, data: any) => api.request("PATCH", `/api/core/announcements/${id}/`, data),
  deleteAnnouncement: (id: number) => api.request("DELETE", `/api/core/announcements/${id}/`),

  getHelpArticles: async (search?: string, category?: string) => {
    let url = "/api/core/faqs/";
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (category) params.append("category", category);
    if (params.toString()) url += `?${params.toString()}`;
    return api.request("GET", url);
  },
  createHelpArticle: (data: any) => api.request("POST", "/api/core/faqs/", data),
  updateHelpArticle: (id: number, data: any) => api.request("PATCH", `/api/core/faqs/${id}/`, data),
  deleteHelpArticle: (id: number) => api.request("DELETE", `/api/core/faqs/${id}/`),


  // ─────────────────────────────────────────────────────────────────────────────
  // CORE / SYSTEM ENDPOINTS
  // ─────────────────────────────────────────────────────────────────────────────
  getPublicSettings: () => api.publicRequest("GET", "/api/core/settings/public/"),
  getAdminBranding: () => api.request("GET", "/api/core/settings/branding/"),
  updateAdminBranding: (data: FormData) => api.request("PATCH", "/api/core/settings/branding/", data),
  getContentVersions: () => api.request("GET", "/api/core/content-versions/"),
  revertContent: (versionId: number) => api.request("POST", `/api/core/content-versions/${versionId}/revert/`),

  // Teams
  getTeams: () => api.request("GET", "/api/teams/"),
  createTeam: (data: { name: string }) => api.request("POST", "/api/teams/", data),
  inviteTeamMember: (teamId: number, email: string, role: string = 'MEMBER') =>
    api.request("POST", `/api/teams/${teamId}/invite/`, { email, role }),
  revokeTeamInvitation: (teamId: number, invitationId: number) =>
    api.request("POST", `/api/teams/${teamId}/revoke_invite/`, { invitation_id: invitationId }),

  // Workflows
  getWorkflows: () => api.request("GET", "/api/workflows/workflows/"),
  createWorkflow: (data: any) => api.request("POST", "/api/workflows/workflows/", data),

  // ─────────────────────────────────────────────────────────────────────────────
  // SUPPORT TICKETS
  // ─────────────────────────────────────────────────────────────────────────────
  getSupportTickets: async (params?: { status?: string, priority?: string, assigned?: string }) => {
    let url = "/api/core/support-tickets/";
    if (params) {
      const q = new URLSearchParams(params as any);
      url += `?${q.toString()}`;
    }
    return api.request("GET", url);
  },
  createSupportTicket: (data: any) => {
    if (data.attachments && data.attachments.length > 0) {
      // Handle attachments if backend expects file uploads vs JSON
      // Backend seems to expect 'attachments' as list in JSON or similar, let's assume JSON first based on viewset
      // But usually file uploads need FormData. ViewSet uses `SupportTicketSerializer`.
      // If attachments are files, we might need separate upload or FormData.
      // Assuming JSON with pre-uploaded Attachment IDs or similar for now, usually
      // simple implementation sends text. If file upload needed we use uploadFileAsset first.
    }
    return api.request("POST", "/api/core/support-tickets/", data);
  },
  getSupportTicket: (id: number | string) => api.request("GET", `/api/core/support-tickets/${id}/`),
  closeTicket: (id: number | string) => api.request("POST", `/api/core/support-tickets/${id}/close/`),
  reopenTicket: (id: number | string) => api.request("POST", `/api/core/support-tickets/${id}/reopen/`),
  assignTicket: (id: number | string, adminId: number | string) => api.request("POST", `/api/core/support-tickets/${id}/assign/`, { admin_id: adminId }),

  getTicketMessages: (id: number | string) => api.request("GET", `/api/core/support-tickets/${id}/messages/`),
  replyToTicket: (id: number | string, message: string, isInternal: boolean = false) =>
    api.request("POST", `/api/core/support-tickets/${id}/messages/`, { message, is_internal: isInternal }),

  // Tasks
  getTasks: () => api.request("GET", "/api/jobs/"),

  // Referrals
  getReferralStats: () => api.request("GET", "/api/billing/referrals/stats/"),

  // Payments
  createOrder: (planSlug: string, provider: string = 'razorpay') => api.request("POST", "/api/billing/payments/create_order/", { plan_slug: planSlug, provider }),
  verifyPayment: (data: any) => api.request("POST", "/api/billing/payments/verify_payment/", data),
  // getPlans, updatePlan, getSubscription are defined above under Billing Endpoints
  getPayments: (userId?: number | string) => {
    let url = "/api/billing/payments/";
    if (userId) url += `?user=${userId}`;
    return api.request("GET", url);
  },
  getAdminPayments: () => api.request("GET", "/api/billing/payments/"), // Super admin sees all by default via same endpoint
  downloadReceipt: (id: number) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    window.open(`${baseUrl}/api/billing/payments/${id}/download_receipt/`, '_blank');
  },

  getSystemSettings: () => api.request("GET", "/api/core/settings/"), // Legacy fallback
  createSystemSetting: (key: string, value: any, file?: File) => {
    const formData = new FormData();
    formData.append('key', key);
    if (value) formData.append('value', value);
    if (file) formData.append('file', file);
    return fetch(`${getBaseUrl()}/api/core/settings/`, {
      method: "POST",
      body: formData,
      credentials: "include"
    }).then(async res => {
      if (!res.ok) throw new Error("Failed to create setting");
      return res.json();
    });
  },
  updateSystemSetting: (key: string, value: any, file?: File) => {
    const formData = new FormData();
    if (value) formData.append('value', value);
    if (file) formData.append('file', file);
    // Using generic update since we don't have key-specific endpoint, or assume PATCH on detail
    return fetch(`${getBaseUrl()}/api/core/settings/${key}/`, {
      method: "PATCH",
      body: formData,
      credentials: "include"
    }).then(async res => {
      if (!res.ok) throw new Error("Failed to update setting");
      return res.json();
    });
  },
  getAdminRequests: () => api.request("GET", "/api/core/admin-requests/"),
  approveRequest: (id: number) => api.request("POST", `/api/core/admin-requests/${id}/approve/`),
  rejectRequest: (id: number, note: string) => api.request("POST", `/api/core/admin-requests/${id}/reject/`, { note }),

  // --- Features ---
  getFeatures: () => api.publicRequest("GET", "/api/billing/features/"),
  createFeature: (data: any) => {
    // If data contains an 'icon' file, use uploadFile/FormData
    if (data.icon && data.icon instanceof File) {
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        formData.append(key, data[key]);
      });
      return fetch(`${getBaseUrl()}/api/billing/features/`, {
        method: "POST",
        headers: {
          // Content-Type is handled automatically by browser for FormData
        },
        body: formData,
        credentials: "include"
      }).then(async res => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Feature creation failed");
        return res.json();
      });
    }
    // Fallback to JSON
    return api.request("POST", "/api/billing/features/", data);
  },
  updateFeature: (id: number, data: any) => {
    // Check if data contains file
    if (data.icon && data.icon instanceof File) {
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        formData.append(key, data[key]);
      });
      return fetch(`${getBaseUrl()}/api/billing/features/${id}/`, {
        method: "PATCH",
        body: formData,
        credentials: "include"
      }).then(async res => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Update failed");
        return res.json();
      });
    }
    return api.request("PATCH", `/api/billing/features/${id}/`, data);
  },
  getFeatureOverrides: (userId?: number | string) => {
    let url = "/api/billing/feature-overrides/";
    if (userId) url += `?user=${userId}`;
    return api.request("GET", url);
  },
  setFeatureOverride: (userId: number, featureId: number, isEnabled: boolean) =>
    api.request("POST", "/api/billing/feature-overrides/", { user: userId, feature: featureId, is_enabled: isEnabled }),
  getHistory: () => api.request("GET", "/api/core/history/"),
};
