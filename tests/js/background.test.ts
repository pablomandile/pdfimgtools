import { colorKey, dominantBorderColor, hexToRgb, rgbToHex, type Pixels } from '@/tools/ops/background';
import { describe, expect, it } from 'vitest';

/** Imagen de prueba a partir de una grilla de colores ('W' blanco, 'K' negro, 'G' gris claro). */
function image(rows: string[]): Pixels {
    const palette: Record<string, number[]> = { W: [255, 255, 255], K: [0, 0, 0], G: [240, 240, 240] };
    const height = rows.length;
    const width = rows[0].length;
    const data = new Uint8ClampedArray(width * height * 4);

    rows.forEach((row, y) =>
        [...row].forEach((c, x) => {
            data.set([...palette[c], 255], (y * width + x) * 4);
        }),
    );

    return { data, width, height };
}

const alpha = ({ data, width }: Pixels, x: number, y: number) => data[(y * width + x) * 4 + 3];

// Un logo: aro negro con el centro blanco, sobre fondo blanco.
const LOGO = ['WWWWW', 'WKKKW', 'WKWKW', 'WKKKW', 'WWWWW'];

describe('colorKey', () => {
    it('borra el color elegido y deja el resto', () => {
        const img = image(LOGO);
        colorKey(img, [255, 255, 255], { tolerance: 5, softness: 0, connectedOnly: false });

        expect(alpha(img, 0, 0)).toBe(0);
        expect(alpha(img, 1, 1)).toBe(255);
        expect(alpha(img, 2, 2)).toBe(0); // sin "solo conectado" también se va el centro
    });

    it('con «solo conectado» no agujerea el blanco de adentro', () => {
        const img = image(LOGO);
        colorKey(img, [255, 255, 255], { tolerance: 5, softness: 0, connectedOnly: true });

        expect(alpha(img, 0, 0)).toBe(0);
        expect(alpha(img, 4, 4)).toBe(0);
        expect(alpha(img, 2, 2)).toBe(255);
    });

    it('la tolerancia alcanza colores parecidos', () => {
        const strict = image(['GW']);
        colorKey(strict, [255, 255, 255], { tolerance: 1, softness: 0, connectedOnly: false });
        expect(alpha(strict, 0, 0)).toBe(255);

        const loose = image(['GW']);
        colorKey(loose, [255, 255, 255], { tolerance: 10, softness: 0, connectedOnly: false });
        expect(alpha(loose, 0, 0)).toBe(0);
    });

    it('en el margen de suavizado el alfa queda a medias', () => {
        const img = image(['G']);
        // Distancia del gris al blanco ≈ 26: cae en el medio del margen.
        colorKey(img, [255, 255, 255], { tolerance: 3, softness: 3, connectedOnly: false });

        expect(alpha(img, 0, 0)).toBeGreaterThan(0);
        expect(alpha(img, 0, 0)).toBeLessThan(255);
    });
});

describe('dominantBorderColor', () => {
    it('devuelve el color más repetido del borde', () => {
        expect(dominantBorderColor(image(LOGO))).toEqual([255, 255, 255]);
        expect(dominantBorderColor(image(['KKK', 'KWK', 'KKK']))).toEqual([0, 0, 0]);
    });
});

describe('hex', () => {
    it('va y vuelve', () => {
        expect(hexToRgb('#1a2b3c')).toEqual([26, 43, 60]);
        expect(rgbToHex([26, 43, 60])).toBe('#1a2b3c');
    });
});
