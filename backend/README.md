# Ninja-PDF Backend Documentation

This guide provides a comprehensive overview of the Ninja-PDF backend architecture, API endpoints, and core service functions.

## 🏗️ Architecture Overview

The backend is built with **Django** and **Django Rest Framework (DRF)**, organized into modular applications within the `apps/` directory.

- **Root URL Configuration**: `core.urls`
- **Settings**: `config.settings`
- **Main Applications**:
  - `accounts`: User management, authentication, and security.
  - `files`: File management and cloud storage integration.
  - `jobs`: Asynchronous job processing and orchestration (Celery).
  - `tools`: PDF processing logic (converters, editors).
  - `subscriptions`: Billing, plans, and feature entitlements (Stripe).
  - `teams`: Team collaboration and management.
  - `workflows`: Multi-step PDF workflows.

---

## 🚀 API Endpoints & Functions by App

### 1. Accounts (`apps.accounts`)
Handles authentication, user management, security protocols, and GDPR compliance.

#### 📡 API Endpoints (`api/auth/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| **POST** | `/signup/` | Register a new user account. |
| **POST** | `/login/` | Authenticate user and retrieve JWT tokens. |
| **POST** | `/logout/` | Invalidates current session/token. |
| **GET** | `/user/` | Get details of the currently authenticated user. |
| **GET** | `/users/me/export/` | Export user data (GDPR). |
| **POST** | `/users/me/avatar/` | Upload user profile picture. |
| **POST** | `/token/refresh/` | Refresh access token using refresh token. |
| **POST** | `/password/change/` | Change current password. |
| **POST** | `/password/reset/` | Request password reset email. |
| **POST** | `/google/` | Initiate Google OAuth flow. |
| **GET** | `/admin/stats/` | Retrieve platform statistics (Admin only). |
| **GET** | `/admin/activity/` | Retrieve admin activity logs. |
| **GET** | `/2fa/status/` | Check 2FA status for user. |
| **POST** | `/2fa/setup/` | Initiate 2FA setup. |
| **POST** | `/2fa/verify/` | Verify 2FA OTP. |
| **POST** | `/2fa/disable/` | Disable 2FA. |
| **GET** | `/gdpr/export/` | Download all user data. |
| **DELETE**| `/gdpr/delete/` | Request account deletion. |
| **POST** | `/super-admin/users/{id}/ban/` | Ban a user (Super Admin). |
| **POST** | `/super-admin/users/{id}/impersonate/` | Impersonate a user (Super Admin). |
| **GET** | `/security/audit-logs/` | List security audit logs. |

#### 🔧 Key Services & Functions
**`apps.accounts.services.user_service.UserService`**
- `get_context(user)`: Resolves full user context including tier (FREE/PREMIUM), subscription status, storage limits, and permissions.
- `check_quota(user, additional_bytes)`: Checks if a user has enough storage space for a new upload.
- `get_storage_warnings(user)`: returns percentage of storage used and warning flags (80%, 95%).

**`apps.accounts.services.abuse_detector.AbuseDetector`**
- `check_all()`: Runs all abuse checks (Rapid requests, API limits, etc.).
- `check_rapid_requests()`: Detects DDoS-like behavior (e.g., >100 requests/60s).
- `check_failed_logins()`: Detects brute-force attempts.
- `check_large_uploads(file_size)`: Prevents spamming of large files.
- `auto_flag_user(reasons)`: Automatically flags suspicious users for admin review.

---

### 2. Files (`apps.files`)
Manages user file assets, uploads, and cloud storage integrations (Google Drive, Dropbox, etc.).

#### 📡 API Endpoints (`api/files/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| **GET** | `/` | List all user files. |
| **POST** | `/` | Upload a new file. |
| **GET** | `/{uuid}/` | Get file details. |
| **DELETE**| `/{uuid}/` | Delete a file. |
| **GET** | `/share/` | Access public/shared files. |
| **GET** | `/cloud/providers/` | List available cloud providers. |
| **POST** | `/cloud/connect/{provider}/` | Initiate OAuth for cloud storage. |
| **POST** | `/cloud/{id}/import/` | Import file from cloud storage. |
| **POST** | `/cloud/{id}/export/` | Export file to cloud storage. |

#### 🔧 Key Services & Functions
**`apps.files.services.upload_service.UploadService`**
- `process_upload(file_obj, user)`: Orchestrates the entire upload process: validation -> checksum -> storage -> DB record.
- `validate_mime_type(file_obj)`: Uses magic bytes to verify file type security.
- `validate_file_size(file_obj, user)`: Enforces user storage quotas.
- `validate_pdf_integrity(file_obj)`: Checks if PDF is valid and encrypted.
- `calculate_checksum(file_obj)`: Generates MD5/SHA hash for file integrity.

**`apps.files.services.cloud_storage`** (implied)
- Handles OAuth handshakes and file transfers for Google Drive, Dropbox, OneDrive.

---

### 3. Jobs (`apps.jobs`)
Handles asynchronous PDF processing tasks and batch operations.

#### 📡 API Endpoints (`api/jobs/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| **POST** | `/jobs/` | Create a new processing job. |
| **GET** | `/jobs/{id}/` | Get status of a specific job. |
| **POST** | `/batch/` | Create a batch processing job (multiple files). |
| **GET** | `/batch/{id}/` | Get status of a batch job. |
| **POST** | `/batch/{id}/cancel/` | Cancel a running batch job. |

#### 🔧 Key Services & Functions
**`apps.jobs.services.orchestrator.JobOrchestrator`**
- `create_job(file_asset, tool_type, user)`: Creates a job record and determines priority.
- `resolve_priority(user)`: Assigns queue (High/Default) based on user tier (Admin/Premium vs Free).
- `dispatch_to_celery(job)`: Pushes the job to the appropriate Celery queue.
- `retry_job(job)`: Re-queues failed jobs if retry limit not reached.
- `get_queue_stats()`: Returns current load on job queues.

---

### 4. Subscriptions (`apps.subscriptions`)
Handles billing, Stripe integration, plans, and feature entitlements.

#### 📡 API Endpoints (`api/billing/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| **GET** | `/plans/` | List available subscription plans. |
| **GET** | `/subscriptions/` | Get current user subscription. |
| **GET** | `/invoices/` | List user invoices. |
| **POST** | `/webhook/` | Endpoint for Stripe webhooks. |
| **POST** | `/trial/start/` | Start a free trial. |
| **GET** | `/trial/status/` | Check trial status. |
| **POST** | `/payments/` | Process payments. |

#### 🔧 Key Services & Functions
**`apps.subscriptions.services.entitlements.EntitlementService`**
- `get_feature_limit(user, feature_code)`: Returns the daily limit for a specific feature based on plan.
- `check_usage(user, feature_code)`: Boolean check if user is allowed to use a feature right now.
- `record_usage(user, feature_code)`: Increments the usage counter for a feature.

**`apps.subscriptions.services.stripe_service`**
- `initialize_free_plan(user)`: Sets up default free tier for new users.
- `activate_subscription_atomic(user, plan, ...)`: Activates a paid plan, upgrades storage, and enables AI features transactionally.
- `verify_stripe_webhook(payload, header)`: Validates signatures from Stripe.
- `detect_upgrade_trigger(user, type)`: Analyzes if a user should be prompted to upgrade (e.g., storage 80% full).
- `lock_excess_storage(user)`: Sets files to read-only if subscription expires/downgrades.

---

### 5. Tools (`apps.tools`)
The core PDF processing capabilities.

#### 📡 API Endpoints (`api/tools/`)
_Note: All endpoints accept a file or file_id and return a processed file or job_id._

| Endpoint | Tool |
|----------|------|
| `/word-to-pdf/` | Convert DOCX to PDF |
| `/excel-to-pdf/` | Convert XLSX to PDF |
| `/jpg-to-pdf/` | Convert Images to PDF |
| `/pdf-to-word/` | Convert PDF to DOCX |
| `/merge/` | Merge multiple PDFs |
| `/split/` | Split PDF into multiple files |
| `/compress-pdf/` | Optimize PDF size |
| `/protect-pdf/` | Add password protection |
| `/unlock-pdf/` | Remove password protection |
| `/ocr/` | Make scanned PDF searchable (OCR) |
| `/redact/` | Redact sensitive info (Premium) |
| `/edit/` | Edit PDF content |

---

### 6. Teams (`apps.teams`)
Collaborative features for enterprise users.

#### 📡 API Endpoints (`api/teams/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| **GET/POST** | `/` | List/Create teams. |
| **POST** | `/{id}/invite/` | Invite member to team. |
| **GET** | `/memberships/` | List user's team memberships. |

---

### 7. Signatures (`apps.signatures`)
E-Signature workflow management.

#### 📡 API Endpoints (`api/signatures/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| **POST** | `/requests/` | Create a signature request. |
| **GET** | `/templates/` | Manage signature templates. |
| **GET** | `/contacts/` | Manage contact book. |

---

### 8. Workflows (`apps.workflows`)
Multi-step processing pipelines.

#### 📡 API Endpoints (`api/workflows/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| **GET/POST** | `/workflows/` | CRUD for workflows. |
| **GET/POST** | `/tasks/` | Manage workflow tasks. |

---
