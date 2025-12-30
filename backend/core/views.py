from rest_framework import viewsets, status, permissions, parsers
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from .models import SystemSetting, AdminActionRequest, PlatformBranding
from .serializers import SystemSettingSerializer, AdminActionRequestSerializer, PlatformBrandingSerializer
from apps.accounts.models import User

class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.role == 'SUPER_ADMIN' or request.user.is_superuser)

class IsAdminOrSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.role == 'ADMIN' or request.user.role == 'SUPER_ADMIN')

class PublicSettingsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from django.conf import settings
        branding = PlatformBranding.load()
        serializer = PlatformBrandingSerializer(branding, context={'request': request})
        data = serializer.data
        data['config'] = {
            'stripe_public_key': getattr(settings, 'STRIPE_PUBLIC_KEY', ''),
            'razorpay_key_id': getattr(settings, 'RAZORPAY_KEY_ID', ''),
        }
        return Response(data)

class AdminBrandingView(APIView):
    permission_classes = [IsSuperAdmin]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def get(self, request):
        branding = PlatformBranding.load()
        serializer = PlatformBrandingSerializer(branding, context={'request': request})
        return Response(serializer.data)

    def patch(self, request):
        branding = PlatformBranding.load()
        
        # Create Version Snapshot before saving
        from .models import ContentVersion
        import json
        
        # Create snapshot data, handling logo field properly
        snapshot_data = {
            'platform_name': branding.platform_name,
            'hero_title': branding.hero_title,
            'hero_subtitle': branding.hero_subtitle,
            'primary_color': branding.primary_color,
            'logo': branding.logo.url if branding.logo else None,
            'is_active': branding.is_active,
            'updated_at': branding.updated_at.isoformat() if branding.updated_at else None
        }
        
        ContentVersion.objects.create(
            snapshot=snapshot_data,
            created_by=request.user,
            note="Auto-save before update"
        )
        
        # Update fields manually
        if 'platform_name' in request.data:
            branding.platform_name = request.data['platform_name']
        if 'hero_title' in request.data:
            branding.hero_title = request.data['hero_title']
        if 'hero_subtitle' in request.data:
            branding.hero_subtitle = request.data['hero_subtitle']
        if 'primary_color' in request.data:
            branding.primary_color = request.data['primary_color']
        if 'logo' in request.FILES:
            branding.logo = request.FILES['logo']
        
        branding.save()
        
        serializer = PlatformBrandingSerializer(branding, context={'request': request})
        return Response(serializer.data)


class SystemSettingViewSet(viewsets.ModelViewSet):
    queryset = SystemSetting.objects.all()
    serializer_class = SystemSettingSerializer
    permission_classes = [IsSuperAdmin] # Strict: only Super Admin can change settings
    lookup_field = 'key'

class AdminActionRequestViewSet(viewsets.ModelViewSet):
    queryset = AdminActionRequest.objects.all().order_by('-created_at')
    serializer_class = AdminActionRequestSerializer
    permission_classes = [IsAdminOrSuperAdmin]

    def perform_create(self, serializer):
        serializer.save(requester=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsSuperAdmin])
    def approve(self, request, pk=None):
        req = self.get_object()
        if req.status != 'PENDING':
             return Response({'error': 'Request is not pending'}, status=status.HTTP_400_BAD_REQUEST)
        
        req.status = 'APPROVED'
        req.reviewer = request.user
        req.save()
        
        # Execute the logic based on action_type
        success = self._execute_action(req)
        if not success:
            return Response({'error': 'Action execution failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({'status': 'approved'})

    @action(detail=True, methods=['post'], permission_classes=[IsSuperAdmin])
    def reject(self, request, pk=None):
        req = self.get_object()
        if req.status != 'PENDING':
             return Response({'error': 'Request is not pending'}, status=status.HTTP_400_BAD_REQUEST)
        
        req.status = 'REJECTED'
        req.reviewer = request.user
        req.review_note = request.data.get('note', '')
        req.save()
        
        return Response({'status': 'rejected'})

    def _execute_action(self, req):
        """
        Routing logic for executing approved actions.
        """
        payload = req.payload
        try:
            if req.action_type == 'CHANGE_ROLE':
                user_id = payload.get('user_id')
                new_role = payload.get('new_role')
                user = User.objects.get(id=user_id)
                user.role = new_role
                user.save()
                return True
            
            elif req.action_type == 'CHANGE_USER_PLAN':
                from apps.subscriptions.models.subscription import Plan, Subscription
                user_id = payload.get('user_id')
                plan_slug = payload.get('plan_slug')
                user = User.objects.get(id=user_id)
                plan = Plan.objects.get(slug=plan_slug)
                
                sub, created = Subscription.objects.get_or_create(user=user)
                sub.plan = plan
                sub.status = 'ACTIVE'
                sub.save()
                return True

        except Exception as e:
            print(f"Error executing action {req.action_type}: {e}")
            return False
        
        return True

class ContentVersionViewSet(viewsets.ReadOnlyModelViewSet):
    from .models import ContentVersion
    from .serializers import ContentVersionSerializer
    
    queryset = ContentVersion.objects.all().order_by('-created_at')
    serializer_class = ContentVersionSerializer
    permission_classes = [IsSuperAdmin]

    @action(detail=True, methods=['post'])
    def revert(self, request, pk=None):
        version = self.get_object()
        snapshot = version.snapshot
        
        # Apply snapshot to singleton
        branding = PlatformBranding.load()
        serializer = PlatformBrandingSerializer(branding, data=snapshot)
        if serializer.is_valid():
            serializer.save()
            return Response({'status': 'reverted', 'data': serializer.data})
        return Response({'error': 'Invalid snapshot data'}, status=status.HTTP_400_BAD_REQUEST)

from celery.result import AsyncResult

class TaskStatusView(APIView):
    """
    Checks the status of an async Celery task.
    """
    permission_classes = [permissions.AllowAny] # Or Authenticated depending on needs (Guests need this too)

    def get(self, request, task_id):
        res = AsyncResult(task_id)
        
        status_data = {
            'task_id': task_id,
            'status': res.status,
        }
        
        if res.status == 'SUCCESS':
            status_data['result'] = res.result
        elif res.status == 'FAILURE':
             status_data['error'] = str(res.result)
        
        # If State is standard (PENDING, STARTED, RETRY), just return status
        return Response(status_data)

class UserTaskViewSet(viewsets.ReadOnlyModelViewSet):
    """
    List user's own tasks history.
    """
    from .models import TaskLog
    from .serializers import TaskLogSerializer
    
    serializer_class = TaskLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        from .models import TaskLog
        return TaskLog.objects.filter(user=self.request.user).order_by('-created_at')





class SupportTicketViewSet(viewsets.ModelViewSet):
    """
    Manage support tickets.
    """
    from .models import SupportTicket
    from .serializers import SupportTicketSerializer
    
    queryset = SupportTicket.objects.all()
    serializer_class = SupportTicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Admins see all, Users see their own
        user = self.request.user
        if user.role in ['ADMIN', 'SUPER_ADMIN']:
            return self.queryset
        return self.queryset.filter(user=user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class LegalDocumentView(APIView):
    """
    Serve legal documents (Privacy Policy, Terms) via API.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        # In a real app, these could be in the DB or flat files.
        # Hardcoding for launch readiness as requested.
        documents = {
            'terms-of-service': {
                'title': 'Terms and Conditions of Service',
                'last_updated': '2025-12-19',
                'content': '''
                    <h2>1. Acceptance of Terms</h2>
                    <p>By accessing or using this platform (“Service”), you confirm that you have read, understood, and agree to be bound by these Terms and Conditions (“Terms”). If you do not agree, you must not use the Service.</p>
                    <p>Use of the Service constitutes a legally binding agreement between you (“User”) and the Service operator (“Company”).</p>

                    <h2>2. Eligibility</h2>
                    <p>You must be at least the age of legal majority in your jurisdiction to use this Service. By using the Service, you represent and warrant that you meet this requirement.</p>

                    <h2>3. Account Registration</h2>
                    <ul>
                        <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                        <li>You are responsible for all activities conducted under your account.</li>
                        <li>The Company is not liable for unauthorized access resulting from your failure to secure your credentials.</li>
                    </ul>

                    <h2>4. Description of Services</h2>
                    <p>The Service provides online tools for processing, converting, editing, securing, and managing PDF and related document formats, including automated workflows.</p>
                    <p>The Company may modify, suspend, or discontinue any part of the Service at any time without prior notice.</p>

                    <h2>5. User Content & File Ownership</h2>
                    <ul>
                        <li>You retain full ownership of all files uploaded by you to the Service.</li>
                        <li>By uploading files, you grant the Company a <strong>limited, temporary, non-exclusive license</strong> to process the files solely for the purpose of providing the requested Service.</li>
                        <li>Files are not accessed, reviewed, or used for any other purpose.</li>
                    </ul>

                    <h2>6. Prohibited Use</h2>
                    <p>You agree NOT to:</p>
                    <ul>
                        <li>Upload illegal, copyrighted, harmful, or malicious content</li>
                        <li>Upload files you do not have the legal right to process</li>
                        <li>Use the Service for surveillance, harassment, or unlawful activities</li>
                        <li>Attempt to bypass usage limits or security controls</li>
                        <li>Reverse engineer or abuse system resources</li>
                    </ul>
                    <p>Violation may result in suspension or permanent termination.</p>

                    <h2>7. Service Availability</h2>
                    <p>The Service is provided “AS IS” and “AS AVAILABLE.” The Company does not guarantee uninterrupted or error-free operation.</p>

                    <h2>8. Limitation of Liability</h2>
                    <p>To the maximum extent permitted by law:</p>
                    <ul>
                        <li>The Company shall not be liable for any indirect, incidental, or consequential damages.</li>
                        <li>Total liability shall not exceed the amount paid by the User in the preceding billing period.</li>
                    </ul>

                    <h2>9. Termination</h2>
                    <p>The Company may suspend or terminate accounts:</p>
                    <ul>
                        <li>For violations of these Terms</li>
                        <li>For abuse or misuse</li>
                        <li>For legal or regulatory reasons</li>
                    </ul>
                    <p>Users may terminate their account at any time.</p>

                    <h2>10. Governing Law</h2>
                    <p>These Terms shall be governed by and construed in accordance with applicable international commercial laws, without regard to conflict of law principles.</p>
                '''
            },
            'privacy-policy': {
                'title': 'Privacy Policy',
                'last_updated': '2025-12-19',
                'content': '''
                    <h2>1. Information We Collect</h2>
                    <ul>
                        <li>Account information (email, profile data)</li>
                        <li>Uploaded files (temporarily)</li>
                        <li>Usage data</li>
                        <li>Device and session metadata</li>
                        <li>Payment metadata (processed via third-party providers)</li>
                    </ul>

                    <h2>2. Purpose of Data Collection</h2>
                    <ul>
                        <li>Provide document processing services</li>
                        <li>Maintain security and prevent abuse</li>
                        <li>Improve performance and features</li>
                        <li>Process payments and subscriptions</li>
                        <li>Comply with legal obligations</li>
                    </ul>

                    <h2>3. File Handling & Deletion</h2>
                    <ul>
                        <li>Uploaded files are stored temporarily.</li>
                        <li>Files are automatically deleted after a defined period based on account type.</li>
                        <li>Premium users may configure custom deletion rules.</li>
                    </ul>

                    <h2>4. Data Security</h2>
                    <ul>
                        <li>Encryption in transit and at rest</li>
                        <li>Restricted internal access</li>
                        <li>Regular security audits</li>
                    </ul>

                    <h2>5. Data Sharing</h2>
                    <p>We do <strong>not sell user data</strong>. Data may be shared only with:</p>
                    <ul>
                        <li>Payment processors</li>
                        <li>Cloud storage providers (if explicitly authorized)</li>
                        <li>Legal authorities when required by law</li>
                    </ul>

                    <h2>6. User Rights</h2>
                    <p>Users may request:</p>
                    <ul>
                        <li>Access to personal data</li>
                        <li>Correction of data</li>
                        <li>Deletion of data</li>
                        <li>Export of data</li>
                        <li>Withdrawal of consent</li>
                    </ul>

                    <h2>7. International Data Transfers</h2>
                    <p>Data may be processed in multiple regions using appropriate safeguards.</p>
                '''
            },
            'cookie-policy': {
                'title': 'Cookie Policy',
                'last_updated': '2025-12-19',
                'content': '''
                    <h2>1. Types of Cookies Used</h2>
                    <ul>
                        <li><strong>Essential Cookies:</strong> Required for authentication and security</li>
                        <li><strong>Functional Cookies:</strong> Preferences and settings</li>
                        <li><strong>Analytics Cookies:</strong> Usage statistics</li>
                        <li><strong>Advertising Cookies:</strong> Free-tier monetization</li>
                    </ul>

                    <h2>2. Consent</h2>
                    <p>Users are presented with a cookie consent banner and may opt-in or opt-out of non-essential cookies at any time.</p>
                '''
            },
            'payment-policy': {
                'title': 'Payment Policy',
                'last_updated': '2025-12-19',
                'content': '''
                    <h2>1. Payment Methods</h2>
                    <p>Accepted payment methods include credit/debit cards and other regionally supported options.</p>

                    <h2>2. Billing</h2>
                    <ul>
                        <li>Subscriptions are billed in advance.</li>
                        <li>Charges are automatically renewed unless cancelled.</li>
                        <li>Taxes may apply depending on jurisdiction.</li>
                    </ul>

                    <h2>3. Failed Payments</h2>
                    <ul>
                        <li>Failed payments may result in account downgrade or suspension.</li>
                        <li>Users will be notified before enforcement.</li>
                    </ul>
                '''
            },
            'subscription-policy': {
                'title': 'Subscription Policy',
                'last_updated': '2025-12-19',
                'content': '''
                    <h2>1. Plans</h2>
                    <p>The Service offers Free and Paid subscription plans with differing features and limits.</p>

                    <h2>2. Upgrades & Downgrades</h2>
                    <ul>
                        <li>Upgrades take effect immediately.</li>
                        <li>Downgrades take effect at the end of the billing cycle.</li>
                    </ul>

                    <h2>3. Cancellation</h2>
                    <p>Users may cancel at any time.</p>
                    <p>Cancellation prevents future charges but does not retroactively refund past charges.</p>
                '''
            },
            'refund-policy': {
                'title': 'Refund Policy',
                'last_updated': '2025-12-19',
                'content': '''
                    <h2>1. General Rule</h2>
                    <p>Refunds are not guaranteed and are evaluated on a case-by-case basis.</p>

                    <h2>2. Eligibility</h2>
                    <p>Refunds may be granted if:</p>
                    <ul>
                        <li>Service was unavailable due to platform fault</li>
                        <li>Billing error occurred</li>
                        <li>No substantial usage occurred</li>
                    </ul>

                    <h2>3. Non-Refundable Cases</h2>
                    <ul>
                        <li>Excessive usage</li>
                        <li>Policy violations</li>
                        <li>Change of mind after usage</li>
                    </ul>
                '''
            },
            'data-retention-policy': {
                'title': 'Data Retention & Deletion Policy',
                'last_updated': '2025-12-19',
                'content': '''
                    <ul>
                        <li>Free users: short-term file retention</li>
                        <li>Premium users: configurable retention</li>
                        <li>Logs retained for security and compliance</li>
                        <li>Backups retained per internal policy</li>
                    </ul>
                '''
            },
            'security-policy': {
                'title': 'Security & Responsible Disclosure Policy',
                'last_updated': '2025-12-19',
                'content': '''
                    <h2>Security Measures</h2>
                    <ul>
                        <li>Encryption</li>
                        <li>Access controls</li>
                        <li>Monitoring</li>
                    </ul>

                    <h2>Vulnerability Reporting</h2>
                    <p>Security issues may be reported responsibly. Verified issues may be acknowledged.</p>
                '''
            },
            'dmca-policy': {
                'title': 'DMCA & Copyright Policy',
                'last_updated': '2025-12-19',
                'content': '''
                    <ul>
                        <li>Copyright infringement notices must include required legal details.</li>
                        <li>Valid requests result in content removal.</li>
                        <li>Repeat infringers may be banned.</li>
                    </ul>
                '''
            }
        }
        
        doc = documents.get(slug)
        if not doc:
            return Response({'error': 'Document not found'}, status=status.HTTP_404_NOT_FOUND)
        
        return Response(doc)


class HealthCheckView(APIView):
    """
    Simple health check for uptime monitoring.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({
            'status': 'ok',
            'service': 'ninja-pdf-api',
            'version': '1.0.0'
        })
