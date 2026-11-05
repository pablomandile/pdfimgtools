import { addPageNumbers, addWatermark, formatPageNumber, placeImage, visualFrame } from '@/tools/ops/stamp';
import { degrees, PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { PNG } from './fixtures';

async function samplePdf(pages: number, rotation = 0): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    for (let i = 0; i < pages; i++) {
        doc.addPage([200, 400]).setRotation(degrees(rotation));
    }
    return doc.save();
}

/** Si a la página se le estampó algo, tiene un stream de contenido. */
async function stamped(bytes: Uint8Array): Promise<boolean[]> {
    const doc = await PDFDocument.load(bytes);
    return doc.getPages().map((page) => page.node.normalizedEntries().Contents !== undefined);
}

describe('visualFrame', () => {
    it('invierte ancho y alto en páginas giradas 90°', async () => {
        const doc = await PDFDocument.load(await samplePdf(1, 90));
        const frame = visualFrame(doc.getPage(0));

        expect([frame.width, frame.height]).toEqual([400, 200]);
        // La esquina visible de abajo a la izquierda es la de abajo a la derecha del PDF.
        expect(frame.toPdf(0, 0)).toEqual({ x: 200, y: 0 });
    });

    it('no traduce nada en páginas sin girar', async () => {
        const doc = await PDFDocument.load(await samplePdf(1));
        expect(visualFrame(doc.getPage(0)).toPdf(10, 20)).toEqual({ x: 10, y: 20 });
    });
});

describe('formatPageNumber', () => {
    it('arma los formatos disponibles', () => {
        expect(formatPageNumber('n', 3, 9)).toBe('3');
        expect(formatPageNumber('n-de-total', 3, 9)).toBe('3 de 9');
        expect(formatPageNumber('pagina-n-de-total', 3, 9)).toBe('Página 3 de 9');
    });
});

describe('addPageNumbers', () => {
    it('numera desde la página pedida y deja las anteriores intactas', async () => {
        const out = await addPageNumbers(await samplePdf(3), {
            position: 'bottom-center',
            format: 'pagina-n-de-total',
            fromPage: 2,
            startAt: 1,
            size: 12,
            margin: 20,
            color: '#000000',
        });

        expect(await stamped(out)).toEqual([false, true, true]);
    });
});

describe('addWatermark', () => {
    it('estampa texto en todas las páginas, también en las giradas', async () => {
        const out = await addWatermark(await samplePdf(2, 90), { kind: 'text', text: 'CONFIDENCIAL', opacity: 0.3, angle: 45, layout: 'mosaic' });
        expect(await stamped(out)).toEqual([true, true]);
    });

    it('acepta una imagen como marca', async () => {
        const out = await addWatermark(await samplePdf(1), {
            kind: 'image',
            image: { bytes: PNG, type: 'png' },
            opacity: 0.5,
            angle: 0,
            layout: 'center',
        });
        expect(await stamped(out)).toEqual([true]);
    });

    it('pide el texto si está vacío', async () => {
        await expect(addWatermark(await samplePdf(1), { kind: 'text', text: '  ', opacity: 1, angle: 0, layout: 'center' })).rejects.toThrow(
            'Escribí el texto',
        );
    });
});

describe('placeImage', () => {
    it('ubica la firma solo en las páginas indicadas', async () => {
        const out = await placeImage(await samplePdf(3), { bytes: PNG, type: 'png' }, [{ page: 2, x: 0.5, y: 0.8, width: 0.3 }]);
        expect(await stamped(out)).toEqual([false, false, true]);
    });

    it('pide al menos una ubicación', async () => {
        await expect(placeImage(await samplePdf(1), { bytes: PNG, type: 'png' }, [])).rejects.toThrow('al menos una página');
    });
});
