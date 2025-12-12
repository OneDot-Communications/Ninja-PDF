// ==================== SCAN TO PDF FUNCTIONALITY ====================
let cameraStream = null;
let capturedImages = [];

async function openCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });
        cameraStream = stream;
        
        document.getElementById('cameraStream').srcObject = stream;
        document.getElementById('scanOptions').style.display = 'none';
        document.getElementById('cameraView').style.display = 'block';
    } catch (error) {
        alert('Could not access camera. Please check permissions or use the image upload option.');
    }
}

function captureImage() {
    const video = document.getElementById('cameraStream');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    canvas.toBlob((blob) => {
        capturedImages.push({ 
            blob: blob, 
            dataURL: canvas.toDataURL('image/jpeg') 
        });
        
        document.getElementById('cameraView').style.display = 'none';
        document.getElementById('capturedImagesPreview').style.display = 'block';
        displayCapturedImages();
    }, 'image/jpeg', 0.9);
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    
    document.getElementById('cameraView').style.display = 'none';
    
    if (capturedImages.length > 0) {
        document.getElementById('capturedImagesPreview').style.display = 'block';
    } else {
        document.getElementById('scanOptions').style.display = 'block';
    }
}

function displayCapturedImages() {
    const imagesList = document.getElementById('imagesList');
    if (!imagesList) return;
    
    imagesList.innerHTML = '';
    
    capturedImages.forEach((image, index) => {
        const imgContainer = document.createElement('div');
        imgContainer.style.cssText = 'position: relative; display: inline-block;';
        
        const img = document.createElement('img');
        img.src = image.dataURL;
        img.style.cssText = 'width: 120px; height: 120px; object-fit: cover; border-radius: 8px;';
        
        const removeBtn = document.createElement('button');
        removeBtn.innerHTML = '×';
        removeBtn.style.cssText = 'position: absolute; top: 5px; right: 5px; background: red; color: white; border: none; border-radius: 50%; width: 25px; height: 25px; cursor: pointer; font-size: 18px; line-height: 1;';
        removeBtn.onclick = () => removeImage(index);
        
        imgContainer.appendChild(img);
        imgContainer.appendChild(removeBtn);
        imagesList.appendChild(imgContainer);
    });
}

function removeImage(index) {
    capturedImages.splice(index, 1);
    displayCapturedImages();
    
    if (capturedImages.length === 0) {
        document.getElementById('capturedImagesPreview').style.display = 'none';
        document.getElementById('scanOptions').style.display = 'block';
    }
}

// Handle image upload from file picker
function setupImageUpload() {
    const scanImageInput = document.getElementById('scanImageInput');
    if (!scanImageInput) return;
    
    scanImageInput.addEventListener('change', (event) => {
        const files = event.target.files;
        if (files.length === 0) return;
        
        const totalFiles = files.length;
        let loadedCount = 0;
        
        Array.from(files).forEach((file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                capturedImages.push({ 
                    blob: file, 
                    dataURL: e.target.result 
                });
                loadedCount++;
                
                if (loadedCount === totalFiles) {
                    document.getElementById('scanOptions').style.display = 'none';
                    document.getElementById('capturedImagesPreview').style.display = 'block';
                    displayCapturedImages();
                }
            };
            reader.readAsDataURL(file);
        });
        
        scanImageInput.value = '';
    });
}

document.addEventListener('DOMContentLoaded', setupImageUpload);

async function processScanToPdf() {
    if (capturedImages.length === 0) {
        alert('Please capture or upload at least one image');
        return;
    }
    
    document.getElementById('capturedImagesPreview').style.display = 'none';
    document.getElementById('loading').style.display = 'block';
    
    const formData = new FormData();
    capturedImages.forEach((image, index) => {
        formData.append('files', image.blob, `scan_${index + 1}.jpg`);
    });
    formData.append('enhance', 'true');
    formData.append('deskew', 'true');
    
    try {
        const response = await fetch('/api/v1/recovery/batch-scan-to-pdf/', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            showResult(url, 'scanned_document.pdf');
            capturedImages = [];
        } else {
            const errorText = await response.text();
            alert(`Error: ${response.status} ${response.statusText}\n${errorText}`);
            document.getElementById('loading').style.display = 'none';
            document.getElementById('capturedImagesPreview').style.display = 'block';
        }
    } catch (error) {
        alert(`Network Error: Could not connect to backend.\nEnsure Django server is running at http://127.0.0.1:8000`);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('capturedImagesPreview').style.display = 'block';
    }
}
