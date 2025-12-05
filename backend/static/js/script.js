let currentTool = '';
let currentFile = null;

function openTool(toolId, toolName) {
    currentTool = toolId;
    document.getElementById('modalTitle').innerText = toolName;
    document.getElementById('toolModal').style.display = 'flex';
    resetModal();
}

function closeModal() {
    document.getElementById('toolModal').style.display = 'none';
}

function resetModal() {
    currentFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('dropZone').style.display = 'block';
    document.getElementById('fileInfo').style.display = 'none';
    document.getElementById('resultArea').style.display = 'none';
    document.getElementById('loading').style.display = 'none';
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
    document.getElementById('fileInfo').style.display = 'block';
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
    'protect-pdf': '/api/v1/security/protect/',
    'unlock-pdf': '/api/v1/security/unlock/',
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
    'repair-pdf': '/api/v1/recovery/repair/',
    'scan-to-pdf': '/api/v1/recovery/scan/'
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

function showResult(url) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('resultArea').style.display = 'block';
    const downloadLink = document.getElementById('downloadLink');
    downloadLink.href = url;
    downloadLink.download = `converted_${currentFile.name}`; // Simplified naming
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('toolModal');
    if (event.target == modal) {
        closeModal();
    }
}