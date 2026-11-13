<script setup lang="ts">
import { LoaderCircle } from 'lucide-vue-next';

defineProps<{ busy?: boolean }>();
</script>

<template>
    <button
        type="submit"
        :disabled="busy"
        class="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
    >
        <LoaderCircle v-if="busy" class="size-4 animate-spin" />
        <slot />
    </button>
</template>
