<script setup lang="ts">
import AppLogo from '@/components/AppLogo.vue';
import InstallButton from '@/components/InstallButton.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
import type { SharedData } from '@/types';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue';
import { Link, router, usePage } from '@inertiajs/vue3';
import { ChartColumn, LogOut, UserRound } from 'lucide-vue-next';
import { computed, nextTick, onMounted, watch } from 'vue';
import { toast, Toaster } from 'vue-sonner';
import 'vue-sonner/style.css';

const page = usePage<SharedData>();
const user = computed(() => page.props.auth?.user);

// Los mensajes flash del backend (bloqueos, email confirmado…) salen como toast.
// Recién después de montar: un toast creado antes de que exista el <Toaster>
// se pierde, y eso pasa siempre en la primera carga (p. ej. el link del mail).
function showFlash(flash: SharedData['flash'] | undefined) {
    if (flash?.error) toast.error(flash.error);
    if (flash?.success) toast.success(flash.success);
}
onMounted(() => nextTick(() => showFlash(page.props.flash)));
watch(() => page.props.flash, showFlash, { deep: true });

function logout() {
    router.post(route('logout'));
}
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
                    <Link
                        v-if="user?.admin"
                        :href="route('stats.index')"
                        class="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground sm:flex"
                    >
                        <ChartColumn class="size-4" /> Estadísticas
                    </Link>
                    <InstallButton />
                    <ThemeToggle />

                    <Menu v-if="user" as="div" class="relative">
                        <MenuButton
                            class="ml-1 flex items-center rounded-full outline-none ring-ring/40 transition focus-visible:ring-2"
                            :aria-label="`Cuenta de ${user.name}`"
                        >
                            <img v-if="user.avatar" :src="user.avatar" alt="" referrerpolicy="no-referrer" class="size-9 rounded-full border" />
                            <span v-else class="flex size-9 items-center justify-center rounded-full border bg-muted">
                                <UserRound class="size-4" />
                            </span>
                        </MenuButton>
                        <MenuItems class="absolute right-0 mt-2 w-60 origin-top-right rounded-xl border bg-card p-1.5 shadow-lg outline-none">
                            <div class="border-b px-3 py-2">
                                <p class="truncate text-sm font-medium">{{ user.name }}</p>
                                <p class="truncate text-xs text-muted-foreground">{{ user.email }}</p>
                            </div>
                            <MenuItem v-slot="{ active }">
                                <Link
                                    :href="route('account')"
                                    :class="['mt-1.5 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm', active && 'bg-muted']"
                                >
                                    <UserRound class="size-4" /> Mi cuenta
                                </Link>
                            </MenuItem>
                            <MenuItem v-if="user.admin" v-slot="{ active }">
                                <Link
                                    :href="route('stats.index')"
                                    :class="['mt-1.5 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm', active && 'bg-muted']"
                                >
                                    <ChartColumn class="size-4" /> Estadísticas
                                </Link>
                            </MenuItem>
                            <MenuItem v-slot="{ active }">
                                <button
                                    type="button"
                                    :class="['mt-1.5 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm', active && 'bg-muted']"
                                    @click="logout"
                                >
                                    <LogOut class="size-4" /> Cerrar sesión
                                </button>
                            </MenuItem>
                        </MenuItems>
                    </Menu>
                </nav>
            </div>
        </header>

        <main class="flex-1">
            <slot />
        </main>

        <footer class="border-t py-6 text-center text-xs text-muted-foreground">
            PDFImgTools · uso personal · las herramientas marcadas «en tu navegador» no suben tus archivos a ningún lado
        </footer>

        <Toaster position="top-center" rich-colors close-button />
    </div>
</template>
