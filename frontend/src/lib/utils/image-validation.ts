/**
 * Image validation and processing utilities for profile photos
 */

export interface ImageValidationResult {
    valid: boolean;
    error?: string;
}

export interface ImageDimensions {
    width: number;
    height: number;
}

// Configuration
export const IMAGE_CONSTRAINTS = {
    MIN_WIDTH: 200,
    MIN_HEIGHT: 200,
    MAX_WIDTH: 2048,
    MAX_HEIGHT: 2048,
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ["image/jpeg", "image/png", "image/webp"],
};

/**
 * Validate image file before processing
 */
export const validateImageFile = (file: File): ImageValidationResult => {
    // Check file type
    if (!IMAGE_CONSTRAINTS.ALLOWED_TYPES.includes(file.type)) {
        return {
            valid: false,
            error: "Please upload a JPG, PNG, or WebP image.",
        };
    }

    // Check file size
    if (file.size > IMAGE_CONSTRAINTS.MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `Image size must be less than ${IMAGE_CONSTRAINTS.MAX_FILE_SIZE / (1024 * 1024)}MB.`,
        };
    }

    return { valid: true };
};

/**
 * Get image dimensions from file
 */
export const getImageDimensions = (file: File): Promise<ImageDimensions> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({
                width: img.width,
                height: img.height,
            });
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Failed to load image"));
        };

        img.src = url;
    });
};

/**
 * Validate image dimensions
 */
export const validateImageDimensions = (dimensions: ImageDimensions): ImageValidationResult => {
    const { width, height } = dimensions;

    if (width < IMAGE_CONSTRAINTS.MIN_WIDTH || height < IMAGE_CONSTRAINTS.MIN_HEIGHT) {
        return {
            valid: false,
            error: `Image must be at least ${IMAGE_CONSTRAINTS.MIN_WIDTH}x${IMAGE_CONSTRAINTS.MIN_HEIGHT}px.`,
        };
    }

    if (width > IMAGE_CONSTRAINTS.MAX_WIDTH || height > IMAGE_CONSTRAINTS.MAX_HEIGHT) {
        return {
            valid: false,
            error: `Image must be no larger than ${IMAGE_CONSTRAINTS.MAX_WIDTH}x${IMAGE_CONSTRAINTS.MAX_HEIGHT}px.`,
        };
    }

    return { valid: true };
};

/**
 * Complete validation of image file
 */
export const validateImage = async (file: File): Promise<ImageValidationResult> => {
    // First validate file properties
    const fileValidation = validateImageFile(file);
    if (!fileValidation.valid) {
        return fileValidation;
    }

    // Then validate dimensions
    try {
        const dimensions = await getImageDimensions(file);
        return validateImageDimensions(dimensions);
    } catch (error) {
        return {
            valid: false,
            error: "Failed to read image dimensions.",
        };
    }
};

/**
 * Convert file to data URL for preview
 */
export const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

/**
 * Convert blob to file
 */
export const blobToFile = (blob: Blob, filename: string): File => {
    return new File([blob], filename, { type: blob.type });
};
