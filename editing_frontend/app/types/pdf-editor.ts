
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
