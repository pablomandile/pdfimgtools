import { readBytes } from '@/lib/files';
import { registerUsageSource } from '@/lib/usage';
import { computed, ref, shallowRef } from 'vue';
import { toast } from 'vue-sonner';

/**
 * Texto de entrada de las herramientas de texto (Markdown, HTML): sale de un
 * archivo subido o se pega a mano, y se puede editar en los dos casos.
 */
export function useTextSource(decode: (bytes: Uint8Array) => string = (b) => new TextDecoder('utf-8').decode(b)) {
    const file = shallowRef<File | null>(null);
    const text = ref('');

    registerUsageSource(() => ({ files: file.value ? 1 : 0, bytes: new TextEncoder().encode(text.value).length }));

    const lines = computed(() => (text.value ? text.value.split('\n').length : 0));
    const empty = computed(() => !text.value.trim());

    async function load(newFile: File) {
        try {
            text.value = decode(await readBytes(newFile));
            file.value = newFile;
        } catch {
            toast.error('No se pudo leer el archivo.');
        }
    }

    function reset() {
        file.value = null;
        text.value = '';
    }

    return { file, text, lines, empty, load, reset };
}
