import { degrees, PDFDocument } from 'pdf-lib';

export type Bytes = Uint8Array | ArrayBuffer;

/** Una página de salida: qué página del original y cuánto girarla (sumado a su giro actual). */
export interface PageRef {
    index: number;
    rotation: number;
}

export async function loadPdf(bytes: Bytes): Promise<PDFDocument> {
    try {
        return await PDFDocument.load(bytes);
    } catch (e) {
        if (String(e).toLowerCase().includes('encrypted')) {
            throw new Error('El PDF está protegido con contraseña. Desbloquealo primero.');
        }
        throw new Error('No se pudo leer el PDF. Puede estar dañado.');
    }
}

export async function pageCount(bytes: Bytes): Promise<number> {
    return (await loadPdf(bytes)).getPageCount();
}

export function normalizeAngle(angle: number): number {
    return ((angle % 360) + 360) % 360;
}

export async function mergePdfs(files: Bytes[]): Promise<Uint8Array> {
    const out = await PDFDocument.create();

    for (const bytes of files) {
        const src = await loadPdf(bytes);
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((page) => out.addPage(page));
    }

    return out.save();
}

/** Arma un PDF nuevo con las páginas indicadas, en ese orden y con ese giro extra. */
export async function buildFromPages(bytes: Bytes, refs: PageRef[]): Promise<Uint8Array> {
    if (refs.length === 0) {
        throw new Error('El resultado no tendría ninguna página.');
    }

    const src = await loadPdf(bytes);
    const out = await PDFDocument.create();
    const pages = await out.copyPages(
        src,
        refs.map((r) => r.index),
    );

    pages.forEach((page, i) => {
        const extra = refs[i].rotation;
        if (extra) {
            page.setRotation(degrees(normalizeAngle(page.getRotation().angle + extra)));
        }
        out.addPage(page);
    });

    return out.save();
}

/**
 * Interpreta rangos escritos por el usuario ("1-3, 5, 8-") y los devuelve como
 * listas de índices base 0. Tira un error con un mensaje claro si algo no cierra.
 */
export function parseRanges(input: string, total: number): number[][] {
    const parts = input
        .split(/[,;]/)
        .map((p) => p.trim())
        .filter(Boolean);

    if (parts.length === 0) {
        throw new Error('Escribí al menos un rango, por ejemplo 1-3, 5.');
    }

    return parts.map((part) => {
        const match = part.match(/^(\d*)\s*(-?)\s*(\d*)$/);
        if (!match || (!match[1] && !match[3])) {
            throw new Error(`No entiendo el rango "${part}".`);
        }

        const isRange = match[2] === '-';
        const from = match[1] ? Number(match[1]) : 1;
        const to = isRange ? (match[3] ? Number(match[3]) : total) : from;

        if (from < 1 || to > total || from > to) {
            throw new Error(`El rango "${part}" no es válido: el PDF tiene ${total} páginas.`);
        }

        return Array.from({ length: to - from + 1 }, (_, i) => from - 1 + i);
    });
}

/** Rangos de N páginas cada uno: [[0..n-1], [n..2n-1], ...]. */
export function chunkRanges(total: number, size: number): number[][] {
    if (!Number.isInteger(size) || size < 1) {
        throw new Error('La cantidad de páginas por archivo tiene que ser 1 o más.');
    }

    const ranges: number[][] = [];
    for (let start = 0; start < total; start += size) {
        ranges.push(Array.from({ length: Math.min(size, total - start) }, (_, i) => start + i));
    }
    return ranges;
}

/** Un PDF por cada rango. */
export async function splitPdf(bytes: Bytes, ranges: number[][]): Promise<Uint8Array[]> {
    const src = await loadPdf(bytes);
    const results: Uint8Array[] = [];

    for (const range of ranges) {
        const out = await PDFDocument.create();
        const pages = await out.copyPages(src, range);
        pages.forEach((page) => out.addPage(page));
        results.push(await out.save());
    }

    return results;
}

/** Describe un rango base 0 como texto para nombrar archivos: "1-3" o "5". */
export function rangeLabel(range: number[]): string {
    const first = range[0] + 1;
    const last = range[range.length - 1] + 1;
    return first === last ? `${first}` : `${first}-${last}`;
}
