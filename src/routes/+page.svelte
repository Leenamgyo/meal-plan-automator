<script lang="ts">
    import "../app.css";
    import { onMount } from "svelte";

    import MenuTab from "$lib/components/MenuTab.svelte";
    import SettingsTab from "$lib/components/SettingsTab.svelte";
    import CalendarTab from "$lib/components/CalendarTab.svelte";
    import StatsTab from "$lib/components/StatsTab.svelte";

    let activeTab = "calendar";

    let geminiKey = "";

    onMount(() => {
        geminiKey = localStorage.getItem("geminiKey") || "";
    });
</script>

<svelte:head>
    <title>밀차트 자동화</title>
</svelte:head>

<header>
    <div class="mac-traffic-lights">
        <div class="traffic-light tl-red"></div>
        <div class="traffic-light tl-yellow"></div>
        <div class="traffic-light tl-green"></div>
    </div>
    <nav class="tabs">
        <button
            class="tab-btn"
            class:active={activeTab === "calendar"}
            on:click={() => (activeTab = "calendar")}
        >
            <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
            >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            식단표
        </button>
        <button
            class="tab-btn"
            class:active={activeTab === "menu"}
            on:click={() => (activeTab = "menu")}
        >
            <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
            >
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
            메뉴 관리
        </button>
        <button
            class="tab-btn"
            class:active={activeTab === "stats"}
            on:click={() => (activeTab = "stats")}
        >
            <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
            >
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
            통계
        </button>
        <button
            class="tab-btn"
            class:active={activeTab === "settings"}
            on:click={() => (activeTab = "settings")}
        >
            <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
            >
                <circle cx="12" cy="12" r="3"></circle>
                <path
                    d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
                ></path>
            </svg>
            환경설정
        </button>
    </nav>
</header>

<main>
    {#if activeTab === "menu"}
        <MenuTab />
    {:else if activeTab === "calendar"}
        <CalendarTab {geminiKey} />
    {:else if activeTab === "stats"}
        <StatsTab />
    {:else if activeTab === "settings"}
        <SettingsTab bind:geminiKey />
    {/if}
</main>
