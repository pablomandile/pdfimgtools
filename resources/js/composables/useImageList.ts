import { normalizeImage } from '@/lib/heic';
import { onBeforeUnmount, ref } from 'vue';
import { toast } from 'vue-sonner';

export interface ImageItem {
    id: number;
    file: File;
    url: string;
}

/**
 * Lista de imágenes con su vista previa (object URL), liberando la memoria al
 * quitarlas. Las fotos HEIC se pasan a JPEG al entrar.
 */
export function useImageList() {
    const items = ref<ImageItem[]>([]);
    const loading = ref(false);
    let nextId = 1;

    async function add(files: File[]) {
        loading.value = true;
        try {
            for (const original of files) {
                try {
                    const file = await normalizeImage(original);
                    items.value.push({ id: nextId++, file, url: URL.createObjectURL(file) });
                } catch (e) {
                    console.error(e);
                    toast.error(`No se pudo leer «${original.name}».`);
                }
            }
        } finally {
            loading.value = false;
        }
    }

    function remove(index: number) {
        const [item] = items.value.splice(index, 1);
        if (item) URL.revokeObjectURL(item.url);
    }

    function clear() {
        items.value.forEach((i) => URL.revokeObjectURL(i.url));
        items.value = [];
    }

    onBeforeUnmount(clear);

    return { items, loading, add, remove, clear };
}
