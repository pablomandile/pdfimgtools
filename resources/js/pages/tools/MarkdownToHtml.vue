<script setup lang="ts">
import ActionBar from '@/components/ActionBar.vue';
import OptionGroup from '@/components/OptionGroup.vue';
import TextSourceField from '@/components/TextSourceField.vue';
import ToolLayout from '@/components/ToolLayout.vue';
import { useTextSource } from '@/composables/useTextSource';
import { copyText } from '@/lib/clipboard';
import { baseName, downloadBlob } from '@/lib/files';
import { markdownToHtml } from '@/tools/ops/html';
import type { ToolPageProps } from '@/types';
import { Copy } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import { toast } from 'vue-sonner';

defineProps<ToolPageProps>();

const { file, text, lines, empty, load, reset } = useTextSource();
const format = ref<'page' | 'fragment'>('page');
const view = ref<'preview' | 'code'>('preview');

const name = computed(() => (file.value ? baseName(file.value.name) : 'documento'));
const html = computed(() => (empty.value ? '' : markdownToHtml(text.value, { standalone: format.value === 'page', title: name.value })));
// La vista previa siempre con estilos, aunque se descargue solo el fragmento.
const preview = computed(() => (empty.value ? '' : markdownToHtml(text.value, { standalone: true, title: name.value })));

function download() {
    downloadBlob(new Blob([html.value], { type: 'text/html;charset=utf-8' }), `${name.value}.html`);
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
                drop-label="Elegí un archivo .md o soltalo acá"
                what="el Markdown"
                placeholder="# Título&#10;&#10;Un párrafo con **negrita** y una lista:&#10;&#10;- uno&#10;- dos"
                @load="load"
                @remove="reset"
            />

            <OptionGroup
                v-model="format"
                label="Formato"
                :columns="2"
                :options="[
                    { value: 'page', label: 'Página completa', hint: 'Un .html que se abre solo, con estilos y modo oscuro.' },
                    { value: 'fragment', label: 'Solo el contenido', hint: 'El HTML sin estilos, para pegar en una web, un CMS o un mail.' },
                ]"
            />

            <section v-if="!empty" class="space-y-2">
                <div class="flex items-center justify-between gap-2">
                    <div class="inline-flex rounded-lg border bg-card p-0.5 text-sm" role="tablist">
                        <button
                            v-for="tab in [
                                { value: 'preview', label: 'Vista previa' },
                                { value: 'code', label: 'Código' },
                            ] as const"
                            :key="tab.value"
                            type="button"
                            role="tab"
                            :aria-selected="view === tab.value"
                            :class="[
                                'rounded-md px-3 py-1.5 transition',
                                view === tab.value ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                            ]"
                            @click="view = tab.value"
                        >
                            {{ tab.label }}
                        </button>
                    </div>
                    <button
                        type="button"
                        class="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-sm transition hover:bg-muted"
                        @click="copyText(html, 'el HTML')"
                    >
                        <Copy class="size-4" /> Copiar HTML
                    </button>
                </div>

                <!-- sandbox sin allow-scripts: el HTML que venga dentro del Markdown no se ejecuta -->
                <iframe
                    v-if="view === 'preview'"
                    sandbox=""
                    :srcdoc="preview"
                    title="Vista previa del HTML"
                    class="h-96 w-full resize-y rounded-lg border bg-white"
                />
                <pre v-else class="h-96 overflow-auto rounded-lg border bg-card p-3 text-xs"><code>{{ html }}</code></pre>
            </section>

            <ActionBar label="Descargar .html" :busy="false" :disabled="empty" @run="download">
                <span v-if="empty">Cargá un archivo o pegá texto</span>
                <template v-else>{{ lines }} {{ lines === 1 ? 'línea' : 'líneas' }} de Markdown</template>
            </ActionBar>
        </div>
    </ToolLayout>
</template>
