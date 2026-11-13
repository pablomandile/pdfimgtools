<script setup lang="ts">
import FormField from '@/components/auth/FormField.vue';
import SubmitButton from '@/components/auth/SubmitButton.vue';
import AuthLayout from '@/layouts/AuthLayout.vue';
import { Link, useForm } from '@inertiajs/vue3';

defineProps<{ status?: string | null }>();

const form = useForm({ email: '' });
</script>

<template>
    <AuthLayout
        title="¿Olvidaste tu contraseña?"
        subtitle="Te mandamos un enlace para elegir una nueva. Si entrás con Google, sirve también para crearte una."
        :status="status"
    >
        <form class="space-y-4" @submit.prevent="form.post(route('password.email'))">
            <FormField v-model="form.email" label="Email" type="email" autocomplete="email" :error="form.errors.email" autofocus />
            <SubmitButton :busy="form.processing">Mandarme el enlace</SubmitButton>
        </form>

        <p class="text-center text-sm">
            <Link :href="route('login')" class="text-primary hover:underline">Volver a iniciar sesión</Link>
        </p>
    </AuthLayout>
</template>
