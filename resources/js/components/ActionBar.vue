<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { LoaderCircle } from 'lucide-vue-next';

defineProps<{
    label: string;
    busy?: boolean;
    disabled?: boolean;
    progress?: string | null;
}>();

defineEmits<{ run: [] }>();
</script>

<template>
    <!-- Barra fija abajo: el botón principal siempre a mano, aunque la grilla sea larga. -->
    <div class="sticky bottom-0 z-20 -mx-4 mt-8 border-t bg-background/90 px-4 py-4 backdrop-blur">
        <div class="flex flex-wrap items-center justify-end gap-3">
            <div class="mr-auto text-sm text-muted-foreground">
                <slot>{{ progress }}</slot>
            </div>
            <Button size="lg" class="min-w-44 rounded-xl text-base" :disabled="disabled || busy" @click="$emit('run')">
                <LoaderCircle v-if="busy" class="size-5 animate-spin" />
                {{ busy ? (progress ?? 'Procesando…') : label }}
            </Button>
        </div>
    </div>
</template>
