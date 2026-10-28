import { degrees, PDFDocument, PDFFont, PDFImage, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import { Bytes, loadPdf, normalizeAngle } from './pdf';

/**
 * La página tal como se ve: si tiene /Rotate, el ancho y el alto visibles se
 * invierten y las coordenadas hay que traducirlas. Todo lo que se estampa se
 * calcula en coordenadas visibles (origen abajo a la izquierda) y acá se pasa
 * al espacio del PDF.
 */
export interface Frame {
    width: number;
    height: number;
    rotation: number;
    toPdf(x: number, y: number): { x: number; y: number };
}

export function visualFrame(page: PDFPage): Frame {
    const box = page.getCropBox();
    const r = normalizeAngle(page.getRotation().angle);
    const { x: x0, y: y0, width: w, height: h } = box;
    const swap = r === 90 || r === 270;

    const toPdf = (x: number, y: number) => {
        switch (r) {
            case 90:
                return { x: x0 + w - y, y: y0 + x };
            case 180:
                return { x: x0 + w - x, y: y0 + h - y };
            case 270:
                return { x: x0 + y, y: y0 + h - x };
            default:
                return { x: x0 + x, y: y0 + y };
        }
    };

    return { width: swap ? h : w, height: swap ? w : h, rotation: r, toPdf };
}

export function hexToRgb(hex: string) {
    const n = parseInt(hex.replace('#', ''), 16);
    return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

interface TextStyle {
    font: PDFFont;
    size: number;
    color: string;
    opacity?: number;
    /** Ángulo visible en grados, antihorario. */
    angle?: number;
}

/** Dibuja un texto centrado en el punto visible (cx, cy). */
function drawCenteredText(page: PDFPage, frame: Frame, text: string, cx: number, cy: number, style: TextStyle) {
    const a = ((style.angle ?? 0) * Math.PI) / 180;
    const w = style.font.widthOfTextAtSize(text, style.size);
    const h = style.font.heightAtSize(style.size, { descender: false }) * 0.8;
    const start = frame.toPdf(cx - (w / 2) * Math.cos(a) + (h / 2) * Math.sin(a), cy - (w / 2) * Math.sin(a) - (h / 2) * Math.cos(a));

    page.drawText(text, {
        x: start.x,
        y: start.y,
        size: style.size,
        font: style.font,
        color: hexToRgb(style.color),
        opacity: style.opacity ?? 1,
        rotate: degrees(frame.rotation + (style.angle ?? 0)),
    });
}

/** Dibuja una imagen con su esquina inferior izquierda visible en (x, y). */
function drawImageAt(page: PDFPage, frame: Frame, image: PDFImage, x: number, y: number, width: number, height: number, opacity = 1) {
    const origin = frame.toPdf(x, y);
    page.drawImage(image, { x: origin.x, y: origin.y, width, height, opacity, rotate: degrees(frame.rotation) });
}

async function embedImage(doc: PDFDocument, bytes: Bytes, type: 'png' | 'jpg'): Promise<PDFImage> {
    return type === 'png' ? doc.embedPng(bytes) : doc.embedJpg(bytes);
}

// ---------------------------------------------------------------------------
// Numerar páginas
// ---------------------------------------------------------------------------

export type Position = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface PageNumberOptions {
    position: Position;
    format: 'n' | 'n-de-total' | 'pagina-n' | 'pagina-n-de-total';
    /** Página (base 1) desde la que se empieza a numerar. */
    fromPage: number;
    /** Número que se muestra en la primera página numerada. */
    startAt: number;
    size: number;
    margin: number;
    color: string;
}

export function formatPageNumber(format: PageNumberOptions['format'], n: number, total: number): string {
    switch (format) {
        case 'n-de-total':
            return `${n} de ${total}`;
        case 'pagina-n':
            return `Página ${n}`;
        case 'pagina-n-de-total':
            return `Página ${n} de ${total}`;
        default:
            return `${n}`;
    }
}

export async function addPageNumbers(bytes: Bytes, opts: PageNumberOptions): Promise<Uint8Array> {
    const doc = await loadPdf(bytes);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const pages = doc.getPages();
    const first = Math.max(1, opts.fromPage) - 1;
    const total = opts.startAt + (pages.length - first) - 1;

    pages.slice(first).forEach((page, i) => {
        const frame = visualFrame(page);
        const text = formatPageNumber(opts.format, opts.startAt + i, total);
        const w = font.widthOfTextAtSize(text, opts.size);
        const [vertical, horizontal] = opts.position.split('-');

        const cx = horizontal === 'left' ? opts.margin + w / 2 : horizontal === 'right' ? frame.width - opts.margin - w / 2 : frame.width / 2;
        const cy = vertical === 'top' ? frame.height - opts.margin - opts.size / 2 : opts.margin + opts.size / 2;

        drawCenteredText(page, frame, text, cx, cy, { font, size: opts.size, color: opts.color });
    });

    return doc.save();
}

// ---------------------------------------------------------------------------
// Marca de agua
// ---------------------------------------------------------------------------

export interface WatermarkOptions {
    kind: 'text' | 'image';
    text?: string;
    size?: number;
    color?: string;
    bold?: boolean;
    image?: { bytes: Bytes; type: 'png' | 'jpg' };
    /** Ancho de la imagen como fracción del ancho de la página. */
    scale?: number;
    opacity: number;
    angle: number;
    layout: 'center' | 'mosaic';
}

export async function addWatermark(bytes: Bytes, opts: WatermarkOptions): Promise<Uint8Array> {
    const doc = await loadPdf(bytes);

    if (opts.kind === 'text') {
        const text = (opts.text ?? '').trim();
        if (!text) {
            throw new Error('Escribí el texto de la marca de agua.');
        }

        const font = await doc.embedFont(opts.bold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica);
        const style: TextStyle = { font, size: opts.size ?? 48, color: opts.color ?? '#888888', opacity: opts.opacity, angle: opts.angle };

        for (const page of doc.getPages()) {
            const frame = visualFrame(page);
            for (const [cx, cy] of layoutPoints(frame, opts.layout, font.widthOfTextAtSize(text, style.size), style.size)) {
                drawCenteredText(page, frame, text, cx, cy, style);
            }
        }
    } else {
        if (!opts.image) {
            throw new Error('Elegí una imagen para la marca de agua.');
        }

        const image = await embedImage(doc, opts.image.bytes, opts.image.type);

        for (const page of doc.getPages()) {
            const frame = visualFrame(page);
            const w = frame.width * (opts.scale ?? 0.4);
            const h = (w * image.height) / image.width;
            for (const [cx, cy] of layoutPoints(frame, opts.layout, w, h)) {
                drawImageAt(page, frame, image, cx - w / 2, cy - h / 2, w, h, opts.opacity);
            }
        }
    }

    return doc.save();
}

/** Centros donde va la marca: uno en el medio, o una grilla que cubre la página. */
function layoutPoints(frame: Frame, layout: WatermarkOptions['layout'], w: number, h: number): [number, number][] {
    if (layout === 'center') {
        return [[frame.width / 2, frame.height / 2]];
    }

    const stepX = Math.max(w * 1.3, 80);
    const stepY = Math.max(h * 3, 80);
    const points: [number, number][] = [];

    for (let y = stepY / 2, row = 0; y < frame.height; y += stepY, row++) {
        const offset = row % 2 ? stepX / 2 : 0;
        for (let x = stepX / 2 + offset - stepX / 2; x < frame.width + stepX / 2; x += stepX) {
            points.push([x, y]);
        }
    }

    return points;
}

// ---------------------------------------------------------------------------
// Firmar (o cualquier imagen ubicada a mano)
// ---------------------------------------------------------------------------

/** Ubicación en fracciones de la página visible, con origen arriba a la izquierda (como en pantalla). */
export interface Placement {
    page: number;
    x: number;
    y: number;
    width: number;
}

export async function placeImage(bytes: Bytes, image: { bytes: Bytes; type: 'png' | 'jpg' }, placements: Placement[]): Promise<Uint8Array> {
    if (placements.length === 0) {
        throw new Error('Ubicá la firma en al menos una página.');
    }

    const doc = await loadPdf(bytes);
    const embedded = await embedImage(doc, image.bytes, image.type);
    const pages = doc.getPages();

    for (const p of placements) {
        const page = pages[p.page];
        if (!page) continue;

        const frame = visualFrame(page);
        const w = p.width * frame.width;
        const h = (w * embedded.height) / embedded.width;
        // De "arriba a la izquierda" en pantalla a "abajo a la izquierda" del PDF.
        drawImageAt(page, frame, embedded, p.x * frame.width, frame.height - p.y * frame.height - h, w, h);
    }

    return doc.save();
}
