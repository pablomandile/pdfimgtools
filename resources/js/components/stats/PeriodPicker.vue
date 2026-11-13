<script setup lang="ts">
import { router } from '@inertiajs/vue3';
import { computed } from 'vue';

/** Período de las estadísticas: cambia ?dias= y recarga los datos de la página. */
const props = defineProps<{ dias: number | null; url: string }>();

const options = [
    { value: 7, label: '7 días' },
    { value: 30, label: '30 días' },
    { value: 90, label: '90 días' },
    { value: 0, label: 'Todo' },
];

const current = computed(() => props.dias ?? 0);

function pick(value: number) {
    router.get(props.url, { dias: value || 'todo' }, { preserveState: true, preserveScroll: true, replace: true });
}
</script>

<template>
    <div class="inline-flex rounded-lg border bg-card p-0.5 text-sm" role="group" aria-label="Período">
        <button
            v-for="option in options"
            :key="option.value"
            type="button"
            :aria-pressed="current === option.value"
            :class="['rounded-md px-3 py-1.5 transition', current === option.value ? 'bg-primary text-primary-foreground' : 'hover:bg-muted']"
            @click="pick(option.value)"
        >
            {{ option.label }}
        </button>
    </div>
</template>
