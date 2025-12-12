let currentTool = '';
let currentFile = null;

function openTool(toolId, toolName) {
    currentTool = toolId;
    document.getElementById('modalTitle').innerText = toolName;
    document.getElementById('toolModal').style.display = 'flex';
    
    // Reset first, then show specific UI
    resetModal();
    
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
    else {
        document.getElementById('fileInfo').style.display = 'block';
        document.getElementById('redactOptions').style.display = 'none';
        document.getElementById('protectOptions').style.display = 'none';
    }
}

// Tool ID to API Endpoint Mapping
// This defines the contract between Frontend and Backend
const toolEndpoints = {
    // 1. Converters
    'pdf-to-word': '/api/v1/convert/pdf-to-word/',
    'word-to-pdf': '/api/v1/convert/word-to-pdf/',
    'pdf-to-powerpoint': '/api/v1/convert/pdf-to-powerpoint/',
    'powerpoint-to-pdf': '/api/v1/convert/powerpoint-to-pdf/',
    'pdf-to-excel': '/api/v1/convert/pdf-to-excel/',
    'excel-to-pdf': '/api/v1/convert/excel-to-pdf/',
    'pdf-to-jpg': '/api/v1/convert/pdf-to-jpg/',
    'jpg-to-pdf': '/api/v1/convert/jpg-to-pdf/',
    'html-to-pdf': '/api/v1/convert/html-to-pdf/',
    'pdf-to-pdfa': '/api/v1/convert/pdf-to-pdfa/',
    'pdf-to-html': '/api/v1/convert/pdf-to-html/',

    // AI Converters
    'pdf-to-presentation-ai': '/api/v1/ai/pdf-to-presentation/',
    'markdown-to-pdf': '/api/v1/convert/markdown-to-pdf/',
    'pdf-translator-ai': '/api/v1/ai/translate/',

    // 2. Compression
    'compress-pdf': '/api/v1/optimize/compress/',
    'image-compression': '/api/v1/optimize/compress-image/',

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
    formData.append('file', currentFile);

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
            // Handle success (e.g., get download link)
            // For demo, we assume the response contains a file or a link
            // If it's a blob:
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            showResult(url);
        } else {
            // If 404 or error, we simulate success for UI testing if it's just a demo
            // But the user wants to TEST the backend. So we should show the error.
            console.error('Backend error:', response.statusText);

            // Construct a helpful error message for the developer
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

// Auto open tool when static index is served directly via route
document.addEventListener('DOMContentLoaded', () => {
    const segments = window.location.pathname.split('/').filter(Boolean);
    if (segments.length === 0) return;

    // Determine the last path segment as a tool identifier
    const last = segments[segments.length - 1];

    // Known pages that are not tool ids should not trigger modal
    const ignore = ['pdf-conversions', 'to_pdf', 'optimizer', 'admin', 'api', 'static'];
    if (ignore.includes(last)) return;

    // Map path segment to tool id
    const toolId = last;

    // If tool exists in endpoints map or special cases, open modal
    if (toolEndpoints[toolId] || ['pdf-to-word', 'word-to-pdf', 'pdf-to-excel', 'pdf-to-powerpoint', 'jpg-to-pdf', 'html-to-pdf', 'pdf-to-pdfa', 'pdf-to-html', 'compare-pdf', 'redact-pdf', 'scan-to-pdf', 'protect-pdf', 'unlock-pdf', 'repair-pdf'].includes(toolId)) {
        // Build a readable title
        const title = toolId.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
        openTool(toolId, title);
    }
});