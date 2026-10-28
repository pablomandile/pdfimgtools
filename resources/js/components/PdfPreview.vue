<script setup lang="ts">
import { openPdf, renderPage } from '@/lib/pdfjs';
import { LoaderCircle } from 'lucide-vue-next';
import { ref, watch } from 'vue';

/** Muestra una página de un PDF en bytes. Se usa para previsualizar el resultado antes de descargar. */
const props = withDefaults(defineProps<{ bytes: Uint8Array | null; page?: number; width?: number }>(), { page: 1, width: 420 });

const holder = ref<HTMLDivElement>();
const rendering = ref(false);
let token = 0;

watch(
    () => [props.bytes, props.page] as const,
    async ([bytes, page]) => {
        const mine = ++token;
        if (!bytes || !holder.value) return;

        rendering.value = true;
        try {
            const doc = await openPdf(bytes);
            const canvas = await renderPage(doc, Math.min(page, doc.numPages), { width: props.width * Math.min(window.devicePixelRatio || 1, 2) });
            await doc.destroy();

            if (mine !== token) return; // llegó una versión más nueva mientras dibujaba
            canvas.className = 'h-auto w-full';
            holder.value.replaceChildren(canvas);
        } catch {
            // La vista previa es accesoria: si falla, el error real aparece al procesar.
        } finally {
            if (mine === token) rendering.value = false;
        }
    },
    { immediate: true, flush: 'post' },
);
</script>

<template>
    <div class="relative overflow-hidden rounded-lg border bg-white shadow-sm" :style="{ maxWidth: `${width}px` }">
        <div ref="holder" class="min-h-40" />
        <div v-if="rendering" class="absolute inset-0 grid place-items-center bg-background/40">
            <LoaderCircle class="size-6 animate-spin text-primary" />
        </div>
    </div>
</template>
