<script setup lang="ts">
defineProps<{ label: string; value: string; hint?: string }>();
</script>

<template>
    <div class="rounded-xl border bg-card p-4">
        <p class="text-xs font-medium text-muted-foreground">{{ label }}</p>
        <p class="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{{ value }}</p>
        <p v-if="hint" class="mt-0.5 text-xs text-muted-foreground">{{ hint }}</p>
    </div>
</template>
