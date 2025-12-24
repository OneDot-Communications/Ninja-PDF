
import os
import django
import sys
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.subscriptions.models.subscription import Feature

def update_descriptions():
    """
    Updates the descriptions of features to the 'witty' versions requested by the user.
    """
    witty_descriptions = {
        "MERGE_PDF": "Merging PDFs is easy, merging plans… not always.",
        "SPLIT_PDF": "Breaking pages apart is fine breaking hearts is not.",
        "COMPRESS_PDF": "Making PDFs lighter—because life is heavy enough.",
        "PDF_TO_WORD": "PDFs open up in Word; hearts don’t open that easily.",
        "PDF_TO_PPT": "Turn your PDF files into easy to edit PPT and PPTX slideshows.",
        "PDF_TO_EXCEL": "Extracting data is easy, extracting feelings isn’t.",
        "WORD_TO_PDF": "Converting Word is simple, converting emotions is not.",
        "PPT_TO_PDF": "Converting slides is simple, converting feelings is not.",
        "EXCEL_TO_PDF": "Excel has formulas; PDF has its life together.",
        "EDIT_PDF": "Editing PDFs made easy—unlike editing your past decisions.",
        "PDF_TO_JPG": "Convert to JPG so your file loads before you lose patience.",
        "JPG_TO_PDF": "One click and your JPG puts on its “I’m important” outfit.",
        "SIGN_PDF": "PDFs can be signed in seconds; life decisions take forever.",
        "WATERMARK_PDF": "Put a watermark on it—like a tattoo, but for documents.",
        "ROTATE_PDF": "Fix that sideways PDF before your neck files a complaint.",
        "UNLOCK_PDF": "Your PDF is locked—probably for no good reason. Fix that.",
        "PROTECT_PDF": "Guard your document—because trust issues apply to files too.",
        "ORGANIZE_PDF": "Organize your PDF because smth’ng in your life should be in order.",
        "PDF_TO_PDFA": "Convert to PDF/A because even files need to get their life together.",
        "REPAIR_PDF": "PDFs break too luckily, theirs is easier to fix.",
        "PAGE_NUMBERS": "Add page numbers into PDFs with ease.",
        "SCAN_TO_PDF": "Scan to PDF because your papers deserve a digital retirement plan.",
        "OCR_PDF": "Make your PDF readable; it’s been ignoring you long enough.",
        "COMPARE_PDF": "Compare two PDFs and finally prove you weren’t imagining things.",
        "REDACT_PDF": "Redact text and graphics to permanently remove sensitive information.",
        "CROP_PDF": "Crop margins of PDF documents or select specific areas.",
        "HTML_TO_PDF": "Convert webpages in HTML to PDF.",
        "CREATE_WORKFLOW": "Design your own PDF assembly line—because doing it manually is for chumps.",
        "METADATA_CLEANER": "Remove hidden metadata and personal information from your PDF files."
    }

    updated_count = 0
    
    for code, description in witty_descriptions.items():
        try:
            # Try to get feature by code
            feature = Feature.objects.get(code=code)
            feature.description = description
            feature.save()
            print(f"Updated description for {feature.name} ({code})")
            updated_count += 1
        except Feature.DoesNotExist:
            print(f"Feature not found: {code}")

    print(f"\nUpdate complete. Updated {updated_count} feature descriptions.")

if __name__ == '__main__':
    update_descriptions()
