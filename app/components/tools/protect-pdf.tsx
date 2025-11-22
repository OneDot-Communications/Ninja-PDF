"use client";

import { useState } from "react";
import { saveAs } from "file-saver";
import { FileUpload } from "../ui/file-upload";
import { Button } from "../ui/button";
import { Lock, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { pdfStrategyManager } from "../../lib/pdf-strategies";
import { toast } from "../../lib/use-toast";

export function ProtectPdfTool() {
    const [file, setFile] = useState<File | null>(null);
    const [userPassword, setUserPassword] = useState("");
    const [ownerPassword, setOwnerPassword] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    
    // Permissions
    const [allowPrinting, setAllowPrinting] = useState(true);
    const [allowCopying, setAllowCopying] = useState(false);
    const [allowModifying, setAllowModifying] = useState(false);
    const [allowAnnotating, setAllowAnnotating] = useState(false);
    const [allowFillingForms, setAllowFillingForms] = useState(false);
    const [allowAccessibility, setAllowAccessibility] = useState(true); // Usually good to allow for screen readers
    const [allowAssembly, setAllowAssembly] = useState(false);

    const handleFileSelected = (files: File[]) => {
        if (files.length > 0) {
            setFile(files[0]);
        }
    };

    const protectPdf = async () => {
        if (!file || (!userPassword && !ownerPassword)) return;
        setIsProcessing(true);

        try {
            const result = await pdfStrategyManager.execute('protect', [file], {
                userPassword,
                ownerPassword,
                permissions: {
                    printing: allowPrinting,
                    modifying: allowModifying,
                    copying: allowCopying,
                    annotating: allowAnnotating,
                    fillingForms: allowFillingForms,
                    contentAccessibility: allowAccessibility,
                    documentAssembly: allowAssembly,
                }
            });

            saveAs(result.blob, result.fileName || `protected-${file.name}`);
            
            toast.show({
                title: "Success",
                message: "PDF protected successfully!",
                variant: "success",
                position: "top-right",
            });
        } catch (error) {
            console.error("Error protecting PDF:", error);
            toast.show({
                title: "Protection Failed",
                message: "Failed to protect PDF. Please try again.",
                variant: "error",
                position: "top-right",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    if (!file) {
        return (
            <div className="mx-auto max-w-2xl">
                <FileUpload
                    onFilesSelected={handleFileSelected}
                    maxFiles={1}
                    accept={{ "application/pdf": [".pdf"] }}
                    description="Drop a PDF file here to protect it"
                />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-2xl font-bold">{file.name}</h2>
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" onClick={() => setFile(null)}>
                        Change File
                    </Button>
                </div>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-6 rounded-xl border bg-card p-6 shadow-sm">
                    <div className="flex items-center gap-2 border-b pb-4">
                        <Lock className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold">Security Settings</h3>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="mb-2 block text-sm font-medium">Open Password (User)</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={userPassword}
                                    onChange={(e) => setUserPassword(e.target.value)}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm pr-10"
                                    placeholder="Required to open the file"
                                />
                                <button 
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">Leave blank if you only want to restrict permissions.</p>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">Permission Password (Owner)</label>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={ownerPassword}
                                onChange={(e) => setOwnerPassword(e.target.value)}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                placeholder="Required to change permissions"
                            />
                        </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t">
                        <h4 className="text-sm font-medium">Allowed Actions</h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={allowPrinting} 
                                    onChange={e => setAllowPrinting(e.target.checked)} 
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" 
                                />
                                <span className="text-sm">Printing</span>
                            </label>

                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={allowCopying} 
                                    onChange={e => setAllowCopying(e.target.checked)} 
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" 
                                />
                                <span className="text-sm">Copying Text</span>
                            </label>

                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={allowModifying} 
                                    onChange={e => setAllowModifying(e.target.checked)} 
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" 
                                />
                                <span className="text-sm">Modifying</span>
                            </label>

                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={allowAnnotating} 
                                    onChange={e => setAllowAnnotating(e.target.checked)} 
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" 
                                />
                                <span className="text-sm">Annotating</span>
                            </label>

                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={allowFillingForms} 
                                    onChange={e => setAllowFillingForms(e.target.checked)} 
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" 
                                />
                                <span className="text-sm">Filling Forms</span>
                            </label>

                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={allowAccessibility} 
                                    onChange={e => setAllowAccessibility(e.target.checked)} 
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" 
                                />
                                <span className="text-sm">Accessibility</span>
                            </label>

                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={allowAssembly} 
                                    onChange={e => setAllowAssembly(e.target.checked)} 
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" 
                                />
                                <span className="text-sm">Assembly</span>
                            </label>
                        </div>
                    </div>

                    <Button
                        size="lg"
                        onClick={protectPdf}
                        disabled={isProcessing || (!userPassword && !ownerPassword && allowPrinting && allowCopying && allowModifying && allowAnnotating && allowFillingForms && allowAccessibility && allowAssembly)}
                        className="w-full mt-4"
                    >
                        {isProcessing ? "Processing..." : "Encrypt PDF"}
                    </Button>
                </div>

                <div className="flex items-center justify-center rounded-xl border bg-muted/20 p-8 text-center">
                    <div className="space-y-4 max-w-xs">
                        <ShieldCheck className="mx-auto h-16 w-16 text-primary/50" />
                        <h3 className="text-lg font-semibold">Bank-Grade Encryption</h3>
                        <p className="text-sm text-muted-foreground">
                            Your file will be encrypted with 128-bit AES encryption. 
                            Without the password, the content is mathematically impossible to access.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
