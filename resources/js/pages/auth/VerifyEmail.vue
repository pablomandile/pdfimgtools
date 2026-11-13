<script setup lang="ts">
import SubmitButton from '@/components/auth/SubmitButton.vue';
import AuthLayout from '@/layouts/AuthLayout.vue';
import { router, useForm } from '@inertiajs/vue3';
import { MailCheck } from 'lucide-vue-next';

defineProps<{ email: string; status?: string | null }>();

const form = useForm({});
</script>

<template>
    <AuthLayout title="Confirmá tu email" :status="status">
        <div class="flex flex-col items-center gap-3 rounded-xl border bg-card p-5 text-center text-sm">
            <MailCheck class="size-8 text-primary" />
            <p>
                Te mandamos un enlace a <strong class="break-all">{{ email }}</strong
                >. Abrilo para empezar a usar las herramientas.
            </p>
            <p class="text-muted-foreground">Si no lo ves, revisá el correo no deseado.</p>
        </div>

        <form @submit.prevent="form.post(route('verification.send'))">
            <SubmitButton :busy="form.processing">Mandarme otro enlace</SubmitButton>
        </form>

        <p class="text-center text-sm text-muted-foreground">
            ¿Te equivocaste de email?
            <button type="button" class="font-medium text-primary hover:underline" @click="router.post(route('logout'))">Cerrar sesión</button>
            y registrate de nuevo.
        </p>
    </AuthLayout>
</template>
