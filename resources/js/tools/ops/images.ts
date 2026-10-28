import { PDFDocument, PageSizes } from 'pdf-lib';

export interface PreparedImage {
    bytes: Uint8Array;
    type: 'png' | 'jpg';
}

export interface ImagesToPdfOptions {
    pageSize: 'fit' | 'a4' | 'letter';
    orientation: 'auto' | 'portrait' | 'landscape';
    /** Margen en puntos (72 pt = 1 pulgada). */
    margin: number;
}

export async function imagesToPdf(images: PreparedImage[], opts: ImagesToPdfOptions): Promise<Uint8Array> {
    if (images.length === 0) {
        throw new Error('Agregá al menos una imagen.');
    }

    const doc = await PDFDocument.create();

    for (const img of images) {
        const image = img.type === 'png' ? await doc.embedPng(img.bytes) : await doc.embedJpg(img.bytes);
        const landscapeImage = image.width > image.height;

        let pageW: number;
        let pageH: number;

        if (opts.pageSize === 'fit') {
            pageW = image.width + opts.margin * 2;
            pageH = image.height + opts.margin * 2;
        } else {
            const [w, h] = opts.pageSize === 'a4' ? PageSizes.A4 : PageSizes.Letter;
            const landscape = opts.orientation === 'landscape' || (opts.orientation === 'auto' && landscapeImage);
            [pageW, pageH] = landscape ? [h, w] : [w, h];
        }

        const page = doc.addPage([pageW, pageH]);
        const boxW = pageW - opts.margin * 2;
        const boxH = pageH - opts.margin * 2;
        const scale = Math.min(boxW / image.width, boxH / image.height, opts.pageSize === 'fit' ? 1 : Infinity);
        const w = image.width * scale;
        const h = image.height * scale;

        page.drawImage(image, { x: (pageW - w) / 2, y: (pageH - h) / 2, width: w, height: h });
    }

    return doc.save();
}

/**
 * Orientación EXIF de un JPEG (1 = normal). Las fotos del celular suelen venir
 * giradas por EXIF, y pdf-lib no lo tiene en cuenta.
 */
export function jpegOrientation(bytes: Uint8Array): number {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return 1;

    let offset = 2;
    while (offset + 4 < view.byteLength) {
        const marker = view.getUint16(offset);
        const length = view.getUint16(offset + 2);

        if (marker === 0xffe1 && view.getUint32(offset + 4) === 0x45786966) {
            const tiff = offset + 10;
            const little = view.getUint16(tiff) === 0x4949;
            const ifd = tiff + view.getUint32(tiff + 4, little);
            const entries = view.getUint16(ifd, little);

            for (let i = 0; i < entries; i++) {
                const entry = ifd + 2 + i * 12;
                if (view.getUint16(entry, little) === 0x0112) {
                    return view.getUint16(entry + 8, little);
                }
            }
            return 1;
        }

        if ((marker & 0xff00) !== 0xff00) break;
        offset += 2 + length;
    }

    return 1;
}
