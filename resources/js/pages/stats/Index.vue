<script setup lang="ts">
import PeriodPicker from '@/components/stats/PeriodPicker.vue';
import StatsTotals from '@/components/stats/StatsTotals.vue';
import ToolRanking from '@/components/stats/ToolRanking.vue';
import UsageChart from '@/components/stats/UsageChart.vue';
import SiteLayout from '@/layouts/SiteLayout.vue';
import { formatSize } from '@/lib/files';
import { formatDateTime, formatNumber } from '@/lib/format';
import type { StatsPoint, StatsTool, StatsUser, StatsTotals as Totals } from '@/types';
import { Head, Link } from '@inertiajs/vue3';
import { Ban, ChevronRight, Search, ShieldCheck, UserRound } from 'lucide-vue-next';
import { computed, ref } from 'vue';

const props = defineProps<{
    dias: number | null;
    totales: Totals;
    serie: StatsPoint[];
    herramientas: StatsTool[];
    usuarios: StatsUser[];
}>();

const search = ref('');
const filtered = computed(() => {
    const q = search.value.trim().toLowerCase();
    return q ? props.usuarios.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) : props.usuarios;
});

const periodText = computed(() => (props.dias ? `últimos ${props.dias} días` : 'desde el principio'));
</script>

<template>
    <SiteLayout>
        <Head title="Estadísticas" />

        <div class="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:py-12">
            <div class="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">Estadísticas</h1>
                    <p class="mt-1 text-muted-foreground">Uso de las herramientas, {{ periodText }}.</p>
                </div>
                <PeriodPicker :dias="dias" :url="route('stats.index')" />
            </div>

            <StatsTotals :totales="totales" users />

            <section class="rounded-xl border bg-card p-4 sm:p-5">
                <h2 class="mb-3 font-medium">Conversiones por {{ dias ? 'día' : 'mes' }}</h2>
                <UsageChart :serie="serie" />
            </section>

            <section class="rounded-xl border bg-card p-4 sm:p-5">
                <h2 class="mb-3 font-medium">Herramientas más usadas</h2>
                <ToolRanking :herramientas="herramientas" />
            </section>

            <section class="rounded-xl border bg-card p-4 sm:p-5">
                <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <h2 class="font-medium">
                        Usuarios <span class="text-sm font-normal text-muted-foreground">({{ usuarios.length }})</span>
                    </h2>
                    <label class="relative block w-full sm:w-64">
                        <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            v-model="search"
                            type="search"
                            placeholder="Buscar por nombre o email"
                            aria-label="Buscar usuario"
                            class="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                        />
                    </label>
                </div>

                <p v-if="!filtered.length" class="py-6 text-center text-sm text-muted-foreground">No hay usuarios que coincidan.</p>

                <ul v-else class="divide-y">
                    <li v-for="u in filtered" :key="u.id">
                        <Link
                            :href="route('stats.user', { user: u.id, dias: dias ?? 'todo' })"
                            class="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition hover:bg-muted"
                        >
                            <img v-if="u.avatar" :src="u.avatar" alt="" referrerpolicy="no-referrer" class="size-9 shrink-0 rounded-full border" />
                            <span v-else class="flex size-9 shrink-0 items-center justify-center rounded-full border bg-muted">
                                <UserRound class="size-4" />
                            </span>

                            <div class="min-w-0 flex-1">
                                <p class="flex items-center gap-1.5 truncate font-medium">
                                    {{ u.name }}
                                    <ShieldCheck v-if="u.admin" class="size-4 shrink-0 text-primary" aria-label="Administrador" />
                                    <span
                                        v-if="u.blocked"
                                        class="inline-flex shrink-0 items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-normal text-destructive"
                                    >
                                        <Ban class="size-3" /> Bloqueado
                                    </span>
                                </p>
                                <p class="truncate text-xs text-muted-foreground">{{ u.email }}</p>
                            </div>

                            <div class="hidden text-right text-xs text-muted-foreground sm:block">
                                <p>Último uso</p>
                                <p class="text-foreground">{{ formatDateTime(u.ultimoUso) }}</p>
                            </div>
                            <div class="w-24 text-right">
                                <p class="font-medium tabular-nums">{{ formatNumber(u.conversiones) }}</p>
                                <p class="text-xs text-muted-foreground">
                                    <template v-if="u.conversiones">
                                        {{ u.bytes ? formatSize(u.bytes) : '' }}
                                        <span v-if="u.conversiones - u.exitos" class="text-destructive"> · {{ u.conversiones - u.exitos }} err.</span>
                                    </template>
                                    <template v-else>sin uso</template>
                                </p>
                            </div>
                            <ChevronRight class="size-4 shrink-0 text-muted-foreground" />
                        </Link>
                    </li>
                </ul>
            </section>
        </div>
    </SiteLayout>
</template>
