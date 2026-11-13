import { gfm } from '@joplin/turndown-plugin-gfm';
import { marked } from 'marked';
import TurndownService from 'turndown';

/* ------------------------------------------------------------------------ */
/* Markdown → HTML                                                           */
/* ------------------------------------------------------------------------ */

/** Estilos del documento completo: legible, con tablas y código, y modo oscuro. */
export const DOCUMENT_CSS = `
:root { color-scheme: light dark; --fg: #1f2328; --muted: #59636e; --bg: #ffffff; --soft: #f6f8fa; --border: #d1d9e0; --link: #0969da; }
@media (prefers-color-scheme: dark) {
  :root { --fg: #e6edf3; --muted: #9198a1; --bg: #0d1117; --soft: #151b23; --border: #3d444d; --link: #4493f8; }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 16px/1.6 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
main { max-width: 46rem; margin: 0 auto; padding: 2.5rem 1rem 4rem; }
h1, h2, h3, h4, h5, h6 { line-height: 1.25; margin: 1.8em 0 .6em; }
h1 { font-size: 2em; border-bottom: 1px solid var(--border); padding-bottom: .3em; margin-top: 0; }
h2 { font-size: 1.5em; border-bottom: 1px solid var(--border); padding-bottom: .3em; }
p, ul, ol, blockquote, pre, table { margin: 0 0 1em; }
a { color: var(--link); }
img { max-width: 100%; height: auto; }
code { font: .9em ui-monospace, SFMono-Regular, Consolas, monospace; background: var(--soft); padding: .15em .35em; border-radius: 4px; }
pre { background: var(--soft); padding: 1em; border-radius: 6px; overflow-x: auto; }
pre code { background: none; padding: 0; }
blockquote { border-left: 4px solid var(--border); color: var(--muted); padding: 0 1em; margin-left: 0; }
table { border-collapse: collapse; display: block; overflow-x: auto; }
th, td { border: 1px solid var(--border); padding: .4em .8em; }
th { background: var(--soft); }
hr { border: 0; border-top: 1px solid var(--border); margin: 2em 0; }
li > input[type="checkbox"] { margin-right: .4em; }
`.trim();

export interface MarkdownToHtmlOptions {
    /** Documento completo (con <head> y estilos) en vez de solo el fragmento. */
    standalone?: boolean;
    /** Título si el Markdown no tiene un `#`. */
    title?: string;
}

function escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Texto plano del primer título de nivel 1, si hay. */
function firstHeading(md: string): string | null {
    const token = marked.lexer(md).find((t) => t.type === 'heading' && t.depth === 1);
    if (!token || token.type !== 'heading') return null;
    // el texto puede traer **énfasis** o `código`: se pasa a HTML y se le sacan las etiquetas
    const html = marked.parseInline(token.text, { async: false });
    return html
        .replace(/<[^>]+>/g, '')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .trim();
}

export function markdownToHtml(md: string, options: MarkdownToHtmlOptions = {}): string {
    const body = marked.parse(md.replace(/\r\n?/g, '\n'), { gfm: true, async: false });
    if (!options.standalone) return body;

    const title = firstHeading(md) || options.title || 'Documento';
    return [
        '<!doctype html>',
        '<html lang="es">',
        '<head>',
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        `<title>${escapeHtml(title)}</title>`,
        `<style>\n${DOCUMENT_CSS}\n</style>`,
        '</head>',
        '<body>',
        '<main>',
        body.trimEnd(),
        '</main>',
        '</body>',
        '</html>',
        '',
    ].join('\n');
}

/* ------------------------------------------------------------------------ */
/* HTML → Markdown                                                           */
/* ------------------------------------------------------------------------ */

export interface HtmlToMarkdownOptions {
    /** Si la página tiene <main> o <article>, convertir solo eso (sin menús ni pies). */
    mainOnly?: boolean;
}

/** DOMParser en el navegador; en Node (tests), domino, el parser que ya trae turndown. */
async function parseHtml(html: string): Promise<Document> {
    if (typeof DOMParser !== 'undefined') return new DOMParser().parseFromString(html, 'text/html');
    const domino = await import('@mixmark-io/domino');
    return (domino as unknown as { default?: typeof domino }).default?.createDocument(html) ?? domino.createDocument(html);
}

function createTurndown(): TurndownService {
    const service = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        bulletListMarker: '-',
        emDelimiter: '*',
        strongDelimiter: '**',
        hr: '---',
    });
    service.use(gfm);
    service.remove((node) => DROPPED_TAGS.has(node.nodeName.toLowerCase()));
    return service;
}

/** Elementos que no aportan texto al Markdown (o que traen código). */
const DROPPED_TAGS = new Set(['script', 'style', 'noscript', 'iframe', 'template', 'head', 'svg', 'canvas', 'form', 'button', 'select']);

export async function htmlToMarkdown(html: string, options: HtmlToMarkdownOptions = {}): Promise<string> {
    const doc = await parseHtml(html);
    const root: HTMLElement | null =
        (options.mainOnly ? (doc.querySelector('main') ?? doc.querySelector('article')) : null) ?? doc.body ?? doc.documentElement;
    if (!root) return '';

    const md = createTurndown().turndown(root);
    const clean = md
        .replace(/[ \t]+$/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    return clean ? clean + '\n' : '';
}

/**
 * Decodifica un archivo HTML respetando el charset que declara (las páginas
 * viejas suelen venir en windows-1252). Sin declaración, UTF-8.
 */
export function decodeHtmlBytes(bytes: Uint8Array): string {
    const head = new TextDecoder('latin1').decode(bytes.subarray(0, 1024));
    const match = /<meta[^>]+charset\s*=\s*["']?\s*([\w:.-]+)/i.exec(head);
    const label = match?.[1].toLowerCase();

    if (label && label !== 'utf-8' && label !== 'utf8') {
        try {
            return new TextDecoder(label).decode(bytes);
        } catch {
            // charset desconocido: seguimos con UTF-8
        }
    }
    return new TextDecoder('utf-8').decode(bytes);
}
