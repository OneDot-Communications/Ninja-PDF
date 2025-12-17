from django.core.management.base import BaseCommand
from apps.subscriptions.models import Feature, RolePermission

class Command(BaseCommand):
    help = 'Initialize all 203 RBAC Permissions from RBAC Specification'

    def handle(self, *args, **options):
        """
        COMPLETE 203 RBAC Tasks:
        - Tasks 1-107: Super Admin Only
        - Tasks 108-145: Admin (requires approval for tool changes)
        - Tasks 146-167: Free User
        - Tasks 168-196: Premium User
        - Tasks 197-203: Enterprise
        """
        
        from apps.accounts.models import User
        
        # COMPLETE PERMISSION LIST - ALL 203 TASKS
        permissions = [
            # ============================================
            # SECTION 1: SUPER ADMIN (Tasks 1-107)
            # ============================================
            
            # 1.1 Account & Identity Management (1-20)
            (1, 'CREATE_SUPER_ADMIN', 'Create Super Admin accounts', 'PERMISSION'),
            (2, 'EDIT_SUPER_ADMIN', 'Edit Super Admin account details', 'PERMISSION'),
            (3, 'DELETE_SUPER_ADMIN', 'Delete Super Admin accounts', 'PERMISSION'),
            (4, 'CREATE_ADMIN', 'Create Admin accounts', 'PERMISSION'),
            (5, 'EDIT_ADMIN', 'Edit Admin account details', 'PERMISSION'),
            (6, 'DELETE_ADMIN', 'Delete Admin accounts', 'PERMISSION'),
            (7, 'CREATE_USER', 'Create User accounts', 'PERMISSION'),
            (8, 'EDIT_USER', 'Edit User accounts', 'PERMISSION'),
            (9, 'DELETE_USER', 'Delete User accounts', 'PERMISSION'),
            (10, 'ASSIGN_ROLE', 'Assign roles to any account', 'PERMISSION'),
            (11, 'CHANGE_ROLE', 'Change role of any account', 'PERMISSION'),
            (12, 'FORCE_DOWNGRADE', 'Force downgrade Premium to Free', 'PERMISSION'),
            (13, 'FORCE_UPGRADE', 'Force upgrade Free to Premium', 'PERMISSION'),
            (14, 'LOCK_ACCOUNT', 'Lock any account', 'PERMISSION'),
            (15, 'BAN_ACCOUNT', 'Permanently ban any account', 'PERMISSION'),
            (16, 'FORCE_PASSWORD_RESET', 'Force password reset for any account', 'PERMISSION'),
            (17, 'FORCE_LOGOUT', 'Force logout from all sessions', 'PERMISSION'),
            (18, 'VIEW_LOGIN_HISTORY', 'View login history of any account', 'PERMISSION'),
            (19, 'RESET_MFA', 'Reset MFA / 2FA for any account', 'PERMISSION'),
            (20, 'ENFORCE_PASSWORD_POLICY', 'Enforce password policies globally', 'PERMISSION'),
            
            # 1.2 Subscription & Pricing Management (21-35)
            (21, 'CREATE_PLAN', 'Create subscription plans', 'PERMISSION'),
            (22, 'EDIT_PLAN', 'Edit subscription plans', 'PERMISSION'),
            (23, 'DELETE_PLAN', 'Delete subscription plans', 'PERMISSION'),
            (24, 'SET_MONTHLY_PRICE', 'Set monthly pricing', 'PERMISSION'),
            (25, 'SET_YEARLY_PRICE', 'Set yearly pricing', 'PERMISSION'),
            (26, 'SET_TRIAL_DURATION', 'Define free trial duration', 'PERMISSION'),
            (27, 'TOGGLE_TRIAL', 'Enable / disable free trials', 'PERMISSION'),
            (28, 'CONFIG_UPGRADE_PATH', 'Configure upgrade paths', 'PERMISSION'),
            (29, 'CONFIG_DOWNGRADE_PATH', 'Configure downgrade behavior', 'PERMISSION'),
            (30, 'DEFINE_GRACE_PERIOD', 'Define grace periods', 'PERMISSION'),
            (31, 'DEFINE_CANCEL_RULES', 'Define cancellation rules', 'PERMISSION'),
            (32, 'ENABLE_PROMO_PRICE', 'Enable promotional pricing', 'PERMISSION'),
            (33, 'CONFIG_COUPONS', 'Configure coupons & discounts', 'PERMISSION'),
            (34, 'SET_REGIONAL_PRICE', 'Set regional pricing', 'PERMISSION'),
            (35, 'CONFIG_TAX_RULES', 'Configure tax rules', 'PERMISSION'),
            
            # 1.3 Feature Entitlement Configuration (36-47)
            (36, 'ENABLE_TOOL_PLAN', 'Enable tools per plan', 'PERMISSION'),
            (37, 'DISABLE_TOOL_PLAN', 'Disable tools per plan', 'PERMISSION'),
            (38, 'SET_DAILY_LIMIT_PLAN', 'Set daily operation limits per plan', 'PERMISSION'),
            (39, 'SET_MONTHLY_LIMIT_PLAN', 'Set monthly operation limits per plan', 'PERMISSION'),
            (40, 'CONFIG_BATCH_ACCESS', 'Configure batch processing availability', 'PERMISSION'),
            (41, 'CONFIG_OCR_ACCESS', 'Configure OCR access', 'PERMISSION'),
            (42, 'CONFIG_EDIT_ACCESS', 'Configure PDF editing access', 'PERMISSION'),
            (43, 'CONFIG_WATERMARK', 'Configure watermark rules', 'PERMISSION'),
            (44, 'CONFIG_QUALITY_LEVELS', 'Configure output quality levels', 'PERMISSION'),
            (45, 'CONFIG_SPEED_TIERS', 'Configure processing speed tiers', 'PERMISSION'),
            (46, 'CONFIG_CONCURRENT_JOBS', 'Configure concurrent job limits', 'PERMISSION'),
            (47, 'TOGGLE_ADS_PLAN', 'Enable / disable ads per plan', 'PERMISSION'),
            
            # 1.4 Payment & Revenue Management (48-58)
            (48, 'INTEGRATE_GATEWAY', 'Integrate payment gateways', 'PERMISSION'),
            (49, 'TOGGLE_PAYMENT_METHOD', 'Enable / disable payment methods', 'PERMISSION'),
            (50, 'VIEW_TRANSACTIONS', 'View all transactions', 'PERMISSION'),
            (51, 'VIEW_INVOICES', 'View all invoices', 'PERMISSION'),
            (52, 'VIEW_FAILED_PAYMENTS', 'View failed payments', 'PERMISSION'),
            (53, 'RETRY_PAYMENT', 'Retry failed payments', 'PERMISSION'),
            (54, 'ISSUE_PARTIAL_REFUND', 'Issue partial refunds', 'PERMISSION'),
            (55, 'ISSUE_FULL_REFUND', 'Issue full refunds', 'PERMISSION'),
            (56, 'CONFIG_REFUND_POLICY', 'Configure refund policies', 'PERMISSION'),
            (57, 'VIEW_REVENUE_ANALYTICS', 'View revenue analytics', 'PERMISSION'),
            (58, 'EXPORT_FINANCIAL_REPORT', 'Export financial reports', 'PERMISSION'),
            
            # 1.5 PDF Tool System Management - Global (59-72)
            (59, 'ENABLE_MERGE_GLOBAL', 'Enable PDF Merge globally', 'SYSTEM_CONFIG'),
            (60, 'DISABLE_MERGE_GLOBAL', 'Disable PDF Merge globally', 'SYSTEM_CONFIG'),
            (61, 'ENABLE_SPLIT_GLOBAL', 'Enable PDF Split globally', 'SYSTEM_CONFIG'),
            (62, 'DISABLE_SPLIT_GLOBAL', 'Disable PDF Split globally', 'SYSTEM_CONFIG'),
            (63, 'ENABLE_COMPRESS_GLOBAL', 'Enable PDF Compress globally', 'SYSTEM_CONFIG'),
            (64, 'DISABLE_COMPRESS_GLOBAL', 'Disable PDF Compress globally', 'SYSTEM_CONFIG'),
            (65, 'ENABLE_CONVERT_GLOBAL', 'Enable PDF Convert globally', 'SYSTEM_CONFIG'),
            (66, 'DISABLE_CONVERT_GLOBAL', 'Disable PDF Convert globally', 'SYSTEM_CONFIG'),
            (67, 'ENABLE_OCR_GLOBAL', 'Enable OCR globally', 'SYSTEM_CONFIG'),
            (68, 'DISABLE_OCR_GLOBAL', 'Disable OCR globally', 'SYSTEM_CONFIG'),
            (69, 'ENABLE_EDIT_GLOBAL', 'Enable PDF Edit globally', 'SYSTEM_CONFIG'),
            (70, 'DISABLE_EDIT_GLOBAL', 'Disable PDF Edit globally', 'SYSTEM_CONFIG'),
            (71, 'ENABLE_SIGN_GLOBAL', 'Enable PDF Sign globally', 'SYSTEM_CONFIG'),
            (72, 'DISABLE_SIGN_GLOBAL', 'Disable PDF Sign globally', 'SYSTEM_CONFIG'),
            
            # 1.6 File & Storage Management (73-82)
            (73, 'SET_GLOBAL_MAX_SIZE', 'Set global max file size', 'SYSTEM_CONFIG'),
            (74, 'SET_USER_SIZE_LIMIT', 'Set per-user file size limits', 'PERMISSION'),
            (75, 'SET_AUTO_DELETE', 'Set auto-delete duration', 'SYSTEM_CONFIG'),
            (76, 'CONFIG_AUTO_DELETE_TIERS', 'Configure auto-delete by tier', 'SYSTEM_CONFIG'),
            (77, 'ENABLE_ENCRYPTED_STORAGE', 'Enable encrypted storage', 'SYSTEM_CONFIG'),
            (78, 'CONFIG_VIRUS_SCAN', 'Configure virus scanning', 'SYSTEM_CONFIG'),
            (79, 'CONFIG_RETENTION', 'Configure file retention rules', 'SYSTEM_CONFIG'),
            (80, 'CONFIG_STORAGE_QUOTA', 'Configure storage quotas', 'PERMISSION'),
            (81, 'MONITOR_STORAGE', 'Monitor storage usage', 'PERMISSION'),
            (82, 'EXPAND_STORAGE', 'Expand storage capacity', 'PERMISSION'),
            
            # 1.7 API & Integration Management (83-90)
            (83, 'ENABLE_API_ACCESS', 'Enable API access', 'PERMISSION'),
            (84, 'DISABLE_API_ACCESS', 'Disable API access', 'PERMISSION'),
            (85, 'ISSUE_API_KEY', 'Issue API keys', 'PERMISSION'),
            (86, 'REVOKE_API_KEY', 'Revoke API keys', 'PERMISSION'),
            (87, 'SET_API_RATE_LIMIT', 'Set API rate limits', 'SYSTEM_CONFIG'),
            (88, 'MONITOR_API_USAGE', 'Monitor API usage', 'PERMISSION'),
            (89, 'ENABLE_CLOUD_INTEGRATION', 'Enable cloud integrations', 'SYSTEM_CONFIG'),
            (90, 'DISABLE_CLOUD_INTEGRATION', 'Disable cloud integrations', 'SYSTEM_CONFIG'),
            
            # 1.8 Security & Compliance (91-100)
            (91, 'VIEW_AUDIT_LOGS', 'View system audit logs', 'PERMISSION'),
            (92, 'EXPORT_AUDIT_LOGS', 'Export audit logs', 'PERMISSION'),
            (93, 'CONFIG_IP_WHITELIST', 'Configure IP whitelisting', 'SYSTEM_CONFIG'),
            (94, 'CONFIG_IP_BLACKLIST', 'Configure IP blacklisting', 'SYSTEM_CONFIG'),
            (95, 'ENABLE_DDOS_PROTECTION', 'Enable DDoS protection', 'SYSTEM_CONFIG'),
            (96, 'CONFIG_ABUSE_RULES', 'Configure abuse detection rules', 'SYSTEM_CONFIG'),
            (97, 'ENFORCE_GDPR', 'Enforce GDPR compliance', 'PERMISSION'),
            (98, 'EXECUTE_DATA_DELETION', 'Execute user data deletion', 'PERMISSION'),
            (99, 'EXECUTE_DATA_EXPORT', 'Execute data export requests', 'PERMISSION'),
            (100, 'MANAGE_CONSENT', 'Manage consent policies', 'PERMISSION'),
            
            # 1.9 Analytics & Monitoring (101-107)
            (101, 'VIEW_DAU_MAU', 'View DAU / MAU metrics', 'PERMISSION'),
            (102, 'VIEW_CONVERSION', 'View conversion rates', 'PERMISSION'),
            (103, 'VIEW_CHURN', 'View churn rate', 'PERMISSION'),
            (104, 'VIEW_TOOL_ANALYTICS', 'View tool usage analytics', 'PERMISSION'),
            (105, 'VIEW_PERFORMANCE', 'View system performance metrics', 'PERMISSION'),
            (106, 'MONITOR_QUEUE', 'Monitor job queue health', 'PERMISSION'),
            (107, 'MONITOR_FAILURE_RATES', 'Monitor failure rates', 'PERMISSION'),
            
            # ============================================
            # SECTION 2: ADMIN (Tasks 108-145)
            # Admin can REQUEST tool tier changes, Super Admin approves
            # ============================================
            
            # 2.1 User Management Operations (108-116)
            (108, 'VIEW_USER_PROFILE', 'View user profiles', 'PERMISSION'),
            (109, 'VIEW_SUB_STATUS', 'View subscription status', 'PERMISSION'),
            (110, 'VIEW_USAGE_HISTORY', 'View usage history', 'PERMISSION'),
            (111, 'REQUEST_UPGRADE_USER', 'Request to upgrade users (needs approval)', 'PERMISSION'),
            (112, 'REQUEST_DOWNGRADE_USER', 'Request to downgrade users (needs approval)', 'PERMISSION'),
            (113, 'SUSPEND_USER', 'Temporarily suspend users', 'PERMISSION'),
            (114, 'REACTIVATE_USER', 'Reactivate suspended users', 'PERMISSION'),
            (115, 'RESET_USER_PWD', 'Reset user passwords', 'PERMISSION'),
            (116, 'VERIFY_USER_EMAIL', 'Verify user email status', 'PERMISSION'),
            
            # 2.2 Usage & Abuse Monitoring (117-122)
            (117, 'MONITOR_DAILY_USAGE', 'Monitor daily user usage', 'PERMISSION'),
            (118, 'IDENTIFY_ABNORMAL_USAGE', 'Identify abnormal usage', 'PERMISSION'),
            (119, 'FLAG_ABUSE', 'Flag users for abuse', 'PERMISSION'),
            (120, 'APPLY_RATE_LIMIT', 'Apply temporary rate limits', 'PERMISSION'),
            (121, 'ENFORCE_USAGE_CAP', 'Enforce usage caps', 'PERMISSION'),
            (122, 'ESCALATE_TO_SUPER', 'Escalate violations to Super Admin', 'PERMISSION'),
            
            # 2.3 Tool Control (123-127) - THESE REQUIRE APPROVAL
            (123, 'REQUEST_ENABLE_TOOL_USER', 'Request to enable tools for user (needs approval)', 'PERMISSION'),
            (124, 'REQUEST_DISABLE_TOOL_USER', 'Request to disable tools for user (needs approval)', 'PERMISSION'),
            (125, 'REQUEST_ADJUST_USER_LIMIT', 'Request to adjust per-user limits (needs approval)', 'PERMISSION'),
            (126, 'REQUEST_TOGGLE_USER_WATERMARK', 'Request to toggle watermark per user (needs approval)', 'PERMISSION'),
            (127, 'CONFIG_REGION_TOOL', 'Configure tool availability per region', 'PERMISSION'),
            
            # 2.4 Support Operations (128-134)
            (128, 'VIEW_TICKETS', 'View support tickets', 'PERMISSION'),
            (129, 'RESPOND_TICKET', 'Respond to tickets', 'PERMISSION'),
            (130, 'ESCALATE_TICKET', 'Escalate tickets', 'PERMISSION'),
            (131, 'VIEW_JOB_LOGS', 'View job failure logs', 'PERMISSION'),
            (132, 'RETRY_JOB', 'Retry failed PDF jobs', 'PERMISSION'),
            (133, 'ASSIST_BILLING', 'Assist with billing inquiries', 'PERMISSION'),
            (134, 'ASSIST_SUB', 'Assist with subscription issues', 'PERMISSION'),
            
            # 2.5 Content Management (135-141)
            (135, 'CREATE_FAQ', 'Create FAQ articles', 'PERMISSION'),
            (136, 'EDIT_FAQ', 'Edit FAQ articles', 'PERMISSION'),
            (137, 'DELETE_FAQ', 'Delete FAQ articles', 'PERMISSION'),
            (138, 'CREATE_TUTORIAL', 'Create tutorials', 'PERMISSION'),
            (139, 'UPDATE_TUTORIAL', 'Update tutorials', 'PERMISSION'),
            (140, 'PUBLISH_ANNOUNCEMENT', 'Publish system announcements', 'PERMISSION'),
            (141, 'SCHEDULE_ANNOUNCEMENT', 'Schedule announcements', 'PERMISSION'),
            
            # 2.6 Reporting (142-145)
            (142, 'GEN_DAILY_REPORT', 'Generate daily usage reports', 'PERMISSION'),
            (143, 'GEN_MONTHLY_REPORT', 'Generate monthly usage reports', 'PERMISSION'),
            (144, 'GEN_SUB_REPORT', 'Generate subscription reports', 'PERMISSION'),
            (145, 'EXPORT_REPORT', 'Export reports', 'PERMISSION'),
            
            # ============================================
            # SECTION 3: FREE USER (Tasks 146-167)
            # ============================================
            
            # 3.1 Account Management (146-150)
            (146, 'REGISTER', 'Register account', 'PERMISSION'),
            (147, 'VERIFY_EMAIL', 'Verify email', 'PERMISSION'),
            (148, 'LOGIN', 'Login / logout', 'PERMISSION'),
            (149, 'RESET_PWD', 'Reset own password', 'PERMISSION'),
            (150, 'UPDATE_PROFILE', 'Update own profile', 'PERMISSION'),
            
            # 3.2 PDF Tools (Limited) (151-155)
            (151, 'UPLOAD_FILE', 'Upload PDF files', 'TOOL'),
            (152, 'MERGE_PDF_LIMITED', 'Merge PDFs (max 5 files)', 'TOOL'),
            (153, 'SPLIT_PDF_LIMITED', 'Split PDFs (max 20 pages)', 'TOOL'),
            (154, 'COMPRESS_PDF_LIMITED', 'Compress PDFs (standard quality)', 'TOOL'),
            (155, 'CONVERT_PDF_BASIC', 'Convert PDFs (PDF, JPG only)', 'TOOL'),
            
            # 3.3 Usage Restrictions (156-160)
            (156, 'DAY_LIMIT_10', 'Limited to 10 operations per day', 'PERMISSION'),
            (157, 'FILE_SIZE_LIMIT_10MB', 'Max file size 10MB', 'PERMISSION'),
            (158, 'WATERMARK_APPLIED', 'Watermark applied to output', 'PERMISSION'),
            (159, 'STANDARD_QUEUE', 'Standard processing queue', 'PERMISSION'),
            (160, 'TEMP_STORAGE_1HR', 'Files deleted after 1 hour', 'PERMISSION'),
            
            # 3.4 Ads & Monetization (161-164)
            (161, 'VIEW_ADS', 'View ads', 'PERMISSION'),
            (162, 'VIEW_UPGRADE_PROMPTS', 'View upgrade prompts', 'PERMISSION'),
            (163, 'VIEW_FEATURE_PREVIEWS', 'View premium feature previews', 'PERMISSION'),
            (164, 'START_TRIAL', 'Start premium trial', 'PERMISSION'),
            
            # 3.5 Cloud & Storage (165-167)
            (165, 'LOCAL_DOWNLOAD_ONLY', 'Local download only', 'PERMISSION'),
            (166, 'NO_CLOUD_SAVE', 'No cloud save', 'PERMISSION'),
            (167, 'NO_HISTORY', 'No file history', 'PERMISSION'),
            
            # ============================================
            # SECTION 4: PREMIUM USER (Tasks 168-196)
            # ============================================
            
            # 4.1 Subscription Management (168-171)
            (168, 'VIEW_BILLING', 'View billing dashboard', 'PERMISSION'),
            (169, 'MANAGE_SUB', 'Manage subscription', 'PERMISSION'),
            (170, 'VIEW_INVOICES_OWN', 'View own invoices', 'PERMISSION'),
            (171, 'CANCEL_SUB', 'Cancel subscription', 'PERMISSION'),
            
            # 4.2 PDF Tools (Full Access) (172-180)
            (172, 'MERGE_PDF_UNLIMITED', 'Merge PDFs (unlimited files)', 'TOOL'),
            (173, 'SPLIT_PDF_ADVANCED', 'Split PDFs (advanced options)', 'TOOL'),
            (174, 'COMPRESS_PDF_HIGH', 'Compress PDFs (high quality settings)', 'TOOL'),
            (175, 'CONVERT_PDF_ALL', 'Convert PDFs (all formats)', 'TOOL'),
            (176, 'EDIT_PDF', 'Edit PDFs (text, images, annotations)', 'TOOL'),
            (177, 'OCR_PDF', 'OCR scanned PDFs', 'TOOL'),
            (178, 'SIGN_PDF', 'Sign PDFs (digital signatures)', 'TOOL'),
            (179, 'PROTECT_PDF', 'Protect PDFs (password, permissions)', 'TOOL'),
            (180, 'UNLOCK_PDF', 'Unlock PDFs (remove restrictions)', 'TOOL'),
            
            # 4.3 Advanced Processing (181-184)
            (181, 'BATCH_PROCESS', 'Batch processing', 'TOOL'),
            (182, 'HIGH_PRIORITY_QUEUE', 'Priority processing queue', 'PERMISSION'),
            (183, 'CONCURRENT_JOBS', 'Multiple concurrent jobs', 'PERMISSION'),
            (184, 'LARGE_FILE_UPLOAD', 'Large file upload (up to 100MB)', 'PERMISSION'),
            
            # 4.4 Cloud Integration (185-189)
            (185, 'GOOGLE_DRIVE_SAVE', 'Save to Google Drive', 'TOOL'),
            (186, 'DROPBOX_SAVE', 'Save to Dropbox', 'TOOL'),
            (187, 'ONEDRIVE_SAVE', 'Save to OneDrive', 'TOOL'),
            (188, 'VIEW_FILE_HISTORY', 'View file history', 'PERMISSION'),
            (189, 'EXTENDED_STORAGE', 'Extended file storage (7 days)', 'PERMISSION'),
            
            # 4.5 Security & Privacy (190-193)
            (190, 'NO_WATERMARK', 'No watermark on output', 'PERMISSION'),
            (191, 'ENCRYPTED_PROCESSING', 'Encrypted processing', 'PERMISSION'),
            (192, 'SECURE_DELETE', 'Secure file deletion', 'PERMISSION'),
            (193, 'PRIVACY_MODE', 'Privacy mode', 'PERMISSION'),
            
            # 4.6 Support (194-196)
            (194, 'PRIORITY_SUPPORT', 'Priority support', 'PERMISSION'),
            (195, 'LIVE_CHAT', 'Live chat support', 'PERMISSION'),
            (196, 'DEDICATED_SUPPORT', 'Dedicated support channel', 'PERMISSION'),
            
            # ============================================
            # SECTION 5: ENTERPRISE (Tasks 197-203)
            # ============================================
            (197, 'CREATE_ORG', 'Create organization accounts', 'PERMISSION'),
            (198, 'MANAGE_TEAM_MEMBERS', 'Manage team members', 'PERMISSION'),
            (199, 'ALLOCATE_TEAM_QUOTA', 'Allocate team quotas', 'PERMISSION'),
            (200, 'SSO_INTEGRATION', 'SSO integration (SAML, OAuth)', 'PERMISSION'),
            (201, 'EXPORT_AUDIT_ENTERPRISE', 'Export enterprise audit logs', 'PERMISSION'),
            (202, 'API_AUTOMATION', 'Full API automation', 'PERMISSION'),
            (203, 'SLA_MONITORING', 'SLA monitoring', 'PERMISSION'),
        ]
        
        self.stdout.write("Initializing all 203 RBAC Permissions...")
        
        count = 0
        created = 0
        updated = 0
        
        for pid, code, desc, cat_type in permissions:
            # Map category
            if cat_type == 'TOOL':
                cat = Feature.Category.TOOL
            elif cat_type == 'SYSTEM_CONFIG':
                cat = Feature.Category.SYSTEM_CONFIG
            else:
                cat = Feature.Category.PERMISSION
                
            feature, was_created = Feature.objects.update_or_create(
                permission_id=pid,
                defaults={
                    'name': desc,
                    'code': code,
                    'description': desc,
                    'category': cat
                }
            )
            count += 1
            if was_created:
                created += 1
            else:
                updated += 1
            
            # SUPER ADMIN gets ALL permissions
            RolePermission.objects.get_or_create(role=User.Roles.SUPER_ADMIN, feature=feature)
            
            # ADMIN gets Task 108-145 (operations, but tool changes need approval)
            if 108 <= pid <= 145:
                RolePermission.objects.get_or_create(role=User.Roles.ADMIN, feature=feature)
            
            # USER gets basic account permissions (146-150, 161-167)
            if (146 <= pid <= 150) or (161 <= pid <= 167):
                RolePermission.objects.get_or_create(role=User.Roles.USER, feature=feature)
            
            # Note: TOOL permissions (151-155 for free, 172-196 for premium) are granted via Plan, not Role

        self.stdout.write(self.style.SUCCESS(
            f"✅ Synced {count} permissions ({created} created, {updated} updated)"
        ))
        self.stdout.write(self.style.SUCCESS(
            f"✅ Assigned to Super Admin: ALL | Admin: 108-145 | User: 146-150, 161-167"
        ))
        self.stdout.write(self.style.WARNING(
            f"⚠️  Tool permissions (151-155, 172-196) are granted via subscription Plan, not Role"
        ))
