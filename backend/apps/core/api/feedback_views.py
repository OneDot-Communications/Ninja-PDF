"""Feedback API Views"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .feedback_serializers import FeedbackSerializer
from apps.core.services.google_sheets_service import get_sheets_service
from core.services.email_service import EmailService
from apps.core.models import Feedback
import logging

logger = logging.getLogger(__name__)


def get_client_ip(request):
    """Extract client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


@api_view(['POST'])
@permission_classes([AllowAny])  # Allow unauthenticated users to submit feedback
def submit_feedback(request):
    """
    Submit user feedback.
    
    This endpoint accepts feedback from users and saves it to both database and Google Sheets.
    No authentication required - this is a public feedback form.
    
    Request body:
        {
            "name": "John Doe",
            "email": "john@example.com",
            "feedback_type": "bug" | "functionality" | "ui",
            "description": "Detailed feedback description..."
        }
    
    Returns:
        {
            "success": true,
            "message": "Feedback submitted successfully",
            "data": {
                "id": 123,
                "name": "John Doe",
                "email": "john@example.com",
                "feedback_type": "bug",
                "description": "...",
                "timestamp": "2025-12-30 16:30:00"
            }
        }
    """
    serializer = FeedbackSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'success': False,
            'message': 'Invalid feedback data',
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Extract validated data
        validated_data = serializer.validated_data
        name = validated_data['name']
        email = validated_data['email']
        feedback_type = validated_data['feedback_type']
        description = validated_data['description']
        proof_link = validated_data.get('proof_link', '')  # Optional field
        
        # Get user information if authenticated
        user = request.user if request.user.is_authenticated else None
        
        # If user is logged in, override email with their account email
        # This ensures we have their official registered email
        if user:
            email = user.email
            # Optionally, also use their account name if they didn't provide one
            if not name.strip() or name == 'Anonymous':
                name = user.get_full_name() or user.username
        
        # Get additional metadata
        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        # Save to database
        feedback = Feedback.objects.create(
            user=user,  # This will be the User object if logged in, None if not
            name=name,
            email=email,  # Will be user's account email if logged in
            feedback_type=feedback_type,
            description=description,
            proof_link=proof_link,  # Save proof link
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        logger.info(f"Feedback #{feedback.id} saved to database by {name} ({email}){' [User ID: ' + str(user.id) + ']' if user else ' [Anonymous]'}")

        
        # Also try to save to Google Sheets (optional)
        try:
            sheets_service = get_sheets_service()
            sheets_result = sheets_service.append_feedback(name, email, feedback_type, description, proof_link)
            
            if sheets_result['success']:
                logger.info(f"Feedback #{feedback.id} also saved to Google Sheets")
        except Exception as sheets_error:
            # Log but don't fail if Google Sheets fails
            logger.warning(f"Google Sheets save failed for feedback #{feedback.id}: {str(sheets_error)}")
        
        # Send confirmation email to user
        try:
            EmailService.send_feedback_received(email, name)
            logger.info(f"Confirmation email sent to {email}")
        except Exception as email_error:
            # Log but don't fail if email fails
            logger.error(f"Failed to send confirmation email to {email}: {str(email_error)}")

        # Return success response
        return Response({
            'success': True,
            'message': 'Thank you for your feedback! We appreciate your input.',
            'data': {
                'id': feedback.id,
                'name': feedback.name,
                'email': feedback.email,
                'feedback_type': feedback.feedback_type,
                'description': feedback.description,
                'timestamp': feedback.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                'user_id': feedback.user.id if feedback.user else None,
            }
        }, status=status.HTTP_201_CREATED)
            
    except Exception as e:
        logger.error(f"Error processing feedback: {str(e)}")
        return Response({
            'success': False,
            'message': 'An unexpected error occurred. Please try again later.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN FEEDBACK MANAGEMENT ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

from rest_framework.permissions import IsAdminUser
from rest_framework.pagination import PageNumberPagination
from .feedback_admin_serializers import FeedbackAdminListSerializer, ResolveFeedbackSerializer
from django.utils import timezone


class FeedbackPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


@api_view(['GET'])
@permission_classes([IsAdminUser])
def list_all_feedbacks(request):
    """
    List all feedback submissions (Admin only).
    
    Query params:
        - status: 'all', 'pending', 'resolved' (default: 'all')
        - page: page number (default: 1)
        - page_size: results per page (default: 20)
    
    Returns paginated list of feedbacks with user information.
    """
    status_filter = request.query_params.get('status', 'all')
    
    # Get base queryset
    feedbacks = Feedback.objects.select_related('user', 'resolved_by').order_by('-created_at')
    
    # Apply status filter
    if status_filter == 'pending':
        feedbacks = feedbacks.filter(is_resolved=False)
    elif status_filter == 'resolved':
        feedbacks = feedbacks.filter(is_resolved=True)
    # 'all' - no filter needed
    
    # Paginate results
    paginator = FeedbackPagination()
    paginated_feedbacks = paginator.paginate_queryset(feedbacks, request)
    
    # Serialize
    serializer = FeedbackAdminListSerializer(paginated_feedbacks, many=True)
    
    return paginator.get_paginated_response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def resolve_feedback(request, feedback_id):
    """
    Mark feedback as resolved (Admin only).
    
    Request body:
        {
            "admin_notes": "Optional notes"
        }
    """
    try:
        feedback = Feedback.objects.get(id=feedback_id)
    except Feedback.DoesNotExist:
        return Response({
            'success': False,
            'message': 'Feedback not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Prevent resolving already resolved feedback
    if feedback.is_resolved:
        return Response({
            'success': False,
            'message': 'Feedback is already resolved'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    serializer = ResolveFeedbackSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Mark as resolved
    admin_notes = serializer.validated_data.get('admin_notes', '')
    feedback.mark_resolved(admin_user=request.user, notes=admin_notes)
    
    logger.info(f"Feedback #{feedback.id} resolved by {request.user.username}")
    
    return Response({
        'success': True,
        'message': 'Feedback marked as resolved',
        'data': {
            'id': feedback.id,
            'is_resolved': feedback.is_resolved,
            'resolved_at': feedback.resolved_at,
            'resolved_by': request.user.username
        }
    }, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def delete_feedback(request, feedback_id):
    """
    Delete feedback submission (Admin only).
    
    This performs a hard delete of the feedback.
    """
    try:
        feedback = Feedback.objects.get(id=feedback_id)
    except Feedback.DoesNotExist:
        return Response({
            'success': False,
            'message': 'Feedback not found'
        }, status=status.HTTP_404_NOT_FOUND)
    
    feedback_info = f"#{feedback.id} from {feedback.name}"
    feedback.delete()
    
    logger.info(f"Feedback {feedback_info} deleted by {request.user.username}")
    
    return Response({
        'success': True,
        'message': 'Feedback deleted successfully'
    }, status=status.HTTP_200_OK)
