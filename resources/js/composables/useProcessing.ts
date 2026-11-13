import { collectUsageStats, reportUsage } from '@/lib/usage';
import type { SharedData, Tool } from '@/types';
import { usePage } from '@inertiajs/vue3';
import { ref } from 'vue';
import { toast } from 'vue-sonner';

/**
 * Estado de "procesando" + manejo de errores con toasts, para que cada
 * herramienta no tenga que repetirlo. Si la página es de una herramienta del
 * navegador, también registra el uso (las de servidor se registran solas).
 */
export function useProcessing() {
    const busy = ref(false);
    const progress = ref<string | null>(null);
    const page = usePage<SharedData & { tool?: Tool }>();

    function track(ok: boolean, started: number, error?: string) {
        const tool = page.props.tool;
        if (!tool || tool.mode !== 'client') return;

        reportUsage(tool.slug, { ok, error, durationMs: performance.now() - started, ...collectUsageStats() });
    }

    async function run(task: () => Promise<string | void>): Promise<void> {
        if (busy.value) return;

        busy.value = true;
        const started = performance.now();
        try {
            const message = await task();
            if (message) toast.success(message);
            track(true, started);
        } catch (e) {
            console.error(e);
            const message = e instanceof Error ? e.message : 'Algo salió mal al procesar el archivo.';
            toast.error(message);
            track(false, started, message);
        } finally {
            busy.value = false;
            progress.value = null;
        }
    }

    return { busy, progress, run };
}
