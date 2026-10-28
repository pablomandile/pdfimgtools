import { onBeforeUnmount, ref } from 'vue';

export interface ImageItem {
    id: number;
    file: File;
    url: string;
}

/** Lista de imágenes con su vista previa (object URL), liberando la memoria al quitarlas. */
export function useImageList() {
    const items = ref<ImageItem[]>([]);
    let nextId = 1;

    function add(files: File[]) {
        items.value.push(...files.map((file) => ({ id: nextId++, file, url: URL.createObjectURL(file) })));
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

    return { items, add, remove, clear };
}
