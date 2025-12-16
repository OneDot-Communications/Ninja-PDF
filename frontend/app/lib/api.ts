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
    let response: Response;
    try {
      response = await fetch(url, options);
    } catch (e) {
      const msg = (e as Error).message || String(e);
      throw new Error(`Network request failed to ${url}: ${msg}. Possible causes: backend not running, network error, CORS policy blocking the request, or mixed-content (HTTP/HTTPS) when serving the frontend over HTTPS.`);
    }
    if (!response.ok) {
      const contentType = response.headers.get("content-type") || "";
      let parsedBody: any = null;
      let errorBody: string | null = null;
      let errorMessage = `API error ${response.status}`;

      if (contentType.includes("application/json")) {
        try {
          parsedBody = await response.json();
          // Handle Django Rest Framework standard error format
          if (parsedBody.non_field_errors && Array.isArray(parsedBody.non_field_errors)) {
            errorMessage = parsedBody.non_field_errors.join(' ');
          } else if (parsedBody.detail) {
            errorMessage = parsedBody.detail;
          } else if (parsedBody.error && typeof parsedBody.error === 'string') {
            errorMessage = parsedBody.error;
          } else if (parsedBody.error && typeof parsedBody.error === 'object' && parsedBody.error.message) {
            errorMessage = parsedBody.error.message;
          } else if (typeof parsedBody === 'object') {
            try {
              errorMessage = Object.values(parsedBody).flat().join(' ');
            } catch (e) {
              // leave default message
            }
          }
        } catch (e) {
          // JSON parse failed — fallback to text
          errorBody = await response.text();
          if (errorBody) errorMessage = errorBody;
        }
      } else {
        // Not JSON, read as text
        errorBody = await response.text();
        if (errorBody) errorMessage = errorBody;
      }

      const err = new Error(errorMessage) as any;
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
    let response: Response;
    try {
      response = await fetch(url, options);
    } catch (e) {
      const msg = (e as Error).message || String(e);
      throw new Error(`Network request failed to ${url}: ${msg}. Possible causes: backend not running, network error, CORS policy blocking the request, or mixed-content (HTTP/HTTPS) when serving the frontend over HTTPS.`);
    }
    if (!response.ok) {
      const contentType = response.headers.get("content-type") || "";
      let parsedBody: any = null;
      let errorBody: string | null = null;
      let errorMessage = `API error ${response.status}`;

      if (contentType.includes("application/json")) {
        try {
          parsedBody = await response.json();
          // Handle Django Rest Framework standard error format
          if (parsedBody.non_field_errors && Array.isArray(parsedBody.non_field_errors)) {
            errorMessage = parsedBody.non_field_errors.join(' ');
          } else if (parsedBody.detail) {
            errorMessage = parsedBody.detail;
          } else if (parsedBody.error && typeof parsedBody.error === 'string') {
            errorMessage = parsedBody.error;
          } else if (parsedBody.error && typeof parsedBody.error === 'object' && parsedBody.error.message) {
            errorMessage = parsedBody.error.message;
          } else if (typeof parsedBody === 'object') {
            try {
              errorMessage = Object.values(parsedBody).flat().join(' ');
            } catch (e) {
              // leave default
            }
          }
        } catch (e) {
          // JSON parse failed — fallback to text
          errorBody = await response.text();
          if (errorBody) errorMessage = errorBody;
        }
      } else {
        // Not JSON, read as text
        errorBody = await response.text();
        if (errorBody) errorMessage = errorBody;
      }

      const err = new Error(errorMessage) as any;
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

  // ─────────────────────────────────────────────────────────────────────────────
  // CORE / SYSTEM ENDPOINTS
  // ─────────────────────────────────────────────────────────────────────────────
  getPublicSettings: () => api.request("GET", "/api/core/settings/public/"),
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
  updateWorkflow: (id: number, data: any) => api.request("PATCH", `/api/workflows/workflows/${id}/`, data),
  deleteWorkflow: (id: number) => api.request("DELETE", `/api/workflows/workflows/${id}/`),
  logRun: (id: number) => api.request("POST", `/api/workflows/workflows/${id}/log_run/`),

  // Tasks
  getTasks: () => api.request("GET", "/api/jobs/"),

  // Referrals
  getReferralStats: () => api.request("GET", "/api/billing/referrals/stats/"),

  // Payments
  createOrder: (planSlug: string, provider: string = 'razorpay') => api.request("POST", "/api/billing/payments/create_order/", { plan_slug: planSlug, provider }),
  verifyPayment: (data: any) => api.request("POST", "/api/billing/payments/verify_payment/", data),
  // getPlans, updatePlan, getSubscription are defined above under Billing Endpoints
  getPayments: () => api.request("GET", "/api/billing/payments/"),
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
  getFeatureOverrides: () => api.request("GET", "/api/billing/feature-overrides/"),
  setFeatureOverride: (userId: number, featureId: number, isEnabled: boolean) =>
    api.request("POST", "/api/billing/feature-overrides/", { user: userId, feature: featureId, is_enabled: isEnabled }),
  getHistory: () => api.request("GET", "/api/core/history/"),
};
