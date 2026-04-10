<script lang="ts">
    import { confirmDialog } from "$lib/stores";

    function handleCancel() {
        if ($confirmDialog.resolve) $confirmDialog.resolve(false);
        confirmDialog.update(s => ({ ...s, open: false, resolve: null }));
    }

    function handleConfirm() {
        if ($confirmDialog.resolve) $confirmDialog.resolve(true);
        confirmDialog.update(s => ({ ...s, open: false, resolve: null }));
    }
</script>

{#if $confirmDialog.open}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
        class="fixed inset-0 bg-on-surface/30 backdrop-blur-sm z-[300] flex items-center justify-center p-4"
        on:click={handleCancel}
    >
        <div
            class="bg-surface-container-lowest rounded-3xl shadow-2xl w-full max-w-sm p-7 space-y-5"
            on:click|stopPropagation
        >
            <div>
                <h3 class="text-lg font-extrabold text-on-surface font-headline">{$confirmDialog.title}</h3>
                {#if $confirmDialog.description}
                    <p class="text-sm text-on-surface-variant mt-1.5">{$confirmDialog.description}</p>
                {/if}
            </div>
            <div class="flex gap-3">
                <button
                    class="flex-1 py-3 bg-surface-container-low text-on-surface-variant font-bold rounded-2xl hover:bg-surface-container-high transition-all text-sm"
                    on:click={handleCancel}
                >취소</button>
                <button
                    class="flex-1 py-3 bg-error text-white font-bold rounded-2xl hover:opacity-90 transition-all text-sm shadow-md shadow-error/20"
                    on:click={handleConfirm}
                >삭제</button>
            </div>
        </div>
    </div>
{/if}
