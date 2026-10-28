import { buildFromPages, chunkRanges, mergePdfs, parseRanges, rangeLabel, splitPdf } from '@/tools/ops/pdf';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

/** PDF de prueba con N páginas de distinto ancho, para poder reconocerlas. */
async function samplePdf(pages: number, baseWidth = 100): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    for (let i = 0; i < pages; i++) {
        doc.addPage([baseWidth + i, 200]);
    }
    return doc.save();
}

async function widths(bytes: Uint8Array): Promise<number[]> {
    return (await PDFDocument.load(bytes)).getPages().map((p) => p.getWidth());
}

describe('mergePdfs', () => {
    it('junta las páginas de todos los archivos en orden', async () => {
        const merged = await mergePdfs([await samplePdf(2, 100), await samplePdf(3, 300)]);
        expect(await widths(merged)).toEqual([100, 101, 300, 301, 302]);
    });

    it('avisa si un archivo no es un PDF', async () => {
        await expect(mergePdfs([new TextEncoder().encode('hola')])).rejects.toThrow('No se pudo leer el PDF');
    });
});

describe('parseRanges', () => {
    it('entiende páginas sueltas, rangos y rangos abiertos', () => {
        expect(parseRanges('1-3, 5, 8-', 9)).toEqual([[0, 1, 2], [4], [7, 8]]);
        expect(parseRanges('-2', 5)).toEqual([[0, 1]]);
    });

    it('rechaza rangos fuera del documento o mal escritos', () => {
        expect(() => parseRanges('4-9', 5)).toThrow('el PDF tiene 5 páginas');
        expect(() => parseRanges('3-1', 5)).toThrow('no es válido');
        expect(() => parseRanges('a', 5)).toThrow('No entiendo');
        expect(() => parseRanges(' ', 5)).toThrow('al menos un rango');
    });
});

describe('chunkRanges', () => {
    it('corta cada N páginas y deja el resto al final', () => {
        expect(chunkRanges(5, 2)).toEqual([[0, 1], [2, 3], [4]]);
    });

    it('rechaza tamaños inválidos', () => {
        expect(() => chunkRanges(5, 0)).toThrow();
    });
});

describe('splitPdf', () => {
    it('genera un PDF por rango', async () => {
        const parts = await splitPdf(await samplePdf(5), [[0, 1], [4]]);
        expect(parts).toHaveLength(2);
        expect(await widths(parts[0])).toEqual([100, 101]);
        expect(await widths(parts[1])).toEqual([104]);
        expect(rangeLabel([0, 1])).toBe('1-2');
        expect(rangeLabel([4])).toBe('5');
    });
});

describe('buildFromPages', () => {
    it('reordena, descarta y gira páginas', async () => {
        const out = await buildFromPages(await samplePdf(4), [
            { index: 3, rotation: 0 },
            { index: 0, rotation: 90 },
        ]);
        const doc = await PDFDocument.load(out);

        expect(doc.getPages().map((p) => p.getWidth())).toEqual([103, 100]);
        expect(doc.getPage(1).getRotation().angle).toBe(90);
    });

    it('suma el giro al que ya tenía la página', async () => {
        const first = await buildFromPages(await samplePdf(1), [{ index: 0, rotation: 270 }]);
        const second = await buildFromPages(first, [{ index: 0, rotation: 180 }]);
        expect((await PDFDocument.load(second)).getPage(0).getRotation().angle).toBe(90);
    });

    it('no permite un resultado vacío', async () => {
        await expect(buildFromPages(await samplePdf(2), [])).rejects.toThrow('ninguna página');
    });
});
