/** Píxeles RGBA, como los de un ImageData (sin depender del DOM, para los tests). */
export interface Pixels {
    data: Uint8ClampedArray;
    width: number;
    height: number;
}

export type Rgb = [number, number, number];

export interface ColorKeyOptions {
    /** Distancia (0–100) hasta la que un color cuenta como fondo. */
    tolerance: number;
    /** Margen extra (0–100) donde el alfa baja de a poco en vez de cortar en seco. */
    softness: number;
    /** Borrar solo el fondo que toca los bordes: no agujerea el blanco de adentro de un logo. */
    connectedOnly: boolean;
}

/** Distancia máxima entre dos colores RGB (negro a blanco). */
const MAX_DISTANCE = Math.sqrt(3 * 255 * 255);

export function hexToRgb(hex: string): Rgb {
    const n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: Rgb): string {
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Color más repetido en el borde de la imagen: casi siempre es el fondo.
 * Se agrupa de a 8 niveles por canal para que el ruido de un JPG no lo disperse.
 */
export function dominantBorderColor({ data, width, height }: Pixels): Rgb {
    const counts = new Map<number, { n: number; r: number; g: number; b: number }>();

    const visit = (x: number, y: number) => {
        const i = (y * width + x) * 4;
        if (data[i + 3] < 128) return;
        const key = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
        const c = counts.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
        c.n++;
        c.r += data[i];
        c.g += data[i + 1];
        c.b += data[i + 2];
        counts.set(key, c);
    };

    for (let x = 0; x < width; x++) {
        visit(x, 0);
        visit(x, height - 1);
    }
    for (let y = 1; y < height - 1; y++) {
        visit(0, y);
        visit(width - 1, y);
    }

    let best: { n: number; r: number; g: number; b: number } | undefined;
    for (const c of counts.values()) if (!best || c.n > best.n) best = c;

    return best ? [Math.round(best.r / best.n), Math.round(best.g / best.n), Math.round(best.b / best.n)] : [255, 255, 255];
}

/**
 * Vuelve transparente el color `key`, modificando `pixels` en el lugar.
 * Dentro de la tolerancia el alfa queda en 0; en el margen de suavizado baja
 * de forma pareja, así los bordes no quedan serruchados.
 */
export function colorKey(pixels: Pixels, key: Rgb, { tolerance, softness, connectedOnly }: ColorKeyOptions): void {
    const { data, width, height } = pixels;
    const hard = (tolerance / 100) * MAX_DISTANCE;
    const soft = hard + (softness / 100) * MAX_DISTANCE;

    // Alfa que le toca a cada píxel según su distancia al color (1 = queda igual).
    const factor = (p: number) => {
        const i = p * 4;
        const d = Math.hypot(data[i] - key[0], data[i + 1] - key[1], data[i + 2] - key[2]);
        if (d <= hard) return 0;
        if (d >= soft) return 1;
        return (d - hard) / (soft - hard);
    };

    const apply = (p: number, f: number) => {
        data[p * 4 + 3] = Math.round(data[p * 4 + 3] * f);
    };

    if (!connectedOnly) {
        for (let p = 0; p < width * height; p++) {
            const f = factor(p);
            if (f < 1) apply(p, f);
        }
        return;
    }

    // Relleno desde los bordes: solo avanza por píxeles que son fondo (factor < 1).
    const seen = new Uint8Array(width * height);
    const stack: number[] = [];
    const push = (p: number) => {
        if (!seen[p]) {
            seen[p] = 1;
            stack.push(p);
        }
    };

    for (let x = 0; x < width; x++) {
        push(x);
        push((height - 1) * width + x);
    }
    for (let y = 0; y < height; y++) {
        push(y * width);
        push(y * width + width - 1);
    }

    while (stack.length) {
        const p = stack.pop()!;
        const f = factor(p);
        if (f >= 1) continue;
        apply(p, f);

        const x = p % width;
        if (x > 0) push(p - 1);
        if (x < width - 1) push(p + 1);
        if (p >= width) push(p - width);
        if (p < width * (height - 1)) push(p + width);
    }
}
