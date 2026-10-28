<script setup lang="ts">
import AppLogo from '@/components/AppLogo.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
import { Link } from '@inertiajs/vue3';
import { Toaster } from 'vue-sonner';
import 'vue-sonner/style.css';
</script>

<template>
    <div class="flex min-h-screen flex-col">
        <header class="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
            <div class="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
                <Link :href="route('home')" aria-label="Inicio">
                    <AppLogo />
                </Link>
                <nav class="flex items-center gap-1">
                    <Link
                        :href="route('home')"
                        class="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground sm:block"
                    >
                        Todas las herramientas
                    </Link>
                    <ThemeToggle />
                </nav>
            </div>
        </header>

        <main class="flex-1">
            <slot />
        </main>

        <footer class="border-t py-6 text-center text-xs text-muted-foreground">
            AmoralPDF · uso personal · las herramientas marcadas «en tu navegador» no suben tus archivos a ningún lado
        </footer>

        <Toaster position="top-center" rich-colors close-button />
    </div>
</template>
