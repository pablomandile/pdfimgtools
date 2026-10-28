<script setup lang="ts">
import ActionBar from '@/components/ActionBar.vue';
import FileChip from '@/components/FileChip.vue';
import FileDropzone from '@/components/FileDropzone.vue';
import OptionGroup from '@/components/OptionGroup.vue';
import ToolLayout from '@/components/ToolLayout.vue';
import { usePdfFile } from '@/composables/usePdfFile';
import { useProcessing } from '@/composables/useProcessing';
import { baseName, canvasToBlob, downloadAll, type OutputFile } from '@/lib/files';
import { renderPage } from '@/lib/pdfjs';
import { parseRanges } from '@/tools/ops/pdf';
import type { ToolPageProps } from '@/types';
import { computed, ref } from 'vue';

defineProps<ToolPageProps>();

const pdf = usePdfFile();
const { busy, progress, run } = useProcessing();

const format = ref<'jpg' | 'png'>('jpg');
const dpi = ref(150);
const which = ref<'todas' | 'algunas'>('todas');
const rangesText = ref('1');

const selection = computed<number[] | string>(() => {
    if (which.value === 'todas') return Array.from({ length: pdf.pages.value }, (_, i) => i);
    try {
        return [...new Set(parseRanges(rangesText.value, pdf.pages.value).flat())];
    } catch (e) {
        return (e as Error).message;
    }
});

function convert() {
    const pages = selection.value;
    if (typeof pages === 'string') return;

    run(async () => {
        const base = baseName(pdf.file.value!.name);
        const files: OutputFile[] = [];

        for (const [i, index] of pages.entries()) {
            progress.value = `Página ${i + 1} de ${pages.length}…`;
            const canvas = await renderPage(pdf.doc.value!, index + 1, { scale: dpi.value / 72 });
            files.push({ name: `${base}_pagina_${index + 1}.${format.value}`, data: await canvasToBlob(canvas, format.value, 0.9) });
            canvas.width = canvas.height = 0; // libera la memoria del canvas ya mismo
        }

        await downloadAll(files, `${base}_imagenes.zip`);
        return files.length === 1 ? 'Listo.' : `Listo: ${files.length} imágenes en un .zip.`;
    });
}
</script>

<template>
    <ToolLayout :tool="tool">
        <FileDropzone v-if="!pdf.file.value" :accept="tool.accept" @files="(f) => pdf.load(f[0])" />

        <div v-else class="space-y-6">
            <FileChip :file="pdf.file.value" :detail="`${pdf.pages.value} páginas`" @remove="pdf.reset()" />

            <OptionGroup
                v-model="format"
                label="Formato"
                :columns="2"
                :options="[
                    { value: 'jpg', label: 'JPG', hint: 'Más liviano. Ideal para fotos y documentos escaneados.' },
                    { value: 'png', label: 'PNG', hint: 'Sin pérdida. Mejor para texto nítido y gráficos.' },
                ]"
            />

            <OptionGroup
                v-model="dpi"
                label="Resolución"
                :options="[
                    { value: 72, label: 'Pantalla', hint: '72 ppp' },
                    { value: 150, label: 'Normal', hint: '150 ppp' },
                    { value: 300, label: 'Impresión', hint: '300 ppp (archivos grandes)' },
                ]"
            />

            <OptionGroup
                v-model="which"
                label="Páginas"
                :columns="2"
                :options="[
                    { value: 'todas', label: 'Todas' },
                    { value: 'algunas', label: 'Elegir cuáles' },
                ]"
            />
            <input
                v-if="which === 'algunas'"
                v-model="rangesText"
                aria-label="Páginas a exportar"
                class="h-11 w-full rounded-lg border bg-card px-3 font-mono outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                placeholder="1, 3-5"
            />

            <ActionBar label="Convertir a imágenes" :busy="busy" :progress="progress" :disabled="typeof selection === 'string'" @run="convert">
                <span v-if="typeof selection === 'string'" class="text-destructive">{{ selection }}</span>
                <template v-else>{{ selection.length }} {{ selection.length === 1 ? 'imagen' : 'imágenes' }}</template>
            </ActionBar>
        </div>
    </ToolLayout>
</template>
