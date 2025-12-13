let currentTool = '';
let currentFile = null;

function openTool(toolId, toolName) {
    currentTool = toolId;
    document.getElementById('modalTitle').innerText = toolName;
    document.getElementById('toolModal').style.display = 'flex';
    
    // Reset first, then show specific UI
    resetModal();
    
    // Update file input accept attribute based on tool
    const fileInput = document.getElementById('fileInput');
    if (toolId === 'word-to-pdf') {
        fileInput.accept = '.doc,.docx';
    } else if (toolId === 'powerpoint-to-pdf') {
        fileInput.accept = '.ppt,.pptx';
    } else if (toolId === 'excel-to-pdf') {
        fileInput.accept = '.xls,.xlsx';
    } else if (toolId === 'jpg-to-pdf') {
        fileInput.accept = 'image/*,.jpg,.jpeg,.png';
    } else if (toolId === 'html-to-pdf') {
        fileInput.accept = '.html,.htm';
    } else if (toolId === 'markdown-to-pdf') {
        fileInput.accept = '.md,.markdown';
    } else if (toolId === 'compress-image') {
        fileInput.accept = 'image/*,.jpg,.jpeg,.png';
    } else {
        fileInput.accept = '.pdf';
    }
    
    // Show compare options for compare-pdf tool
    if (toolId === 'compare-pdf') {
        document.getElementById('dropZone').style.display = 'none';
        document.getElementById('compareOptions').style.display = 'block';
    }
    // Show scan options for scan-to-pdf tool
    else if (toolId === 'scan-to-pdf') {
        document.getElementById('dropZone').style.display = 'none';
        document.getElementById('scanOptions').style.display = 'block';
    }
    // For watermark-pdf, show dropZone first to let user upload file
    // The watermarkOptions will be shown in handleFile() after file is selected
}

function closeModal() {
    document.getElementById('toolModal').style.display = 'none';
}

function resetModal() {
    currentFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('dropZone').style.display = 'block';
    document.getElementById('fileInfo').style.display = 'none';
    document.getElementById('compareOptions').style.display = 'none';
    document.getElementById('redactOptions').style.display = 'none';
    document.getElementById('protectOptions').style.display = 'none';
    document.getElementById('watermarkOptions').style.display = 'none';
    document.getElementById('cropOptions').style.display = 'none';
    document.getElementById('rotateOptions').style.display = 'none';
    document.getElementById('pageNumbersOptions').style.display = 'none';
    document.getElementById('scanOptions').style.display = 'none';
    document.getElementById('cameraView').style.display = 'none';
    document.getElementById('capturedImagesPreview').style.display = 'none';
    document.getElementById('resultArea').style.display = 'none';
    document.getElementById('loading').style.display = 'none';
    document.getElementById('searchWord').value = '';
    document.getElementById('caseSensitive').checked = false;
    document.getElementById('protectPassword').value = '';
    document.getElementById('compareFile1').value = '';
    document.getElementById('compareFile2').value = '';
}

// Rotation selection function
function selectRotation(degrees) {
    // Update hidden input
    document.getElementById('selectedRotation').value = degrees;
    
    // Update visual selection
    document.querySelectorAll('.rotation-option').forEach(btn => {
        if (parseInt(btn.dataset.rotation) === degrees) {
            btn.style.background = 'linear-gradient(135deg, #03a9f4 0%, #0288d1 100%)';
            btn.style.borderColor = '#03a9f4';
            btn.style.color = 'white';
            btn.querySelectorAll('i, span, small').forEach(el => {
                el.style.color = 'white';
            });
        } else {
            btn.style.background = 'white';
            btn.style.borderColor = '#ddd';
            btn.style.color = '#333';
            btn.querySelector('i').style.color = '#03a9f4';
            btn.querySelector('span').style.color = '#333';
            btn.querySelector('small').style.color = '#666';
        }
    });
}

// Drag and Drop
const dropZone = document.getElementById('dropZone');

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
    }
});

document.getElementById('fileInput').addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

// Watermark slider event listeners
document.addEventListener('DOMContentLoaded', () => {
    const opacitySlider = document.getElementById('watermarkOpacity');
    const rotationSlider = document.getElementById('watermarkRotation');
    
    if (opacitySlider) {
        opacitySlider.addEventListener('input', (e) => {
            document.getElementById('opacityValue').textContent = e.target.value;
        });
    }
    
    if (rotationSlider) {
        rotationSlider.addEventListener('input', (e) => {
            document.getElementById('rotationValue').textContent = e.target.value + '°';
        });
    }
    // page-numbers position buttons
    document.querySelectorAll('.pn-pos').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.pn-pos').forEach(b => b.style.background = 'white');
            e.currentTarget.style.background = '#03a9f4';
            e.currentTarget.style.color = 'white';
            const pos = e.currentTarget.dataset.pos;
            const hidden = document.getElementById('pnPosition');
            if (hidden) hidden.value = pos;
        });
    });
});

function handleFile(file) {
    currentFile = file;
    document.getElementById('fileName').innerText = file.name;
    document.getElementById('dropZone').style.display = 'none';
    
    // For redact-pdf, show search options
    if (currentTool === 'redact-pdf') {
        document.getElementById('redactFileName').innerText = file.name;
        document.getElementById('fileInfo').style.display = 'none';
        document.getElementById('redactOptions').style.display = 'block';
    } 
    // For protect-pdf or unlock-pdf, show password input
    else if (currentTool === 'protect-pdf' || currentTool === 'unlock-pdf') {
        document.getElementById('protectFileName').innerText = file.name;
        document.getElementById('fileInfo').style.display = 'none';
        document.getElementById('protectOptions').style.display = 'block';
        
        // Update UI text based on tool
        if (currentTool === 'unlock-pdf') {
            document.getElementById('protectPasswordLabel').innerHTML = '<i class="fas fa-unlock"></i> Enter Password to Unlock:';
            document.getElementById('protectPassword').placeholder = 'Enter the PDF password...';
            document.getElementById('protectPasswordHint').innerHTML = '<i class="fas fa-info-circle"></i> Enter the password used to protect this PDF';
            document.getElementById('protectActionButton').querySelector('i').className = 'fas fa-unlock-alt';
            document.getElementById('protectActionText').innerText = 'Unlock PDF';
            document.getElementById('protectActionButton').style.background = 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)';
        } else {
            document.getElementById('protectPasswordLabel').innerHTML = '<i class="fas fa-lock"></i> Password:';
            document.getElementById('protectPassword').placeholder = 'Enter password to protect PDF...';
            document.getElementById('protectPasswordHint').innerHTML = '<i class="fas fa-info-circle"></i> Minimum 4 characters required';
            document.getElementById('protectActionButton').querySelector('i').className = 'fas fa-shield-alt';
            document.getElementById('protectActionText').innerText = 'Protect PDF';
            document.getElementById('protectActionButton').style.background = 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)';
        }
    } 
    // For watermark-pdf, show watermark options
    else if (currentTool === 'watermark-pdf') {
        document.getElementById('watermarkFileName').innerText = file.name;
        document.getElementById('dropZone').style.display = 'none';
        document.getElementById('fileInfo').style.display = 'none';
        document.getElementById('watermarkOptions').style.display = 'block';
    }
    // For crop-pdf, show crop options with visual preview
    else if (currentTool === 'crop-pdf') {
        document.getElementById('cropFileName').innerText = file.name;
        document.getElementById('dropZone').style.display = 'none';
        document.getElementById('fileInfo').style.display = 'none';
        document.getElementById('cropOptions').style.display = 'block';
        // Initialize the visual crop preview
        if (typeof initCropPreview === 'function') {
            initCropPreview(file);
        }
    }
    // For rotate-pdf, show rotate options
    else if (currentTool === 'rotate-pdf') {
        document.getElementById('rotateFileName').innerText = file.name;
        document.getElementById('dropZone').style.display = 'none';
        document.getElementById('fileInfo').style.display = 'none';
        document.getElementById('rotateOptions').style.display = 'block';
    }
    // For page-numbers, show page numbers options
    else if (currentTool === 'page-numbers') {
        document.getElementById('pageNumbersFileName').innerText = file.name;
        document.getElementById('dropZone').style.display = 'none';
        document.getElementById('fileInfo').style.display = 'none';
        document.getElementById('pageNumbersOptions').style.display = 'block';
    }
    else {
        document.getElementById('fileInfo').style.display = 'block';
        document.getElementById('redactOptions').style.display = 'none';
        document.getElementById('protectOptions').style.display = 'none';
        document.getElementById('watermarkOptions').style.display = 'none';
        document.getElementById('cropOptions').style.display = 'none';
        document.getElementById('rotateOptions').style.display = 'none';
    }
}

// Tool ID to API Endpoint Mapping
// This defines the contract between Frontend and Backend
const toolEndpoints = {
    // 1. Converters (FROM PDF)
    'pdf-to-word': '/pdf-conversions/api/pdf-to-word/',
    'pdf-to-powerpoint': '/pdf-conversions/api/pdf-to-powerpoint/',
    'pdf-to-excel': '/pdf-conversions/api/pdf-to-excel/',
    'pdf-to-jpg': '/pdf-conversions/api/pdf-to-jpg/',
    'pdf-to-pdfa': '/pdf-conversions/api/pdf-to-pdfa/',
    'pdf-to-html': '/pdf-conversions/api/pdf-to-html/',
    
    // TO PDF Converters
    'word-to-pdf': '/to_pdf/word-to-pdf/',
    'powerpoint-to-pdf': '/to_pdf/powerpoint-to-pdf/',
    'excel-to-pdf': '/to_pdf/excel-to-pdf/',
    'jpg-to-pdf': '/to_pdf/jpg-to-pdf/',
    'html-to-pdf': '/to_pdf/html-to-pdf/',

    // AI Converters
    'pdf-to-presentation-ai': '/api/v1/ai/pdf-to-presentation/',
    'markdown-to-pdf': '/to_pdf/markdown-to-pdf/',
    'pdf-translator-ai': '/api/v1/ai/translate/',

    // 2. Compression
    'compress-pdf': '/optimizer/compress-pdf/',
    'compress-image': '/optimizer/compress-image/',

    // 3. Editing
    'edit-pdf': '/api/v1/edit/add-elements/',
    'annotate-pdf': '/api/v1/edit/annotate/',
    'full-edit-pdf': '/api/v1/edit/full-edit/',
    'crop-pdf': '/api/v1/edit/crop/',
    'watermark-pdf': '/api/v1/edit/watermark/',
    'page-numbers': '/api/v1/edit/page-numbers/',
    'redact-pdf': '/api/v1/edit/redact/',
    'compare-pdf': '/api/v1/edit/compare/',
    'organize-pdf': '/api/v1/edit/organize/',
    'rotate-pdf': '/api/v1/edit/rotate/',

    // Advanced Editing
    'metadata-cleaner': '/api/v1/edit/clean-metadata/',
    'rewrite-pdf-ai': '/api/v1/ai/rewrite/',
    'collaborative-edit': '/api/v1/edit/collaborate/', // Likely a WebSocket or different protocol

    // 4. Security
    'protect-pdf': '/api/v1/security/protect-pdf/',
    'unlock-pdf': '/api/v1/security/unlock-pdf/',
    'secure-sharing': '/api/v1/security/share/',
    'secure-room': '/api/v1/security/room/',

    // 5. Forms
    'create-form': '/api/v1/forms/create/',
    'form-data': '/api/v1/forms/data/',
    'workflow-automation': '/api/v1/forms/workflow/',

    // 6. AI & Recognition
    'ocr-pdf': '/api/v1/ai/ocr/',
    'ask-pdf': '/api/v1/ai/chat/',
    'contract-analysis': '/api/v1/ai/analyze-contract/',
    'table-extraction': '/api/v1/ai/extract-table/',
    'document-insights': '/api/v1/ai/insights/',

    // 7. Cloud
    'cloud-integration': '/api/v1/cloud/connect/',
    'user-accounts': '/api/v1/user/profile/',
    'processing-history': '/api/v1/user/history/',

    // 8. Recovery
    'repair-pdf': '/api/v1/recovery/repair-pdf/',
    'scan-to-pdf': '/api/v1/recovery/batch-scan-to-pdf/'
};

async function processFile() {
    if (!currentFile) return;

    document.getElementById('fileInfo').style.display = 'none';
    document.getElementById('loading').style.display = 'block';

    const formData = new FormData();
    // Use 'pdf_file' for FROM PDF conversions, 'file' for TO PDF conversions
    const fieldName = currentTool.startsWith('pdf-to-') ? 'pdf_file' : 'file';
    formData.append(fieldName, currentFile);

    // Add watermark-specific parameters if applicable
    if (currentTool === 'watermark-pdf') {
        const watermarkText = document.getElementById('watermarkText') && document.getElementById('watermarkText').value 
            ? document.getElementById('watermarkText').value 
            : 'WATERMARK';
        const watermarkOpacity = document.getElementById('watermarkOpacity') && document.getElementById('watermarkOpacity').value 
            ? document.getElementById('watermarkOpacity').value 
            : 0.3;
        const watermarkColor = document.getElementById('watermarkColor') && document.getElementById('watermarkColor').value 
            ? document.getElementById('watermarkColor').value.replace('#', '') 
            : 'FF0000';
        const watermarkRotation = document.getElementById('watermarkRotation') && document.getElementById('watermarkRotation').value 
            ? document.getElementById('watermarkRotation').value 
            : 45;
        
        formData.append('watermark_text', watermarkText);
        formData.append('watermark_opacity', watermarkOpacity);
        formData.append('watermark_color', watermarkColor);
        formData.append('watermark_rotation', watermarkRotation);
    }
    
    // Add crop-specific parameters if applicable
    if (currentTool === 'crop-pdf') {
        const cropTop = document.getElementById('cropTop') && document.getElementById('cropTop').value 
            ? document.getElementById('cropTop').value 
            : 0;
        const cropBottom = document.getElementById('cropBottom') && document.getElementById('cropBottom').value 
            ? document.getElementById('cropBottom').value 
            : 0;
        const cropLeft = document.getElementById('cropLeft') && document.getElementById('cropLeft').value 
            ? document.getElementById('cropLeft').value 
            : 0;
        const cropRight = document.getElementById('cropRight') && document.getElementById('cropRight').value 
            ? document.getElementById('cropRight').value 
            : 0;
        
        formData.append('crop_top', cropTop);
        formData.append('crop_bottom', cropBottom);
        formData.append('crop_left', cropLeft);
        formData.append('crop_right', cropRight);
    }
    
    // Add rotate-specific parameters if applicable
    if (currentTool === 'rotate-pdf') {
        const rotation = document.getElementById('selectedRotation') && document.getElementById('selectedRotation').value 
            ? document.getElementById('selectedRotation').value 
            : 90;
        const rotateAll = document.querySelector('input[name="rotatePages"]:checked').value === 'all';
        
        formData.append('rotation', rotation);
        
        if (!rotateAll) {
            const pageNumbers = document.getElementById('rotatePageNumbers') && document.getElementById('rotatePageNumbers').value 
                ? document.getElementById('rotatePageNumbers').value 
                : '';
            formData.append('pages', pageNumbers || 'all');
        } else {
            formData.append('pages', 'all');
        }
    }
    
    // Add page-numbers specific parameters
    if (currentTool === 'page-numbers') {
        const startFrom = document.getElementById('pnStartFrom') && document.getElementById('pnStartFrom').value ? document.getElementById('pnStartFrom').value : '1';
        const fontSize = document.getElementById('pnFontSize') && document.getElementById('pnFontSize').value ? document.getElementById('pnFontSize').value : '12';
        const fromPage = document.getElementById('pnFromPage') && document.getElementById('pnFromPage').value ? document.getElementById('pnFromPage').value : '';
        const toPage = document.getElementById('pnToPage') && document.getElementById('pnToPage').value ? document.getElementById('pnToPage').value : '';
        const format = document.getElementById('pnFormat') && document.getElementById('pnFormat').value ? document.getElementById('pnFormat').value : 'n';
        const position = document.getElementById('pnPosition') && document.getElementById('pnPosition').value ? document.getElementById('pnPosition').value : 'bottom-center';
        const margin = document.getElementById('pnMargin') && document.getElementById('pnMargin').value ? document.getElementById('pnMargin').value : 'recommended';

        formData.append('start_from', startFrom);
        formData.append('font_size', fontSize);
        if (fromPage) formData.append('from_page', fromPage);
        if (toPage) formData.append('to_page', toPage);
        formData.append('format', format);
        formData.append('position', position);
        formData.append('margin', margin);
        // send 'pages' as all if no specific from/to provided
        if (!fromPage && !toPage) formData.append('pages', 'all');
    }

    // Get the correct endpoint from our mapping
    const endpoint = toolEndpoints[currentTool];

    if (!endpoint) {
        console.error(`No endpoint defined for tool: ${currentTool}`);
        alert(`Configuration Error: No backend endpoint defined for ${currentTool}`);
        resetModal();
        return;
    }

    console.log(`Sending request to: ${endpoint}`);

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            // Extract filename from Content-Disposition header if available
            const disposition = response.headers.get('Content-Disposition');
            let filename = 'converted_file';
            if (disposition && disposition.indexOf('filename=') !== -1) {
                const matches = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (matches != null && matches[1]) {
                    filename = matches[1].replace(/['"]/g, '');
                }
            }
            
            showResult(url, filename);
        } else {
            console.error('Backend error:', response.statusText);
            const errorText = await response.text();
            alert(`Conversion failed: ${response.status} ${response.statusText}\n${errorText}`);
            resetModal();
        }
    } catch (error) {
        console.error('Error:', error);
        alert(`Network Error: Could not connect to backend.\nEnsure Django server is running at http://127.0.0.1:8000`);
        resetModal();
    }
}

async function processRedactPdf() {
    if (!currentFile) {
        alert('Please select a PDF file');
        return;
    }

    const searchWord = document.getElementById('searchWord').value.trim();
    const caseSensitive = document.getElementById('caseSensitive').checked;

    if (!searchWord) {
        alert('Please enter a word to redact');
        return;
    }

    document.getElementById('redactOptions').style.display = 'none';
    document.getElementById('loading').style.display = 'block';

    const formData = new FormData();
    formData.append('file', currentFile);
    formData.append('search_word', searchWord);
    formData.append('case_sensitive', caseSensitive ? 'true' : 'false');

    const endpoint = '/api/v1/edit/redact/';

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            showResult(url);
        } else {
            console.error('Backend error:', response.statusText);
            let errorMessage = `Error: ${response.status} ${response.statusText}\n`;
            errorMessage += `Endpoint: ${endpoint}\n`;
            errorMessage += `\nTo fix this, ensure your Django backend has a URL pattern matching this endpoint.`;
            alert(errorMessage);
            resetModal();
        }
    } catch (error) {
        console.error('Error:', error);
        alert(`Network Error: Could not connect to backend.\nEnsure Django server is running at http://127.0.0.1:8000`);
        resetModal();
    }
}

function showResult(url, filename = null) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('resultArea').style.display = 'block';
    const downloadLink = document.getElementById('downloadLink');
    downloadLink.href = url;
    
    // Use provided filename or generate one
    if (filename) {
        downloadLink.download = filename;
    } else if (currentFile) {
        downloadLink.download = `converted_${currentFile.name}`;
    } else {
        downloadLink.download = 'output.pdf';
    }
}

async function processComparePdf() {
    const file1Input = document.getElementById('compareFile1');
    const file2Input = document.getElementById('compareFile2');
    
    if (!file1Input.files[0] || !file2Input.files[0]) {
        alert('Please select both PDF files');
        return;
    }
    
    document.getElementById('compareOptions').style.display = 'none';
    document.getElementById('loading').style.display = 'block';
    
    const formData = new FormData();
    formData.append('file1', file1Input.files[0]);
    formData.append('file2', file2Input.files[0]);
    
    try {
        const response = await fetch('/api/v1/pdf-operations/compare-pdf/', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            showResult(url, 'comparison.pdf');
        } else {
            const errorText = await response.text();
            alert(`Error: ${response.status} ${response.statusText}\n${errorText}`);
            resetModal();
        }
    } catch (error) {
        alert(`Network Error: Could not connect to backend.\nEnsure Django server is running at http://127.0.0.1:8000`);
        resetModal();
    }
}

async function processProtectPdf() {
    if (!currentFile) {
        alert('Please select a PDF file');
        return;
    }

    const password = document.getElementById('protectPassword').value.trim();

    if (!password) {
        alert('Please enter a password');
        return;
    }
    
    if (password.length < 4) {
        alert('Password must be at least 4 characters long');
        return;
    }

    document.getElementById('protectOptions').style.display = 'none';
    document.getElementById('loading').style.display = 'block';

    const formData = new FormData();
    formData.append('file', currentFile);
    formData.append('password', password);

    const endpoint = toolEndpoints[currentTool];

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            showResult(url);
        } else {
            const errorText = await response.text();
            alert(`Error: ${response.status} ${response.statusText}\n${errorText}`);
            resetModal();
        }
    } catch (error) {
        alert(`Network Error: Could not connect to backend.\nEnsure Django server is running at http://127.0.0.1:8000`);
        resetModal();
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('toolModal');
    if (event.target == modal) {
        closeModal();
    }
}