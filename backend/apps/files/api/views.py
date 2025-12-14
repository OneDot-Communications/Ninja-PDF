from rest_framework import viewsets, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from .models import UserFile
import fitz # PyMuPDF
import io

class UserFileViewSet(viewsets.ModelViewSet):
    """
    Manage user's file library.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return UserFile.objects.filter(user=self.request.user).order_by('-created_at')

    # Serializer will be needed, defining inline for now or basic
    # Ideally should use a serializer file
    def get_serializer_class(self):
        from rest_framework import serializers
        class UserFileSerializer(serializers.ModelSerializer):
            class Meta:
                model = UserFile
                fields = '__all__'
        return UserFileSerializer

    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        """
        Generate a PNG preview of the first page of the file (if PDF).
        """
        user_file = self.get_object()
        
        # Check if file is PDF
        if user_file.mime_type != 'application/pdf' and not user_file.name.lower().endswith('.pdf'):
             return Response({'error': 'Preview only available for PDFs'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Open file stream
            file_content = user_file.file.read()
            doc = fitz.open(stream=file_content, filetype="pdf")
            
            # Get first page
            page = doc.load_page(0) 
            pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5)) # 1.5 zoom for better quality
            
            # Output PNG
            output = io.BytesIO()
            output.write(pix.tobytes("png"))
            output.seek(0)
            
            return HttpResponse(output, content_type="image/png")
            
        except Exception as e:
            return Response({'error': f'Failed to generate preview: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
