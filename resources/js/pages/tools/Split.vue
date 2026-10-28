<script setup lang="ts">
import ActionBar from '@/components/ActionBar.vue';
import FileChip from '@/components/FileChip.vue';
import FileDropzone from '@/components/FileDropzone.vue';
import OptionGroup from '@/components/OptionGroup.vue';
import ToolLayout from '@/components/ToolLayout.vue';
import { usePdfFile } from '@/composables/usePdfFile';
import { useProcessing } from '@/composables/useProcessing';
import { baseName, downloadAll } from '@/lib/files';
import { chunkRanges, parseRanges, rangeLabel, splitPdf } from '@/tools/ops/pdf';
import type { ToolPageProps } from '@/types';
import { computed, ref, watch } from 'vue';

defineProps<ToolPageProps>();

const pdf = usePdfFile();
const { busy, run } = useProcessing();

const mode = ref<'rangos' | 'cada' | 'todas'>('rangos');
const rangesText = ref('');
const every = ref(1);

watch(pdf.pages, (n) => {
    if (n) rangesText.value = n > 1 ? `1-${Math.ceil(n / 2)}, ${Math.ceil(n / 2) + 1}-${n}` : '1';
});

/** Rangos según el modo elegido, o el error de por qué no se pueden armar. */
const plan = computed<{ ranges: number[][] } | { error: string }>(() => {
    try {
        const total = pdf.pages.value;
        if (mode.value === 'todas') return { ranges: chunkRanges(total, 1) };
        if (mode.value === 'cada') return { ranges: chunkRanges(total, Number(every.value)) };
        return { ranges: parseRanges(rangesText.value, total) };
    } catch (e) {
        return { error: (e as Error).message };
    }
});

function split() {
    if ('error' in plan.value) return;
    const ranges = plan.value.ranges;

    run(async () => {
        const parts = await splitPdf(pdf.bytes.value!, ranges);
        const base = baseName(pdf.file.value!.name);
        await downloadAll(
            parts.map((data, i) => ({ name: `${base}_${rangeLabel(ranges[i])}.pdf`, data })),
            `${base}_dividido.zip`,
        );
        return parts.length === 1 ? 'Listo.' : `Listo: ${parts.length} archivos en un .zip.`;
    });
}
</script>

<template>
    <ToolLayout :tool="tool">
        <FileDropzone v-if="!pdf.file.value" :accept="tool.accept" @files="(f) => pdf.load(f[0])" />

        <div v-else class="space-y-6">
            <FileChip :file="pdf.file.value" :detail="`${pdf.pages.value} páginas`" @remove="pdf.reset()" />

            <OptionGroup
                v-model="mode"
                label="¿Cómo lo querés dividir?"
                :options="[
                    { value: 'rangos', label: 'Por rangos', hint: 'Vos decidís qué páginas van en cada archivo.' },
                    { value: 'cada', label: 'Cada N páginas', hint: 'Bloques del mismo tamaño.' },
                    { value: 'todas', label: 'Todas sueltas', hint: 'Un archivo por página.' },
                ]"
            />

            <div v-if="mode === 'rangos'">
                <label for="ranges" class="text-sm font-medium">Rangos (separados por coma)</label>
                <input
                    id="ranges"
                    v-model="rangesText"
                    class="mt-1.5 h-11 w-full rounded-lg border bg-card px-3 font-mono outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                    placeholder="1-3, 4, 5-"
                />
                <p class="mt-1.5 text-xs text-muted-foreground">
                    Ejemplo: «1-3, 5, 8-» arma tres archivos. «8-» quiere decir de la 8 hasta el final.
                </p>
            </div>

            <div v-if="mode === 'cada'" class="flex items-center gap-3">
                <label for="every" class="text-sm font-medium">Páginas por archivo</label>
                <input
                    id="every"
                    v-model.number="every"
                    type="number"
                    min="1"
                    :max="pdf.pages.value"
                    class="h-11 w-24 rounded-lg border bg-card px-3 outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                />
            </div>

            <ActionBar label="Dividir PDF" :busy="busy" :disabled="'error' in plan" @run="split">
                <span v-if="'error' in plan" class="text-destructive">{{ plan.error }}</span>
                <template v-else>Se van a generar {{ plan.ranges.length }} {{ plan.ranges.length === 1 ? 'archivo' : 'archivos' }}.</template>
            </ActionBar>
        </div>
    </ToolLayout>
</template>
