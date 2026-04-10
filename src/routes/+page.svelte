<script lang="ts">
    import "../app.css";
    import { onMount } from "svelte";

    import MenuTab from "$lib/components/MenuTab.svelte";
    import SettingsTab from "$lib/components/SettingsTab.svelte";
    import CalendarTab from "$lib/components/CalendarTab.svelte";
    import AlertSuccess from "$lib/components/AlertSuccess.svelte";
    import AlertConfirm from "$lib/components/AlertConfirm.svelte";
    import { geminiKey, aiIngredientsEnabled } from "$lib/stores";

    let activeTab = "planner";

    onMount(() => {
        geminiKey.set(localStorage.getItem("geminiKey") || "");
        const stored = localStorage.getItem("aiIngredientsEnabled");
        aiIngredientsEnabled.set(stored === null ? true : stored === "true");
    });

    const tabs = [
        { id: "planner",   label: "Planner",   icon: "calendar_month" },
        { id: "inventory", label: "Inventory", icon: "inventory_2" },
        { id: "settings",  label: "Settings",  icon: "settings" },
    ];
</script>

<svelte:head>
    <title>밀차트 자동화</title>
</svelte:head>

<!-- Global overlays -->
<AlertSuccess />
<AlertConfirm />

<header class="bg-surface/80 backdrop-blur-xl fixed top-0 z-50 w-full border-b border-surface-container-high">
    <div class="flex items-center justify-between w-full px-6 py-3 max-w-[1920px] mx-auto">
        <!-- 좌측: Traffic Lights + 로고 -->
        <div class="flex items-center gap-4">
            <div class="flex gap-2 no-drag mr-2">
                <div class="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]"></div>
                <div class="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]"></div>
                <div class="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]"></div>
            </div>
            <span class="text-xl font-extrabold tracking-tighter text-primary font-headline">Meal Chart</span>
        </div>

        <!-- 중앙: 탭 내비게이션 -->
        <nav class="flex items-center gap-1 p-1 bg-surface-container-low rounded-full no-drag">
            {#each tabs as tab}
                <button
                    class="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold transition-all
                           {activeTab === tab.id
                             ? 'bg-surface-container-lowest text-primary shadow-sm'
                             : 'text-on-surface-variant hover:bg-surface-container-lowest/60'}"
                    on:click={() => (activeTab = tab.id)}
                >
                    <span class="material-symbols-outlined" style="font-size:18px; line-height:1">{tab.icon}</span>
                    {tab.label}
                </button>
            {/each}
        </nav>

        <!-- 우측: 빈 공간 (대칭 유지) -->
        <div class="w-[140px]"></div>
    </div>
</header>

<main class="pt-[56px] h-screen flex flex-col bg-surface">
    <div class="flex-1 overflow-hidden relative">
        {#if activeTab === "planner"}
            <CalendarTab />
        {:else if activeTab === "inventory"}
            <MenuTab />
        {:else if activeTab === "settings"}
            <SettingsTab />
        {/if}
    </div>
</main>
