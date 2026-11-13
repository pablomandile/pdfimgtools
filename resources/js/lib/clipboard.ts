import { toast } from 'vue-sonner';

/** Copia texto al portapapeles y avisa con un toast. */
export async function copyText(text: string, what = 'el texto'): Promise<void> {
    try {
        await navigator.clipboard.writeText(text);
        toast.success(`Copiaste ${what}.`);
    } catch {
        toast.error('No se pudo copiar. Seleccioná el texto y copialo a mano.');
    }
}
