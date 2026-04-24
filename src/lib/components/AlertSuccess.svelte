<script lang="ts">
    import { toastMessage } from "$lib/stores";
    import { fly } from "svelte/transition";

    $: visible = !!$toastMessage;
</script>

{#if visible}
    <div
        class="fixed top-20 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container-high"
        in:fly={{ x: 64, duration: 240, opacity: 0 }}
        out:fly={{ x: 64, duration: 200, opacity: 0 }}
    >
        <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span class="material-symbols-outlined text-primary" style="font-size:18px">check_circle</span>
        </div>
        <p class="text-sm font-bold text-on-surface">{$toastMessage}</p>
    </div>
{/if}
