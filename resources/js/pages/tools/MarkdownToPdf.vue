<script setup lang="ts">
import ActionBar from '@/components/ActionBar.vue';
import FileChip from '@/components/FileChip.vue';
import FileDropzone from '@/components/FileDropzone.vue';
import OptionGroup from '@/components/OptionGroup.vue';
import ToolLayout from '@/components/ToolLayout.vue';
import { useProcessing } from '@/composables/useProcessing';
import { baseName, downloadBlob, toBlob } from '@/lib/files';
import { markdownToPdf, type PageSizeName } from '@/tools/ops/markdown';
import type { ToolPageProps } from '@/types';
import { computed, ref, shallowRef } from 'vue';
import { toast } from 'vue-sonner';

defineProps<ToolPageProps>();

const { busy, run } = useProcessing();

const file = shallowRef<File | null>(null);
const text = ref('');
const pageSize = ref<PageSizeName>('A4');

const lines = computed(() => (text.value ? text.value.split('\n').length : 0));

async function load(newFile: File) {
    try {
        text.value = await newFile.text();
        file.value = newFile;
    } catch {
        toast.error('No se pudo leer el archivo.');
    }
}

function reset() {
    file.value = null;
    text.value = '';
}

function convert() {
    run(async () => {
        const { bytes, pages } = await markdownToPdf(text.value, pageSize.value);
        const name = file.value ? baseName(file.value.name) : 'documento';
        downloadBlob(toBlob(bytes), `${name}.pdf`);
        return pages === 1 ? 'Listo: 1 página.' : `Listo: ${pages} páginas.`;
    });
}
</script>

<template>
    <ToolLayout :tool="tool">
        <div class="space-y-6">
            <FileChip v-if="file" :file="file" :detail="`${lines} líneas`" @remove="reset()" />
            <FileDropzone v-else compact :accept="tool.accept" label="Elegí un archivo .md o soltalo acá" @files="(f) => load(f[0])" />

            <div>
                <label for="markdown" class="text-sm font-medium">{{ file ? 'Contenido (podés editarlo)' : 'O pegá el Markdown acá' }}</label>
                <textarea
                    id="markdown"
                    v-model="text"
                    rows="14"
                    spellcheck="false"
                    class="mt-1.5 w-full rounded-lg border bg-card p-3 font-mono text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                    placeholder="# Título&#10;&#10;Un párrafo con **negrita** y una lista:&#10;&#10;- uno&#10;- dos"
                />
            </div>

            <OptionGroup
                v-model="pageSize"
                label="Tamaño de página"
                :columns="2"
                :options="[
                    { value: 'A4', label: 'A4', hint: '210 × 297 mm' },
                    { value: 'Letter', label: 'Carta', hint: '216 × 279 mm' },
                ]"
            />

            <p class="text-xs text-muted-foreground">
                Admite títulos, listas, tablas, citas, código, enlaces, negrita y cursiva. Las imágenes se indican con su texto alternativo, y los
                emoji o los alfabetos no latinos se reemplazan por «?».
            </p>

            <ActionBar label="Convertir a PDF" :busy="busy" :disabled="!text.trim()" @run="convert">
                <template v-if="text.trim()">{{ lines }} {{ lines === 1 ? 'línea' : 'líneas' }}</template>
                <span v-else>Cargá un archivo o pegá texto</span>
            </ActionBar>
        </div>
    </ToolLayout>
</template>
