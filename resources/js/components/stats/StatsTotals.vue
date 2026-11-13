<script setup lang="ts">
import StatTile from '@/components/stats/StatTile.vue';
import { formatSize } from '@/lib/files';
import { formatDuration, formatNumber, formatPercent } from '@/lib/format';
import type { StatsTotals } from '@/types';

/** Fila de indicadores. `users` muestra la tarjeta de usuarios activos (solo en la vista general). */
defineProps<{ totales: StatsTotals; users?: boolean }>();
</script>

<template>
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile
            label="Conversiones"
            :value="formatNumber(totales.conversiones)"
            :hint="`${formatNumber(totales.archivos)} ${totales.archivos === 1 ? 'archivo' : 'archivos'} subidos`"
        />
        <StatTile
            label="Con error"
            :value="formatPercent(totales.conversiones - totales.exitos, totales.conversiones)"
            :hint="`${formatNumber(totales.conversiones - totales.exitos)} de ${formatNumber(totales.conversiones)}`"
        />
        <StatTile label="Procesado" :value="totales.bytes ? formatSize(totales.bytes) : '—'" hint="Tamaño de los archivos de entrada" />
        <StatTile label="Duración promedio" :value="totales.conversiones ? formatDuration(totales.duracionMs) : '—'" />
        <StatTile v-if="users" label="Usuarios activos" :value="formatNumber(totales.usuariosActivos)" hint="Con al menos un uso" />
    </div>
</template>
