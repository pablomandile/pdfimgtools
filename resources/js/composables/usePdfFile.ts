import { readBytes } from '@/lib/files';
import { openPdf, thumbnail, type PDFDocumentProxy } from '@/lib/pdfjs';
import { onBeforeUnmount, reactive, ref, shallowRef } from 'vue';
import { toast } from 'vue-sonner';

/**
 * Un PDF cargado: el archivo, sus bytes, el documento de pdf.js para dibujar
 * y las miniaturas que se van generando de a una.
 */
export function usePdfFile() {
    const file = shallowRef<File | null>(null);
    const bytes = shallowRef<Uint8Array | null>(null);
    const doc = shallowRef<PDFDocumentProxy | null>(null);
    const pages = ref(0);
    const loading = ref(false);
    const thumbs = reactive<Record<number, string>>({});

    async function load(newFile: File): Promise<boolean> {
        reset();
        loading.value = true;

        try {
            const data = await readBytes(newFile);
            const pdf = await openPdf(data);

            file.value = newFile;
            bytes.value = data;
            doc.value = pdf;
            pages.value = pdf.numPages;
            return true;
        } catch (e) {
            console.error(e); // el toast es genérico: el motivo real queda en la consola
            const name = (e as { name?: string })?.name;
            toast.error(
                name === 'PasswordException'
                    ? 'El PDF está protegido con contraseña. Desbloquealo primero con «Desbloquear PDF».'
                    : 'No se pudo abrir el PDF. Puede estar dañado.',
            );
            return false;
        } finally {
            loading.value = false;
        }
    }

    /** Genera las miniaturas de las páginas (base 1) que falten, en orden. */
    async function loadThumbs(width = 180) {
        const pdf = doc.value;
        for (let n = 1; pdf && n <= pages.value; n++) {
            if (doc.value !== pdf) return; // cambiaron de archivo a mitad de camino
            if (!thumbs[n]) thumbs[n] = await thumbnail(pdf, n, width);
        }
    }

    function reset() {
        doc.value?.destroy();
        file.value = null;
        bytes.value = null;
        doc.value = null;
        pages.value = 0;
        Object.keys(thumbs).forEach((k) => delete thumbs[Number(k)]);
    }

    onBeforeUnmount(() => doc.value?.destroy());

    return { file, bytes, doc, pages, loading, thumbs, load, loadThumbs, reset };
}
