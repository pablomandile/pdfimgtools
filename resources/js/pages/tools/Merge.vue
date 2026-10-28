<script setup lang="ts">
import ActionBar from '@/components/ActionBar.vue';
import FileDropzone from '@/components/FileDropzone.vue';
import ToolLayout from '@/components/ToolLayout.vue';
import { useProcessing } from '@/composables/useProcessing';
import { downloadAll, formatSize, readBytes } from '@/lib/files';
import { openPdf, thumbnail } from '@/lib/pdfjs';
import { mergePdfs } from '@/tools/ops/pdf';
import type { ToolPageProps } from '@/types';
import { ArrowDownAZ, GripVertical, X } from 'lucide-vue-next';
import { ref } from 'vue';
import { toast } from 'vue-sonner';
import draggable from 'vuedraggable';

defineProps<ToolPageProps>();

interface Item {
    id: number;
    file: File;
    bytes: Uint8Array;
    pages: number;
    thumb?: string;
}

const items = ref<Item[]>([]);
const { busy, run } = useProcessing();
let nextId = 1;

async function add(files: File[]) {
    for (const file of files) {
        try {
            const bytes = await readBytes(file);
            const doc = await openPdf(bytes);
            const item: Item = { id: nextId++, file, bytes, pages: doc.numPages };
            items.value.push(item);
            thumbnail(doc, 1, 140)
                .then((url) => {
                    const found = items.value.find((i) => i.id === item.id);
                    if (found) found.thumb = url;
                })
                .finally(() => doc.destroy());
        } catch {
            toast.error(`No se pudo abrir «${file.name}». Puede estar dañado o protegido.`);
        }
    }
}

function sortByName() {
    items.value.sort((a, b) => a.file.name.localeCompare(b.file.name, 'es', { numeric: true }));
}

function merge() {
    run(async () => {
        const result = await mergePdfs(items.value.map((i) => i.bytes));
        await downloadAll([{ name: 'unido.pdf', data: result }], 'unido.zip');
        return `Listo: ${items.value.length} archivos unidos.`;
    });
}
</script>

<template>
    <ToolLayout :tool="tool">
        <FileDropzone v-if="items.length === 0" :accept="tool.accept" multiple @files="add" />

        <template v-else>
            <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
                <p class="text-sm text-muted-foreground">Arrastrá las tarjetas para cambiar el orden.</p>
                <button type="button" class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm hover:bg-muted" @click="sortByName">
                    <ArrowDownAZ class="size-4" /> Ordenar por nombre
                </button>
            </div>

            <draggable v-model="items" item-key="id" class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4" ghost-class="opacity-40">
                <template #item="{ element, index }">
                    <div class="group relative cursor-grab rounded-xl border bg-card p-3 active:cursor-grabbing">
                        <span class="absolute left-2 top-2 z-10 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                            {{ index + 1 }}
                        </span>
                        <button
                            type="button"
                            class="absolute right-2 top-2 z-10 rounded-full bg-background/90 p-1 text-muted-foreground shadow hover:text-destructive"
                            aria-label="Quitar"
                            @click="items.splice(index, 1)"
                        >
                            <X class="size-4" />
                        </button>
                        <div class="grid aspect-[3/4] place-items-center overflow-hidden rounded-md bg-muted">
                            <img v-if="element.thumb" :src="element.thumb" alt="" class="max-h-full max-w-full object-contain shadow" />
                            <GripVertical v-else class="size-6 text-muted-foreground" />
                        </div>
                        <p class="mt-2 truncate text-sm font-medium" :title="element.file.name">{{ element.file.name }}</p>
                        <p class="text-xs text-muted-foreground">
                            {{ element.pages }} {{ element.pages === 1 ? 'página' : 'páginas' }} · {{ formatSize(element.file.size) }}
                        </p>
                    </div>
                </template>
            </draggable>

            <FileDropzone class="mt-4" :accept="tool.accept" multiple compact label="Agregar más PDF" @files="add" />

            <ActionBar label="Unir PDF" :busy="busy" :disabled="items.length < 2" @run="merge">
                <template v-if="items.length < 2">Agregá al menos dos PDF.</template>
                <template v-else>{{ items.length }} archivos · {{ items.reduce((n, i) => n + i.pages, 0) }} páginas en total</template>
            </ActionBar>
        </template>
    </ToolLayout>
</template>
