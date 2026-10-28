<script setup lang="ts">
import ActionBar from '@/components/ActionBar.vue';
import FileChip from '@/components/FileChip.vue';
import FileDropzone from '@/components/FileDropzone.vue';
import OptionGroup from '@/components/OptionGroup.vue';
import SignaturePad from '@/components/SignaturePad.vue';
import ToolLayout from '@/components/ToolLayout.vue';
import { usePdfFile } from '@/composables/usePdfFile';
import { useProcessing } from '@/composables/useProcessing';
import { baseName, downloadAll, prepareImage } from '@/lib/files';
import { renderPage } from '@/lib/pdfjs';
import type { PreparedImage } from '@/tools/ops/images';
import { placeImage, type Placement } from '@/tools/ops/stamp';
import type { ToolPageProps } from '@/types';
import { ChevronLeft, ChevronRight, Copy, X } from 'lucide-vue-next';
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue';

defineProps<ToolPageProps>();

const pdf = usePdfFile();
const { busy, run } = useProcessing();

const source = ref<'dibujar' | 'subir'>('dibujar');
const signature = shallowRef<PreparedImage | null>(null);
const signatureUrl = ref<string | null>(null);

const current = ref(1);
const pageImage = ref<string | null>(null);
const pageBox = ref<HTMLDivElement>();
const placements = ref<Placement[]>([]);
const width = ref(0.25);

async function useSignature(blob: Blob) {
    const file = new File([blob], 'firma.png', { type: blob.type || 'image/png' });
    signature.value = await prepareImage(file);
    if (signatureUrl.value) URL.revokeObjectURL(signatureUrl.value);
    signatureUrl.value = URL.createObjectURL(file);
}

onBeforeUnmount(() => signatureUrl.value && URL.revokeObjectURL(signatureUrl.value));

watch(
    () => [pdf.doc.value, current.value] as const,
    async ([doc, n]) => {
        pageImage.value = null;
        if (!doc) return;
        const canvas = await renderPage(doc, n, { width: 900 });
        pageImage.value = canvas.toDataURL('image/jpeg', 0.85);
    },
);

const onPage = computed(() => placements.value.map((p, i) => ({ ...p, i })).filter((p) => p.page === current.value - 1));

/** Tocar la página pone la firma centrada en ese punto. */
function place(e: MouseEvent) {
    if (!signatureUrl.value || dragging) return;
    const rect = pageBox.value!.getBoundingClientRect();
    const ratio = rect.width / rect.height;
    const aspect = signature.value ? signatureAspect.value : 3;
    placements.value.push({
        page: current.value - 1,
        x: (e.clientX - rect.left) / rect.width - width.value / 2,
        y: (e.clientY - rect.top) / rect.height - (width.value * ratio) / aspect / 2,
        width: width.value,
    });
}

const signatureAspect = ref(3);
watch(signatureUrl, (url) => {
    if (!url) return;
    const img = new Image();
    img.onload = () => (signatureAspect.value = img.width / img.height);
    img.src = url;
});

// Arrastrar una firma ya ubicada.
let dragging: { index: number; dx: number; dy: number; moved: boolean } | null = null;

function startDrag(e: PointerEvent, index: number) {
    const rect = pageBox.value!.getBoundingClientRect();
    const p = placements.value[index];
    dragging = { index, dx: (e.clientX - rect.left) / rect.width - p.x, dy: (e.clientY - rect.top) / rect.height - p.y, moved: false };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
}

function drag(e: PointerEvent) {
    if (!dragging) return;
    const rect = pageBox.value!.getBoundingClientRect();
    const p = placements.value[dragging.index];
    p.x = (e.clientX - rect.left) / rect.width - dragging.dx;
    p.y = (e.clientY - rect.top) / rect.height - dragging.dy;
    dragging.moved = true;
}

function endDrag() {
    // Se suelta un instante después para que el clic del final no agregue otra firma.
    setTimeout(() => (dragging = null));
}

watch(width, (w) => placements.value.forEach((p) => (p.width = w)));

function copyToAllPages() {
    const model = onPage.value[0];
    if (!model) return;
    const others = Array.from({ length: pdf.pages.value }, (_, i) => i).filter((i) => i !== model.page);
    placements.value = [
        ...placements.value.filter((p) => p.page === model.page),
        ...others.map((page) => ({ page, x: model.x, y: model.y, width: model.width })),
    ];
}

function reset() {
    pdf.reset();
    placements.value = [];
    current.value = 1;
}

function process() {
    run(async () => {
        const data = await placeImage(pdf.bytes.value!, signature.value!, placements.value);
        const name = `${baseName(pdf.file.value!.name)}_firmado.pdf`;
        await downloadAll([{ name, data }], name);
        return 'Listo, ya se descargó.';
    });
}
</script>

<template>
    <ToolLayout :tool="tool">
        <FileDropzone v-if="!pdf.file.value" :accept="tool.accept" @files="(f) => pdf.load(f[0])" />

        <div v-else class="grid gap-8 lg:grid-cols-[minmax(0,360px)_1fr]">
            <div class="space-y-6">
                <FileChip :file="pdf.file.value" :detail="`${pdf.pages.value} páginas`" @remove="reset" />

                <div>
                    <p class="mb-2 text-sm font-medium">1. Tu firma</p>
                    <div v-if="signatureUrl" class="flex items-center gap-3 rounded-xl border bg-white p-3">
                        <img :src="signatureUrl" alt="Tu firma" class="max-h-16 flex-1 object-contain object-left" />
                        <button
                            type="button"
                            class="rounded-lg px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
                            @click="((signatureUrl = null), (signature = null))"
                        >
                            Cambiar
                        </button>
                    </div>
                    <template v-else>
                        <OptionGroup
                            v-model="source"
                            :columns="2"
                            :options="[
                                { value: 'dibujar', label: 'Dibujarla' },
                                { value: 'subir', label: 'Subir imagen' },
                            ]"
                        />
                        <div class="mt-3">
                            <SignaturePad v-if="source === 'dibujar'" @done="useSignature" />
                            <FileDropzone
                                v-else
                                accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                                compact
                                label="Elegí la imagen de tu firma"
                                @files="(f) => useSignature(f[0])"
                            />
                        </div>
                    </template>
                </div>

                <div v-if="signatureUrl" class="space-y-4">
                    <p class="text-sm font-medium">2. Ubicala</p>
                    <p class="text-sm text-muted-foreground">Tocá la página donde va la firma. Podés arrastrarla para acomodarla.</p>
                    <div>
                        <label for="width" class="flex justify-between text-sm font-medium">
                            Tamaño <span class="text-muted-foreground">{{ Math.round(width * 100) }}%</span>
                        </label>
                        <input
                            id="width"
                            v-model.number="width"
                            type="range"
                            min="0.08"
                            max="0.6"
                            step="0.01"
                            class="mt-2 w-full accent-[hsl(var(--primary))]"
                        />
                    </div>
                    <button
                        v-if="onPage.length && pdf.pages.value > 1"
                        type="button"
                        class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
                        @click="copyToAllPages"
                    >
                        <Copy class="size-4" /> Repetir en todas las páginas
                    </button>
                </div>
            </div>

            <div>
                <div class="mb-3 flex items-center justify-center gap-3">
                    <button
                        type="button"
                        class="rounded-lg p-2 hover:bg-muted disabled:opacity-30"
                        :disabled="current <= 1"
                        aria-label="Página anterior"
                        @click="current--"
                    >
                        <ChevronLeft class="size-5" />
                    </button>
                    <span class="text-sm">Página {{ current }} de {{ pdf.pages.value }}</span>
                    <button
                        type="button"
                        class="rounded-lg p-2 hover:bg-muted disabled:opacity-30"
                        :disabled="current >= pdf.pages.value"
                        aria-label="Página siguiente"
                        @click="current++"
                    >
                        <ChevronRight class="size-5" />
                    </button>
                </div>

                <div
                    ref="pageBox"
                    :class="[
                        'relative mx-auto max-w-xl select-none overflow-hidden rounded-lg border bg-white shadow',
                        signatureUrl ? 'cursor-crosshair' : '',
                    ]"
                    @click="place"
                >
                    <img v-if="pageImage" :src="pageImage" alt="" class="block w-full" draggable="false" />
                    <div v-else class="aspect-[3/4] animate-pulse bg-muted" />

                    <div
                        v-for="p in onPage"
                        :key="p.i"
                        class="group absolute cursor-move touch-none outline-dashed outline-1 outline-primary/60"
                        :style="{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, width: `${p.width * 100}%` }"
                        @pointerdown.stop="startDrag($event, p.i)"
                        @pointermove="drag"
                        @pointerup="endDrag"
                        @click.stop
                    >
                        <img :src="signatureUrl!" alt="" class="pointer-events-none block w-full" draggable="false" />
                        <button
                            type="button"
                            class="absolute -right-3 -top-3 rounded-full bg-destructive p-1 text-destructive-foreground shadow"
                            aria-label="Quitar esta firma"
                            @pointerdown.stop
                            @click.stop="placements.splice(p.i, 1)"
                        >
                            <X class="size-3" />
                        </button>
                    </div>
                </div>
            </div>

            <ActionBar class="lg:col-span-2" label="Firmar PDF" :busy="busy" :disabled="!signature || placements.length === 0" @run="process">
                <template v-if="!signatureUrl">Primero cargá tu firma.</template>
                <template v-else-if="placements.length === 0">Tocá la página para ubicar la firma.</template>
                <template v-else>{{ placements.length }} {{ placements.length === 1 ? 'firma ubicada' : 'firmas ubicadas' }}</template>
            </ActionBar>
        </div>
    </ToolLayout>
</template>
