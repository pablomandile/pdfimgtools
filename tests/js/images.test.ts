import { imagesToPdf, jpegOrientation } from '@/tools/ops/images';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { PNG } from './fixtures';

describe('imagesToPdf', () => {
    it('genera una página por imagen', async () => {
        const out = await imagesToPdf(
            [
                { bytes: PNG, type: 'png' },
                { bytes: PNG, type: 'png' },
            ],
            { pageSize: 'a4', orientation: 'portrait', margin: 20 },
        );
        const doc = await PDFDocument.load(out);

        expect(doc.getPageCount()).toBe(2);
        expect(Math.round(doc.getPage(0).getWidth())).toBe(595);
    });

    it('en modo "ajustar" la página mide lo que la imagen más el margen', async () => {
        const out = await imagesToPdf([{ bytes: PNG, type: 'png' }], { pageSize: 'fit', orientation: 'auto', margin: 10 });
        expect((await PDFDocument.load(out)).getPage(0).getSize()).toEqual({ width: 21, height: 21 });
    });

    it('pide al menos una imagen', async () => {
        await expect(imagesToPdf([], { pageSize: 'fit', orientation: 'auto', margin: 0 })).rejects.toThrow('al menos una imagen');
    });
});

describe('jpegOrientation', () => {
    it('lee la orientación EXIF', () => {
        // SOI + APP1 "Exif" con TIFF big-endian y una sola entrada 0x0112 = 6.
        const bytes = new Uint8Array([
            0xff, 0xd8, 0xff, 0xe1, 0x00, 0x22, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, 0x00, 0x01, 0x01,
            0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        ]);
        expect(jpegOrientation(bytes)).toBe(6);
    });

    it('devuelve 1 si no es un JPEG o no tiene EXIF', () => {
        expect(jpegOrientation(PNG)).toBe(1);
        expect(jpegOrientation(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]))).toBe(1);
    });
});
