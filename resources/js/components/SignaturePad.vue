<script setup lang="ts">
import { Eraser } from 'lucide-vue-next';
import { onMounted, ref } from 'vue';

/** Lienzo para dibujar la firma con el mouse, el dedo o un lápiz. Emite un PNG recortado y con fondo transparente. */
const emit = defineEmits<{ done: [png: Blob] }>();

const color = ref('#1e1b4b');
const canvas = ref<HTMLCanvasElement>();
const empty = ref(true);
let ctx: CanvasRenderingContext2D;
let last: { x: number; y: number } | null = null;

onMounted(() => {
    const c = canvas.value!;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    c.width = c.clientWidth * ratio;
    c.height = c.clientHeight * ratio;
    ctx = c.getContext('2d')!;
    ctx.scale(ratio, ratio);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
});

function point(e: PointerEvent) {
    const rect = canvas.value!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function down(e: PointerEvent) {
    canvas.value!.setPointerCapture(e.pointerId);
    last = point(e);
}

function move(e: PointerEvent) {
    if (!last) return;
    const p = point(e);
    ctx.strokeStyle = color.value;
    // Con lápiz, el trazo sigue la presión; con mouse o dedo, grosor fijo.
    ctx.lineWidth = e.pointerType === 'pen' ? 1 + e.pressure * 3.5 : 2.5;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last = p;
    empty.value = false;
}

function up() {
    last = null;
}

function clear() {
    const c = canvas.value!;
    ctx.clearRect(0, 0, c.width, c.height);
    empty.value = true;
}

/** Recorta el lienzo al área dibujada, para que la firma no arrastre espacio vacío. */
function finish() {
    const c = canvas.value!;
    const { data, width, height } = c.getContext('2d')!.getImageData(0, 0, c.width, c.height);
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (data[(y * width + x) * 4 + 3] > 0) {
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
            }
        }
    }
    if (maxX < 0) return;

    const pad = 6;
    const out = document.createElement('canvas');
    out.width = maxX - minX + pad * 2;
    out.height = maxY - minY + pad * 2;
    out.getContext('2d')!.drawImage(c, minX - pad, minY - pad, out.width, out.height, 0, 0, out.width, out.height);
    out.toBlob((blob) => blob && emit('done', blob), 'image/png');
}
</script>

<template>
    <div>
        <canvas
            ref="canvas"
            class="h-48 w-full touch-none rounded-xl border-2 border-dashed bg-white"
            @pointerdown="down"
            @pointermove="move"
            @pointerup="up"
            @pointercancel="up"
        />
        <div class="mt-3 flex flex-wrap items-center gap-2">
            <span class="text-sm">Color:</span>
            <button
                v-for="c in ['#1e1b4b', '#000000', '#1d4ed8']"
                :key="c"
                type="button"
                :aria-label="`Tinta ${c}`"
                :class="['size-7 rounded-full border-2', color === c ? 'border-primary' : 'border-transparent']"
                :style="{ backgroundColor: c }"
                @click="color = c"
            />
            <button type="button" class="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm hover:bg-muted" @click="clear">
                <Eraser class="size-4" /> Borrar
            </button>
            <button
                type="button"
                class="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                :disabled="empty"
                @click="finish"
            >
                Usar esta firma
            </button>
        </div>
    </div>
</template>
