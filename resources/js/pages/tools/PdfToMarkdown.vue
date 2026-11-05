<script setup lang="ts">
import ActionBar from '@/components/ActionBar.vue';
import FileChip from '@/components/FileChip.vue';
import FileDropzone from '@/components/FileDropzone.vue';
import OptionGroup from '@/components/OptionGroup.vue';
import ToolLayout from '@/components/ToolLayout.vue';
import { usePdfFile } from '@/composables/usePdfFile';
import { useProcessing } from '@/composables/useProcessing';
import { baseName, downloadBlob } from '@/lib/files';
import { extractPageText } from '@/lib/pdfText';
import { pagesToMarkdown, type PageBreakMode, type PageText } from '@/tools/ops/markdown';
import { parseRanges } from '@/tools/ops/pdf';
import type { ToolPageProps } from '@/types';
import { computed, ref } from 'vue';

defineProps<ToolPageProps>();

const pdf = usePdfFile();
const { busy, progress, run } = useProcessing();

const which = ref<'todo' | 'intervalo'>('todo');
const rangesText = ref('1');
const pageBreaks = ref<PageBreakMode>('none');

/** Páginas elegidas (base 0, en el orden escrito y sin repetir), o el error del rango. */
const selection = computed<number[] | string>(() => {
    if (which.value === 'todo') return Array.from({ length: pdf.pages.value }, (_, i) => i);
    try {
        return [...new Set(parseRanges(rangesText.value, pdf.pages.value).flat())];
    } catch (e) {
        return (e as Error).message;
    }
});

/** Sufijo del nombre para un intervalo: «_p1-3_5». */
function rangeSuffix(pages: number[]): string {
    const parts: string[] = [];
    let start = pages[0];
    let prev = pages[0];
    for (const n of [...pages.slice(1), NaN]) {
        if (n === prev + 1) {
            prev = n;
            continue;
        }
        parts.push(start === prev ? `${start + 1}` : `${start + 1}-${prev + 1}`);
        start = prev = n;
    }
    return `_p${parts.join('_')}`;
}

function convert() {
    const pages = selection.value;
    if (typeof pages === 'string') return;

    run(async () => {
        const texts: PageText[] = [];
        for (const [i, index] of pages.entries()) {
            progress.value = `Leyendo página ${i + 1} de ${pages.length}…`;
            texts.push({ number: index + 1, items: await extractPageText(pdf.doc.value!, index + 1) });
        }

        if (!texts.some((p) => p.items.some((item) => item.str.trim()))) {
            throw new Error('Este PDF no tiene texto seleccionable (¿es escaneado?). No hay nada para convertir.');
        }

        const md = pagesToMarkdown(texts, pageBreaks.value);
        const suffix = which.value === 'intervalo' ? rangeSuffix(pages) : '';
        downloadBlob(new Blob([md], { type: 'text/markdown;charset=utf-8' }), `${baseName(pdf.file.value!.name)}${suffix}.md`);

        return pages.length === 1 ? 'Listo: 1 página convertida.' : `Listo: ${pages.length} páginas convertidas.`;
    });
}
</script>

<template>
    <ToolLayout :tool="tool">
        <FileDropzone v-if="!pdf.file.value" :accept="tool.accept" @files="(f) => pdf.load(f[0])" />

        <div v-else class="space-y-6">
            <FileChip :file="pdf.file.value" :detail="`${pdf.pages.value} páginas`" @remove="pdf.reset()" />

            <OptionGroup
                v-model="which"
                label="Qué convertir"
                :columns="2"
                :options="[
                    { value: 'todo', label: 'Todo el documento', hint: `Las ${pdf.pages.value} páginas.` },
                    { value: 'intervalo', label: 'Intervalo de páginas', hint: 'Solo las páginas que elijas.' },
                ]"
            />

            <div v-if="which === 'intervalo'">
                <label for="ranges" class="text-sm font-medium">Páginas</label>
                <input
                    id="ranges"
                    v-model="rangesText"
                    class="mt-1.5 h-11 w-full rounded-lg border bg-card px-3 font-mono outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                    placeholder="1-3, 5, 8-"
                />
                <p class="mt-1.5 text-xs text-muted-foreground">Ejemplo: «1-3, 5, 8-» convierte de la 1 a la 3, la 5 y de la 8 hasta el final.</p>
            </div>

            <OptionGroup
                v-model="pageBreaks"
                label="Entre páginas"
                :options="[
                    { value: 'none', label: 'Texto corrido', hint: 'Sin marcas.' },
                    { value: 'rule', label: 'Línea', hint: 'Separa con ---' },
                    { value: 'comment', label: 'Número de página', hint: 'Comentario <!-- Página N -->' },
                ]"
            />

            <p class="text-xs text-muted-foreground">
                Se reconocen títulos, párrafos, listas, negrita y cursiva. Las imágenes y los PDF escaneados (sin texto) no se convierten.
            </p>

            <ActionBar label="Convertir a Markdown" :busy="busy" :progress="progress" :disabled="typeof selection === 'string'" @run="convert">
                <span v-if="typeof selection === 'string'" class="text-destructive">{{ selection }}</span>
                <template v-else>{{ selection.length }} {{ selection.length === 1 ? 'página' : 'páginas' }}</template>
            </ActionBar>
        </div>
    </ToolLayout>
</template>
