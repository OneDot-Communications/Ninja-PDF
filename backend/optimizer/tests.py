from django.test import TestCase, Client
from django.core.files.uploadedfile import SimpleUploadedFile
import io
from PIL import Image
import pikepdf

class OptimizationTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_compress_image_view(self):
        # Create a dummy image
        img_buffer = io.BytesIO()
        img = Image.new('RGB', (1000, 1000), color='red')
        img.save(img_buffer, format='JPEG', quality=95)
        img_buffer.seek(0)
        original_size = len(img_buffer.getvalue())
        
        file = SimpleUploadedFile("test_image.jpg", img_buffer.getvalue(), content_type="image/jpeg")
        
        response = self.client.post('/optimizer/compress-image/', {'file': file, 'level': 'extreme'})
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.has_header('Content-Disposition'))
        self.assertLess(len(response.content), original_size)

    def test_compress_pdf_view_with_images(self):
        # Create a dummy PDF with an image
        pdf = pikepdf.new()
        
        # Create a large image to embed
        img_buffer = io.BytesIO()
        # Make it large enough to see compression
        img = Image.new('RGB', (2000, 2000), color='blue') 
        img.save(img_buffer, format='JPEG', quality=100)
        
        # Save image as PDF so we can merge page (easier than low-level embedding)
        pdf_img_buffer = io.BytesIO()
        img.save(pdf_img_buffer, format='PDF')
        pdf_img_buffer.seek(0)
        
        original_size = len(pdf_img_buffer.getvalue())
        
        file = SimpleUploadedFile("test_with_image.pdf", pdf_img_buffer.getvalue(), content_type="application/pdf")
        
        # Compress with 'extreme' logic
        response = self.client.post('/optimizer/compress-pdf/', {'file': file, 'level': 'extreme'})
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        
        compressed_size = len(response.content)
        # Check if size reduced
        self.assertLess(compressed_size, original_size, "Compression failed to reduce size")
        
        # Verify it's still a valid PDF
        try:
            pikepdf.open(io.BytesIO(response.content))
        except Exception:
            self.fail("Output file is not a valid PDF")
