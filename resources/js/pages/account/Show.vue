<script setup lang="ts">
import FormField from '@/components/auth/FormField.vue';
import SiteLayout from '@/layouts/SiteLayout.vue';
import { Head, useForm } from '@inertiajs/vue3';
import { KeyRound, LoaderCircle, UserRound } from 'lucide-vue-next';

const props = defineProps<{
    account: { name: string; email: string; hasPassword: boolean; hasGoogle: boolean };
}>();

const nameForm = useForm({ name: props.account.name });
const passwordForm = useForm({ current_password: '', password: '', password_confirmation: '' });

function savePassword() {
    passwordForm.put(route('account.password'), {
        preserveScroll: true,
        onSuccess: () => passwordForm.reset(),
        onError: () => passwordForm.reset('password', 'password_confirmation'),
    });
}
</script>

<template>
    <SiteLayout>
        <Head title="Mi cuenta" />

        <div class="mx-auto max-w-2xl space-y-8 px-4 py-8 sm:py-12">
            <div>
                <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">Mi cuenta</h1>
                <p class="mt-1 text-muted-foreground">
                    {{ account.email }} · entrás con
                    {{ [account.hasGoogle && 'Google', account.hasPassword && 'email y contraseña'].filter(Boolean).join(' o con ') }}
                </p>
            </div>

            <section class="rounded-xl border bg-card p-5">
                <h2 class="mb-4 flex items-center gap-2 font-medium"><UserRound class="size-4" /> Nombre</h2>
                <form
                    class="flex flex-col gap-3 sm:flex-row sm:items-end"
                    @submit.prevent="nameForm.put(route('account.name'), { preserveScroll: true })"
                >
                    <div class="flex-1">
                        <FormField v-model="nameForm.name" label="Cómo te mostramos" autocomplete="name" :error="nameForm.errors.name" />
                    </div>
                    <button
                        type="submit"
                        :disabled="nameForm.processing || !nameForm.isDirty"
                        class="inline-flex h-11 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
                    >
                        <LoaderCircle v-if="nameForm.processing" class="size-4 animate-spin" /> Guardar
                    </button>
                </form>
            </section>

            <section class="rounded-xl border bg-card p-5">
                <h2 class="flex items-center gap-2 font-medium">
                    <KeyRound class="size-4" /> {{ account.hasPassword ? 'Cambiar contraseña' : 'Crear una contraseña' }}
                </h2>
                <p v-if="!account.hasPassword" class="mt-1 text-sm text-muted-foreground">
                    Hoy entrás solo con Google. Con una contraseña vas a poder entrar también con tu email.
                </p>

                <form class="mt-4 space-y-4" @submit.prevent="savePassword">
                    <FormField
                        v-if="account.hasPassword"
                        v-model="passwordForm.current_password"
                        label="Contraseña actual"
                        type="password"
                        autocomplete="current-password"
                        :error="passwordForm.errors.current_password"
                    />
                    <FormField
                        v-model="passwordForm.password"
                        :label="account.hasPassword ? 'Contraseña nueva' : 'Contraseña'"
                        type="password"
                        autocomplete="new-password"
                        hint="Al menos 8 caracteres. Se cierran tus sesiones en otros dispositivos."
                        :error="passwordForm.errors.password"
                    />
                    <FormField
                        v-model="passwordForm.password_confirmation"
                        label="Repetí la contraseña"
                        type="password"
                        autocomplete="new-password"
                        :error="passwordForm.errors.password_confirmation"
                    />
                    <button
                        type="submit"
                        :disabled="passwordForm.processing"
                        class="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                    >
                        <LoaderCircle v-if="passwordForm.processing" class="size-4 animate-spin" />
                        {{ account.hasPassword ? 'Cambiar contraseña' : 'Crear contraseña' }}
                    </button>
                </form>
            </section>
        </div>
    </SiteLayout>
</template>
