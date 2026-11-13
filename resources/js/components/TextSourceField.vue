<script setup lang="ts">
import FileChip from '@/components/FileChip.vue';
import FileDropzone from '@/components/FileDropzone.vue';

/** Entrada de texto de las herramientas de Markdown/HTML: un archivo o texto pegado, editable. */
defineProps<{
    file: File | null;
    lines: number;
    accept: string;
    /** Texto de la zona para soltar, p. ej. «Elegí un archivo .md o soltalo acá». */
    dropLabel: string;
    /** Qué se pega, p. ej. «el Markdown». */
    what: string;
    placeholder?: string;
}>();

const text = defineModel<string>({ required: true });
defineEmits<{ load: [file: File]; remove: [] }>();
</script>

<template>
    <div class="space-y-4">
        <FileChip v-if="file" :file="file" :detail="`${lines} líneas`" @remove="$emit('remove')" />
        <FileDropzone v-else compact :accept="accept" :label="dropLabel" @files="(f) => $emit('load', f[0])" />

        <div>
            <label for="source-text" class="text-sm font-medium">{{ file ? 'Contenido (podés editarlo)' : `O pegá ${what} acá` }}</label>
            <textarea
                id="source-text"
                v-model="text"
                rows="12"
                spellcheck="false"
                class="mt-1.5 w-full rounded-lg border bg-card p-3 font-mono text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                :placeholder="placeholder"
            />
        </div>
    </div>
</template>
