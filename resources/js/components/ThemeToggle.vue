<script setup lang="ts">
import { useAppearance } from '@/composables/useAppearance';
import { Monitor, Moon, Sun } from 'lucide-vue-next';
import { computed } from 'vue';

const { appearance, updateAppearance } = useAppearance();

const order = ['light', 'dark', 'system'] as const;
const labels = { light: 'Tema claro', dark: 'Tema oscuro', system: 'Tema del sistema' };
const icons = { light: Sun, dark: Moon, system: Monitor };

const next = computed(() => order[(order.indexOf(appearance.value) + 1) % order.length]);
</script>

<template>
    <button
        type="button"
        class="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        :title="`${labels[appearance]} (cambiar a ${labels[next].toLowerCase()})`"
        :aria-label="`Cambiar a ${labels[next].toLowerCase()}`"
        @click="updateAppearance(next)"
    >
        <component :is="icons[appearance]" class="size-5" />
    </button>
</template>
