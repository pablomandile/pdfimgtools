<script setup lang="ts">
import { formatNumber, formatPeriodLabel } from '@/lib/format';
import type { StatsPoint } from '@/types';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

/**
 * Columnas apiladas por día (o por mes): correctas en el color principal y
 * errores en rojo encima. SVG puro, sin librerías. Specs: columna de 24px
 * como máximo, punta redondeada de 4px y base recta, 2px de separación entre
 * segmentos, grilla de 1px y tooltip al pasar el mouse.
 *
 * Se dibuja en píxeles reales (ancho medido con ResizeObserver): con un
 * viewBox fijo el SVG queda con bandas vacías a los costados.
 */
const props = defineProps<{ serie: StatsPoint[] }>();

const container = ref<HTMLElement | null>(null);
const W = ref(800);
const H = 208;
const PAD = { top: 10, right: 8, bottom: 26, left: 36 };
const innerW = computed(() => Math.max(1, W.value - PAD.left - PAD.right));
const innerH = H - PAD.top - PAD.bottom;
const GAP = 2;

let observer: ResizeObserver | null = null;
onMounted(() => {
    if (!container.value) return;
    W.value = container.value.clientWidth || 800;
    observer = new ResizeObserver(([entry]) => (W.value = Math.round(entry.contentRect.width) || W.value));
    observer.observe(container.value);
});
onBeforeUnmount(() => observer?.disconnect());
const RADIUS = 4;

/** Máximo redondeado hacia arriba a un número «limpio» para la escala. */
const max = computed(() => {
    const raw = Math.max(1, ...props.serie.map((p) => p.total));
    if (raw <= 4) return 4;
    // 4 divisiones con un paso «redondo» (1, 2, 5 × 10ⁿ): 15 → 0/5/10/15/20
    const rawStep = raw / 4;
    const magnitude = 10 ** Math.floor(Math.log10(rawStep));
    const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rawStep) ?? magnitude * 10;
    return step * 4;
});

const ticks = computed(() => [0, 1, 2, 3, 4].map((i) => ({ value: (max.value / 4) * i, y: PAD.top + innerH - (innerH / 4) * i })));

/** Rectángulo con las esquinas de arriba redondeadas y la base recta. */
function topRounded(x: number, y: number, w: number, h: number): string {
    const r = Math.min(RADIUS, w / 2, h);
    return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

const bars = computed(() => {
    const n = props.serie.length || 1;
    const slot = innerW.value / n;
    const width = Math.min(24, Math.max(2, slot * 0.7));
    // una etiqueta cada ~56px para que no se pisen
    const labelEvery = Math.max(1, Math.ceil(56 / slot));
    const scale = innerH / max.value;
    const base = PAD.top + innerH;

    return props.serie.map((p, i) => {
        const errors = p.total - p.ok;
        const okH = p.ok * scale;
        const errH = errors * scale;
        const x = PAD.left + slot * i + (slot - width) / 2;
        const okY = base - okH;
        // el segmento de error va arriba, separado 2px del de correctas
        const errBottom = okH > 0 ? okY - GAP : base;
        const errHeight = Math.max(0, errH - (okH > 0 ? GAP : 0));

        return {
            key: p.label,
            point: p,
            errors,
            slotX: PAD.left + slot * i,
            slot,
            cx: PAD.left + slot * i + slot / 2,
            okPath: okH > 0 ? (errH > 0 ? `M${x},${base} V${okY} H${x + width} V${base} Z` : topRounded(x, okY, width, okH)) : null,
            errPath: errHeight > 0 ? topRounded(x, errBottom - errHeight, width, errHeight) : null,
            showLabel: i % labelEvery === 0,
        };
    });
});

const hovered = ref<number | null>(null);
const tip = computed(() => (hovered.value === null ? null : bars.value[hovered.value]));
const empty = computed(() => props.serie.every((p) => p.total === 0));
</script>

<template>
    <div>
        <div class="mb-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span class="inline-flex items-center gap-1.5"><span class="size-2.5 rounded-sm bg-primary" /> Correctas</span>
            <span class="inline-flex items-center gap-1.5"><span class="size-2.5 rounded-sm bg-destructive" /> Con error</span>
        </div>

        <div ref="container" class="relative w-full" @mouseleave="hovered = null">
            <svg :width="W" :height="H" :viewBox="`0 0 ${W} ${H}`" class="block" role="img" aria-label="Conversiones por período">
                <g v-for="t in ticks" :key="t.value">
                    <line :x1="PAD.left" :x2="W - PAD.right" :y1="t.y" :y2="t.y" class="stroke-border" stroke-width="1" />
                    <text :x="PAD.left - 8" :y="t.y + 3.5" text-anchor="end" class="fill-muted-foreground text-[11px] tabular-nums">
                        {{ formatNumber(t.value) }}
                    </text>
                </g>

                <g v-for="(b, i) in bars" :key="b.key">
                    <rect v-if="hovered === i" :x="b.slotX" :y="PAD.top" :width="b.slot" :height="innerH" class="fill-muted" opacity="0.6" />
                    <path v-if="b.okPath" :d="b.okPath" class="fill-primary" />
                    <path v-if="b.errPath" :d="b.errPath" class="fill-destructive" />
                    <text v-if="b.showLabel" :x="b.cx" :y="H - 8" text-anchor="middle" class="fill-muted-foreground text-[11px]">
                        {{ formatPeriodLabel(b.point.label) }}
                    </text>
                    <!-- zona de hover: toda la franja, más grande que la columna -->
                    <rect :x="b.slotX" :y="PAD.top" :width="b.slot" :height="innerH" fill="transparent" @mouseenter="hovered = i" />
                </g>
            </svg>

            <div
                v-if="tip"
                class="pointer-events-none absolute top-0 z-10 w-max min-w-40 -translate-x-1/2 rounded-lg border bg-card px-3 py-2 text-xs shadow-lg"
                :style="{ left: `${Math.min(Math.max(tip.cx, 88), W - 88)}px` }"
            >
                <p class="mb-1 font-medium first-letter:uppercase">{{ formatPeriodLabel(tip.point.label, true) }}</p>
                <p class="flex items-center justify-between gap-4">
                    <span class="inline-flex items-center gap-1.5 text-muted-foreground"
                        ><span class="size-2 rounded-sm bg-primary" /> Correctas</span
                    >
                    <span class="tabular-nums">{{ formatNumber(tip.point.ok) }}</span>
                </p>
                <p class="flex items-center justify-between gap-4">
                    <span class="inline-flex items-center gap-1.5 text-muted-foreground"
                        ><span class="size-2 rounded-sm bg-destructive" /> Con error</span
                    >
                    <span class="tabular-nums">{{ formatNumber(tip.errors) }}</span>
                </p>
            </div>

            <p v-if="empty" class="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">Sin uso en este período.</p>
        </div>
    </div>
</template>
