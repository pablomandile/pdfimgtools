import type { ToolCategory } from '@/types';

/** Color de cada categoría: fondo del ícono en las tarjetas y en el encabezado de la herramienta. */
export const categoryStyle: Record<ToolCategory, string> = {
    organizar: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    convertir: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    editar: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
    seguridad: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    optimizar: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
};
