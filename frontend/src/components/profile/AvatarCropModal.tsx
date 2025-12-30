"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut } from "lucide-react";

interface AvatarCropModalProps {
    open: boolean;
    onClose: () => void;
    imageSrc: string;
    onCropComplete: (croppedImage: Blob) => void;
}

export function AvatarCropModal({ open, onClose, imageSrc, onCropComplete }: AvatarCropModalProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const onCropChange = (crop: any) => {
        setCrop(crop);
    };

    const onZoomChange = (zoom: number) => {
        setZoom(zoom);
    };

    const onCropCompleteHandler = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const createCroppedImage = async () => {
        try {
            const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
            return croppedImage;
        } catch (e) {
            console.error(e);
            return null;
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const croppedImage = await createCroppedImage();
            if (croppedImage) {
                onCropComplete(croppedImage);
            }
        } catch (error) {
            console.error("Error cropping image:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Crop Profile Photo</DialogTitle>
                </DialogHeader>

                <div className="relative w-full h-[400px] bg-gray-100 rounded-lg overflow-hidden">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        cropShape="round"
                        showGrid={false}
                        onCropChange={onCropChange}
                        onZoomChange={onZoomChange}
                        onCropComplete={onCropCompleteHandler}
                    />
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <ZoomOut className="w-5 h-5 text-gray-500" />
                        <Slider
                            value={[zoom]}
                            min={1}
                            max={3}
                            step={0.1}
                            onValueChange={(value) => setZoom(value[0])}
                            className="flex-1"
                        />
                        <ZoomIn className="w-5 h-5 text-gray-500" />
                    </div>
                    <p className="text-sm text-gray-500 text-center">
                        Drag to reposition • Scroll or use slider to zoom
                    </p>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading ? "Saving..." : "Save Photo"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Helper function to create cropped image
const getCroppedImg = (imageSrc: string, pixelCrop: any): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.src = imageSrc;
        image.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            if (!ctx) {
                reject(new Error("Failed to get canvas context"));
                return;
            }

            // Set canvas size to the crop size
            canvas.width = pixelCrop.width;
            canvas.height = pixelCrop.height;

            // Draw the cropped image
            ctx.drawImage(
                image,
                pixelCrop.x,
                pixelCrop.y,
                pixelCrop.width,
                pixelCrop.height,
                0,
                0,
                pixelCrop.width,
                pixelCrop.height
            );

            // Convert canvas to blob
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error("Failed to create blob"));
                }
            }, "image/jpeg", 0.95);
        };
        image.onerror = () => {
            reject(new Error("Failed to load image"));
        };
    });
};
