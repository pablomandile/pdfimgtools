// Paquetes sin tipos propios.

declare module '@joplin/turndown-plugin-gfm' {
    import type TurndownService from 'turndown';
    type Plugin = (service: TurndownService) => void;
    export const gfm: Plugin;
    export const tables: Plugin;
    export const strikethrough: Plugin;
    export const taskListItems: Plugin;
    export const highlightedCodeBlock: Plugin;
}

declare module '@mixmark-io/domino' {
    export function createDocument(html?: string): Document;
}
