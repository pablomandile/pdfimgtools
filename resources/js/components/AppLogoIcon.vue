<script setup lang="ts">
defineOptions({
    inheritAttrs: false,
});
</script>

<template>
    <!-- Hoja con la esquina doblada y una "A" trazada adentro. -->
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" v-bind="$attrs">
        <path d="M8 3h11l7 7v17a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" fill="currentColor" opacity=".18" />
        <path d="M8 3h11l7 7v17a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
        <path d="M19 3v5a2 2 0 0 0 2 2h5" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
        <path d="m11 24 5-11 5 11M12.8 20h6.4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
</template>
