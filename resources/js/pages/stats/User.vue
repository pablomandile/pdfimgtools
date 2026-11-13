<script setup lang="ts">
import PeriodPicker from '@/components/stats/PeriodPicker.vue';
import StatsTotals from '@/components/stats/StatsTotals.vue';
import ToolRanking from '@/components/stats/ToolRanking.vue';
import UsageChart from '@/components/stats/UsageChart.vue';
import SiteLayout from '@/layouts/SiteLayout.vue';
import { formatDateTime } from '@/lib/format';
import type { SharedData, StatsPoint, StatsTool, StatsTotals as Totals } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/vue3';
import { ArrowLeft, Ban, ShieldCheck, TriangleAlert, UserRound } from 'lucide-vue-next';
import { computed } from 'vue';

const props = defineProps<{
    dias: number | null;
    usuario: {
        id: number;
        name: string;
        email: string;
        avatar: string | null;
        admin: boolean;
        blocked: boolean;
        registrado: string | null;
        ultimoLogin: string | null;
    };
    totales: Totals;
    serie: StatsPoint[];
    herramientas: StatsTool[];
    errores: { tool: string; error: string | null; fecha: string }[];
}>();

const page = usePage<SharedData>();
const toolName = (slug: string) => page.props.tools.find((t) => t.slug === slug)?.name ?? slug;
const periodText = computed(() => (props.dias ? `últimos ${props.dias} días` : 'desde el principio'));

function toggleBlock() {
    const u = props.usuario;
    if (!u.blocked && !confirm(`¿Bloquear a ${u.name}? Se le cierra la sesión y no va a poder volver a entrar hasta que lo desbloquees.`)) return;
    router.post(route(u.blocked ? 'stats.unblock' : 'stats.block', { user: u.id }), {}, { preserveScroll: true });
}
</script>

<template>
    <SiteLayout>
        <Head :title="`${usuario.name} · Estadísticas`" />

        <div class="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:py-12">
            <Link
                :href="route('stats.index', { dias: dias ?? 'todo' })"
                class="inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
            >
                <ArrowLeft class="size-4" /> Estadísticas
            </Link>

            <div class="flex flex-wrap items-start justify-between gap-4">
                <div class="flex min-w-0 items-center gap-4">
                    <img
                        v-if="usuario.avatar"
                        :src="usuario.avatar"
                        alt=""
                        referrerpolicy="no-referrer"
                        class="size-14 shrink-0 rounded-full border"
                    />
                    <span v-else class="flex size-14 shrink-0 items-center justify-center rounded-full border bg-muted">
                        <UserRound class="size-6" />
                    </span>
                    <div class="min-w-0">
                        <h1 class="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
                            <span class="truncate">{{ usuario.name }}</span>
                            <span
                                v-if="usuario.admin"
                                class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                            >
                                <ShieldCheck class="size-3.5" /> Admin
                            </span>
                            <span
                                v-if="usuario.blocked"
                                class="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"
                            >
                                <Ban class="size-3.5" /> Bloqueado
                            </span>
                        </h1>
                        <p class="truncate text-muted-foreground">{{ usuario.email }}</p>
                        <p class="mt-1 text-xs text-muted-foreground">
                            Se registró el {{ formatDateTime(usuario.registrado) }} · último ingreso {{ formatDateTime(usuario.ultimoLogin) }}
                        </p>
                    </div>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                    <PeriodPicker :dias="dias" :url="route('stats.user', { user: usuario.id })" />
                    <button
                        v-if="!usuario.admin"
                        type="button"
                        :class="[
                            'inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition',
                            usuario.blocked ? 'bg-card hover:bg-muted' : 'border-destructive/40 text-destructive hover:bg-destructive/10',
                        ]"
                        @click="toggleBlock"
                    >
                        <Ban class="size-4" /> {{ usuario.blocked ? 'Desbloquear' : 'Bloquear' }}
                    </button>
                </div>
            </div>

            <p class="text-sm text-muted-foreground">Uso {{ periodText }}.</p>

            <StatsTotals :totales="totales" />

            <section class="rounded-xl border bg-card p-4 sm:p-5">
                <h2 class="mb-3 font-medium">Conversiones por {{ dias ? 'día' : 'mes' }}</h2>
                <UsageChart :serie="serie" />
            </section>

            <div class="grid gap-8 lg:grid-cols-2">
                <section class="rounded-xl border bg-card p-4 sm:p-5">
                    <h2 class="mb-3 font-medium">Herramientas que usó</h2>
                    <ToolRanking :herramientas="herramientas" />
                </section>

                <section class="rounded-xl border bg-card p-4 sm:p-5">
                    <h2 class="mb-3 font-medium">Últimos errores</h2>
                    <p v-if="!errores.length" class="py-6 text-center text-sm text-muted-foreground">Ningún error en este período.</p>
                    <ul v-else class="divide-y text-sm">
                        <li v-for="(e, i) in errores" :key="i" class="flex gap-3 py-2.5">
                            <TriangleAlert class="mt-0.5 size-4 shrink-0 text-destructive" aria-label="Error" />
                            <div class="min-w-0">
                                <p class="font-medium">
                                    {{ toolName(e.tool) }}
                                    <span class="font-normal text-muted-foreground">· {{ formatDateTime(e.fecha) }}</span>
                                </p>
                                <p class="break-words text-muted-foreground">{{ e.error || 'Sin detalle' }}</p>
                            </div>
                        </li>
                    </ul>
                </section>
            </div>
        </div>
    </SiteLayout>
</template>
