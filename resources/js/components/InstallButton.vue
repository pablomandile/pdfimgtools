<script setup lang="ts">
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePwaInstall } from '@/composables/usePwaInstall';
import { Download } from 'lucide-vue-next';
import { ref } from 'vue';

const { canInstall, isIos, install } = usePwaInstall();
const showHelp = ref(false);
const busy = ref(false);

async function onClick() {
    if (busy.value) return;
    busy.value = true;
    try {
        // 'manual' = iOS, o el prompt ya se usó: se explican los pasos a mano.
        if ((await install()) === 'manual') showHelp.value = true;
    } finally {
        busy.value = false;
    }
}
</script>

<template>
    <button
        v-if="canInstall"
        type="button"
        class="flex items-center gap-1.5 rounded-lg p-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        title="Instalar app"
        aria-label="Instalar app"
        :disabled="busy"
        @click="onClick"
    >
        <Download class="size-5" />
        <span class="hidden sm:inline">Instalar app</span>
    </button>

    <Dialog v-model:open="showHelp">
        <DialogContent class="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Instalar PDFImgTools</DialogTitle>
                <DialogDescription>Queda como una app más, con su ícono.</DialogDescription>
            </DialogHeader>
            <ol v-if="isIos" class="list-decimal space-y-2 pl-5 text-sm">
                <li>Tocá <strong>Compartir</strong> en la barra de Safari.</li>
                <li>Elegí <strong>Agregar a inicio</strong>.</li>
            </ol>
            <ol v-else class="list-decimal space-y-2 pl-5 text-sm">
                <li>Abrí el menú del navegador (los tres puntos).</li>
                <li>Elegí <strong>Instalar aplicación</strong> o <strong>Agregar a la pantalla principal</strong>.</li>
            </ol>
        </DialogContent>
    </Dialog>
</template>
