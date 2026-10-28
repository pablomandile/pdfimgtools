<script setup lang="ts">
import { formatSize } from '@/lib/files';
import { FileText, X } from 'lucide-vue-next';

defineProps<{ file: File; detail?: string }>();
defineEmits<{ remove: [] }>();
</script>

<template>
    <div class="flex items-center gap-3 rounded-xl border bg-card p-3">
        <FileText class="size-8 shrink-0 text-primary" />
        <div class="min-w-0 flex-1">
            <p class="truncate font-medium">{{ file.name }}</p>
            <p class="text-xs text-muted-foreground">
                {{ formatSize(file.size) }}<template v-if="detail"> · {{ detail }}</template>
            </p>
        </div>
        <button
            type="button"
            class="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Quitar archivo"
            @click="$emit('remove')"
        >
            <X class="size-4" />
        </button>
    </div>
</template>
