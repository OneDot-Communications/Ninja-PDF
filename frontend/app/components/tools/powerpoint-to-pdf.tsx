"use client";

import { useState } from "react";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import { ArrowRight, Presentation, Loader2, RefreshCw, Settings, LayoutTemplate } from "lucide-react";
import JSZip from "jszip";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { saveAs } from "file-saver";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";

export function PowerPointToPdfTool() {
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState("");
    
    // Options
    const [layout, setLayout] = useState<"slides" | "handouts">("slides");
    const [includeImages, setIncludeImages] = useState(true);

    const handleFilesSelected = (newFiles: File[]) => {
        setFiles((prev) => [...prev, ...newFiles]);
    };

    const convert = async () => {
        if (files.length === 0) return;
        setIsProcessing(true);
        setStatus("Reading PowerPoint file...");

        try {
            const file = files[0];
            const zip = new JSZip();
            const content = await zip.loadAsync(file);
            
            const pdfDoc = await PDFDocument.create();
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            
            // Find slides
            const slideFiles = Object.keys(content.files).filter(name => name.match(/ppt\/slides\/slide\d+\.xml/));
            // Sort slides by number
            slideFiles.sort((a, b) => {
                const numA = parseInt(a.match(/slide(\d+)\.xml/)![1]);
                const numB = parseInt(b.match(/slide(\d+)\.xml/)![1]);
                return numA - numB;
            });
            
            let currentHandoutPage: any = null;
            let handoutY = 750; // Start from top
            
            for (let i = 0; i < slideFiles.length; i++) {
                const slideFile = slideFiles[i];
                const slideNum = slideFile.match(/slide(\d+)\.xml/)![1];
                setStatus(`Processing Slide ${slideNum}...`);
                
                const slideXml = await content.files[slideFile].async("text");
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(slideXml, "text/xml");
                
                // Extract text
                const textElements = xmlDoc.getElementsByTagName("a:t");
                let slideText = "";
                for (let j = 0; j < textElements.length; j++) {
                    slideText += textElements[j].textContent + "\n";
                }
                
                // Extract Images if enabled
                const images: { data: Uint8Array, type: string, x: number, y: number, w: number, h: number }[] = [];
                
                if (includeImages) {
                    try {
                        // Load relationships
                        const relsFile = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
                        if (content.files[relsFile]) {
                            const relsXml = await content.files[relsFile].async("text");
                            const relsDoc = parser.parseFromString(relsXml, "text/xml");
                            const relationships = relsDoc.getElementsByTagName("Relationship");
                            const relMap: {[key: string]: string} = {};
                            
                            for (let r = 0; r < relationships.length; r++) {
                                const id = relationships[r].getAttribute("Id");
                                const target = relationships[r].getAttribute("Target");
                                if (id && target) relMap[id] = target;
                            }
                            
                            // Find pictures
                            const pics = xmlDoc.getElementsByTagName("p:pic");
                            for (let p = 0; p < pics.length; p++) {
                                const pic = pics[p];
                                const blip = pic.getElementsByTagName("a:blip")[0];
                                const embedId = blip?.getAttribute("r:embed");
                                
                                if (embedId && relMap[embedId]) {
                                    // Resolve path (usually ../media/image.png)
                                    let imagePath = relMap[embedId];
                                    if (imagePath.startsWith("../")) {
                                        imagePath = "ppt/" + imagePath.substring(3);
                                    } else {
                                        imagePath = "ppt/slides/" + imagePath; // Relative to slide folder? usually not.
                                    }
                                    
                                    if (content.files[imagePath]) {
                                        const imgData = await content.files[imagePath].async("uint8array");
                                        const ext = imagePath.split(".").pop()?.toLowerCase();
                                        
                                        // Get transform
                                        const xfrm = pic.getElementsByTagName("a:xfrm")[0];
                                        const off = xfrm?.getElementsByTagName("a:off")[0];
                                        const extDim = xfrm?.getElementsByTagName("a:ext")[0];
                                        
                                        if (off && extDim) {
                                            // EMU to Points (1 inch = 914400 EMUs = 72 points)
                                            // 1 point = 12700 EMUs
                                            const x = parseInt(off.getAttribute("x") || "0") / 12700;
                                            const y = parseInt(off.getAttribute("y") || "0") / 12700;
                                            const w = parseInt(extDim.getAttribute("cx") || "0") / 12700;
                                            const h = parseInt(extDim.getAttribute("cy") || "0") / 12700;
                                            
                                            images.push({ data: imgData, type: ext || "png", x, y, w, h });
                                        }
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        console.warn("Failed to extract images for slide " + slideNum, e);
                    }
                }

                if (layout === "slides") {
                    const page = pdfDoc.addPage([720, 540]); // Standard PPT size (10x7.5 inches)
                    const { height } = page.getSize();
                    
                    // Draw Images
                    for (const img of images) {
                        try {
                            let pdfImage;
                            if (img.type === "png") pdfImage = await pdfDoc.embedPng(img.data);
                            else if (img.type === "jpg" || img.type === "jpeg") pdfImage = await pdfDoc.embedJpg(img.data);
                            
                            if (pdfImage) {
                                page.drawImage(pdfImage, {
                                    x: img.x,
                                    y: height - img.y - img.h, // PDF coords are bottom-left
                                    width: img.w,
                                    height: img.h
                                });
                            }
                        } catch (e) {
                            console.warn("Failed to embed image", e);
                        }
                    }
                    
                    // Draw Text (Overlay)
                    if (slideText) {
                        page.drawText(slideText, {
                            x: 50,
                            y: height - 50,
                            size: 12,
                            font,
                            color: rgb(0, 0, 0),
                            maxWidth: 620,
                            lineHeight: 14,
                        });
                    }
                } else {
                    // Handouts
                    if (i % 3 === 0) {
                        currentHandoutPage = pdfDoc.addPage([595, 842]); // A4
                        handoutY = 750;
                    }
                    
                    if (currentHandoutPage) {
                        currentHandoutPage.drawText(`Slide ${slideNum}`, {
                            x: 50,
                            y: handoutY,
                            size: 10,
                            font,
                            color: rgb(0.5, 0.5, 0.5),
                        });
                        
                        // Draw a box for the slide
                        currentHandoutPage.drawRectangle({
                            x: 50,
                            y: handoutY - 150,
                            width: 200,
                            height: 140,
                            borderColor: rgb(0, 0, 0),
                            borderWidth: 1,
                        });
                        
                        // Draw text preview inside box
                        if (slideText) {
                            currentHandoutPage.drawText(slideText.substring(0, 200) + "...", {
                                x: 55,
                                y: handoutY - 20,
                                size: 8,
                                font,
                                maxWidth: 190,
                                lineHeight: 10,
                            });
                        }
                        
                        // Draw lines for notes
                        for (let k = 0; k < 5; k++) {
                            currentHandoutPage.drawLine({
                                start: { x: 270, y: handoutY - 30 - (k * 25) },
                                end: { x: 550, y: handoutY - 30 - (k * 25) },
                                thickness: 1,
                                color: rgb(0.8, 0.8, 0.8),
                            });
                        }
                        
                        handoutY -= 250;
                    }
                }
            }
            
            setStatus("Saving PDF...");
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
            saveAs(blob, file.name.replace(/\.pptx?$/, ".pdf"));
            setStatus("Completed!");
            
        } catch (error) {
            console.error("Conversion Error:", error);
            alert("Failed to convert PowerPoint to PDF.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (files.length === 0) {
        return (
            <div className="mx-auto max-w-2xl">
                <FileUpload
                    onFilesSelected={handleFilesSelected}
                    maxFiles={1}
                    accept={{ "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"], "application/vnd.ms-powerpoint": [".ppt"] }}
                    description="Drop PowerPoint file here to convert to PDF"
                />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between rounded-xl border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                        <Presentation className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold">{files[0].name}</h2>
                        <p className="text-sm text-muted-foreground">
                            {(files[0].size / 1024 / 1024).toFixed(2)} MB
                        </p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setFiles([])}>
                    <RefreshCw className="h-5 w-5" />
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-6 rounded-xl border bg-card p-6 shadow-sm">
                    <div className="flex items-center gap-2 border-b pb-4">
                        <Settings className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold">Conversion Settings</h3>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Layout</Label>
                            <div className="flex gap-2">
                                <Button 
                                    variant={layout === "slides" ? "default" : "outline"} 
                                    onClick={() => setLayout("slides")}
                                    className="flex-1"
                                >
                                    <Presentation className="mr-2 h-4 w-4" /> Slides
                                </Button>
                                <Button 
                                    variant={layout === "handouts" ? "default" : "outline"} 
                                    onClick={() => setLayout("handouts")}
                                    className="flex-1"
                                >
                                    <LayoutTemplate className="mr-2 h-4 w-4" /> Handouts
                                </Button>
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base">Include Images</Label>
                                <p className="text-xs text-muted-foreground">Extract and place images from slides</p>
                            </div>
                            <Switch checked={includeImages} onCheckedChange={setIncludeImages} />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center space-y-6 rounded-xl border bg-muted/20 p-6">
                    {isProcessing ? (
                        <div className="w-full max-w-md space-y-4 text-center">
                            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
                            <p className="text-lg font-medium">{status}</p>
                        </div>
                    ) : (
                        <div className="text-center space-y-4">
                            <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto">
                                <Presentation className="h-8 w-8 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold">Ready to Convert</h3>
                            <p className="text-muted-foreground max-w-xs mx-auto">
                                We'll convert your presentation to PDF with your chosen layout.
                            </p>
                            <Button
                                size="lg"
                                onClick={convert}
                                className="h-14 min-w-[200px] text-lg shadow-lg transition-all hover:scale-105"
                            >
                                Convert to PDF <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
