import { extractPageText, type PageTextItem } from '@/lib/pdfText';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { markdownToPdf, pagesToMarkdown, type PageText } from '@/tools/ops/markdown';
import { loadPdf } from '@/tools/ops/pdf';
import { describe, expect, it } from 'vitest';

/** Una línea de texto en la posición `y`, como la devolvería pdf.js. */
function item(str: string, y: number, opts: Partial<PageTextItem> = {}): PageTextItem {
    const size = opts.size ?? 11;
    return { str, x: 50, y, width: str.length * size * 0.5, size, bold: false, italic: false, ...opts };
}

function page(items: PageTextItem[], number = 1): PageText {
    return { number, items };
}

describe('pagesToMarkdown', () => {
    it('detecta títulos por tamaño, párrafos por espacio y une líneas', () => {
        const md = pagesToMarkdown([
            page([
                item('Informe anual', 780, { size: 22 }),
                item('Esta es la primera línea', 740),
                item('y esta la segunda.', 727),
                item('Otro párrafo.', 690),
            ]),
        ]);
        expect(md).toBe('# Informe anual\n\nEsta es la primera línea y esta la segunda.\n\nOtro párrafo.\n');
    });

    it('arma listas con viñetas y numeradas', () => {
        const md = pagesToMarkdown([
            page([
                item('Texto de introducción común.', 780),
                item('• Primero', 760),
                item('• Segundo', 747),
                item('1. Uno', 720),
                item('2) Dos', 707),
            ]),
        ]);
        expect(md).toContain('- Primero\n- Segundo');
        expect(md).toContain('1. Uno\n2. Dos');
    });

    it('marca la negrita y la cursiva', () => {
        const md = pagesToMarkdown([
            page([item('Un texto con ', 700), item('negrita', 700, { x: 120, bold: true }), item(' y ', 700, { x: 160 }), item('cursiva', 700, { x: 175, italic: true })]),
        ]);
        expect(md.trim()).toBe('Un texto con **negrita** y *cursiva*');
    });

    it('une las palabras cortadas con guion al final de la línea', () => {
        const md = pagesToMarkdown([page([item('Una pala-', 700), item('bra cortada.', 687)])]);
        expect(md.trim()).toBe('Una palabra cortada.');
    });

    it('separa páginas con línea o comentario', () => {
        const pages = [page([item('Uno', 700)], 2), page([item('Dos', 700)], 3)];
        expect(pagesToMarkdown(pages, 'rule')).toBe('Uno\n\n---\n\nDos\n');
        expect(pagesToMarkdown(pages, 'comment')).toBe('<!-- Página 2 -->\n\nUno\n\n<!-- Página 3 -->\n\nDos\n');
        expect(pagesToMarkdown(pages, 'none')).toBe('Uno\n\nDos\n');
    });

    it('asigna el nivel de título según el ranking de tamaños del documento', () => {
        const md = pagesToMarkdown([
            page([item('Grande', 780, { size: 20 }), item('Texto común del cuerpo.', 750), item('Mediano', 720, { size: 16 }), item('Más texto.', 690)]),
        ]);
        expect(md).toContain('# Grande');
        expect(md).toContain('## Mediano');
    });

    it('separa listas de distinto tipo y el párrafo que sigue a una lista', () => {
        const md = pagesToMarkdown([
            page([
                item('Texto de introducción bastante largo.', 780),
                item('• uno', 767),
                item('1. dos', 754),
                item('Párrafo después.', 741),
            ]),
        ]);
        expect(md).toBe('Texto de introducción bastante largo.\n\n- uno\n\n1. dos\n\nPárrafo después.\n');
    });

    it('no toma como viñeta un guion pegado a un número', () => {
        expect(pagesToMarkdown([page([item('-5 grados bajo cero', 700)])]).trim()).toBe('-5 grados bajo cero');
    });

    it('ida y vuelta: el PDF generado desde Markdown vuelve a dar el mismo Markdown', async () => {
        const source = [
            '# Informe de prueba',
            '',
            'Un párrafo con **negrita** y *cursiva* que es bastante largo como para ocupar más de una línea en la página, así probamos que se unan bien.',
            '',
            '## Sección dos',
            '',
            '- primer ítem',
            '- segundo ítem',
            '',
            '1. uno',
            '2. dos',
            '',
            'Último párrafo, con acentos: ñandú.',
        ].join('\n');
        const { bytes } = await markdownToPdf(source);
        const doc = await pdfjs.getDocument({ data: bytes }).promise;
        const items = await extractPageText(doc as unknown as PDFDocumentProxy, 1);
        expect(pagesToMarkdown([{ number: 1, items }])).toBe(source + '\n');
    });

    it('escapa los caracteres de Markdown del texto', () => {
        const md = pagesToMarkdown([page([item('# no es título y *no* es cursiva', 700)])]);
        expect(md.trim()).toBe(String.raw`\# no es título y \*no\* es cursiva`);
    });
});

describe('markdownToPdf', () => {
    const sample = [
        '# Título del documento',
        '',
        'Un párrafo con **negrita**, *cursiva*, `código` y un [enlace](https://example.com). Año, niño, acción.',
        '',
        '- uno',
        '- dos',
        '  1. anidado',
        '',
        '- [x] tarea hecha',
        '',
        '> Una cita',
        '',
        '```js',
        'const x = 1;',
        '```',
        '',
        '| Col A | Col B |',
        '| :---- | ----: |',
        '| 1     | 2     |',
        '',
        '---',
        '',
        '![logo](logo.png)',
    ].join('\n');

    it('genera un PDF válido con todos los bloques y el título en los metadatos', async () => {
        const { bytes, pages } = await markdownToPdf(sample);
        const doc = await loadPdf(bytes);
        expect(pages).toBe(1);
        expect(doc.getPageCount()).toBe(1);
        expect(doc.getTitle()).toBe('Título del documento');
    });

    it('agrega páginas cuando el texto no entra', async () => {
        const long = Array.from({ length: 200 }, (_, i) => `Párrafo número ${i + 1} con algo de texto para ocupar lugar.`).join('\n\n');
        const { pages } = await markdownToPdf(long);
        expect(pages).toBeGreaterThan(3);
    });

    it('no se rompe con emoji, comillas tipográficas ni otros alfabetos', async () => {
        const { pages } = await markdownToPdf('“Hola” — ¿qué tal? 🎉 → 日本語 ✓ …');
        expect(pages).toBe(1);
    });

    it('respeta el tamaño de página', async () => {
        const doc = await loadPdf((await markdownToPdf('hola', 'Letter')).bytes);
        expect(doc.getPage(0).getSize()).toEqual({ width: 612, height: 792 });
    });

    it('corta palabras y líneas de código más largas que la página', async () => {
        const { pages } = await markdownToPdf('a'.repeat(500) + '\n\n```\n' + 'b'.repeat(500) + '\n```');
        expect(pages).toBe(1);
    });
});
