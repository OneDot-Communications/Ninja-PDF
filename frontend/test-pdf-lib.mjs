import { PDFDocument } from 'pdf-lib';

async function test() {
    console.log("Testing pdf-lib...");
    try {
        const pdfDoc = await PDFDocument.create();
        console.log("PDFDocument created.");
        if (typeof pdfDoc.encrypt === 'function') {
            console.log("pdfDoc.encrypt is a function. Encryption is supported.");
        } else {
            console.log("pdfDoc.encrypt is NOT a function. Encryption is NOT supported.");
            console.log("Keys on pdfDoc:", Object.keys(pdfDoc));
            console.log("Prototype keys:", Object.getOwnPropertyNames(Object.getPrototypeOf(pdfDoc)));
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

test();
