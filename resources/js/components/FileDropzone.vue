<script setup lang="ts">
import { formatSize, matchesAccept } from '@/lib/files';
import { cn } from '@/lib/utils';
import { Upload } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import { toast } from 'vue-sonner';

const props = withDefaults(
    defineProps<{
        accept: string;
        multiple?: boolean;
        /** Límite por archivo, en MB. */
        maxMb?: number;
        compact?: boolean;
        label?: string;
    }>(),
    { multiple: false, compact: false },
);

const emit = defineEmits<{ files: [files: File[]] }>();

const input = ref<HTMLInputElement>();
const dragging = ref(false);

const kinds = computed(() => {
    const exts = props.accept
        .split(',')
        .filter((a) => a.startsWith('.'))
        .map((a) => a.slice(1).toUpperCase());
    return [...new Set(exts)].join(', ');
});

function handle(list: FileList | null) {
    if (!list?.length) return;

    const files = Array.from(list);
    const valid = files.filter((f) => matchesAccept(f, props.accept));
    const rejected = files.length - valid.length;

    if (rejected) {
        toast.error(rejected === 1 ? 'Ese tipo de archivo no sirve para esta herramienta.' : `${rejected} archivos no son de un tipo válido.`);
    }

    const sized = props.maxMb ? valid.filter((f) => f.size <= props.maxMb! * 1024 * 1024) : valid;
    if (sized.length < valid.length) {
        toast.error(`El límite es ${props.maxMb} MB por archivo.`);
    }

    const result = props.multiple ? sized : sized.slice(0, 1);
    if (result.length) emit('files', result);
}

function onDrop(e: DragEvent) {
    dragging.value = false;
    handle(e.dataTransfer?.files ?? null);
}

function onChange() {
    handle(input.value!.files);
    input.value!.value = '';
}
</script>

<template>
    <div
        :class="
            cn(
                'group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center transition',
                compact ? 'gap-1 px-4 py-5' : 'gap-3 px-6 py-14',
                dragging ? 'border-primary bg-accent' : 'border-input bg-card hover:border-primary/60 hover:bg-accent/50',
            )
        "
        role="button"
        tabindex="0"
        @click="input?.click()"
        @keydown.enter.prevent="input?.click()"
        @keydown.space.prevent="input?.click()"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="onDrop"
    >
        <div v-if="!compact" class="rounded-full bg-primary p-4 text-primary-foreground shadow-lg shadow-primary/25 transition group-hover:scale-105">
            <Upload class="size-7" />
        </div>
        <p :class="compact ? 'text-sm font-medium' : 'text-lg font-semibold'">
            <Upload v-if="compact" class="mr-1 inline size-4" />
            {{ label ?? (multiple ? 'Elegí los archivos o soltalos acá' : 'Elegí el archivo o soltalo acá') }}
        </p>
        <p v-if="!compact" class="text-sm text-muted-foreground">
            {{ kinds }}<template v-if="maxMb"> · hasta {{ formatSize(maxMb * 1024 * 1024) }}</template>
        </p>
        <input ref="input" type="file" class="hidden" :accept="accept" :multiple="multiple" @change="onChange" />
    </div>
</template>
