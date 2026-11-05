import { targetSize } from '@/lib/files';
import { isHeic } from '@/lib/heic';
import { describe, expect, it } from 'vitest';

describe('targetSize', () => {
    it('sin redimensionar queda igual', () => {
        expect(targetSize(4032, 3024)).toEqual({ width: 4032, height: 3024 });
    });

    it('lado mayor máximo achica respetando la proporción', () => {
        expect(targetSize(4032, 3024, { mode: 'max', px: 1920 })).toEqual({ width: 1920, height: 1440 });
        expect(targetSize(3024, 4032, { mode: 'max', px: 1920 })).toEqual({ width: 1440, height: 1920 });
    });

    it('lado mayor máximo nunca agranda', () => {
        expect(targetSize(800, 600, { mode: 'max', px: 1920 })).toEqual({ width: 800, height: 600 });
    });

    it('porcentaje escala las dos medidas', () => {
        expect(targetSize(1000, 500, { mode: 'percent', value: 25 })).toEqual({ width: 250, height: 125 });
    });

    it('nunca baja de 1 px', () => {
        expect(targetSize(3, 2000, { mode: 'max', px: 10 })).toEqual({ width: 1, height: 10 });
    });
});

describe('isHeic', () => {
    it('reconoce HEIC por tipo o por extensión', () => {
        expect(isHeic({ name: 'IMG_0001.HEIC', type: '' })).toBe(true);
        expect(isHeic({ name: 'foto.heif', type: '' })).toBe(true);
        expect(isHeic({ name: 'foto', type: 'image/heic' })).toBe(true);
        expect(isHeic({ name: 'foto.jpg', type: 'image/jpeg' })).toBe(false);
    });
});
