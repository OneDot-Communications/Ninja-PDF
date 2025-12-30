"""Feedback API Serializers"""
from rest_framework import serializers


class FeedbackSerializer(serializers.Serializer):
    """Serializer for user feedback submissions"""
    
    FEEDBACK_TYPE_CHOICES = [
        ('bug', 'Bug'),
        ('functionality', 'Add functionality'),
        ('ui', 'Change UI'),
    ]
    
    name = serializers.CharField(
        max_length=255,
        required=True,
        help_text="Name of the person providing feedback"
    )
    
    feedback_type = serializers.ChoiceField(
        choices=FEEDBACK_TYPE_CHOICES,
        required=True,
        help_text="Type of feedback"
    )
    
    description = serializers.CharField(
        required=True,
        help_text="Detailed description of the feedback"
    )
    
    def validate_name(self, value):
        """Validate name is not empty after stripping whitespace"""
        if not value.strip():
            raise serializers.ValidationError("Name cannot be empty")
        return value.strip()
    
    def validate_description(self, value):
        """Validate description is not empty and has minimum length"""
        if not value.strip():
            raise serializers.ValidationError("Description cannot be empty")
        if len(value.strip()) < 10:
            raise serializers.ValidationError("Description must be at least 10 characters long")
        return value.strip()
