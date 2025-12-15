"""Tools API URLs - Complete PDF Processing Routes"""
from django.urls import path
from apps.tools.api.views import (
    # Conversion TO PDF
    WordToPDFView,
    ExcelToPDFView,
    PowerpointToPDFView,
    JPGToPDFView,
    HTMLToPDFView,
    MarkdownToPDFView,
    # Conversion FROM PDF
    PDFToJPGView,
    PDFToWordView,
    PDFToExcelView,
    PDFToPowerpointView,
    PDFToHTMLView,
    PDFToPDFAView,
    # Optimization
    MergePDFView,
    SplitPDFView,
    CompressPDFView,
    OrganizePDFView,
    FlattenPDFView,
    CompressImageView,
    # Security
    ProtectPDFView,
    UnlockPDFView,
)

urlpatterns = [
    # ─────────────────────────────────────────────────────────────────────────
    # CONVERSION TO PDF
    # ─────────────────────────────────────────────────────────────────────────
    path('word-to-pdf/', WordToPDFView.as_view(), name='word-to-pdf'),
    path('excel-to-pdf/', ExcelToPDFView.as_view(), name='excel-to-pdf'),
    path('powerpoint-to-pdf/', PowerpointToPDFView.as_view(), name='powerpoint-to-pdf'),
    path('jpg-to-pdf/', JPGToPDFView.as_view(), name='jpg-to-pdf'),
    path('html-to-pdf/', HTMLToPDFView.as_view(), name='html-to-pdf'),
    path('markdown-to-pdf/', MarkdownToPDFView.as_view(), name='markdown-to-pdf'),
    
    # ─────────────────────────────────────────────────────────────────────────
    # CONVERSION FROM PDF
    # ─────────────────────────────────────────────────────────────────────────
    path('pdf-to-jpg/', PDFToJPGView.as_view(), name='pdf-to-jpg'),
    path('pdf-to-word/', PDFToWordView.as_view(), name='pdf-to-word'),
    path('pdf-to-excel/', PDFToExcelView.as_view(), name='pdf-to-excel'),
    path('pdf-to-powerpoint/', PDFToPowerpointView.as_view(), name='pdf-to-powerpoint'),
    path('pdf-to-html/', PDFToHTMLView.as_view(), name='pdf-to-html'),
    path('pdf-to-pdfa/', PDFToPDFAView.as_view(), name='pdf-to-pdfa'),
    
    # ─────────────────────────────────────────────────────────────────────────
    # OPTIMIZATION
    # ─────────────────────────────────────────────────────────────────────────
    path('merge/', MergePDFView.as_view(), name='merge-pdf'),
    path('split/', SplitPDFView.as_view(), name='split-pdf'),
    path('compress-pdf/', CompressPDFView.as_view(), name='compress-pdf'),
    path('organize/', OrganizePDFView.as_view(), name='organize-pdf'),
    path('flatten/', FlattenPDFView.as_view(), name='flatten-pdf'),
    path('compress-image/', CompressImageView.as_view(), name='compress-image'),
    
    # ─────────────────────────────────────────────────────────────────────────
    # SECURITY
    # ─────────────────────────────────────────────────────────────────────────
    path('protect-pdf/', ProtectPDFView.as_view(), name='protect-pdf'),
    path('unlock-pdf/', UnlockPDFView.as_view(), name='unlock-pdf'),
]
