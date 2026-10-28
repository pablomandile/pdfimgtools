<script setup lang="ts">
import ActionBar from '@/components/ActionBar.vue';
import FileDropzone from '@/components/FileDropzone.vue';
import OptionGroup from '@/components/OptionGroup.vue';
import ToolLayout from '@/components/ToolLayout.vue';
import { useImageList } from '@/composables/useImageList';
import { useProcessing } from '@/composables/useProcessing';
import { baseName, downloadAll, prepareImage } from '@/lib/files';
import { imagesToPdf, type ImagesToPdfOptions } from '@/tools/ops/images';
import type { ToolPageProps } from '@/types';
import { X } from 'lucide-vue-next';
import { reactive } from 'vue';
import draggable from 'vuedraggable';

defineProps<ToolPageProps>();

const { items, add, remove } = useImageList();
const { busy, progress, run } = useProcessing();

const options = reactive<ImagesToPdfOptions>({ pageSize: 'a4', orientation: 'auto', margin: 20 });

function convert() {
    run(async () => {
        const prepared = [];
        for (const [i, item] of items.value.entries()) {
            progress.value = `Preparando imagen ${i + 1} de ${items.value.length}…`;
            prepared.push(await prepareImage(item.file));
        }

        progress.value = 'Armando el PDF…';
        const data = await imagesToPdf(prepared, options);
        const name = items.value.length === 1 ? `${baseName(items.value[0].file.name)}.pdf` : 'imagenes.pdf';
        await downloadAll([{ name, data }], name);

        return `Listo: PDF de ${items.value.length} ${items.value.length === 1 ? 'página' : 'páginas'}.`;
    });
}
</script>

<template>
    <ToolLayout :tool="tool">
        <FileDropzone v-if="items.length === 0" :accept="tool.accept" multiple @files="add" />

        <div v-else class="grid gap-8 lg:grid-cols-[1fr_300px]">
            <div>
                <p class="mb-3 text-sm text-muted-foreground">Arrastrá las imágenes para elegir el orden de las páginas.</p>
                <draggable v-model="items" item-key="id" class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4" ghost-class="opacity-40">
                    <template #item="{ element, index }">
                        <div class="relative cursor-grab rounded-xl border bg-card p-2 active:cursor-grabbing">
                            <span
                                class="absolute left-1.5 top-1.5 z-10 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground"
                            >
                                {{ index + 1 }}
                            </span>
                            <button
                                type="button"
                                class="absolute right-1.5 top-1.5 z-10 rounded-full bg-background/90 p-1 text-muted-foreground shadow hover:text-destructive"
                                aria-label="Quitar imagen"
                                @click="remove(index)"
                            >
                                <X class="size-4" />
                            </button>
                            <div class="grid aspect-square place-items-center overflow-hidden rounded-md bg-muted">
                                <img :src="element.url" alt="" class="max-h-full max-w-full object-contain" />
                            </div>
                            <p class="mt-1.5 truncate text-xs text-muted-foreground" :title="element.file.name">{{ element.file.name }}</p>
                        </div>
                    </template>
                </draggable>
                <FileDropzone class="mt-4" :accept="tool.accept" multiple compact label="Agregar más imágenes" @files="add" />
            </div>

            <div class="space-y-6">
                <OptionGroup
                    v-model="options.pageSize"
                    label="Tamaño de página"
                    :columns="3"
                    :options="[
                        { value: 'a4', label: 'A4' },
                        { value: 'letter', label: 'Carta' },
                        { value: 'fit', label: 'Como la imagen' },
                    ]"
                />
                <OptionGroup
                    v-if="options.pageSize !== 'fit'"
                    v-model="options.orientation"
                    label="Orientación"
                    :columns="3"
                    :options="[
                        { value: 'auto', label: 'Automática' },
                        { value: 'portrait', label: 'Vertical' },
                        { value: 'landscape', label: 'Horizontal' },
                    ]"
                />
                <OptionGroup
                    v-model="options.margin"
                    label="Margen"
                    :columns="3"
                    :options="[
                        { value: 0, label: 'Sin margen' },
                        { value: 20, label: 'Chico' },
                        { value: 50, label: 'Grande' },
                    ]"
                />
            </div>

            <ActionBar class="lg:col-span-2" label="Convertir a PDF" :busy="busy" :progress="progress" @run="convert">
                {{ items.length }} {{ items.length === 1 ? 'imagen' : 'imágenes' }}
            </ActionBar>
        </div>
    </ToolLayout>
</template>
