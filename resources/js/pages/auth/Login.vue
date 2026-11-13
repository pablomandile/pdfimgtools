<script setup lang="ts">
import AppLogo from '@/components/AppLogo.vue';
import type { SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/vue3';
import { TriangleAlert } from 'lucide-vue-next';
import { computed } from 'vue';

defineProps<{ googleConfigured: boolean }>();

const page = usePage<SharedData>();
const error = computed(() => page.props.flash?.error);
</script>

<template>
    <Head title="Iniciar sesión" />

    <div class="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div class="w-full max-w-sm space-y-6">
            <div class="flex flex-col items-center gap-3 text-center">
                <AppLogo />
                <p class="text-sm text-muted-foreground">
                    Herramientas para PDF e imágenes. Iniciá sesión para usarlas: así cada cuenta tiene su historial de uso.
                </p>
            </div>

            <div
                v-if="error"
                class="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                role="alert"
            >
                <TriangleAlert class="mt-0.5 size-4 shrink-0" />
                <span>{{ error }}</span>
            </div>

            <a
                v-if="googleConfigured"
                :href="route('google.redirect')"
                class="flex h-12 w-full items-center justify-center gap-3 rounded-xl border bg-card font-medium transition hover:bg-muted"
            >
                <svg class="size-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                        fill="#4285F4"
                        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81z"
                    />
                    <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.11A12 12 0 0 0 12 24z"
                    />
                    <path fill="#FBBC05" d="M5.28 14.28a7.21 7.21 0 0 1 0-4.56V6.61H1.27a12 12 0 0 0 0 10.78l4.01-3.11z" />
                    <path
                        fill="#EA4335"
                        d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.61l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77z"
                    />
                </svg>
                Continuar con Google
            </a>

            <div v-else class="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
                El inicio de sesión con Google todavía no está configurado. Hay que completar <code class="text-xs">GOOGLE_CLIENT_ID</code> y
                <code class="text-xs">GOOGLE_CLIENT_SECRET</code> en el <code class="text-xs">.env</code>.
            </div>

            <p class="text-center text-xs text-muted-foreground">
                Las herramientas marcadas «en tu navegador» procesan los archivos en tu compu: no se suben a ningún lado.
            </p>
        </div>
    </div>
</template>
