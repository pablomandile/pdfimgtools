<script setup lang="ts">
import ActionBar from '@/components/ActionBar.vue';
import FileChip from '@/components/FileChip.vue';
import FileDropzone from '@/components/FileDropzone.vue';
import ToolLayout from '@/components/ToolLayout.vue';
import { usePdfFile } from '@/composables/usePdfFile';
import { useProcessing } from '@/composables/useProcessing';
import { baseName, downloadAll } from '@/lib/files';
import { buildFromPages, normalizeAngle } from '@/tools/ops/pdf';
import type { ToolPageProps } from '@/types';
import { ArrowDownUp, Check, LoaderCircle, RotateCcw, RotateCw, Trash2 } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import draggable from 'vuedraggable';

/**
 * Una sola pantalla para las cuatro herramientas de páginas. Lo que cambia es
 * qué hace un clic sobre una página y qué páginas van al resultado.
 */
const props = defineProps<ToolPageProps>();

type Mode = 'extraer-paginas' | 'eliminar-paginas' | 'ordenar-paginas' | 'rotar-pdf';
const mode = props.tool.slug as Mode;

interface Item {
    id: number;
    index: number;
    rotation: number;
    marked: boolean;
}

const pdf = usePdfFile();
const { busy, run } = useProcessing();
const items = ref<Item[]>([]);

const copy = {
    'extraer-paginas': { hint: 'Tocá las páginas que querés conservar.', action: 'Extraer páginas', suffix: '_extracto' },
    'eliminar-paginas': { hint: 'Tocá las páginas que querés eliminar.', action: 'Eliminar páginas', suffix: '_editado' },
    'ordenar-paginas': { hint: 'Arrastrá las páginas para cambiar el orden.', action: 'Guardar orden', suffix: '_ordenado' },
    'rotar-pdf': { hint: 'Tocá una página para girarla, o girá todas juntas.', action: 'Rotar PDF', suffix: '_rotado' },
}[mode];

async function open(files: File[]) {
    if (!(await pdf.load(files[0]))) return;
    items.value = Array.from({ length: pdf.pages.value }, (_, i) => ({ id: i, index: i, rotation: 0, marked: false }));
    pdf.loadThumbs();
}

function reset() {
    pdf.reset();
    items.value = [];
}

function toggle(item: Item) {
    if (mode === 'rotar-pdf') item.rotation = normalizeAngle(item.rotation + 90);
    else if (mode !== 'ordenar-paginas') item.marked = !item.marked;
}

function rotateAll(delta: number) {
    items.value.forEach((i) => (i.rotation = normalizeAngle(i.rotation + delta)));
}

function markAll(marked: boolean) {
    items.value.forEach((i) => (i.marked = marked));
}

const marked = computed(() => items.value.filter((i) => i.marked).length);

const result = computed(() => {
    if (mode === 'extraer-paginas') return items.value.filter((i) => i.marked);
    if (mode === 'eliminar-paginas') return items.value.filter((i) => !i.marked);
    return items.value;
});

const unchanged = computed(() => {
    if (mode === 'rotar-pdf') return items.value.every((i) => i.rotation === 0);
    if (mode === 'ordenar-paginas') return items.value.every((item, pos) => item.index === pos);
    return false;
});

const status = computed(() => {
    const total = pdf.pages.value;
    if (mode === 'extraer-paginas') return marked.value ? `${marked.value} de ${total} páginas elegidas.` : 'Elegí al menos una página.';
    if (mode === 'eliminar-paginas') {
        if (marked.value === total) return 'No podés eliminar todas las páginas.';
        return marked.value ? `Se eliminan ${marked.value}, quedan ${total - marked.value}.` : 'Elegí las páginas a eliminar.';
    }
    if (unchanged.value) return mode === 'rotar-pdf' ? 'Todavía no giraste ninguna página.' : 'Todavía no cambiaste el orden.';
    return `${total} páginas.`;
});

const disabled = computed(() => result.value.length === 0 || unchanged.value || (mode === 'eliminar-paginas' && marked.value === 0));

function process() {
    run(async () => {
        const data = await buildFromPages(
            pdf.bytes.value!,
            result.value.map((i) => ({ index: i.index, rotation: i.rotation })),
        );
        const name = `${baseName(pdf.file.value!.name)}${copy.suffix}.pdf`;
        await downloadAll([{ name, data }], name);
        return 'Listo, ya se descargó.';
    });
}
</script>

<template>
    <ToolLayout :tool="tool">
        <FileDropzone v-if="!pdf.file.value" :accept="tool.accept" @files="open" />

        <template v-else>
            <FileChip :file="pdf.file.value" :detail="`${pdf.pages.value} páginas`" @remove="reset" />

            <div class="my-5 flex flex-wrap items-center justify-between gap-2">
                <p class="text-sm text-muted-foreground">{{ copy.hint }}</p>
                <div class="flex flex-wrap gap-1">
                    <template v-if="mode === 'rotar-pdf'">
                        <button
                            type="button"
                            class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm hover:bg-muted"
                            @click="rotateAll(-90)"
                        >
                            <RotateCcw class="size-4" /> Todas a la izquierda
                        </button>
                        <button
                            type="button"
                            class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm hover:bg-muted"
                            @click="rotateAll(90)"
                        >
                            <RotateCw class="size-4" /> Todas a la derecha
                        </button>
                    </template>
                    <template v-else-if="mode === 'ordenar-paginas'">
                        <button
                            type="button"
                            class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm hover:bg-muted"
                            @click="items.reverse()"
                        >
                            <ArrowDownUp class="size-4" /> Invertir orden
                        </button>
                    </template>
                    <template v-else>
                        <button type="button" class="rounded-lg px-3 py-1.5 text-sm hover:bg-muted" @click="markAll(true)">Marcar todas</button>
                        <button type="button" class="rounded-lg px-3 py-1.5 text-sm hover:bg-muted" @click="markAll(false)">Desmarcar todas</button>
                    </template>
                </div>
            </div>

            <draggable
                v-model="items"
                item-key="id"
                :disabled="mode !== 'ordenar-paginas'"
                class="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
                ghost-class="opacity-40"
            >
                <template #item="{ element }">
                    <button
                        type="button"
                        :class="[
                            'group relative rounded-xl border-2 bg-card p-2 text-left transition',
                            mode === 'ordenar-paginas' ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
                            element.marked && mode === 'extraer-paginas' && 'border-primary bg-accent',
                            element.marked && mode === 'eliminar-paginas' && 'border-destructive bg-destructive/10',
                            !element.marked && 'border-transparent hover:border-border',
                        ]"
                        :aria-pressed="element.marked"
                        @click="toggle(element)"
                    >
                        <div class="grid aspect-[3/4] place-items-center overflow-hidden rounded-md bg-muted">
                            <img
                                v-if="pdf.thumbs[element.index + 1]"
                                :src="pdf.thumbs[element.index + 1]"
                                alt=""
                                class="max-h-full max-w-full object-contain shadow transition-transform duration-300"
                                :class="{ 'opacity-40': element.marked && mode === 'eliminar-paginas' }"
                                :style="{ transform: `rotate(${element.rotation}deg) scale(${element.rotation % 180 ? 0.75 : 1})` }"
                            />
                            <LoaderCircle v-else class="size-5 animate-spin text-muted-foreground" />
                        </div>
                        <span class="mt-1.5 block text-center text-xs text-muted-foreground">{{ element.index + 1 }}</span>

                        <span
                            v-if="element.marked && mode === 'extraer-paginas'"
                            class="absolute right-1 top-1 rounded-full bg-primary p-1 text-primary-foreground"
                        >
                            <Check class="size-3.5" />
                        </span>
                        <span
                            v-if="element.marked && mode === 'eliminar-paginas'"
                            class="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground"
                        >
                            <Trash2 class="size-3.5" />
                        </span>
                        <span
                            v-if="mode === 'rotar-pdf'"
                            class="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-muted-foreground shadow transition group-hover:text-primary"
                        >
                            <RotateCw class="size-3.5" />
                        </span>
                    </button>
                </template>
            </draggable>

            <ActionBar :label="copy.action" :busy="busy" :disabled="disabled" @run="process">{{ status }}</ActionBar>
        </template>
    </ToolLayout>
</template>
