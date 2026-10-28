<script setup lang="ts">
import Icon from '@/components/Icon.vue';
import SiteLayout from '@/layouts/SiteLayout.vue';
import { categoryStyle } from '@/lib/categories';
import type { SharedData, Tool } from '@/types';
import { Head, Link, usePage } from '@inertiajs/vue3';
import { ArrowLeft, HardDrive, Laptop, TriangleAlert } from 'lucide-vue-next';
import { computed } from 'vue';

const props = defineProps<{ tool: Tool }>();

const page = usePage<SharedData>();
const missing = computed(() => (props.tool.requires ? page.props.binaries[props.tool.requires] : null));
</script>

<template>
    <SiteLayout>
        <Head :title="tool.name" />

        <div class="mx-auto max-w-5xl px-4 py-8 sm:py-12">
            <Link :href="route('home')" class="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground">
                <ArrowLeft class="size-4" /> Herramientas
            </Link>

            <div class="mb-8 flex items-start gap-4">
                <div :class="['shrink-0 rounded-2xl p-3', categoryStyle[tool.category]]">
                    <Icon :name="tool.icon" class="size-7" />
                </div>
                <div class="min-w-0">
                    <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">{{ tool.name }}</h1>
                    <p class="mt-1 text-muted-foreground">{{ tool.description }}</p>
                    <p class="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <template v-if="tool.mode === 'client'">
                            <Laptop class="size-3.5" /> Se procesa en tu navegador: el archivo no sale de tu compu.
                        </template>
                        <template v-else> <HardDrive class="size-3.5" /> Se procesa en tu servidor local y se borra al terminar. </template>
                    </p>
                </div>
            </div>

            <div
                v-if="missing && !missing.available"
                class="mb-6 flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
            >
                <TriangleAlert class="mt-0.5 size-5 shrink-0" />
                <div>
                    <p class="font-medium">Falta instalar {{ missing.label }} para usar esta herramienta.</p>
                    <p class="mt-1">
                        Abrí una terminal, corré
                        <code class="rounded bg-amber-100 px-1.5 py-0.5 font-mono dark:bg-amber-500/20">{{ missing.install }}</code>
                        y recargá esta página.
                    </p>
                </div>
            </div>

            <slot />
        </div>
    </SiteLayout>
</template>
