<script setup lang="ts">
import ActionBar from '@/components/ActionBar.vue';
import FileChip from '@/components/FileChip.vue';
import FileDropzone from '@/components/FileDropzone.vue';
import OptionGroup from '@/components/OptionGroup.vue';
import ToolLayout from '@/components/ToolLayout.vue';
import { useProcessing } from '@/composables/useProcessing';
import { downloadBlob, formatSize } from '@/lib/files';
import type { SharedData, ToolPageProps } from '@/types';
import { usePage } from '@inertiajs/vue3';
import { Eye, EyeOff } from 'lucide-vue-next';
import { computed, reactive, ref, shallowRef } from 'vue';

/** Herramientas que corren en el servidor: comprimir, proteger, desbloquear y las conversiones de Office. */
const props = defineProps<ToolPageProps>();

const page = usePage<SharedData>();
const { busy, progress, run } = useProcessing();

const file = shallowRef<File | null>(null);
const options = reactive({ level: 'media', password: '', password_confirmation: '', owner_password: '' });
const showPassword = ref(false);

const available = computed(() => !props.tool.requires || page.props.binaries[props.tool.requires]?.available);

const actionLabel: Record<string, string> = {
    'comprimir-pdf': 'Comprimir PDF',
    'proteger-pdf': 'Proteger PDF',
    'desbloquear-pdf': 'Desbloquear PDF',
    'office-a-pdf': 'Convertir a PDF',
    'pdf-a-word': 'Convertir a Word',
};

const problem = computed(() => {
    if (!available.value) return 'Falta instalar el programa necesario (ver arriba).';
    if (props.tool.slug === 'proteger-pdf') {
        if (options.password.length < 4) return 'La contraseña tiene que tener al menos 4 caracteres.';
        if (options.password !== options.password_confirmation) return 'Las contraseñas no coinciden.';
    }
    return null;
});

function xsrfToken(): string {
    const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

function fileNameFrom(response: Response, fallback: string): string {
    const header = response.headers.get('Content-Disposition') ?? '';
    const utf8 = header.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8) return decodeURIComponent(utf8[1]);
    const plain = header.match(/filename="?([^";]+)"?/i);
    return plain ? plain[1] : fallback;
}

function process() {
    run(async () => {
        const body = new FormData();
        body.append('file', file.value!);
        if (props.tool.slug === 'comprimir-pdf') body.append('level', options.level);
        if (props.tool.slug === 'proteger-pdf') {
            body.append('password', options.password);
            if (options.owner_password) body.append('owner_password', options.owner_password);
        }
        if (props.tool.slug === 'desbloquear-pdf') body.append('password', options.password);

        progress.value = props.tool.slug.includes('office') || props.tool.slug.includes('word') ? 'Convirtiendo… (puede tardar)' : 'Procesando…';

        const response = await fetch(route('tools.process', { slug: props.tool.slug }), {
            method: 'POST',
            body,
            headers: { Accept: 'application/json', 'X-XSRF-TOKEN': xsrfToken() },
            credentials: 'same-origin',
        });

        if (!response.ok) {
            const error = await response.json().catch(() => null);
            const first = error?.errors ? Object.values(error.errors as Record<string, string[]>)[0]?.[0] : null;
            throw new Error(first ?? error?.message ?? `El servidor respondió con un error (${response.status}).`);
        }

        const blob = await response.blob();
        downloadBlob(blob, fileNameFrom(response, file.value!.name));

        if (props.tool.slug === 'comprimir-pdf') {
            const original = Number(response.headers.get('X-Original-Size')) || file.value!.size;
            const saved = Math.round((1 - blob.size / original) * 100);
            return saved > 0
                ? `Listo: ${formatSize(original)} → ${formatSize(blob.size)} (${saved}% menos).`
                : 'Este PDF ya estaba bien optimizado: te devolvemos el original.';
        }

        return 'Listo, ya se descargó.';
    });
}
</script>

<template>
    <ToolLayout :tool="tool">
        <FileDropzone v-if="!file" :accept="tool.accept" :max-mb="page.props.maxUploadMb" @files="(f) => (file = f[0])" />

        <div v-else class="max-w-2xl space-y-6">
            <FileChip :file="file" @remove="file = null" />

            <OptionGroup
                v-if="tool.slug === 'comprimir-pdf'"
                v-model="options.level"
                label="Nivel de compresión"
                :options="[
                    { value: 'baja', label: 'Poca', hint: 'Casi sin pérdida. Apta para imprimir.' },
                    { value: 'media', label: 'Recomendada', hint: 'Buen equilibrio entre calidad y tamaño.' },
                    { value: 'alta', label: 'Máxima', hint: 'Lo más chico posible. Las imágenes pierden calidad.' },
                ]"
            />

            <template v-if="tool.slug === 'proteger-pdf' || tool.slug === 'desbloquear-pdf'">
                <div>
                    <label for="password" class="text-sm font-medium">
                        {{ tool.slug === 'proteger-pdf' ? 'Contraseña para abrir el PDF' : 'Contraseña actual del PDF' }}
                    </label>
                    <div class="relative mt-1.5">
                        <input
                            id="password"
                            v-model="options.password"
                            :type="showPassword ? 'text' : 'password'"
                            autocomplete="new-password"
                            class="h-11 w-full rounded-lg border bg-card px-3 pr-11 outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                        />
                        <button
                            type="button"
                            class="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:text-foreground"
                            :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                            @click="showPassword = !showPassword"
                        >
                            <component :is="showPassword ? EyeOff : Eye" class="size-4" />
                        </button>
                    </div>
                    <p v-if="tool.slug === 'desbloquear-pdf'" class="mt-1.5 text-xs text-muted-foreground">
                        Si el PDF se abre sin contraseña pero no deja imprimir o copiar, dejala vacía.
                    </p>
                </div>

                <template v-if="tool.slug === 'proteger-pdf'">
                    <div>
                        <label for="password2" class="text-sm font-medium">Repetí la contraseña</label>
                        <input
                            id="password2"
                            v-model="options.password_confirmation"
                            :type="showPassword ? 'text' : 'password'"
                            autocomplete="new-password"
                            class="mt-1.5 h-11 w-full rounded-lg border bg-card px-3 outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                        />
                    </div>
                    <details class="rounded-lg border bg-card p-3 text-sm">
                        <summary class="cursor-pointer font-medium">Opciones avanzadas</summary>
                        <label for="owner" class="mt-3 block">Contraseña de propietario (opcional)</label>
                        <input
                            id="owner"
                            v-model="options.owner_password"
                            :type="showPassword ? 'text' : 'password'"
                            autocomplete="new-password"
                            class="mt-1.5 h-11 w-full rounded-lg border bg-background px-3 outline-none focus:border-primary"
                        />
                        <p class="mt-1.5 text-xs text-muted-foreground">
                            Permite cambiar los permisos del PDF. Si la dejás vacía, se usa la misma de arriba.
                        </p>
                    </details>
                    <p class="text-xs text-muted-foreground">Guardala bien: si la perdés, no hay forma de recuperar el contenido.</p>
                </template>
            </template>

            <p v-if="tool.slug === 'pdf-a-word'" class="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                La conversión funciona bien con PDF de texto. Si el PDF es un escaneo o tiene un diseño muy armado, el .docx puede quedar desprolijo.
            </p>

            <ActionBar :label="actionLabel[tool.slug] ?? 'Procesar'" :busy="busy" :progress="progress" :disabled="!!problem" @run="process">
                <span v-if="problem" :class="available ? '' : 'text-destructive'">{{ problem }}</span>
            </ActionBar>
        </div>
    </ToolLayout>
</template>
