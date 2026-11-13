<script setup lang="ts">
import ActionBar from '@/components/ActionBar.vue';
import OptionGroup from '@/components/OptionGroup.vue';
import TextSourceField from '@/components/TextSourceField.vue';
import ToolLayout from '@/components/ToolLayout.vue';
import { useProcessing } from '@/composables/useProcessing';
import { useTextSource } from '@/composables/useTextSource';
import { baseName, downloadBlob, toBlob } from '@/lib/files';
import { markdownToPdf, type PageSizeName } from '@/tools/ops/markdown';
import type { ToolPageProps } from '@/types';
import { ref } from 'vue';

defineProps<ToolPageProps>();

const { busy, run } = useProcessing();
const { file, text, lines, empty, load, reset } = useTextSource();
const pageSize = ref<PageSizeName>('A4');

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
            <TextSourceField
                v-model="text"
                :file="file"
                :lines="lines"
                :accept="tool.accept"
                drop-label="Elegí un archivo .md o soltalo acá"
                what="el Markdown"
                placeholder="# Título&#10;&#10;Un párrafo con **negrita** y una lista:&#10;&#10;- uno&#10;- dos"
                @load="load"
                @remove="reset"
            />

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

            <ActionBar label="Convertir a PDF" :busy="busy" :disabled="empty" @run="convert">
                <span v-if="empty">Cargá un archivo o pegá texto</span>
                <template v-else>{{ lines }} {{ lines === 1 ? 'línea' : 'líneas' }}</template>
            </ActionBar>
        </div>
    </ToolLayout>
</template>
