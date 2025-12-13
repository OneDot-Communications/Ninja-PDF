/**
 * Visual PDF Crop Functions
 * Provides interactive crop selection for PDF pages
 */

// Crop state variables
let cropPdfDoc = null;
let cropCurrentPageNum = 1;
let cropTotalPagesCount = 1;
let cropScale = 1.5;
let cropSelection = {
    x: 0,
    y: 0,
    width: 0,
    height: 0
};
let isDragging = false;
let isResizing = false;
let activeHandle = null;
let dragStartX = 0;
let dragStartY = 0;
let selectionStartX = 0;
let selectionStartY = 0;
let canvasRect = null;
let pdfPageWidth = 0;
let pdfPageHeight = 0;

// Initialize crop when file is loaded
async function initCropPreview(file) {
    const pdfjsLib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;
    
    if (!pdfjsLib) {
        console.error('PDF.js not loaded');
        return;
    }
    
    try {
        const arrayBuffer = await file.arrayBuffer();
        cropPdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        cropTotalPagesCount = cropPdfDoc.numPages;
        cropCurrentPageNum = 1;
        
        document.getElementById('cropTotalPages').textContent = cropTotalPagesCount;
        document.getElementById('cropCurrentPage').textContent = cropCurrentPageNum;
        
        await renderCropPage(cropCurrentPageNum);
        initCropSelection();
        
    } catch (error) {
        console.error('Error loading PDF for crop:', error);
    }
}

// Render a specific page
async function renderCropPage(pageNum) {
    if (!cropPdfDoc) return;
    
    const page = await cropPdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: cropScale });
    
    const canvas = document.getElementById('cropCanvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    pdfPageWidth = viewport.width;
    pdfPageHeight = viewport.height;
    
    await page.render({
        canvasContext: ctx,
        viewport: viewport
    }).promise;
    
    // Update canvas rect for mouse calculations
    canvasRect = canvas.getBoundingClientRect();
    
    // Reset or maintain crop selection
    if (cropSelection.width === 0) {
        // Initialize with full page selection
        cropSelection = {
            x: 20,
            y: 20,
            width: canvas.width - 40,
            height: canvas.height - 40
        };
    }
    
    updateCropSelectionUI();
}

// Initialize crop selection box
function initCropSelection() {
    const container = document.getElementById('cropPreviewContainer');
    const selection = document.getElementById('cropSelection');
    const canvas = document.getElementById('cropCanvas');
    
    // Show selection box
    selection.style.display = 'block';
    
    // Mouse events for the container
    container.addEventListener('mousedown', handleCropMouseDown);
    document.addEventListener('mousemove', handleCropMouseMove);
    document.addEventListener('mouseup', handleCropMouseUp);
    
    // Touch events for mobile
    container.addEventListener('touchstart', handleCropTouchStart, { passive: false });
    document.addEventListener('touchmove', handleCropTouchMove, { passive: false });
    document.addEventListener('touchend', handleCropTouchEnd);
}

// Update the visual selection box
function updateCropSelectionUI() {
    const selection = document.getElementById('cropSelection');
    const canvas = document.getElementById('cropCanvas');
    
    if (!selection || !canvas) return;
    
    // Get canvas position relative to container
    const container = document.getElementById('cropPreviewContainer');
    const containerRect = container.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    
    const offsetX = canvasRect.left - containerRect.left;
    const offsetY = canvasRect.top - containerRect.top;
    
    selection.style.left = (offsetX + cropSelection.x) + 'px';
    selection.style.top = (offsetY + cropSelection.y) + 'px';
    selection.style.width = cropSelection.width + 'px';
    selection.style.height = cropSelection.height + 'px';
    selection.style.display = 'block';
    
    // Update hidden input values (convert to PDF coordinates)
    updateCropValues();
}

// Convert screen coordinates to PDF coordinates
function updateCropValues() {
    const canvas = document.getElementById('cropCanvas');
    if (!canvas) return;
    
    // Calculate crop margins from selection
    const scaleX = canvas.width / pdfPageWidth;
    const scaleY = canvas.height / pdfPageHeight;
    
    // Crop values are the margins (what we're removing)
    const cropTop = Math.max(0, Math.round(cropSelection.y / cropScale));
    const cropLeft = Math.max(0, Math.round(cropSelection.x / cropScale));
    const cropBottom = Math.max(0, Math.round((pdfPageHeight - cropSelection.y - cropSelection.height) / cropScale));
    const cropRight = Math.max(0, Math.round((pdfPageWidth - cropSelection.x - cropSelection.width) / cropScale));
    
    document.getElementById('cropTop').value = cropTop;
    document.getElementById('cropLeft').value = cropLeft;
    document.getElementById('cropBottom').value = cropBottom;
    document.getElementById('cropRight').value = cropRight;
}

// Mouse event handlers
function handleCropMouseDown(e) {
    const selection = document.getElementById('cropSelection');
    const canvas = document.getElementById('cropCanvas');
    
    if (!canvas) return;
    
    const containerRect = document.getElementById('cropPreviewContainer').getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    
    const mouseX = e.clientX - canvasRect.left;
    const mouseY = e.clientY - canvasRect.top;
    
    // Check if clicking on a handle
    const handle = e.target.closest('.crop-handle');
    if (handle) {
        isResizing = true;
        activeHandle = handle.dataset.handle;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        selectionStartX = cropSelection.x;
        selectionStartY = cropSelection.y;
        e.preventDefault();
        return;
    }
    
    // Check if clicking inside selection (for dragging)
    if (e.target.id === 'cropSelection' || e.target.closest('#cropSelection')) {
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        selectionStartX = cropSelection.x;
        selectionStartY = cropSelection.y;
        e.preventDefault();
        return;
    }
    
    // Start new selection
    if (mouseX >= 0 && mouseX <= canvas.width && mouseY >= 0 && mouseY <= canvas.height) {
        cropSelection.x = mouseX;
        cropSelection.y = mouseY;
        cropSelection.width = 0;
        cropSelection.height = 0;
        isDragging = true;
        isResizing = true;
        activeHandle = 'se';
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        selectionStartX = mouseX;
        selectionStartY = mouseY;
        updateCropSelectionUI();
    }
}

function handleCropMouseMove(e) {
    if (!isDragging && !isResizing) return;
    
    const canvas = document.getElementById('cropCanvas');
    if (!canvas) return;
    
    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;
    
    if (isResizing && activeHandle) {
        resizeCropSelection(activeHandle, deltaX, deltaY);
    } else if (isDragging) {
        // Move selection
        cropSelection.x = Math.max(0, Math.min(canvas.width - cropSelection.width, selectionStartX + deltaX));
        cropSelection.y = Math.max(0, Math.min(canvas.height - cropSelection.height, selectionStartY + deltaY));
    }
    
    updateCropSelectionUI();
}

function handleCropMouseUp(e) {
    isDragging = false;
    isResizing = false;
    activeHandle = null;
}

// Resize crop selection based on handle
function resizeCropSelection(handle, deltaX, deltaY) {
    const canvas = document.getElementById('cropCanvas');
    const minSize = 50;
    
    let newX = cropSelection.x;
    let newY = cropSelection.y;
    let newWidth = cropSelection.width;
    let newHeight = cropSelection.height;
    
    switch (handle) {
        case 'nw':
            newX = selectionStartX + deltaX;
            newY = selectionStartY + deltaY;
            newWidth = cropSelection.width - deltaX;
            newHeight = cropSelection.height - deltaY;
            break;
        case 'n':
            newY = selectionStartY + deltaY;
            newHeight = cropSelection.height - deltaY;
            break;
        case 'ne':
            newY = selectionStartY + deltaY;
            newWidth = cropSelection.width + deltaX;
            newHeight = cropSelection.height - deltaY;
            break;
        case 'w':
            newX = selectionStartX + deltaX;
            newWidth = cropSelection.width - deltaX;
            break;
        case 'e':
            newWidth = cropSelection.width + deltaX;
            break;
        case 'sw':
            newX = selectionStartX + deltaX;
            newWidth = cropSelection.width - deltaX;
            newHeight = cropSelection.height + deltaY;
            break;
        case 's':
            newHeight = cropSelection.height + deltaY;
            break;
        case 'se':
            newWidth = cropSelection.width + deltaX;
            newHeight = cropSelection.height + deltaY;
            break;
    }
    
    // Apply constraints
    if (newWidth >= minSize && newX >= 0 && newX + newWidth <= canvas.width) {
        cropSelection.x = newX;
        cropSelection.width = newWidth;
    }
    if (newHeight >= minSize && newY >= 0 && newY + newHeight <= canvas.height) {
        cropSelection.y = newY;
        cropSelection.height = newHeight;
    }
}

// Touch event handlers
function handleCropTouchStart(e) {
    if (e.touches.length === 1) {
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        handleCropMouseDown(mouseEvent);
    }
}

function handleCropTouchMove(e) {
    if (e.touches.length === 1) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        handleCropMouseMove(mouseEvent);
    }
}

function handleCropTouchEnd(e) {
    handleCropMouseUp(e);
}

// Page navigation
function cropPrevPage() {
    if (cropCurrentPageNum > 1) {
        cropCurrentPageNum--;
        document.getElementById('cropCurrentPage').textContent = cropCurrentPageNum;
        renderCropPage(cropCurrentPageNum);
    }
}

function cropNextPage() {
    if (cropCurrentPageNum < cropTotalPagesCount) {
        cropCurrentPageNum++;
        document.getElementById('cropCurrentPage').textContent = cropCurrentPageNum;
        renderCropPage(cropCurrentPageNum);
    }
}

// Reset crop selection to full page
function resetCropSelection() {
    const canvas = document.getElementById('cropCanvas');
    if (canvas) {
        cropSelection = {
            x: 20,
            y: 20,
            width: canvas.width - 40,
            height: canvas.height - 40
        };
        updateCropSelectionUI();
    }
}

// Apply crop and process
async function applyCrop() {
    if (!currentFile) return;
    
    document.getElementById('cropOptions').style.display = 'none';
    document.getElementById('loading').style.display = 'block';
    
    const formData = new FormData();
    formData.append('file', currentFile);
    
    // Get crop values
    const cropTop = document.getElementById('cropTop').value || 0;
    const cropBottom = document.getElementById('cropBottom').value || 0;
    const cropLeft = document.getElementById('cropLeft').value || 0;
    const cropRight = document.getElementById('cropRight').value || 0;
    
    formData.append('crop_top', cropTop);
    formData.append('crop_bottom', cropBottom);
    formData.append('crop_left', cropLeft);
    formData.append('crop_right', cropRight);
    
    // Add page option
    const cropAllPages = document.querySelector('input[name="cropPages"]:checked').value === 'all';
    formData.append('crop_all_pages', cropAllPages);
    formData.append('current_page', cropCurrentPageNum);
    
    try {
        const response = await fetch('/api/v1/edit/crop/', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            
            document.getElementById('loading').style.display = 'none';
            document.getElementById('resultArea').style.display = 'block';
            
            const downloadLink = document.getElementById('downloadLink');
            downloadLink.href = url;
            downloadLink.download = 'cropped_' + currentFile.name;
        } else {
            const errorData = await response.json();
            alert('Crop failed: ' + (errorData.error || 'Unknown error'));
            document.getElementById('loading').style.display = 'none';
            document.getElementById('cropOptions').style.display = 'block';
        }
    } catch (error) {
        console.error('Crop error:', error);
        alert('Crop failed: ' + error.message);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('cropOptions').style.display = 'block';
    }
}

// Cleanup when modal closes
function cleanupCrop() {
    cropPdfDoc = null;
    cropCurrentPageNum = 1;
    cropSelection = { x: 0, y: 0, width: 0, height: 0 };
    
    const selection = document.getElementById('cropSelection');
    if (selection) {
        selection.style.display = 'none';
    }
}
