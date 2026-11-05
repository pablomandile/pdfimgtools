<script setup lang="ts">
import { cn } from '@/lib/utils';
import {
    ArrowDownUp,
    Combine,
    Eraser,
    File,
    FileMinus,
    FileOutput,
    FileText,
    FileType,
    ImagePlus,
    Images,
    ListOrdered,
    Lock,
    LockOpen,
    Minimize2,
    RefreshCw,
    RotateCw,
    Scissors,
    Signature,
    Stamp,
} from 'lucide-vue-next';
import { computed } from 'vue';

/**
 * Ícono por nombre (el que figura en config/tools.php). Se importan solo los
 * que se usan: `import *` de lucide mete los ~1500 íconos en el bundle.
 */
const icons = {
    ArrowDownUp,
    Combine,
    Eraser,
    FileMinus,
    FileOutput,
    FileText,
    FileType,
    ImagePlus,
    Images,
    ListOrdered,
    Lock,
    LockOpen,
    Minimize2,
    RefreshCw,
    RotateCw,
    Scissors,
    Signature,
    Stamp,
};

const props = withDefaults(defineProps<{ name: string; class?: string }>(), { class: '' });

const icon = computed(() => icons[props.name as keyof typeof icons] ?? File);
</script>

<template>
    <component :is="icon" :class="cn('h-4 w-4', props.class)" />
</template>
