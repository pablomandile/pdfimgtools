<script setup lang="ts">
import FormField from '@/components/auth/FormField.vue';
import GoogleButton from '@/components/auth/GoogleButton.vue';
import SubmitButton from '@/components/auth/SubmitButton.vue';
import AuthLayout from '@/layouts/AuthLayout.vue';
import { Link, useForm } from '@inertiajs/vue3';

defineProps<{ googleConfigured: boolean; status?: string | null }>();

const form = useForm({ email: '', password: '', remember: true });

function submit() {
    form.post(route('login.attempt'), { onFinish: () => form.reset('password') });
}
</script>

<template>
    <AuthLayout title="Iniciar sesión" subtitle="Herramientas para PDF e imágenes." :status="status">
        <template v-if="googleConfigured">
            <GoogleButton />
            <div class="flex items-center gap-3 text-xs text-muted-foreground">
                <span class="h-px flex-1 bg-border" /> o con tu email <span class="h-px flex-1 bg-border" />
            </div>
        </template>

        <form class="space-y-4" @submit.prevent="submit">
            <FormField v-model="form.email" label="Email" type="email" autocomplete="email" :error="form.errors.email" autofocus />
            <FormField v-model="form.password" label="Contraseña" type="password" autocomplete="current-password" :error="form.errors.password">
                <template #aside>
                    <Link :href="route('password.request')" class="text-xs text-primary hover:underline">¿Olvidaste tu contraseña?</Link>
                </template>
            </FormField>

            <label class="flex items-center gap-2 text-sm">
                <input v-model="form.remember" type="checkbox" class="size-4 rounded border accent-[hsl(var(--primary))]" />
                Mantener la sesión iniciada
            </label>

            <SubmitButton :busy="form.processing">Entrar</SubmitButton>
        </form>

        <p class="text-center text-sm text-muted-foreground">
            ¿No tenés cuenta?
            <Link :href="route('register')" class="font-medium text-primary hover:underline">Registrate</Link>
        </p>
    </AuthLayout>
</template>
