<script setup lang="ts" generic="T extends string | number">
/** Grupo de opciones tipo "tarjetas": más fácil de tocar que un select, sobre todo en el celular. */
defineProps<{
    label?: string;
    options: { value: T; label: string; hint?: string }[];
    columns?: number;
}>();

const model = defineModel<T>({ required: true });
</script>

<template>
    <fieldset>
        <legend v-if="label" class="mb-2 text-sm font-medium">{{ label }}</legend>
        <div
            class="grid gap-2"
            :class="{ 'sm:grid-cols-2': columns === 2, 'sm:grid-cols-3': !columns || columns === 3, 'sm:grid-cols-4': columns === 4 }"
        >
            <label
                v-for="option in options"
                :key="option.value"
                :class="[
                    'cursor-pointer rounded-xl border bg-card p-3 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40',
                    model === option.value ? 'border-primary bg-accent' : 'hover:bg-muted',
                ]"
            >
                <input v-model="model" type="radio" class="sr-only" :value="option.value" />
                <span class="block text-sm font-medium">{{ option.label }}</span>
                <span v-if="option.hint" class="mt-0.5 block text-xs text-muted-foreground">{{ option.hint }}</span>
            </label>
        </div>
    </fieldset>
</template>
