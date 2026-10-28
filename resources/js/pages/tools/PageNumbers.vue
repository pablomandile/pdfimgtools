<script setup lang="ts">
import ActionBar from '@/components/ActionBar.vue';
import FileChip from '@/components/FileChip.vue';
import FileDropzone from '@/components/FileDropzone.vue';
import PdfPreview from '@/components/PdfPreview.vue';
import ToolLayout from '@/components/ToolLayout.vue';
import { usePdfFile } from '@/composables/usePdfFile';
import { useProcessing } from '@/composables/useProcessing';
import { useStampPreview } from '@/composables/useStampPreview';
import { baseName, downloadAll } from '@/lib/files';
import { addPageNumbers, formatPageNumber, type PageNumberOptions, type Position } from '@/tools/ops/stamp';
import type { ToolPageProps } from '@/types';
import { reactive } from 'vue';

defineProps<ToolPageProps>();

const pdf = usePdfFile();
const { busy, run } = useProcessing();

const options = reactive<PageNumberOptions>({
    position: 'bottom-center',
    format: 'n',
    fromPage: 1,
    startAt: 1,
    size: 11,
    margin: 28,
    color: '#333333',
});

const positions: Position[] = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'];
const positionLabels: Record<Position, string> = {
    'top-left': 'Arriba a la izquierda',
    'top-center': 'Arriba al centro',
    'top-right': 'Arriba a la derecha',
    'bottom-left': 'Abajo a la izquierda',
    'bottom-center': 'Abajo al centro',
    'bottom-right': 'Abajo a la derecha',
};
const formats: PageNumberOptions['format'][] = ['n', 'n-de-total', 'pagina-n', 'pagina-n-de-total'];

// En la vista previa se ve la primera página numerada, aunque se empiece más adelante.
const preview = useStampPreview(
    pdf.bytes,
    () => ({ ...options }),
    (page) => addPageNumbers(page, { ...options, fromPage: 1 }),
);

function process() {
    run(async () => {
        const data = await addPageNumbers(pdf.bytes.value!, options);
        const name = `${baseName(pdf.file.value!.name)}_numerado.pdf`;
        await downloadAll([{ name, data }], name);
        return 'Listo, ya se descargó.';
    });
}
</script>

<template>
    <ToolLayout :tool="tool">
        <FileDropzone v-if="!pdf.file.value" :accept="tool.accept" @files="(f) => pdf.load(f[0])" />

        <div v-else class="grid gap-8 md:grid-cols-[1fr_minmax(0,340px)]">
            <div class="space-y-6">
                <FileChip :file="pdf.file.value" :detail="`${pdf.pages.value} páginas`" @remove="pdf.reset()" />

                <fieldset>
                    <legend class="mb-2 text-sm font-medium">Posición</legend>
                    <!-- Una hoja en miniatura: se toca el lugar donde va el número. -->
                    <div class="grid aspect-[3/4] w-40 grid-cols-3 grid-rows-[auto_1fr_auto] gap-1 rounded-lg border bg-card p-2">
                        <template v-for="(pos, i) in positions" :key="pos">
                            <div v-if="i === 3" class="col-span-3" />
                            <button
                                type="button"
                                :title="positionLabels[pos]"
                                :aria-label="positionLabels[pos]"
                                :aria-pressed="options.position === pos"
                                :class="['h-7 rounded transition', options.position === pos ? 'bg-primary' : 'bg-muted hover:bg-primary/30']"
                                @click="options.position = pos"
                            />
                        </template>
                    </div>
                </fieldset>

                <div>
                    <label for="format" class="text-sm font-medium">Formato</label>
                    <select
                        id="format"
                        v-model="options.format"
                        class="mt-1.5 h-11 w-full rounded-lg border bg-card px-3 outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                    >
                        <option v-for="f in formats" :key="f" :value="f">{{ formatPageNumber(f, 1, pdf.pages.value) }}</option>
                    </select>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="from" class="text-sm font-medium">Numerar desde la página</label>
                        <input
                            id="from"
                            v-model.number="options.fromPage"
                            type="number"
                            min="1"
                            :max="pdf.pages.value"
                            class="mt-1.5 h-11 w-full rounded-lg border bg-card px-3 outline-none focus:border-primary"
                        />
                    </div>
                    <div>
                        <label for="start" class="text-sm font-medium">Primer número</label>
                        <input
                            id="start"
                            v-model.number="options.startAt"
                            type="number"
                            min="0"
                            class="mt-1.5 h-11 w-full rounded-lg border bg-card px-3 outline-none focus:border-primary"
                        />
                    </div>
                    <div>
                        <label for="size" class="text-sm font-medium">Tamaño de letra</label>
                        <input
                            id="size"
                            v-model.number="options.size"
                            type="number"
                            min="6"
                            max="48"
                            class="mt-1.5 h-11 w-full rounded-lg border bg-card px-3 outline-none focus:border-primary"
                        />
                    </div>
                    <div>
                        <label for="color" class="text-sm font-medium">Color</label>
                        <input
                            id="color"
                            v-model="options.color"
                            type="color"
                            class="mt-1.5 h-11 w-full cursor-pointer rounded-lg border bg-card px-1"
                        />
                    </div>
                </div>
            </div>

            <div>
                <p class="mb-2 text-sm font-medium">Vista previa</p>
                <PdfPreview :bytes="preview" :width="340" />
            </div>

            <ActionBar class="md:col-span-2" label="Numerar páginas" :busy="busy" @run="process" />
        </div>
    </ToolLayout>
</template>
