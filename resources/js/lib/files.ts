import { jpegOrientation, PreparedImage } from '@/tools/ops/images';
import JSZip from 'jszip';

export interface OutputFile {
    name: string;
    data: Blob | Uint8Array;
}

export async function readBytes(file: Blob): Promise<Uint8Array> {
    return new Uint8Array(await file.arrayBuffer());
}

export function baseName(name: string): string {
    return name.replace(/\.[^.]+$/, '');
}

export function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

export function toBlob(data: Blob | Uint8Array, type = 'application/pdf'): Blob {
    return data instanceof Blob ? data : new Blob([data as BlobPart], { type });
}

export function downloadBlob(blob: Blob, name: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Descarga un archivo suelto, o un .zip si son varios. */
export async function downloadAll(files: OutputFile[], zipName: string): Promise<void> {
    if (files.length === 1) {
        downloadBlob(toBlob(files[0].data), files[0].name);
        return;
    }

    const zip = new JSZip();
    const used = new Set<string>();

    for (const file of files) {
        zip.file(uniqueName(file.name, used), file.data);
    }

    downloadBlob(await zip.generateAsync({ type: 'blob' }), zipName);
}

function uniqueName(name: string, used: Set<string>): string {
    let candidate = name;
    for (let i = 2; used.has(candidate); i++) {
        candidate = name.replace(/(\.[^.]+)?$/, ` (${i})$1`);
    }
    used.add(candidate);
    return candidate;
}

/** ¿Coincide el archivo con un atributo accept (".pdf,image/png,...")? */
export function matchesAccept(file: File, accept: string): boolean {
    const name = file.name.toLowerCase();
    return accept
        .split(',')
        .map((a) => a.trim().toLowerCase())
        .some((a) => (a.startsWith('.') ? name.endsWith(a) : a.endsWith('/*') ? file.type.startsWith(a.slice(0, -1)) : file.type === a));
}

// ---------------------------------------------------------------------------
// Imágenes (canvas)
// ---------------------------------------------------------------------------

export type ImageFormat = 'jpg' | 'png' | 'webp';

const MIME: Record<ImageFormat, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

export type Resize = { mode: 'none' } | { mode: 'max'; px: number } | { mode: 'percent'; value: number };

/** Tamaño final de una imagen de `width`×`height`. «Lado mayor máximo» nunca agranda. */
export function targetSize(width: number, height: number, resize: Resize = { mode: 'none' }): { width: number; height: number } {
    let scale = 1;
    if (resize.mode === 'max') scale = Math.min(1, resize.px / Math.max(width, height));
    if (resize.mode === 'percent') scale = resize.value / 100;

    return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/**
 * Achica de a mitades hasta quedar a menos del doble del destino: un solo
 * drawImage de 4000 px a 400 px saltea píxeles y queda serruchado.
 */
function downscale(source: CanvasImageSource, width: number, height: number, to: { width: number; height: number }): CanvasImageSource {
    let current = source;
    let w = width;
    let h = height;

    while (w / 2 >= to.width && h / 2 >= to.height) {
        w = Math.round(w / 2);
        h = Math.round(h / 2);
        const step = document.createElement('canvas');
        step.width = w;
        step.height = h;
        const ctx = step.getContext('2d')!;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(current, 0, 0, w, h);
        current = step;
    }

    return current;
}

/** Dibuja la imagen en un canvas, ya derecha según EXIF y al tamaño pedido. */
export async function imageToCanvas(file: Blob, background?: string, resize?: Resize): Promise<HTMLCanvasElement> {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const size = targetSize(bitmap.width, bitmap.height, resize);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;

    const ctx = canvas.getContext('2d')!;
    if (background) {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(downscale(bitmap, bitmap.width, bitmap.height, size), 0, 0, size.width, size.height);
    bitmap.close();

    return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement, format: ImageFormat, quality = 0.92): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('El navegador no pudo generar la imagen.'))), MIME[format], quality);
    });
}

/** Convierte una imagen a otro formato. JPG no tiene transparencia: se rellena con `background`. */
export async function convertImage(file: Blob, format: ImageFormat, quality: number, background = '#ffffff', resize?: Resize): Promise<Blob> {
    const canvas = await imageToCanvas(file, format === 'jpg' ? background : undefined, resize);
    return canvasToBlob(canvas, format, quality);
}

/**
 * Deja la imagen lista para pdf-lib, que solo entiende JPG y PNG. Los JPG
 * derechos pasan tal cual (sin perder calidad); el resto se recodifica.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
    const bytes = await readBytes(file);

    if (file.type === 'image/png') {
        return { bytes, type: 'png' };
    }

    if (file.type === 'image/jpeg' && jpegOrientation(bytes) === 1) {
        return { bytes, type: 'jpg' };
    }

    const isJpeg = file.type === 'image/jpeg';
    const blob = await canvasToBlob(await imageToCanvas(file), isJpeg ? 'jpg' : 'png', 0.95);

    return { bytes: await readBytes(blob), type: isJpeg ? 'jpg' : 'png' };
}
