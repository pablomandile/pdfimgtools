<script setup lang="ts">
import AppLogo from '@/components/AppLogo.vue';
import type { SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/vue3';
import { CircleCheck, TriangleAlert } from 'lucide-vue-next';
import { computed } from 'vue';
import { Toaster } from 'vue-sonner';
import 'vue-sonner/style.css';

/** Pantallas de cuenta (login, registro, contraseña, confirmar email): una tarjeta centrada. */
const props = defineProps<{ title: string; subtitle?: string; status?: string | null }>();

const page = usePage<SharedData>();
const error = computed(() => page.props.flash?.error);
const success = computed(() => props.status || page.props.flash?.success);
</script>

<template>
    <Head :title="title" />

    <div class="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
        <div class="w-full max-w-sm space-y-6">
            <div class="flex flex-col items-center gap-3 text-center">
                <Link :href="route('login')" aria-label="PDFImgTools"><AppLogo /></Link>
                <div>
                    <h1 class="text-xl font-semibold tracking-tight">{{ title }}</h1>
                    <p v-if="subtitle" class="mt-1 text-sm text-muted-foreground">{{ subtitle }}</p>
                </div>
            </div>

            <div
                v-if="error"
                class="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                role="alert"
            >
                <TriangleAlert class="mt-0.5 size-4 shrink-0" />
                <span>{{ error }}</span>
            </div>
            <div v-if="success" class="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm" role="status">
                <CircleCheck class="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{{ success }}</span>
            </div>

            <slot />
        </div>

        <Toaster position="top-center" rich-colors close-button />
    </div>
</template>
