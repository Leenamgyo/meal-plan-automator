<script lang="ts">
    import { createEventDispatcher } from "svelte";
    const dispatch = createEventDispatcher<{ select: "menu" | "combo"; close: void }>();
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
    class="fixed inset-0 bg-on-surface/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
    on:click={() => dispatch("close")}
>
    <div
        class="bg-surface-container-lowest rounded-[2rem] shadow-2xl w-full max-w-md p-8"
        on:click|stopPropagation
    >
        <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-headline font-extrabold tracking-tight text-on-surface">무엇을 추가할까요?</h2>
            <button
                class="p-2 hover:bg-surface-container-low rounded-full transition-colors"
                on:click={() => dispatch("close")}
            >
                <span class="material-symbols-outlined text-on-surface-variant">close</span>
            </button>
        </div>

        <div class="grid grid-cols-2 gap-4">
            <!-- Single menu -->
            <button
                class="group flex flex-col items-center gap-4 p-6 rounded-2xl bg-surface-container-low hover:bg-primary/5 hover:shadow-lg transition-all"
                on:click={() => dispatch("select", "menu")}
            >
                <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/20 transition-all">
                    <span class="material-symbols-outlined text-primary" style="font-size:28px">rice_bowl</span>
                </div>
                <div class="text-center">
                    <p class="font-extrabold text-on-surface">단품 메뉴</p>
                    <p class="text-xs text-on-surface-variant mt-1">개별 메뉴를 등록합니다</p>
                </div>
            </button>

            <!-- Combo -->
            <button
                class="group flex flex-col items-center gap-4 p-6 rounded-2xl bg-surface-container-low hover:bg-secondary/5 hover:shadow-lg transition-all"
                on:click={() => dispatch("select", "combo")}
            >
                <div class="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-secondary/20 transition-all">
                    <span class="material-symbols-outlined text-secondary" style="font-size:28px">restaurant_menu</span>
                </div>
                <div class="text-center">
                    <p class="font-extrabold text-on-surface">콤보 메뉴</p>
                    <p class="text-xs text-on-surface-variant mt-1">여러 단품을 묶어 구성합니다</p>
                </div>
            </button>
        </div>
    </div>
</div>
