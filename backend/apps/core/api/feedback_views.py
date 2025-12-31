"""Feedback API Views"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .feedback_serializers import FeedbackSerializer
from apps.core.services.google_sheets_service import get_sheets_service
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
        
        # Get additional metadata
        user = request.user if request.user.is_authenticated else None
        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        # Save to database
        feedback = Feedback.objects.create(
            user=user,
            name=name,
            email=email,
            feedback_type=feedback_type,
            description=description,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        logger.info(f"Feedback #{feedback.id} saved to database by {name} ({email})")
        
        # Also try to save to Google Sheets (optional)
        try:
            sheets_service = get_sheets_service()
            sheets_result = sheets_service.append_feedback(name, email, feedback_type, description)
            
            if sheets_result['success']:
                logger.info(f"Feedback #{feedback.id} also saved to Google Sheets")
        except Exception as sheets_error:
            # Log but don't fail if Google Sheets fails
            logger.warning(f"Google Sheets save failed for feedback #{feedback.id}: {str(sheets_error)}")
        
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
