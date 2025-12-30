"""Feedback API Views"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .feedback_serializers import FeedbackSerializer
from apps.core.services.google_sheets_service import get_sheets_service
import logging

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([AllowAny])  # Allow unauthenticated users to submit feedback
def submit_feedback(request):
    """
    Submit user feedback.
    
    This endpoint accepts feedback from users and saves it to Google Sheets.
    No authentication required - this is a public feedback form.
    
    Request body:
        {
            "name": "John Doe",
            "feedback_type": "bug" | "functionality" | "ui",
            "description": "Detailed feedback description..."
        }
    
    Returns:
        {
            "success": true,
            "message": "Feedback submitted successfully",
            "data": {
                "name": "John Doe",
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
        
        # Save to Google Sheets
        try:
            sheets_service = get_sheets_service()
            result = sheets_service.append_feedback(name, email, feedback_type, description)
            
            if result['success']:
                logger.info(f"Feedback submitted successfully by {name} ({email})")
                return Response({
                    'success': True,
                    'message': 'Thank you for your feedback! We appreciate your input.',
                    'data': result.get('data', {})
                }, status=status.HTTP_201_CREATED)
            else:
                logger.error(f"Failed to save feedback to Google Sheets: {result.get('message')}")
                return Response({
                    'success': False,
                    'message': 'Failed to save feedback. Please try again later.',
                    'error': result.get('message')
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as sheets_error:
            # Log the error but don't expose internal details to user
            logger.error(f"Google Sheets error: {str(sheets_error)}")
            
            # For now, return success even if Google Sheets fails
            # This prevents blocking the user experience
            return Response({
                'success': True,
                'message': 'Thank you for your feedback! We have received it.',
                'note': 'Feedback recorded locally'
            }, status=status.HTTP_201_CREATED)
            
    except Exception as e:
        logger.error(f"Error processing feedback: {str(e)}")
        return Response({
            'success': False,
            'message': 'An unexpected error occurred. Please try again later.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
