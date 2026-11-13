import { getCurrentScope, onScopeDispose } from 'vue';

/*
 * Registro de uso de las herramientas del navegador. Nunca viaja el contenido
 * ni el nombre de los archivos: solo la herramienta, si salió bien, cuántos
 * archivos, cuántos bytes y cuánto tardó.
 */

export interface UsageStats {
    files: number;
    bytes: number;
}

const sources = new Set<() => UsageStats>();

/**
 * Los composables que cargan archivos (usePdfFile, useImageList, useTextSource)
 * registran acá cómo medir lo que hay cargado. Se desregistra solo al salir de
 * la página.
 */
export function registerUsageSource(getter: () => UsageStats): void {
    sources.add(getter);
    if (getCurrentScope()) onScopeDispose(() => sources.delete(getter));
}

export function collectUsageStats(): UsageStats {
    let files = 0;
    let bytes = 0;
    for (const getter of sources) {
        try {
            const stats = getter();
            files += stats.files;
            bytes += stats.bytes;
        } catch {
            // una fuente rota no corta el registro
        }
    }
    return { files, bytes };
}

export interface UsageReport extends UsageStats {
    ok: boolean;
    error?: string;
    durationMs: number;
}

/** Avisa al servidor; si falla, no molesta al usuario. */
export function reportUsage(tool: string, report: UsageReport): void {
    const token = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/)?.[1];

    fetch(route('usage.store'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-XSRF-TOKEN': token ? decodeURIComponent(token) : '',
        },
        body: JSON.stringify({
            tool,
            ok: report.ok,
            error: report.error ?? null,
            files: report.files,
            bytes: report.bytes,
            duration_ms: Math.max(0, Math.round(report.durationMs)),
        }),
        keepalive: true, // sobrevive si el usuario navega enseguida
    }).catch(() => {});
}
