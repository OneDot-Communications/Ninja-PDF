
export interface PDFTextItem {
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fontName: string;
    fontSize: number;
    transform: number[]; // PDF transform matrix
}

export interface CanvasTextItem {
    text: string;
    left: number;
    top: number;
    width: number;
    height: number;
    fontSize: number;
    fontFamily: string;
}

export interface PDFPageDimensions {
    width: number;
    height: number;
    scale: number;
}

export interface PDFLineItem {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    stroke: string;
    strokeWidth: number;
}

export interface CanvasLineItem {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    stroke: string;
    strokeWidth: number;
}

export interface TextProperties {
    x: number;
    y: number;
    width: number;
    height: number;
    angle: number;
    fontSize: number;
    fontFamily: string;
    fill: string;
    fontWeight: string;
    fontStyle: "" | "normal" | "italic" | "oblique";
    underline: boolean;
    linethrough: boolean;
    textAlign: string;
    lineHeight: number;
    charSpacing: number;
}

export const defaultTextProps: TextProperties = {
    x: 0, y: 0, width: 100, height: 20, angle: 0,
    fontSize: 16, fontFamily: 'Arial', fill: '#000000',
    fontWeight: 'normal', fontStyle: 'normal',
    underline: false, linethrough: false,
    textAlign: 'left',
    lineHeight: 1.2,
    charSpacing: 0
};

