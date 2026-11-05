<script setup lang="ts">
import ActionBar from '@/components/ActionBar.vue';
import FileDropzone from '@/components/FileDropzone.vue';
import OptionGroup from '@/components/OptionGroup.vue';
import ToolLayout from '@/components/ToolLayout.vue';
import { useImageList } from '@/composables/useImageList';
import { useProcessing } from '@/composables/useProcessing';
import { baseName, canvasToBlob, downloadAll, imageToCanvas, type OutputFile } from '@/lib/files';
import { removeBackgroundAi } from '@/lib/removeBackgroundAi';
import { colorKey, dominantBorderColor, hexToRgb, rgbToHex, type ColorKeyOptions } from '@/tools/ops/background';
import type { ToolPageProps } from '@/types';
import { Pipette, X } from 'lucide-vue-next';
import { reactive, ref, watch } from 'vue';

defineProps<ToolPageProps>();

const { items, loading, add, remove, clear } = useImageList();
const { busy, progress, run } = useProcessing();

const mode = ref<'ai' | 'color'>('ai');
const format = ref<'png' | 'webp'>('png');
const color = ref('#ffffff');
const options = reactive<ColorKeyOptions>({ tolerance: 12, softness: 8, connectedOnly: true });

const selected = ref(0);
const results = ref<{ name: string; url: string }[]>([]);

// Vista previa del modo color: la imagen elegida, achicada para que el ajuste sea instantáneo.
const PREVIEW_PX = 640;
const original = ref<HTMLCanvasElement | null>(null);
const preview = ref<HTMLCanvasElement | null>(null);
let source: ImageData | null = null;

watch(
    () => items.value[selected.value]?.url,
    async (url) => {
        source = null;
        if (!url) return;
        const canvas = await imageToCanvas(items.value[selected.value].file, undefined, { mode: 'max', px: PREVIEW_PX });
        if (items.value[selected.value]?.url !== url) return;

        source = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
        color.value = rgbToHex(dominantBorderColor(source));
        draw();
    },
);

watch(
    () => items.value.length,
    (length) => {
        if (selected.value >= length) selected.value = Math.max(0, length - 1);
    },
);

watch([color, options, mode], draw, { deep: true, flush: 'post' });

function draw() {
    if (!source || mode.value !== 'color') return;

    for (const target of [original.value, preview.value]) {
        if (!target) continue;
        target.width = source.width;
        target.height = source.height;
    }
    original.value?.getContext('2d')!.putImageData(source, 0, 0);

    const keyed = new ImageData(new Uint8ClampedArray(source.data), source.width, source.height);
    colorKey(keyed, hexToRgb(color.value), options);
    preview.value?.getContext('2d')!.putImageData(keyed, 0, 0);
}

/** Cuentagotas: tocar la imagen original toma ese color como fondo. */
function pick(event: MouseEvent) {
    const canvas = original.value;
    if (!canvas || !source) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * source.width);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * source.height);
    const i = (y * source.width + x) * 4;
    color.value = rgbToHex([source.data[i], source.data[i + 1], source.data[i + 2]]);
}

function clearResults() {
    results.value.forEach((r) => URL.revokeObjectURL(r.url));
    results.value = [];
}

watch(() => items.value.length, clearResults);

const megabytes = (bytes: number) => (bytes / 1024 / 1024).toFixed(0);

function process() {
    run(async () => {
        clearResults();
        const files: OutputFile[] = [];

        for (const [i, item] of items.value.entries()) {
            const label = items.value.length > 1 ? `Imagen ${i + 1} de ${items.value.length}…` : 'Quitando el fondo…';
            progress.value = label;

            const canvas = await imageToCanvas(item.file);
            let output: HTMLCanvasElement;

            if (mode.value === 'ai') {
                output = await removeBackgroundAi(canvas, (loaded, total) => {
                    progress.value = `Descargando el modelo de IA… ${megabytes(loaded)} de ${megabytes(total)} MB`;
                });
                progress.value = label;
            } else {
                const ctx = canvas.getContext('2d')!;
                const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
                colorKey(pixels, hexToRgb(color.value), options);
                ctx.putImageData(pixels, 0, 0);
                output = canvas;
            }

            const blob = await canvasToBlob(output, format.value, 0.92);
            const name = `${baseName(item.file.name)}_sin_fondo.${format.value}`;
            files.push({ name, data: blob });
            results.value.push({ name, url: URL.createObjectURL(blob) });
        }

        await downloadAll(files, 'sin_fondo.zip');
        return files.length === 1 ? 'Listo: fondo quitado.' : `Listo: ${files.length} imágenes sin fondo.`;
    });
}
</script>

<template>
    <ToolLayout :tool="tool">
        <FileDropzone v-if="items.length === 0" :accept="tool.accept" multiple @files="add" />
        <p v-if="loading" class="mt-3 text-center text-sm text-muted-foreground">Leyendo imágenes…</p>

        <div v-if="items.length" class="space-y-6">
            <div class="flex items-center justify-between">
                <p class="text-sm text-muted-foreground">{{ items.length }} {{ items.length === 1 ? 'imagen' : 'imágenes' }}</p>
                <button type="button" class="rounded-lg px-3 py-1.5 text-sm hover:bg-muted" @click="clear">Quitar todas</button>
            </div>

            <div class="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-6">
                <div
                    v-for="(item, index) in items"
                    :key="item.id"
                    :class="[
                        'relative rounded-xl border bg-card p-1.5',
                        mode === 'color' && index === selected && 'border-primary ring-2 ring-primary/30',
                    ]"
                >
                    <button
                        type="button"
                        class="absolute right-1 top-1 z-10 rounded-full bg-background/90 p-1 text-muted-foreground shadow hover:text-destructive"
                        aria-label="Quitar imagen"
                        @click="remove(index)"
                    >
                        <X class="size-3.5" />
                    </button>
                    <button
                        type="button"
                        class="grid aspect-square w-full place-items-center overflow-hidden rounded-md bg-muted"
                        :aria-label="`Ver ${item.file.name}`"
                        @click="selected = index"
                    >
                        <img :src="item.url" alt="" class="max-h-full max-w-full object-contain" />
                    </button>
                    <p class="mt-1 truncate text-[11px] text-muted-foreground" :title="item.file.name">{{ item.file.name }}</p>
                </div>
            </div>
            <FileDropzone :accept="tool.accept" multiple compact label="Agregar más imágenes" @files="add" />

            <OptionGroup
                v-model="mode"
                label="Cómo quitarlo"
                :columns="2"
                :options="[
                    { value: 'ai', label: 'Automático con IA', hint: 'Personas, productos, mascotas, sobre cualquier fondo.' },
                    { value: 'color', label: 'Por color', hint: 'Fondos lisos: logos, firmas, capturas. Instantáneo.' },
                ]"
            />

            <p v-if="mode === 'ai'" class="rounded-xl border bg-muted/50 p-3 text-sm text-muted-foreground">
                La primera vez se descarga el modelo de IA (unos 44 MB) y queda guardado en el navegador. Corre en tu equipo: la imagen no se sube a
                ningún lado. En celulares viejos puede tardar.
            </p>

            <div v-else class="space-y-4">
                <div class="grid gap-3 sm:grid-cols-2">
                    <figure>
                        <figcaption class="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Pipette class="size-3.5" /> Tocá el fondo para tomar su color
                        </figcaption>
                        <canvas ref="original" class="mx-auto block max-h-80 max-w-full cursor-crosshair rounded-lg border" @click="pick" />
                    </figure>
                    <figure>
                        <figcaption class="mb-1.5 text-xs text-muted-foreground">Resultado</figcaption>
                        <canvas ref="preview" class="checkerboard mx-auto block max-h-80 max-w-full rounded-lg border" />
                    </figure>
                </div>

                <div class="flex items-center gap-3">
                    <input id="key-color" v-model="color" type="color" class="h-9 w-12 cursor-pointer rounded border bg-card" />
                    <label for="key-color" class="text-sm">Color del fondo</label>
                </div>

                <div class="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label for="tolerance" class="flex justify-between text-sm font-medium">
                            Tolerancia <span class="text-muted-foreground">{{ options.tolerance }}</span>
                        </label>
                        <input
                            id="tolerance"
                            v-model.number="options.tolerance"
                            type="range"
                            min="0"
                            max="60"
                            class="mt-2 w-full accent-[hsl(var(--primary))]"
                        />
                    </div>
                    <div>
                        <label for="softness" class="flex justify-between text-sm font-medium">
                            Suavizado de bordes <span class="text-muted-foreground">{{ options.softness }}</span>
                        </label>
                        <input
                            id="softness"
                            v-model.number="options.softness"
                            type="range"
                            min="0"
                            max="40"
                            class="mt-2 w-full accent-[hsl(var(--primary))]"
                        />
                    </div>
                </div>

                <label class="flex items-start gap-2 text-sm">
                    <input v-model="options.connectedOnly" type="checkbox" class="mt-0.5 size-4 rounded accent-[hsl(var(--primary))]" />
                    <span>
                        Solo el fondo que toca los bordes
                        <span class="block text-xs text-muted-foreground"
                            >Así no se borra el mismo color adentro del dibujo (el blanco de un logo, por ejemplo).</span
                        >
                    </span>
                </label>
            </div>

            <OptionGroup
                v-model="format"
                label="Guardar como"
                :columns="2"
                :options="[
                    { value: 'png', label: 'PNG', hint: 'Sin pérdida. El más compatible.' },
                    { value: 'webp', label: 'WebP', hint: 'Más liviano, ideal para web.' },
                ]"
            />

            <div v-if="results.length">
                <p class="mb-2 text-sm font-medium">Resultado</p>
                <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <a
                        v-for="r in results"
                        :key="r.url"
                        :href="r.url"
                        :download="r.name"
                        class="checkerboard block rounded-lg border p-1.5"
                        :title="r.name"
                    >
                        <img :src="r.url" alt="" class="mx-auto max-h-48 object-contain" />
                    </a>
                </div>
            </div>

            <ActionBar label="Quitar fondo" :busy="busy" :progress="progress" @run="process" />
        </div>
    </ToolLayout>
</template>

<style scoped>
/* Cuadriculado de "transparente", como en los editores de imágenes. */
.checkerboard {
    background-color: #fff;
    background-image: conic-gradient(#e5e5e5 25%, transparent 25% 50%, #e5e5e5 50% 75%, transparent 75%);
    background-size: 16px 16px;
}
</style>
