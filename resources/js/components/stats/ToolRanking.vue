<script setup lang="ts">
import Icon from '@/components/Icon.vue';
import { formatSize } from '@/lib/files';
import { formatNumber, formatPercent } from '@/lib/format';
import type { SharedData, StatsTool } from '@/types';
import { usePage } from '@inertiajs/vue3';
import { computed } from 'vue';

/** Herramientas ordenadas por uso, con una barra horizontal por fila (una sola serie: sin leyenda). */
const props = defineProps<{ herramientas: StatsTool[] }>();

const page = usePage<SharedData>();
const tools = computed(() => Object.fromEntries(page.props.tools.map((t) => [t.slug, t])));
const max = computed(() => Math.max(1, ...props.herramientas.map((h) => h.total)));
</script>

<template>
    <p v-if="!herramientas.length" class="py-6 text-center text-sm text-muted-foreground">Sin uso en este período.</p>

    <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
            <thead>
                <tr class="border-b text-left text-xs text-muted-foreground">
                    <th class="py-2 pr-3 font-medium">Herramienta</th>
                    <th class="w-1/3 py-2 pr-3 font-medium">Usos</th>
                    <th class="py-2 pr-3 text-right font-medium">Errores</th>
                    <th class="hidden py-2 text-right font-medium sm:table-cell">Procesado</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="h in herramientas" :key="h.tool" class="border-b last:border-0">
                    <td class="py-2.5 pr-3">
                        <span class="inline-flex items-center gap-2">
                            <Icon :name="tools[h.tool]?.icon ?? 'File'" class="size-4 text-muted-foreground" />
                            <span class="whitespace-nowrap">{{ tools[h.tool]?.name ?? h.tool }}</span>
                        </span>
                    </td>
                    <td class="py-2.5 pr-3">
                        <div class="flex items-center gap-2">
                            <div class="h-2.5 min-w-1 rounded-r bg-primary" :style="{ width: `${(h.total / max) * 100}%` }" />
                            <span class="tabular-nums">{{ formatNumber(h.total) }}</span>
                        </div>
                    </td>
                    <td
                        class="whitespace-nowrap py-2.5 pr-3 text-right tabular-nums"
                        :class="h.total - h.ok > 0 ? 'text-destructive' : 'text-muted-foreground'"
                    >
                        <template v-if="h.total - h.ok > 0">
                            {{ formatNumber(h.total - h.ok) }}
                            <span class="hidden sm:inline">({{ formatPercent(h.total - h.ok, h.total) }})</span>
                        </template>
                        <template v-else>—</template>
                    </td>
                    <td class="hidden whitespace-nowrap py-2.5 text-right tabular-nums text-muted-foreground sm:table-cell">
                        {{ h.bytes ? formatSize(h.bytes) : '—' }}
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>
