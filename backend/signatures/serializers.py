from rest_framework import serializers
from .models import SignatureRequest, Signer, Template, Contact

class SignerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Signer
        fields = '__all__'
        read_only_fields = ('auth_token', 'signed_at')

class SignatureRequestSerializer(serializers.ModelSerializer):
    signers = SignerSerializer(many=True, read_only=True)
    
    class Meta:
        model = SignatureRequest
        fields = '__all__'
        read_only_fields = ('requester', 'created_at', 'updated_at', 'status', 'signed_file')

class TemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Template
        fields = '__all__'
        read_only_fields = ('owner', 'created_at')

class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = '__all__'
        read_only_fields = ('user', 'created_at')
