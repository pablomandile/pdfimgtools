<script setup lang="ts">
import FormField from '@/components/auth/FormField.vue';
import GoogleButton from '@/components/auth/GoogleButton.vue';
import SubmitButton from '@/components/auth/SubmitButton.vue';
import AuthLayout from '@/layouts/AuthLayout.vue';
import { Link, useForm } from '@inertiajs/vue3';

defineProps<{ googleConfigured: boolean }>();

const form = useForm({ name: '', email: '', password: '', password_confirmation: '' });

function submit() {
    form.post(route('register.store'), { onFinish: () => form.reset('password', 'password_confirmation') });
}
</script>

<template>
    <AuthLayout title="Crear cuenta" subtitle="Te vamos a mandar un mail para confirmar tu email.">
        <template v-if="googleConfigured">
            <GoogleButton />
            <div class="flex items-center gap-3 text-xs text-muted-foreground">
                <span class="h-px flex-1 bg-border" /> o con tu email <span class="h-px flex-1 bg-border" />
            </div>
        </template>

        <form class="space-y-4" @submit.prevent="submit">
            <FormField v-model="form.name" label="Nombre" autocomplete="name" :error="form.errors.name" autofocus />
            <FormField v-model="form.email" label="Email" type="email" autocomplete="email" :error="form.errors.email" />
            <FormField
                v-model="form.password"
                label="Contraseña"
                type="password"
                autocomplete="new-password"
                hint="Al menos 8 caracteres."
                :error="form.errors.password"
            />
            <FormField
                v-model="form.password_confirmation"
                label="Repetí la contraseña"
                type="password"
                autocomplete="new-password"
                :error="form.errors.password_confirmation"
            />
            <SubmitButton :busy="form.processing">Crear cuenta</SubmitButton>
        </form>

        <p class="text-center text-sm text-muted-foreground">
            ¿Ya tenés cuenta?
            <Link :href="route('login')" class="font-medium text-primary hover:underline">Iniciá sesión</Link>
        </p>
    </AuthLayout>
</template>
