<script setup lang="ts">
import ActionBar from '@/components/ActionBar.vue';
import FileChip from '@/components/FileChip.vue';
import FileDropzone from '@/components/FileDropzone.vue';
import OptionGroup from '@/components/OptionGroup.vue';
import PdfPreview from '@/components/PdfPreview.vue';
import ToolLayout from '@/components/ToolLayout.vue';
import { usePdfFile } from '@/composables/usePdfFile';
import { useProcessing } from '@/composables/useProcessing';
import { useStampPreview } from '@/composables/useStampPreview';
import { baseName, downloadAll, prepareImage } from '@/lib/files';
import { addWatermark, type WatermarkOptions } from '@/tools/ops/stamp';
import type { ToolPageProps } from '@/types';
import { reactive, ref, shallowRef } from 'vue';

defineProps<ToolPageProps>();

const pdf = usePdfFile();
const { busy, run } = useProcessing();

const options = reactive<WatermarkOptions>({
    kind: 'text',
    text: 'CONFIDENCIAL',
    size: 54,
    color: '#7c3aed',
    bold: true,
    scale: 0.4,
    opacity: 0.25,
    angle: 45,
    layout: 'center',
});

const image = shallowRef<WatermarkOptions['image']>();
const imageName = ref('');

async function pickImage(files: File[]) {
    image.value = await prepareImage(files[0]);
    imageName.value = files[0].name;
}

const current = () => ({ ...options, image: image.value });

const preview = useStampPreview(pdf.bytes, current, (page) => addWatermark(page, current()));

function process() {
    run(async () => {
        const data = await addWatermark(pdf.bytes.value!, current());
        const name = `${baseName(pdf.file.value!.name)}_marca.pdf`;
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

                <OptionGroup
                    v-model="options.kind"
                    :columns="2"
                    :options="[
                        { value: 'text', label: 'Texto' },
                        { value: 'image', label: 'Imagen' },
                    ]"
                />

                <template v-if="options.kind === 'text'">
                    <div>
                        <label for="text" class="text-sm font-medium">Texto</label>
                        <input
                            id="text"
                            v-model="options.text"
                            class="mt-1.5 h-11 w-full rounded-lg border bg-card px-3 outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                        />
                    </div>
                    <div class="grid grid-cols-3 gap-4">
                        <div>
                            <label for="size" class="text-sm font-medium">Tamaño</label>
                            <input
                                id="size"
                                v-model.number="options.size"
                                type="number"
                                min="8"
                                max="200"
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
                        <label class="mt-7 flex items-center gap-2 text-sm">
                            <input v-model="options.bold" type="checkbox" class="size-4 rounded accent-[hsl(var(--primary))]" /> Negrita
                        </label>
                    </div>
                </template>

                <template v-else>
                    <FileDropzone
                        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                        compact
                        :label="imageName || 'Elegí la imagen (PNG con fondo transparente queda mejor)'"
                        @files="pickImage"
                    />
                    <div>
                        <label for="scale" class="flex justify-between text-sm font-medium">
                            Ancho <span class="text-muted-foreground">{{ Math.round(options.scale! * 100) }}% de la página</span>
                        </label>
                        <input
                            id="scale"
                            v-model.number="options.scale"
                            type="range"
                            min="0.05"
                            max="1"
                            step="0.05"
                            class="mt-2 w-full accent-[hsl(var(--primary))]"
                        />
                    </div>
                </template>

                <div>
                    <label for="opacity" class="flex justify-between text-sm font-medium">
                        Opacidad <span class="text-muted-foreground">{{ Math.round(options.opacity * 100) }}%</span>
                    </label>
                    <input
                        id="opacity"
                        v-model.number="options.opacity"
                        type="range"
                        min="0.05"
                        max="1"
                        step="0.05"
                        class="mt-2 w-full accent-[hsl(var(--primary))]"
                    />
                </div>

                <div v-if="options.kind === 'text'">
                    <label for="angle" class="flex justify-between text-sm font-medium">
                        Inclinación <span class="text-muted-foreground">{{ options.angle }}°</span>
                    </label>
                    <input
                        id="angle"
                        v-model.number="options.angle"
                        type="range"
                        min="-90"
                        max="90"
                        step="5"
                        class="mt-2 w-full accent-[hsl(var(--primary))]"
                    />
                </div>

                <OptionGroup
                    v-model="options.layout"
                    label="Distribución"
                    :columns="2"
                    :options="[
                        { value: 'center', label: 'Una al centro' },
                        { value: 'mosaic', label: 'Mosaico', hint: 'Repetida por toda la página.' },
                    ]"
                />
            </div>

            <div>
                <p class="mb-2 text-sm font-medium">Vista previa</p>
                <PdfPreview :bytes="preview" :width="340" />
            </div>

            <ActionBar
                class="md:col-span-2"
                label="Agregar marca de agua"
                :busy="busy"
                :disabled="options.kind === 'image' ? !image : !options.text?.trim()"
                @run="process"
            />
        </div>
    </ToolLayout>
</template>
