<script setup lang="ts">
import { Eye, EyeOff } from 'lucide-vue-next';
import { computed, ref, useId } from 'vue';

/** Campo de formulario con su etiqueta y el error de validación debajo. */
const props = withDefaults(
    defineProps<{
        label: string;
        type?: string;
        error?: string;
        autocomplete?: string;
        hint?: string;
        required?: boolean;
        autofocus?: boolean;
    }>(),
    { type: 'text', required: true },
);

const model = defineModel<string>({ required: true });
const id = useId();
const visible = ref(false);
const isPassword = computed(() => props.type === 'password');
</script>

<template>
    <div>
        <div class="flex items-baseline justify-between gap-2">
            <label :for="id" class="text-sm font-medium">{{ label }}</label>
            <slot name="aside" />
        </div>
        <div class="relative mt-1.5">
            <input
                :id="id"
                v-model="model"
                :type="isPassword && visible ? 'text' : type"
                :autocomplete="autocomplete"
                :required="required"
                :autofocus="autofocus"
                :aria-invalid="!!error"
                :aria-describedby="error ? `${id}-error` : hint ? `${id}-hint` : undefined"
                :class="[
                    'h-11 w-full rounded-lg border bg-card px-3 outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30',
                    isPassword && 'pr-11',
                    error && 'border-destructive',
                ]"
            />
            <button
                v-if="isPassword"
                type="button"
                class="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground transition hover:text-foreground"
                :aria-label="visible ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                @click="visible = !visible"
            >
                <EyeOff v-if="visible" class="size-4" />
                <Eye v-else class="size-4" />
            </button>
        </div>
        <p v-if="error" :id="`${id}-error`" class="mt-1.5 text-sm text-destructive">{{ error }}</p>
        <p v-else-if="hint" :id="`${id}-hint`" class="mt-1.5 text-xs text-muted-foreground">{{ hint }}</p>
    </div>
</template>
