import { baseName } from '@/lib/files';

/** ¿Es una foto HEIC/HEIF (la de los iPhone)? Chrome no la sabe dibujar. */
export function isHeic(file: Pick<File, 'name' | 'type'>): boolean {
    return /^image\/hei[cf]/.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

/**
 * Pasa una foto HEIC a JPEG para que el resto (vista previa, canvas, pdf-lib)
 * la trate como cualquier imagen. Los demás archivos vuelven tal cual.
 * La librería (~2,5 MB de wasm) se carga recién cuando aparece un HEIC.
 */
export async function normalizeImage(file: File): Promise<File> {
    if (!isHeic(file)) return file;

    const { heicTo } = await import('heic-to');
    const blob = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.95 });

    return new File([blob], `${baseName(file.name)}.jpg`, { type: 'image/jpeg', lastModified: file.lastModified });
}
