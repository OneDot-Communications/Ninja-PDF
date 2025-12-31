"use client";

import { useState } from "react";
import { ConversionLayout } from "./shared/conversion-layout";
import { pdfApi } from "@/lib/services/pdf-api";
import { saveAs } from "file-saver";
import { toast } from "@/app/client-layout";
import { useRouter } from "next/navigation";

export function ExcelToPdfTool() {
    const router = useRouter();
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [options, setOptions] = useState({
        orientation: "portrait" as "portrait" | "landscape",
        margin: "normal" as "small" | "normal" | "big",
        pdfa: false
    });

    const handleFilesSelected = (newFiles: File[]) => {
        setFiles((prev) => [...prev, ...newFiles]);
    };

    const handleRemoveFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleClearAll = () => {
        setFiles([]);
    };

    const convert = async () => {
        if (files.length === 0) return;
        setIsProcessing(true);

        try {
            for (const file of files) {
                const result = await pdfApi.excelToPdf(file, options);
                saveAs(result.blob, result.fileName);
            }

            toast.show({
                title: "Success",
                message: "Files converted successfully!",
                variant: "success",
                position: "bottom-right"
            });

        } catch (error: any) {
            console.error("Conversion Error:", error);
            if (error.message && error.message.includes("QUOTA_EXCEEDED")) {
                toast.show({
                    title: "Limit Reached",
                    message: "You have reached your daily limit for this tool.",
                    variant: "warning",
                    position: "top-center",
                    actions: {
                        label: "Upgrade to Unlimited",
                        onClick: () => router.push('/pricing')
                    }
                });
            } else {
                toast.show({
                    title: "Conversion Failed",
                    message: "Failed to convert Excel to PDF.",
                    variant: "error",
                    position: "bottom-right"
                });
            }
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <ConversionLayout
            toolName="Excel to PDF"
            files={files}
            onFilesSelected={handleFilesSelected}
            onRemoveFile={handleRemoveFile}
            onClearAll={handleClearAll}
            onConvert={convert}
            isProcessing={isProcessing}
            accept={{ "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"], "application/vnd.ms-excel": [".xls"] }}
            options={options}
            setOptions={setOptions}
        />
    );
}
