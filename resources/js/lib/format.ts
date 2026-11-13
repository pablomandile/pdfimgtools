const TZ = 'America/Argentina/Buenos_Aires';

export function formatNumber(value: number): string {
    return new Intl.NumberFormat('es-AR').format(value);
}

export function formatPercent(part: number, total: number): string {
    if (!total) return '—';
    return `${Math.round((part / total) * 100)} %`;
}

/** Fecha y hora en hora argentina, p. ej. «13 nov 2026, 16:48». */
export function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short', timeZone: TZ }).format(new Date(iso));
}

export function formatDuration(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)} ms`;
    if (ms < 60_000) return `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
    return `${Math.round(ms / 60_000)} min`;
}

/** Etiqueta de un punto de la serie: «13/11» para días, «nov 26» para meses. */
export function formatPeriodLabel(key: string, long = false): string {
    const [year, month, day] = key.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day || 1));
    if (long) {
        const options: Intl.DateTimeFormatOptions = day
            ? { dateStyle: 'full', timeZone: 'UTC' }
            : { month: 'long', year: 'numeric', timeZone: 'UTC' };
        return new Intl.DateTimeFormat('es-AR', options).format(date);
    }
    if (day) return `${day}/${month}`;
    const name = new Intl.DateTimeFormat('es-AR', { month: 'short', timeZone: 'UTC' }).format(date);
    return `${name.replace('.', '')} ${String(year).slice(2)}`;
}
