import { buildFromPages } from '@/tools/ops/pdf';
import { watchDebounced } from '@vueuse/core';
import { shallowRef, type Ref } from 'vue';

/**
 * Vista previa de una operación aplicada solo a la primera página: se recorta
 * el PDF a esa página y se le aplica la misma función que al resultado final,
 * así lo que se ve es exactamente lo que se va a descargar.
 *
 * `options` es un getter con todo lo que afecta al resultado (se observa en profundidad).
 */
export function useStampPreview(bytes: Ref<Uint8Array | null>, options: () => unknown, apply: (firstPage: Uint8Array) => Promise<Uint8Array>) {
    const preview = shallowRef<Uint8Array | null>(null);
    let firstPage: { source: Uint8Array; page: Uint8Array } | null = null;

    watchDebounced(
        [bytes, options],
        async () => {
            const source = bytes.value;
            if (!source) {
                preview.value = null;
                return;
            }

            try {
                if (firstPage?.source !== source) {
                    firstPage = { source, page: await buildFromPages(source, [{ index: 0, rotation: 0 }]) };
                }
                preview.value = await apply(firstPage.page);
            } catch {
                // Opciones incompletas (p. ej. texto vacío): se deja la vista previa anterior.
            }
        },
        { debounce: 250, deep: true, immediate: true },
    );

    return preview;
}
