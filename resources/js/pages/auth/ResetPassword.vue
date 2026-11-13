<script setup lang="ts">
import FormField from '@/components/auth/FormField.vue';
import SubmitButton from '@/components/auth/SubmitButton.vue';
import AuthLayout from '@/layouts/AuthLayout.vue';
import { useForm } from '@inertiajs/vue3';

const props = defineProps<{ token: string; email: string }>();

const form = useForm({ token: props.token, email: props.email, password: '', password_confirmation: '' });

function submit() {
    form.post(route('password.update'), { onFinish: () => form.reset('password', 'password_confirmation') });
}
</script>

<template>
    <AuthLayout title="Elegí tu contraseña nueva">
        <form class="space-y-4" @submit.prevent="submit">
            <FormField v-model="form.email" label="Email" type="email" autocomplete="email" :error="form.errors.email" />
            <FormField
                v-model="form.password"
                label="Contraseña nueva"
                type="password"
                autocomplete="new-password"
                hint="Al menos 8 caracteres."
                :error="form.errors.password"
                autofocus
            />
            <FormField
                v-model="form.password_confirmation"
                label="Repetí la contraseña"
                type="password"
                autocomplete="new-password"
                :error="form.errors.password_confirmation"
            />
            <SubmitButton :busy="form.processing">Guardar contraseña</SubmitButton>
        </form>
    </AuthLayout>
</template>
