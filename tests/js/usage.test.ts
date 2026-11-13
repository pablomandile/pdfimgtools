import { formatDuration, formatPercent, formatPeriodLabel } from '@/lib/format';
import { collectUsageStats, registerUsageSource } from '@/lib/usage';
import { describe, expect, it } from 'vitest';
import { effectScope } from 'vue';

describe('registro de uso', () => {
    it('suma lo que cargó cada fuente y la saca al salir de la página', () => {
        const scope = effectScope();
        scope.run(() => {
            registerUsageSource(() => ({ files: 1, bytes: 1000 }));
            registerUsageSource(() => ({ files: 3, bytes: 500 }));
        });

        expect(collectUsageStats()).toEqual({ files: 4, bytes: 1500 });

        scope.stop();
        expect(collectUsageStats()).toEqual({ files: 0, bytes: 0 });
    });

    it('una fuente que falla no corta el registro', () => {
        const scope = effectScope();
        scope.run(() => {
            registerUsageSource(() => {
                throw new Error('rota');
            });
            registerUsageSource(() => ({ files: 2, bytes: 10 }));
        });

        expect(collectUsageStats()).toEqual({ files: 2, bytes: 10 });
        scope.stop();
    });
});

describe('formatos de estadísticas', () => {
    it('duración', () => {
        expect(formatDuration(240)).toBe('240 ms');
        expect(formatDuration(1500)).toBe('1,5 s');
        expect(formatDuration(180_000)).toBe('3 min');
    });

    it('porcentaje', () => {
        expect(formatPercent(1, 4)).toBe('25 %');
        expect(formatPercent(0, 0)).toBe('—');
    });

    it('etiquetas de días y meses', () => {
        expect(formatPeriodLabel('2026-11-03')).toBe('3/11');
        expect(formatPeriodLabel('2026-11')).toBe('nov 26');
    });
});
