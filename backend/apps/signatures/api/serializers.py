"""Signatures API Serializers"""
from rest_framework import serializers
from apps.signatures.models import SignatureRequest, SignatureTemplate, SignatureContact, SavedSignature


class SignatureRequestSerializer(serializers.ModelSerializer):
    sender_email = serializers.EmailField(source='sender.email', read_only=True)
    
    class Meta:
        model = SignatureRequest
        fields = [
            'id', 'sender', 'sender_email', 'recipient_email', 'recipient_name',
            'document', 'document_name', 'status', 'message',
            'expires_at', 'signed_at', 'signed_document',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'sender', 'sender_email', 'signed_at', 'signed_document', 'created_at', 'updated_at']


class SignatureTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SignatureTemplate
        fields = ['id', 'name', 'document', 'fields', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class SignatureContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = SignatureContact
        fields = ['id', 'name', 'email', 'company', 'created_at']
        read_only_fields = ['id', 'created_at']


class SavedSignatureSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = SavedSignature
        fields = ['id', 'image', 'image_url', 'name', 'is_default', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {'image': {'write_only': True}}
    
    def get_image_url(self, obj):
        if obj.image:
            return obj.image.url
        return None

