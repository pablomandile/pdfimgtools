<script setup lang="ts">
import ActionBar from '@/components/ActionBar.vue';
import OptionGroup from '@/components/OptionGroup.vue';
import TextSourceField from '@/components/TextSourceField.vue';
import ToolLayout from '@/components/ToolLayout.vue';
import { useTextSource } from '@/composables/useTextSource';
import { copyText } from '@/lib/clipboard';
import { baseName, downloadBlob } from '@/lib/files';
import { decodeHtmlBytes, htmlToMarkdown } from '@/tools/ops/html';
import type { ToolPageProps } from '@/types';
import { Copy } from 'lucide-vue-next';
import { computed, ref, watch } from 'vue';
import { toast } from 'vue-sonner';

defineProps<ToolPageProps>();

const { file, text, lines, empty, load, reset } = useTextSource(decodeHtmlBytes);
const scope = ref<'main' | 'all'>('main');
const markdown = ref('');

const name = computed(() => (file.value ? baseName(file.value.name) : 'documento'));

// Se convierte en vivo; el contador descarta resultados viejos si se escribe rápido.
let version = 0;
watch(
    [text, scope],
    async () => {
        const current = ++version;
        const result = empty.value ? '' : await htmlToMarkdown(text.value, { mainOnly: scope.value === 'main' });
        if (current === version) markdown.value = result;
    },
    { immediate: true },
);

function download() {
    downloadBlob(new Blob([markdown.value], { type: 'text/markdown;charset=utf-8' }), `${name.value}.md`);
    toast.success('Listo.');
}
</script>

<template>
    <ToolLayout :tool="tool">
        <div class="space-y-6">
            <TextSourceField
                v-model="text"
                :file="file"
                :lines="lines"
                :accept="tool.accept"
                drop-label="Elegí un archivo .html o soltalo acá"
                what="el HTML"
                placeholder="<h1>Título</h1>&#10;<p>Un párrafo con <strong>negrita</strong>.</p>"
                @load="load"
                @remove="reset"
            />

            <OptionGroup
                v-model="scope"
                label="Qué convertir"
                :columns="2"
                :options="[
                    { value: 'main', label: 'Contenido principal', hint: 'Si la página tiene <main> o <article>, deja afuera menús y pies.' },
                    { value: 'all', label: 'Toda la página', hint: 'Todo el <body>.' },
                ]"
            />

            <section v-if="!empty" class="space-y-2">
                <div class="flex items-center justify-between gap-2">
                    <label for="result" class="text-sm font-medium">Markdown</label>
                    <button
                        type="button"
                        class="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-sm transition hover:bg-muted disabled:opacity-50"
                        :disabled="!markdown"
                        @click="copyText(markdown, 'el Markdown')"
                    >
                        <Copy class="size-4" /> Copiar Markdown
                    </button>
                </div>
                <textarea
                    id="result"
                    :value="markdown"
                    readonly
                    rows="14"
                    spellcheck="false"
                    class="w-full rounded-lg border bg-muted/40 p-3 font-mono text-sm outline-none"
                    placeholder="(no hay texto para convertir)"
                />
            </section>

            <p class="text-xs text-muted-foreground">
                Se descartan scripts, estilos, formularios e iframes. Las imágenes quedan como enlaces a su dirección original.
            </p>

            <ActionBar label="Descargar .md" :busy="false" :disabled="!markdown" @run="download">
                <span v-if="empty">Cargá un archivo o pegá HTML</span>
                <template v-else>{{ markdown ? markdown.split('\n').length : 0 }} líneas de Markdown</template>
            </ActionBar>
        </div>
    </ToolLayout>
</template>
