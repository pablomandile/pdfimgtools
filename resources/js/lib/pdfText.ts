import type { PDFDocumentProxy } from 'pdfjs-dist';

/*
 * Solo importa tipos de pdf.js: se puede usar (y testear) sin cargar el build
 * del navegador.
 */
/** Un fragmento de texto de una página, en coordenadas PDF (y crece hacia arriba). */
export interface PageTextItem {
    str: string;
    x: number;
    y: number;
    width: number;
    size: number;
    bold: boolean;
    italic: boolean;
}

/**
 * Extrae el texto de una página (base 1) con su posición, tamaño y estilo.
 * El estilo sale del nombre real de la fuente («Arial-BoldMT»), que pdf.js
 * solo conoce después de pedir la lista de operaciones de la página.
 */
export async function extractPageText(doc: PDFDocumentProxy, pageNumber: number): Promise<PageTextItem[]> {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();

    try {
        await page.getOperatorList(); // carga las fuentes en commonObjs
    } catch {
        // sin fuentes igual sirve: solo perdemos negrita/cursiva
    }

    const fontNames = new Map<string, string>();
    const fontName = (id: string): string => {
        if (!fontNames.has(id)) {
            let name = content.styles[id]?.fontFamily ?? '';
            try {
                const font = page.commonObjs.get(id) as { name?: string; bold?: boolean; italic?: boolean; black?: boolean } | undefined;
                name = [font?.name, font?.bold || font?.black ? 'bold' : '', font?.italic ? 'italic' : '', name].join(' ');
            } catch {
                // la fuente no está resuelta
            }
            fontNames.set(id, name);
        }
        return fontNames.get(id)!;
    };

    const items: PageTextItem[] = [];
    for (const item of content.items) {
        if (!('str' in item) || !item.str) continue;
        const [a, b, c, d, e, f] = item.transform as number[];
        const name = fontName(item.fontName);
        items.push({
            str: item.str,
            x: e,
            y: f,
            width: item.width,
            size: Math.hypot(c, d) || Math.hypot(a, b) || item.height,
            bold: /bold|black|heavy|semibold|demi/i.test(name),
            italic: /italic|oblique/i.test(name),
        });
    }

    page.cleanup();
    return items;
}
