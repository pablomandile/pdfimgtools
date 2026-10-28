import type { PDFDocumentProxy } from 'pdfjs-dist';
import * as pdfjs from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export type { PDFDocumentProxy };

export async function openPdf(bytes: Uint8Array, password?: string): Promise<PDFDocumentProxy> {
    // pdf.js se queda con el buffer (lo transfiere al worker): le pasamos una copia.
    return pdfjs.getDocument({ data: bytes.slice(), password }).promise;
}

/**
 * Dibuja una página (base 1) en un canvas. Con `width` escala para ese ancho en
 * píxeles; con `scale`, 1 = 72 ppp.
 */
export async function renderPage(
    doc: PDFDocumentProxy,
    pageNumber: number,
    size: { width: number } | { scale: number },
    extraRotation = 0,
): Promise<HTMLCanvasElement> {
    const page = await doc.getPage(pageNumber);
    const rotation = (page.rotate + extraRotation) % 360;
    const base = page.getViewport({ scale: 1, rotation });
    const scale = 'width' in size ? size.width / base.width : size.scale;
    const viewport = page.getViewport({ scale, rotation });

    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    const ctx = canvas.getContext('2d')!;
    // Fondo blanco: las páginas sin fondo saldrían transparentes (negras en JPG).
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    page.cleanup();

    return canvas;
}

/** Miniatura como data URL, para mostrar en <img>. */
export async function thumbnail(doc: PDFDocumentProxy, pageNumber: number, width = 180): Promise<string> {
    const canvas = await renderPage(doc, pageNumber, { width: width * Math.min(window.devicePixelRatio || 1, 2) });
    return canvas.toDataURL('image/jpeg', 0.8);
}
