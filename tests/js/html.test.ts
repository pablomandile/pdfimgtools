import { decodeHtmlBytes, htmlToMarkdown, markdownToHtml } from '@/tools/ops/html';
import { describe, expect, it } from 'vitest';

describe('markdownToHtml', () => {
    it('convierte títulos, tablas y tachado (GFM) en un fragmento', () => {
        const html = markdownToHtml('# Hola\n\n~~viejo~~\n\n| A | B |\n| - | - |\n| 1 | 2 |');
        expect(html).toContain('<h1>Hola</h1>');
        expect(html).toContain('<del>viejo</del>');
        expect(html).toContain('<table>');
        expect(html).not.toContain('<!doctype');
    });

    it('arma un documento completo con charset, estilos y el título del primer #', () => {
        const html = markdownToHtml('Intro\n\n# Informe **anual** <2026> & más\n\nTexto', { standalone: true, title: 'archivo' });
        expect(html.startsWith('<!doctype html>')).toBe(true);
        expect(html).toContain('<meta charset="utf-8">');
        expect(html).toContain('<title>Informe anual &lt;2026&gt; &amp; más</title>');
        expect(html).toContain('<style>');
        expect(html).toContain('<main>');
    });

    it('sin # usa el título que le pasan', () => {
        expect(markdownToHtml('solo texto', { standalone: true, title: 'notas' })).toContain('<title>notas</title>');
    });
});

describe('htmlToMarkdown', () => {
    it('convierte títulos, listas, enlaces, negrita y código', async () => {
        const md = await htmlToMarkdown(
            '<h1>Título</h1><p>Un <strong>texto</strong> con <a href="https://example.com">enlace</a>.</p>' +
                '<ul><li>uno</li><li>dos</li></ul><pre><code class="language-js">const x = 1;</code></pre>',
        );
        expect(md).toContain('# Título');
        expect(md).toContain('Un **texto** con [enlace](https://example.com).');
        expect(md).toMatch(/^-\s+uno$/m);
        expect(md).toContain('```js\nconst x = 1;\n```');
    });

    it('pasa las tablas a tablas GFM', async () => {
        const md = await htmlToMarkdown('<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>');
        expect(md).toMatch(/\|\s*A\s*\|\s*B\s*\|/);
        expect(md).toMatch(/\|\s*-+\s*\|\s*-+\s*\|/);
        expect(md).toMatch(/\|\s*1\s*\|\s*2\s*\|/);
    });

    it('descarta scripts y estilos', async () => {
        const md = await htmlToMarkdown('<style>p{color:red}</style><p>Visible</p><script>alert(1)</script>');
        expect(md).toBe('Visible\n');
    });

    it('con «solo el contenido principal» ignora menús y pies', async () => {
        const page = '<html><body><nav>Inicio | Contacto</nav><article><h2>Nota</h2><p>Cuerpo</p></article><footer>Pie</footer></body></html>';
        const main = await htmlToMarkdown(page, { mainOnly: true });
        expect(main).toBe('## Nota\n\nCuerpo\n');
        const all = await htmlToMarkdown(page, { mainOnly: false });
        expect(all).toContain('Inicio');
        expect(all).toContain('Pie');
    });

    it('sin <main> ni <article> usa todo el body', async () => {
        expect(await htmlToMarkdown('<p>Uno</p><p>Dos</p>', { mainOnly: true })).toBe('Uno\n\nDos\n');
    });
});

describe('ida y vuelta', () => {
    it('Markdown → HTML → Markdown conserva la estructura', async () => {
        const source = [
            '# Título',
            '',
            'Un párrafo con **negrita** y *cursiva*.',
            '',
            '## Lista',
            '',
            '- uno',
            '- dos',
            '',
            '```js',
            'const x = 1;',
            '```',
        ].join('\n');
        const back = await htmlToMarkdown(markdownToHtml(source, { standalone: true }), { mainOnly: true });
        expect(back).toContain('# Título');
        expect(back).toContain('Un párrafo con **negrita** y *cursiva*.');
        expect(back).toContain('## Lista');
        expect(back).toMatch(/^-\s+uno$/m);
        expect(back).toContain('```js\nconst x = 1;\n```');
    });
});

describe('decodeHtmlBytes', () => {
    it('respeta el charset declarado (windows-1252)', () => {
        const head = new TextEncoder().encode('<html><head><meta charset="windows-1252"></head><body>ni');
        const bytes = new Uint8Array([...head, 0xf1, ...new TextEncoder().encode('o</body></html>')]);
        expect(decodeHtmlBytes(bytes)).toContain('niño');
    });

    it('sin declaración usa UTF-8', () => {
        expect(decodeHtmlBytes(new TextEncoder().encode('<p>acción</p>'))).toBe('<p>acción</p>');
    });
});
