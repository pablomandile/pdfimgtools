import type { PageTextItem } from '@/lib/pdfText';
import { marked, type Token, type Tokens } from 'marked';
import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from 'pdf-lib';

/* ------------------------------------------------------------------------ */
/* PDF → Markdown                                                            */
/* ------------------------------------------------------------------------ */

export interface PageText {
    /** Número de página (base 1), para el separador con comentario. */
    number: number;
    items: PageTextItem[];
}

export type PageBreakMode = 'none' | 'rule' | 'comment';

interface Run {
    text: string;
    bold: boolean;
    italic: boolean;
}

interface Line {
    runs: Run[];
    text: string;
    x: number;
    y: number;
    size: number;
}

type Block =
    | { type: 'heading'; level: number; runs: Run[] }
    | { type: 'paragraph'; runs: Run[] }
    | { type: 'item'; marker: string; runs: Run[]; x: number };

const BULLET = /^(?:[•▪◦●○■□➢►✓✔·]\s*|[*\-–—]\s+)/;
const ORDERED = /^(\d{1,3})[.)]\s+/;

/**
 * Arma el Markdown a partir del texto posicionado de cada página. Es una
 * reconstrucción heurística: títulos por tamaño de letra, párrafos por el
 * espacio vertical, listas por la viñeta y negrita/cursiva por la fuente.
 */
export function pagesToMarkdown(pages: PageText[], pageBreaks: PageBreakMode = 'none'): string {
    const linesPerPage = pages.map((p) => groupLines(p.items));
    const all = linesPerPage.flat();
    const base = bodySize(all);
    const levels = headingSizes(all, base);

    const parts = pages.map((page, i) => {
        const md = blocksToMarkdown(linesToBlocks(linesPerPage[i], base, levels));
        return pageBreaks === 'comment' ? `<!-- Página ${page.number} -->\n\n${md}`.trim() : md;
    });

    const joiner = pageBreaks === 'rule' ? '\n\n---\n\n' : '\n\n';
    return (
        parts
            .filter((p) => p.trim())
            .join(joiner)
            .trim() + '\n'
    );
}

function groupLines(items: PageTextItem[]): Line[] {
    const sorted = items.filter((i) => i.str).sort((a, b) => b.y - a.y || a.x - b.x);
    const groups: PageTextItem[][] = [];

    for (const item of sorted) {
        const current = groups[groups.length - 1];
        const ref = current?.[0];
        if (ref && Math.abs(ref.y - item.y) <= Math.max(ref.size, item.size) * 0.5) current.push(item);
        else groups.push([item]);
    }

    return groups
        .map((group) => {
            group.sort((a, b) => a.x - b.x);
            const runs: Run[] = [];
            let prev: PageTextItem | null = null;

            for (const item of group) {
                let str = item.str;
                if (prev) {
                    const gap = item.x - (prev.x + prev.width);
                    const spaced = /\s$/.test(runs[runs.length - 1]?.text ?? '') || /^\s/.test(str);
                    if (!spaced && gap > Math.max(prev.size, item.size) * 0.15) str = ' ' + str;
                }
                const blank = !item.str.trim();
                const last = runs[runs.length - 1];
                if (last && (blank || (last.bold === item.bold && last.italic === item.italic))) last.text += str;
                else runs.push({ text: str, bold: item.bold, italic: item.italic });
                prev = item;
            }

            const visible = group.filter((i) => i.str.trim());
            return {
                runs,
                text: runs
                    .map((r) => r.text)
                    .join('')
                    .trim(),
                x: Math.min(...group.map((i) => i.x)),
                y: group[0].y,
                size: Math.max(...(visible.length ? visible : group).map((i) => i.size)),
            };
        })
        .filter((line) => line.text);
}

/** Tamaño del texto común: el que más caracteres tiene. */
function bodySize(lines: Line[]): number {
    const weight = new Map<number, number>();
    for (const line of lines) {
        const key = Math.round(line.size * 2) / 2;
        weight.set(key, (weight.get(key) ?? 0) + line.text.length);
    }
    let best = 12;
    let max = -1;
    for (const [size, w] of weight) if (w > max) [best, max] = [size, w];
    return best;
}

function median(values: number[]): number {
    if (!values.length) return 0;
    const s = [...values].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
}

const sizeKey = (size: number) => Math.round(size * 2) / 2;

/**
 * Tamaños de título del documento, de mayor a menor: el más grande es `#`, el
 * siguiente `##`, etc. Así no depende de umbrales fijos.
 */
function headingSizes(lines: Line[], base: number): Map<number, number> {
    const sizes = [...new Set(lines.filter((l) => l.size >= base * 1.12).map((l) => sizeKey(l.size)))].sort((a, b) => b - a);
    return new Map(sizes.map((size, i) => [size, Math.min(i + 1, 6)]));
}

function linesToBlocks(lines: Line[], base: number, levels: Map<number, number>): Block[] {
    const gaps = lines
        .slice(1)
        .map((l, i) => lines[i].y - l.y)
        .filter((g) => g > 0 && g < base * 3);
    const leading = median(gaps) || base * 1.2;

    const blocks: Block[] = [];
    let prev: Line | null = null;

    for (const line of lines) {
        const level = levels.get(sizeKey(line.size)) ?? 0;
        const current = blocks[blocks.length - 1];
        const gap = prev ? prev.y - line.y : Infinity;
        const brokeParagraph = gap > leading * 1.4 || gap < 0;

        if (level) {
            if (current?.type === 'heading' && current.level === level && !brokeParagraph) appendLine(current.runs, line.runs);
            else blocks.push({ type: 'heading', level, runs: plain(line.runs) });
        } else if (BULLET.test(line.text) && !/^[-–—]{2,}/.test(line.text)) {
            blocks.push({ type: 'item', marker: '-', runs: stripPrefix(line.runs, BULLET), x: line.x });
        } else if (ORDERED.test(line.text)) {
            const n = ORDERED.exec(line.text)![1];
            blocks.push({ type: 'item', marker: `${n}.`, runs: stripPrefix(line.runs, ORDERED), x: line.x });
        } else if (current && current.type !== 'heading' && !brokeParagraph && (current.type !== 'item' || line.x > current.x + 2)) {
            // la continuación de un ítem viene sangrada; si no, es un párrafo nuevo
            appendLine(current.runs, line.runs);
        } else {
            blocks.push({ type: 'paragraph', runs: line.runs.map((r) => ({ ...r })) });
        }
        prev = line;
    }

    return blocks;
}

function plain(runs: Run[]): Run[] {
    return [{ text: runs.map((r) => r.text).join(''), bold: false, italic: false }];
}

/** Quita la viñeta o el número del comienzo de la línea. */
function stripPrefix(runs: Run[], pattern: RegExp): Run[] {
    const out = runs.map((r) => ({ ...r }));
    out[0].text = out[0].text.trimStart();
    const match = pattern.exec(out[0].text);
    if (match) out[0].text = out[0].text.slice(match[0].length);
    return out.filter((r, i) => i > 0 || r.text);
}

/** Suma una línea al bloque; si la anterior cortó una palabra con guion, la une. */
function appendLine(target: Run[], runs: Run[]) {
    const last = target[target.length - 1];
    const next = runs.map((r) => ({ ...r }));
    if (!last || !next.length) {
        target.push(...next);
        return;
    }
    last.text = last.text.trimEnd();
    next[0].text = next[0].text.trimStart();

    if (/\p{L}-$/u.test(last.text) && /^\p{Ll}/u.test(next[0].text)) last.text = last.text.slice(0, -1);
    else last.text += ' ';

    for (const run of next) {
        const tail = target[target.length - 1];
        if (tail.bold === run.bold && tail.italic === run.italic) tail.text += run.text;
        else target.push(run);
    }
}

function escapeMd(text: string): string {
    return text.replace(/([\\`*_[\]<>])/g, '\\$1');
}

function runsToMarkdown(runs: Run[]): string {
    const md = runs
        .map((run) => {
            const text = escapeMd(run.text.replace(/\s+/g, ' '));
            if (!text.trim() || (!run.bold && !run.italic)) return text;
            const mark = run.bold && run.italic ? '***' : run.bold ? '**' : '*';
            const [, lead, core, trail] = /^(\s*)(.*?)(\s*)$/.exec(text)!;
            return `${lead}${mark}${core}${mark}${trail}`;
        })
        .join('')
        .trim();

    // Que un párrafo no arranque con algo que Markdown tome como bloque.
    return md.replace(/^(#{1,6}\s|>|[-+]\s|\d+[.)]\s)/, '\\$1');
}

function blocksToMarkdown(blocks: Block[]): string {
    let out = '';
    blocks.forEach((block, i) => {
        const text = runsToMarkdown(block.runs);
        if (!text) return;
        const prev = blocks[i - 1];
        const sameList = block.type === 'item' && prev?.type === 'item' && /\d/.test(prev.marker) === /\d/.test(block.marker);
        if (out) out += sameList ? '\n' : '\n\n';
        if (block.type === 'heading') out += `${'#'.repeat(block.level)} ${text}`;
        else if (block.type === 'item') out += `${block.marker} ${text}`;
        else out += text;
    });
    return out;
}

/* ------------------------------------------------------------------------ */
/* Markdown → PDF                                                            */
/* ------------------------------------------------------------------------ */

export type PageSizeName = 'A4' | 'Letter';

const PAGE_SIZES: Record<PageSizeName, [number, number]> = {
    A4: [595.28, 841.89],
    Letter: [612, 792],
};

const BODY = 11;
const HEADING_SIZES = [22, 18, 15, 13, 12, 11];
const INDENT = 18;
const QUOTE_INDENT = 14;
const COLORS = {
    text: rgb(0.1, 0.1, 0.12),
    muted: rgb(0.4, 0.4, 0.45),
    link: rgb(0.1, 0.35, 0.8),
    rule: rgb(0.8, 0.8, 0.83),
    codeBg: rgb(0.95, 0.95, 0.96),
    headerBg: rgb(0.93, 0.93, 0.95),
};

interface Fonts {
    regular: PDFFont;
    bold: PDFFont;
    italic: PDFFont;
    boldItalic: PDFFont;
    mono: PDFFont;
}

interface Style {
    bold?: boolean;
    italic?: boolean;
    code?: boolean;
    link?: boolean;
    strike?: boolean;
}

interface Piece extends Style {
    text: string;
    /** Salto de línea forzado. */
    br?: boolean;
}

interface Context {
    indent: number;
    quote: number;
}

export interface MarkdownPdfResult {
    bytes: Uint8Array;
    pages: number;
}

/** Caracteres comunes fuera de WinAnsi, con un equivalente que sí se puede dibujar. */
const REPLACEMENTS: Record<string, string> = {
    ' ': ' ',
    '\t': '    ',
    '→': '->',
    '←': '<-',
    '↔': '<->',
    '⇒': '=>',
    '≤': '<=',
    '≥': '>=',
    '≠': '!=',
    '✓': 'v',
    '✔': 'v',
    '✗': 'x',
    '✘': 'x',
    '−': '-',
    '‐': '-',
    '‑': '-',
    '‒': '-',
    '′': "'",
    '″': '"',
    '●': '•',
    '▪': '•',
    '◦': '•',
};

function decodeEntities(text: string): string {
    return text
        .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
        .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&');
}

/**
 * Convierte Markdown (con GFM: tablas, tachado, listas de tareas) en un PDF
 * dibujado con las fuentes estándar. Los caracteres que esas fuentes no tienen
 * (emoji, otros alfabetos) se reemplazan por «?».
 */
export async function markdownToPdf(md: string, pageSize: PageSizeName = 'A4'): Promise<MarkdownPdfResult> {
    const doc = await PDFDocument.create();
    const fonts: Fonts = {
        regular: await doc.embedFont(StandardFonts.Helvetica),
        bold: await doc.embedFont(StandardFonts.HelveticaBold),
        italic: await doc.embedFont(StandardFonts.HelveticaOblique),
        boldItalic: await doc.embedFont(StandardFonts.HelveticaBoldOblique),
        mono: await doc.embedFont(StandardFonts.Courier),
    };

    const tokens = marked.lexer(md.replace(/\r\n?/g, '\n'), { gfm: true });
    const writer = new Writer(doc, fonts, PAGE_SIZES[pageSize]);
    writer.blocks(tokens, { indent: 0, quote: 0 });

    const title = tokens.find((t): t is Tokens.Heading => t.type === 'heading' && t.depth === 1);
    if (title) doc.setTitle(writer.sanitize(decodeEntities(title.text)));
    doc.setCreator('PDFImgTools');

    return { bytes: await doc.save(), pages: doc.getPageCount() };
}

class Writer {
    private page!: PDFPage;
    private y = 0;
    private readonly margin = 56;
    private readonly charset: Set<number>;

    constructor(
        private readonly doc: PDFDocument,
        private readonly fonts: Fonts,
        private readonly size: [number, number],
    ) {
        this.charset = new Set(fonts.regular.getCharacterSet());
        this.newPage();
    }

    /* --- página y espacio --- */

    private get width(): number {
        return this.size[0] - this.margin * 2;
    }

    private newPage() {
        this.page = this.doc.addPage(this.size);
        this.y = this.size[1] - this.margin;
    }

    private atTop(): boolean {
        return this.y >= this.size[1] - this.margin - 0.01;
    }

    /** Pasa de página si no entran `height` puntos. Devuelve si pasó. */
    private ensure(height: number): boolean {
        if (this.y - height < this.margin && !this.atTop()) {
            this.newPage();
            return true;
        }
        return false;
    }

    private gap(points: number) {
        if (!this.atTop()) this.y -= points;
    }

    sanitize(text: string): string {
        let out = '';
        for (const ch of text) {
            const mapped = REPLACEMENTS[ch] ?? ch;
            for (const c of mapped) {
                const code = c.codePointAt(0)!;
                if (code === 10 || this.charset.has(code)) out += c;
                else if (code < 32 || (code >= 0xfe00 && code <= 0xfe0f) || code === 0x200d)
                    continue; // controles y selectores de emoji
                else out += '?';
            }
        }
        return out;
    }

    private font(style: Style): PDFFont {
        if (style.code) return this.fonts.mono;
        if (style.bold && style.italic) return this.fonts.boldItalic;
        if (style.bold) return this.fonts.bold;
        if (style.italic) return this.fonts.italic;
        return this.fonts.regular;
    }

    /* --- bloques --- */

    blocks(tokens: Token[], ctx: Context) {
        for (const token of tokens) this.block(token, ctx);
    }

    private block(token: Token, ctx: Context) {
        switch (token.type) {
            case 'heading': {
                const t = token as Tokens.Heading;
                const size = HEADING_SIZES[t.depth - 1] ?? BODY;
                this.gap(size * 0.7);
                this.paragraph(this.inline(t.tokens, { bold: true }), ctx, { size, keepWithNext: true });
                this.y -= size * 0.35;
                break;
            }
            case 'paragraph':
                this.paragraph(this.inline((token as Tokens.Paragraph).tokens, {}), ctx);
                this.y -= BODY * 0.7;
                break;
            case 'text': {
                const t = token as Tokens.Text;
                this.paragraph(t.tokens ? this.inline(t.tokens, {}) : this.textPieces(t.text, {}), ctx);
                this.y -= BODY * 0.4;
                break;
            }
            case 'list':
                this.list(token as Tokens.List, ctx);
                this.y -= BODY * 0.4;
                break;
            case 'blockquote':
                this.blocks((token as Tokens.Blockquote).tokens, { ...ctx, quote: ctx.quote + 1 });
                break;
            case 'code':
                this.code((token as Tokens.Code).text, ctx);
                this.y -= BODY * 0.7;
                break;
            case 'hr':
                this.hr(ctx);
                break;
            case 'table':
                this.table(token as Tokens.Table, ctx);
                this.y -= BODY * 0.7;
                break;
            case 'html': {
                const text = decodeEntities((token as Tokens.HTML).text.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, '')).trim();
                if (text) {
                    this.paragraph(this.textPieces(text, {}), ctx);
                    this.y -= BODY * 0.7;
                }
                break;
            }
            default:
                break; // space, def, etc.
        }
    }

    private list(list: Tokens.List, ctx: Context) {
        const start = typeof list.start === 'number' ? list.start : 1;
        list.items.forEach((item, i) => {
            let marker = list.ordered ? `${start + i}.` : '•';
            if (item.task) marker = item.checked ? '[x]' : '[ ]';
            const inner: Context = { ...ctx, indent: ctx.indent + INDENT + (item.task ? 6 : 0) };

            const markerFont = list.ordered || item.task ? this.fonts.regular : this.fonts.bold;
            let pending: string | null = marker;
            for (const child of item.tokens) {
                if (item.task && (child.type as string) === 'checkbox') continue;
                if (pending && (child.type === 'text' || child.type === 'paragraph')) {
                    const tokens = (child as Tokens.Text).tokens;
                    const pieces = tokens ? this.inline(tokens, {}) : this.textPieces((child as Tokens.Text).text, {});
                    this.paragraph(pieces, inner, { marker: { text: pending, font: markerFont } });
                    this.y -= BODY * 0.25;
                    pending = null;
                } else {
                    if (pending) {
                        this.paragraph([{ text: ' ' }], inner, { marker: { text: pending, font: markerFont } });
                        pending = null;
                    }
                    this.block(child, inner);
                }
            }
        });
    }

    private hr(ctx: Context) {
        this.ensure(BODY * 1.5);
        this.y -= BODY * 0.6;
        const x = this.margin + ctx.indent;
        this.page.drawLine({ start: { x, y: this.y }, end: { x: this.margin + this.width, y: this.y }, thickness: 1, color: COLORS.rule });
        this.y -= BODY * 0.9;
    }

    private code(text: string, ctx: Context) {
        const size = BODY * 0.85;
        const lh = size * 1.4;
        const pad = 6;
        const left = this.margin + ctx.indent + ctx.quote * QUOTE_INDENT;
        const avail = this.margin + this.width - left - pad * 2;
        const font = this.fonts.mono;
        const charW = font.widthOfTextAtSize('M', size);
        const perLine = Math.max(1, Math.floor(avail / charW));

        const lines: string[] = [];
        for (const raw of this.sanitize(text).split('\n')) {
            if (!raw) lines.push('');
            for (let i = 0; i < raw.length; i += perLine) lines.push(raw.slice(i, i + perLine));
        }

        const box = (height: number) =>
            this.page.drawRectangle({ x: left, y: this.y - height, width: this.margin + this.width - left, height, color: COLORS.codeBg });

        this.ensure(lh + pad * 2);
        box(pad);
        this.y -= pad;
        for (const line of lines) {
            if (this.ensure(lh)) {
                box(pad);
                this.y -= pad;
            }
            box(lh);
            this.quoteBars(ctx, lh);
            this.page.drawText(line, { x: left + pad, y: this.y - lh * 0.72, size, font, color: COLORS.text });
            this.y -= lh;
        }
        box(pad);
        this.y -= pad;
    }

    private table(table: Tokens.Table, ctx: Context) {
        const size = BODY * 0.9;
        const lh = size * 1.35;
        const pad = 4;
        const left = this.margin + ctx.indent + ctx.quote * QUOTE_INDENT;
        const total = this.margin + this.width - left;
        const cols = table.header.length || 1;
        const colW = total / cols;

        const layoutRow = (cells: Tokens.TableCell[], header: boolean) =>
            cells.map((cell) => this.wrap(this.inline(cell.tokens, header ? { bold: true } : {}), colW - pad * 2, size));

        const drawRow = (rows: Piece[][][], header: boolean, aligns: (string | null)[]) => {
            const height = Math.max(1, ...rows.map((l) => l.length)) * lh + pad * 2;
            const top = this.y;
            if (header) this.page.drawRectangle({ x: left, y: top - height, width: total, height, color: COLORS.headerBg });
            rows.forEach((lines, c) => {
                const x0 = left + c * colW;
                this.page.drawRectangle({ x: x0, y: top - height, width: colW, height, borderColor: COLORS.rule, borderWidth: 0.75 });
                lines.forEach((line, i) => {
                    const w = this.lineWidth(line, size);
                    const align = aligns[c];
                    const x = align === 'right' ? x0 + colW - pad - w : align === 'center' ? x0 + (colW - w) / 2 : x0 + pad;
                    this.drawPieces(line, x, top - pad - i * lh - lh * 0.75, size);
                });
            });
            this.y -= height;
        };

        const aligns = table.align ?? [];
        const header = layoutRow(table.header, true);
        const headerHeight = Math.max(1, ...header.map((l) => l.length)) * lh + pad * 2;

        this.ensure(headerHeight * 2);
        drawRow(header, true, aligns);
        for (const row of table.rows) {
            const cells = layoutRow(row, false);
            const height = Math.max(1, ...cells.map((l) => l.length)) * lh + pad * 2;
            if (this.ensure(height)) drawRow(header, true, aligns); // repite el encabezado
            drawRow(cells, false, aligns);
        }
    }

    /* --- texto en línea --- */

    private textPieces(text: string, style: Style): Piece[] {
        return [{ ...style, text: decodeEntities(text) }];
    }

    private inline(tokens: Token[] | undefined, style: Style): Piece[] {
        const out: Piece[] = [];
        for (const token of tokens ?? []) {
            switch (token.type) {
                case 'strong':
                    out.push(...this.inline((token as Tokens.Strong).tokens, { ...style, bold: true }));
                    break;
                case 'em':
                    out.push(...this.inline((token as Tokens.Em).tokens, { ...style, italic: true }));
                    break;
                case 'del':
                    out.push(...this.inline((token as Tokens.Del).tokens, { ...style, strike: true }));
                    break;
                case 'codespan':
                    out.push({ ...style, code: true, text: decodeEntities((token as Tokens.Codespan).text) });
                    break;
                case 'link':
                    out.push(...this.inline((token as Tokens.Link).tokens, { ...style, link: true }));
                    break;
                case 'image':
                    out.push({ ...style, italic: true, text: `[imagen: ${(token as Tokens.Image).text || 'sin descripción'}]` });
                    break;
                case 'br':
                    out.push({ text: '', br: true });
                    break;
                case 'html':
                    if (/^<br\s*\/?>$/i.test((token as Tokens.Tag).text.trim())) out.push({ text: '', br: true });
                    break;
                case 'text':
                case 'escape': {
                    const t = token as Tokens.Text;
                    if (t.tokens?.length) out.push(...this.inline(t.tokens, style));
                    else out.push({ ...style, text: decodeEntities(t.text) });
                    break;
                }
                default:
                    if ('text' in token && typeof token.text === 'string') out.push({ ...style, text: decodeEntities(token.text) });
            }
        }
        return out;
    }

    /** Parte las piezas en líneas que entren en `maxWidth`. */
    private wrap(pieces: Piece[], maxWidth: number, size: number): Piece[][] {
        const lines: Piece[][] = [[]];
        let x = 0;

        const push = (piece: Piece, w: number) => {
            const line = lines[lines.length - 1];
            const last = line[line.length - 1];
            if (last && sameStyle(last, piece)) last.text += piece.text;
            else line.push({ ...piece });
            x += w;
        };
        const breakLine = () => {
            const line = lines[lines.length - 1];
            const last = line[line.length - 1];
            if (last) last.text = last.text.trimEnd();
            lines.push([]);
            x = 0;
        };

        for (const piece of pieces) {
            if (piece.br) {
                breakLine();
                continue;
            }
            const font = this.font(piece);
            const text = this.sanitize(piece.code ? piece.text : piece.text.replace(/\s+/g, ' '));

            for (const word of text.split(/(\s+)/)) {
                if (!word) continue;
                const isSpace = /^\s+$/.test(word);
                if (isSpace && x === 0) continue;
                let w = font.widthOfTextAtSize(word, size);

                if (!isSpace && x + w > maxWidth && x > 0) breakLine();
                if (!isSpace && w > maxWidth) {
                    // palabra más larga que la línea: se corta por caracteres
                    let chunk = '';
                    for (const ch of word) {
                        if (font.widthOfTextAtSize(chunk + ch, size) > maxWidth - x && chunk) {
                            push({ ...piece, text: chunk }, font.widthOfTextAtSize(chunk, size));
                            breakLine();
                            chunk = '';
                        }
                        chunk += ch;
                    }
                    w = font.widthOfTextAtSize(chunk, size);
                    push({ ...piece, text: chunk }, w);
                    continue;
                }
                push({ ...piece, text: word }, w);
            }
        }

        const last = lines[lines.length - 1];
        if (lines.length > 1 && !last.length) lines.pop();
        return lines;
    }

    private lineWidth(line: Piece[], size: number): number {
        return line.reduce((sum, p) => sum + this.font(p).widthOfTextAtSize(p.text, size), 0);
    }

    private drawPieces(line: Piece[], x: number, baseline: number, size: number, color = COLORS.text) {
        for (const piece of line) {
            if (!piece.text) continue;
            const font = this.font(piece);
            const pieceSize = piece.code ? size * 0.92 : size;
            const w = font.widthOfTextAtSize(piece.text, pieceSize);
            if (piece.code) {
                this.page.drawRectangle({ x: x - 1, y: baseline - size * 0.25, width: w + 2, height: size * 1.1, color: COLORS.codeBg });
            }
            const c = piece.link ? COLORS.link : color;
            this.page.drawText(piece.text, { x, y: baseline, size: pieceSize, font, color: c });
            if (piece.link) {
                this.page.drawLine({ start: { x, y: baseline - 1.5 }, end: { x: x + w, y: baseline - 1.5 }, thickness: 0.5, color: c });
            }
            if (piece.strike) {
                this.page.drawLine({ start: { x, y: baseline + size * 0.3 }, end: { x: x + w, y: baseline + size * 0.3 }, thickness: 0.7, color: c });
            }
            x += w;
        }
    }

    private quoteBars(ctx: Context, height: number) {
        for (let q = 0; q < ctx.quote; q++) {
            this.page.drawRectangle({ x: this.margin + ctx.indent + q * QUOTE_INDENT, y: this.y - height, width: 2.5, height, color: COLORS.rule });
        }
    }

    private paragraph(pieces: Piece[], ctx: Context, opts: { size?: number; keepWithNext?: boolean; marker?: { text: string; font: PDFFont } } = {}) {
        const size = opts.size ?? BODY;
        const lh = size * 1.4;
        const left = this.margin + ctx.indent + ctx.quote * QUOTE_INDENT;
        const lines = this.wrap(pieces, this.margin + this.width - left, size);
        const color = ctx.quote ? COLORS.muted : COLORS.text;

        // Un título no queda solo al pie de la página.
        this.ensure(opts.keepWithNext ? lh * lines.length + BODY * 2.8 : lh);

        lines.forEach((line, i) => {
            this.ensure(lh);
            this.quoteBars(ctx, lh);
            const baseline = this.y - lh * 0.75;
            if (i === 0 && opts.marker) {
                const m = this.sanitize(opts.marker.text);
                const w = opts.marker.font.widthOfTextAtSize(m, size);
                this.page.drawText(m, { x: left - w - 5, y: baseline, size, font: opts.marker.font, color });
            }
            this.drawPieces(line, left, baseline, size, color);
            this.y -= lh;
        });
    }
}

function sameStyle(a: Style, b: Style): boolean {
    return !!a.bold === !!b.bold && !!a.italic === !!b.italic && !!a.code === !!b.code && !!a.link === !!b.link && !!a.strike === !!b.strike;
}
