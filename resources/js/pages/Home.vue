<script setup lang="ts">
import Icon from '@/components/Icon.vue';
import SiteLayout from '@/layouts/SiteLayout.vue';
import { categoryStyle } from '@/lib/categories';
import type { SharedData, ToolCategory } from '@/types';
import { Head, Link, usePage } from '@inertiajs/vue3';
import { HardDrive, Search } from 'lucide-vue-next';
import { computed, ref } from 'vue';

const page = usePage<SharedData>();

const query = ref('');
const category = ref<ToolCategory | null>(null);

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const visible = computed(() => {
    const q = normalize(query.value.trim());
    return page.props.tools.filter(
        (t) => (!category.value || t.category === category.value) && (!q || normalize(`${t.name} ${t.description}`).includes(q)),
    );
});

const unavailable = (requires?: string) => !!requires && !page.props.binaries[requires]?.available;
</script>

<template>
    <SiteLayout>
        <Head title="Herramientas PDF" />

        <section class="mx-auto max-w-6xl px-4 pb-6 pt-12 text-center sm:pt-16">
            <h1 class="mx-auto max-w-3xl text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
                Tus PDF, <span class="text-primary">a tu manera</span>.
            </h1>
            <p class="mx-auto mt-4 max-w-2xl text-balance text-muted-foreground sm:text-lg">
                Uní, dividí, convertí, firmá y comprimí documentos sin depender de servicios ajenos. Casi todo corre en tu navegador.
            </p>

            <div class="relative mx-auto mt-8 max-w-md">
                <Search class="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <input
                    v-model="query"
                    type="search"
                    placeholder="Buscar herramienta…"
                    aria-label="Buscar herramienta"
                    class="h-12 w-full rounded-xl border bg-card pl-11 pr-4 text-base shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
                />
            </div>

            <div class="mt-6 flex flex-wrap justify-center gap-2">
                <button
                    type="button"
                    :class="[
                        'rounded-full border px-4 py-1.5 text-sm font-medium transition',
                        !category ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-muted',
                    ]"
                    @click="category = null"
                >
                    Todas
                </button>
                <button
                    v-for="(label, key) in page.props.categories"
                    :key="key"
                    type="button"
                    :class="[
                        'rounded-full border px-4 py-1.5 text-sm font-medium transition',
                        category === key ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-muted',
                    ]"
                    @click="category = category === key ? null : key"
                >
                    {{ label }}
                </button>
            </div>
        </section>

        <section class="mx-auto max-w-6xl px-4 pb-16">
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <Link
                    v-for="tool in visible"
                    :key="tool.slug"
                    :href="route('tools.show', { slug: tool.slug })"
                    class="group flex flex-col rounded-2xl border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
                >
                    <div class="flex items-start justify-between">
                        <div :class="['rounded-xl p-2.5', categoryStyle[tool.category]]">
                            <Icon :name="tool.icon" class="size-6" />
                        </div>
                        <span
                            v-if="tool.mode === 'server'"
                            :title="unavailable(tool.requires) ? 'Falta instalar un programa en el servidor' : 'Se procesa en el servidor local'"
                            :class="[
                                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                                unavailable(tool.requires)
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
                                    : 'bg-muted text-muted-foreground',
                            ]"
                        >
                            <HardDrive class="size-3" />
                            {{ unavailable(tool.requires) ? 'Requiere instalar' : 'Servidor' }}
                        </span>
                    </div>
                    <h2 class="mt-4 font-semibold group-hover:text-primary">{{ tool.name }}</h2>
                    <p class="mt-1 text-sm text-muted-foreground">{{ tool.description }}</p>
                </Link>
            </div>

            <p v-if="visible.length === 0" class="py-12 text-center text-muted-foreground">No hay herramientas que coincidan con «{{ query }}».</p>
        </section>
    </SiteLayout>
</template>
