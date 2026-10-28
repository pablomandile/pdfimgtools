<script setup lang="ts">
import ActionBar from '@/components/ActionBar.vue';
import FileDropzone from '@/components/FileDropzone.vue';
import OptionGroup from '@/components/OptionGroup.vue';
import ToolLayout from '@/components/ToolLayout.vue';
import { useImageList } from '@/composables/useImageList';
import { useProcessing } from '@/composables/useProcessing';
import { baseName, convertImage, downloadAll, formatSize, type ImageFormat, type OutputFile } from '@/lib/files';
import type { ToolPageProps } from '@/types';
import { X } from 'lucide-vue-next';
import { ref } from 'vue';

defineProps<ToolPageProps>();

const { items, add, remove, clear } = useImageList();
const { busy, progress, run } = useProcessing();

const format = ref<ImageFormat>('jpg');
const quality = ref(90);
const background = ref('#ffffff');

const extension = (f: ImageFormat) => (f === 'jpg' ? 'jpg' : f);

function convert() {
    run(async () => {
        const files: OutputFile[] = [];
        let before = 0;
        let after = 0;

        for (const [i, item] of items.value.entries()) {
            progress.value = `Imagen ${i + 1} de ${items.value.length}…`;
            const blob = await convertImage(item.file, format.value, quality.value / 100, background.value);
            files.push({ name: `${baseName(item.file.name)}.${extension(format.value)}`, data: blob });
            before += item.file.size;
            after += blob.size;
        }

        await downloadAll(files, `imagenes_${format.value}.zip`);
        return `Listo: ${formatSize(before)} → ${formatSize(after)}.`;
    });
}
</script>

<template>
    <ToolLayout :tool="tool">
        <FileDropzone v-if="items.length === 0" :accept="tool.accept" multiple @files="add" />

        <div v-else class="space-y-6">
            <div class="flex items-center justify-between">
                <p class="text-sm text-muted-foreground">{{ items.length }} {{ items.length === 1 ? 'imagen' : 'imágenes' }}</p>
                <button type="button" class="rounded-lg px-3 py-1.5 text-sm hover:bg-muted" @click="clear">Quitar todas</button>
            </div>

            <div class="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-6">
                <div v-for="(item, index) in items" :key="item.id" class="relative rounded-xl border bg-card p-1.5">
                    <button
                        type="button"
                        class="absolute right-1 top-1 z-10 rounded-full bg-background/90 p-1 text-muted-foreground shadow hover:text-destructive"
                        aria-label="Quitar imagen"
                        @click="remove(index)"
                    >
                        <X class="size-3.5" />
                    </button>
                    <div class="grid aspect-square place-items-center overflow-hidden rounded-md bg-muted">
                        <img :src="item.url" alt="" class="max-h-full max-w-full object-contain" />
                    </div>
                    <p class="mt-1 truncate text-[11px] text-muted-foreground" :title="item.file.name">{{ item.file.name }}</p>
                </div>
            </div>
            <FileDropzone :accept="tool.accept" multiple compact label="Agregar más imágenes" @files="add" />

            <OptionGroup
                v-model="format"
                label="Convertir a"
                :options="[
                    { value: 'jpg', label: 'JPG', hint: 'Fotos. Sin transparencia.' },
                    { value: 'png', label: 'PNG', hint: 'Sin pérdida, con transparencia.' },
                    { value: 'webp', label: 'WebP', hint: 'Liviano, ideal para web.' },
                ]"
            />

            <div v-if="format !== 'png'">
                <label for="quality" class="flex justify-between text-sm font-medium">
                    Calidad <span class="text-muted-foreground">{{ quality }}%</span>
                </label>
                <input id="quality" v-model.number="quality" type="range" min="30" max="100" class="mt-2 w-full accent-[hsl(var(--primary))]" />
            </div>

            <div v-if="format === 'jpg'" class="flex items-center gap-3">
                <input id="bg" v-model="background" type="color" class="h-9 w-12 cursor-pointer rounded border bg-card" />
                <label for="bg" class="text-sm">Color de fondo para las partes transparentes</label>
            </div>

            <ActionBar :label="`Convertir a ${format.toUpperCase()}`" :busy="busy" :progress="progress" @run="convert" />
        </div>
    </ToolLayout>
</template>
