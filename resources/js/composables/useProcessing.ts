import { ref } from 'vue';
import { toast } from 'vue-sonner';

/**
 * Estado de "procesando" + manejo de errores con toasts, para que cada
 * herramienta no tenga que repetirlo.
 */
export function useProcessing() {
    const busy = ref(false);
    const progress = ref<string | null>(null);

    async function run(task: () => Promise<string | void>): Promise<void> {
        if (busy.value) return;

        busy.value = true;
        try {
            const message = await task();
            if (message) toast.success(message);
        } catch (e) {
            console.error(e);
            toast.error(e instanceof Error ? e.message : 'Algo salió mal al procesar el archivo.');
        } finally {
            busy.value = false;
            progress.value = null;
        }
    }

    return { busy, progress, run };
}
