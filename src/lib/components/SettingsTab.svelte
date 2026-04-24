<script lang="ts">
    import { onMount } from "svelte";
    import { geminiKey } from "$lib/stores";
    import {
        createCategory,
        deleteCategory,
        updateCategory,
        fetchCategories,
    } from "$lib/services/categories";
    import { fetchMenuItems } from "$lib/services/menuItems";
    import type { Category } from "$lib/types/models";
    import { moveItemUp, moveItemDown } from "$lib/utils/arrayUtils";

    // ── Sidebar ──────────────────────────────────────────────
    let activeSection: "profile" | "categories" = "profile";

    const sections = [
        { id: "profile", icon: "storefront", label: "Restaurant Profile" },
        { id: "categories", icon: "category", label: "Category Management" },
    ] as const;

    // ── Profile ──────────────────────────────────────────────
    let saveMsgVisible = false;
    let restaurantName = "";
    let restaurantDesc = "";
    let aiRecommendCount = 5;

    // ── Categories ───────────────────────────────────────────
    let categories: Category[] = [];
    let menuCountMap: Record<number, number> = {};
    let editingCatId: number | null = null;

    onMount(async () => {
        restaurantName = localStorage.getItem("restaurantName") ?? "";
        restaurantDesc = localStorage.getItem("restaurantDesc") ?? "";
        aiRecommendCount = parseInt(
            localStorage.getItem("aiRecommendCount") ?? "5",
            10,
        );

        categories = await fetchCategories();
        categories.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

        const items = await fetchMenuItems();
        for (const item of items) {
            if (item.category_id != null) {
                menuCountMap[item.category_id] =
                    (menuCountMap[item.category_id] ?? 0) + 1;
            }
        }
        menuCountMap = { ...menuCountMap };
    });

    // ── Category actions ─────────────────────────────────────
    async function addCategory() {
        const newCat = await createCategory("새 카테고리", "#4caf50");
        if (newCat) {
            categories = [...categories, newCat];
            editingCatId = newCat.id;
        }
    }

    async function removeCategory(id: number) {
        if (!confirm("이 카테고리를 삭제할까요?")) return;
        if (await deleteCategory(id))
            categories = categories.filter((c) => c.id !== id);
    }

    // ── Profile save ─────────────────────────────────────────
    async function saveSettings() {
        localStorage.setItem("geminiKey", $geminiKey);
        localStorage.setItem("restaurantName", restaurantName);
        localStorage.setItem("restaurantDesc", restaurantDesc);
        localStorage.setItem("aiRecommendCount", String(aiRecommendCount));
        for (let i = 0; i < categories.length; i++) {
            const cat = categories[i];
            await updateCategory(cat.id, {
                name: cat.name,
                color: cat.color,
                sort_order: i,
            });
            cat.sort_order = i;
        }
        saveMsgVisible = true;
        setTimeout(() => (saveMsgVisible = false), 2000);
    }

</script>

<div class="flex h-full bg-surface overflow-hidden no-drag">
    <!-- Left: Navigation Sidebar -->
    <nav class="w-64 bg-surface-container-low p-4 flex flex-col flex-shrink-0">
        <div class="mb-8 px-2">
            <h2 class="font-headline font-bold text-lg text-primary">
                Settings
            </h2>
            <p class="text-xs text-on-surface-variant mt-0.5">
                Local Configuration
            </p>
        </div>

        <div class="flex-1 space-y-1">
            {#each sections as sec}
                <button
                    class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all
                           {activeSection === sec.id
                        ? 'bg-surface-container-lowest text-primary shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container-lowest/60'}"
                    on:click={() => (activeSection = sec.id)}
                >
                    <span
                        class="material-symbols-outlined"
                        style="font-size:20px; line-height:1">{sec.icon}</span
                    >
                    {sec.label}
                </button>
            {/each}
        </div>

        <div class="mt-auto pt-4 space-y-3">
                {#if saveMsgVisible}
                    <div
                        class="bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest py-2 px-4 rounded-full text-center"
                    >
                        Saved ✓
                    </div>
                {/if}
                <button
                    class="w-full bg-primary text-white font-bold py-3 rounded-2xl shadow-md shadow-primary/20 hover:opacity-90 transition-all text-sm"
                    on:click={saveSettings}
                >
                    Apply Changes
                </button>
            </div>
    </nav>

    <!-- Right: Content Area -->
    <div class="flex-1 overflow-hidden flex flex-col">
        <!-- ══════════════════════════════════════════════════
             Restaurant Profile
        ══════════════════════════════════════════════════ -->
        {#if activeSection === "profile"}
            <div class="flex-1 overflow-y-auto custom-scrollbar p-10">
                <div class="max-w-2xl space-y-8">
                    <header>
                        <span
                            class="text-[10px] font-bold text-primary uppercase tracking-widest"
                            >CONFIGURATION</span
                        >
                        <h1
                            class="text-3xl font-headline font-extrabold tracking-tight text-on-surface mt-1"
                        >
                            Restaurant Profile
                        </h1>
                        <p
                            class="text-sm text-on-surface-variant mt-1 leading-relaxed"
                        >
                            식당의 기본 정보와 앱 동작 설정을 관리합니다.
                        </p>
                    </header>

                    <!-- Identity -->
                    <div
                        class="bg-surface-container-low rounded-2xl p-8 space-y-5"
                    >
                        <h3 class="text-sm font-bold text-on-surface">
                            기본 정보
                        </h3>
                        <div class="space-y-1.5">
                            <label
                                for="restaurant-name"
                                class="text-[10px] font-bold uppercase tracking-widest text-outline"
                                >식당 이름</label
                            >
                            <input
                                id="restaurant-name"
                                type="text"
                                class="w-full bg-surface-container-lowest rounded-xl py-3.5 px-5 text-lg font-headline font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none border-none"
                                bind:value={restaurantName}
                                placeholder="예: 더 리빙 키친"
                            />
                        </div>
                        <div class="space-y-1.5">
                            <label
                                for="restaurant-desc"
                                class="text-[10px] font-bold uppercase tracking-widest text-outline"
                                >소개 및 운영 철학</label
                            >
                            <textarea
                                id="restaurant-desc"
                                class="w-full bg-surface-container-lowest rounded-xl py-3.5 px-5 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none border-none custom-scrollbar"
                                rows="4"
                                bind:value={restaurantDesc}
                                placeholder="식당 소개, 특별한 메뉴 구성, 고객에게 전달할 메시지를 입력하세요."
                            ></textarea>
                        </div>
                    </div>

                    <!-- Gemini API Key -->
                    <div
                        class="bg-surface-container-low rounded-2xl p-8 space-y-4"
                    >
                        <h3 class="text-sm font-bold text-on-surface">
                            Gemini API Key
                        </h3>
                        <div class="relative">
                            <span
                                class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline"
                                style="font-size:20px">key</span
                            >
                            <input
                                type="password"
                                class="w-full bg-surface-container-lowest rounded-xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none font-mono border-none"
                                bind:value={$geminiKey}
                                placeholder="Enter your Gemini API key..."
                            />
                        </div>
                        <p
                            class="text-[11px] text-on-surface-variant leading-relaxed"
                        >
                            Google AI Studio에서 발급받은 키를 입력하세요.
                            로컬에만 저장됩니다.
                        </p>
                    </div>

                    <!-- AI Settings -->
                    <div
                        class="bg-surface-container-low rounded-2xl p-8 space-y-5"
                    >
                        <h3 class="text-sm font-bold text-on-surface">
                            AI 추천 설정
                        </h3>
                        <div class="space-y-3">
                            <div
                                class="flex items-center justify-between mb-1"
                            >
                                <label
                                    for="ai-count"
                                    class="text-[10px] font-bold uppercase tracking-widest text-outline"
                                    >추천 콤보 수</label
                                >
                                <span
                                    class="text-lg font-extrabold text-primary font-headline"
                                    >{aiRecommendCount}개</span
                                >
                            </div>
                            <input
                                id="ai-count"
                                type="range"
                                min="3"
                                max="12"
                                bind:value={aiRecommendCount}
                                class="w-full accent-primary"
                            />
                            <div
                                class="flex justify-between text-[10px] text-outline"
                            >
                                <span>3개 (간단)</span>
                                <span>12개 (풍성)</span>
                            </div>
                        </div>
                        <p
                            class="text-[11px] text-on-surface-variant leading-relaxed"
                        >
                            AI 추천 시 보여줄 콤보 후보 수입니다. 그 중 하나를
                            선택해 날짜 배정 또는 콤보 등록을 할 수 있습니다.
                            변경 후 Apply Changes를 눌러 저장하세요.
                        </p>
                    </div>

                    <!-- System Status Footer -->
                    <div
                        class="bg-surface-container-low rounded-2xl p-6 flex items-center gap-4"
                    >
                        <div
                            class="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0"
                        ></div>
                        <div class="flex-1 min-w-0">
                            <div class="text-xs font-bold text-on-surface">
                                System Normal
                            </div>
                            <div class="text-[10px] text-on-surface-variant">
                                Local database connected · http://127.0.0.1:3737
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ══════════════════════════════════════════════════
             Category Management
        ══════════════════════════════════════════════════ -->
        {:else if activeSection === "categories"}
            <div class="flex-1 overflow-y-auto custom-scrollbar p-10">
                <div class="max-w-4xl">
                    <header class="mb-10 flex items-end justify-between">
                        <div>
                            <span
                                class="text-[10px] font-bold text-primary uppercase tracking-widest"
                                >CONFIGURATION</span
                            >
                            <h1
                                class="text-3xl font-headline font-extrabold tracking-tight text-on-surface mt-1"
                            >
                                카테고리 관리
                            </h1>
                            <p
                                class="text-sm text-on-surface-variant mt-1 leading-relaxed"
                            >
                                식단 분류를 위한 카테고리를 관리합니다. 아이콘,
                                색상 및 사용 여부를 설정할 수 있습니다.
                            </p>
                        </div>
                        <button
                            class="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-full font-bold shadow-md shadow-primary/20 hover:opacity-90 transition-all text-sm flex-shrink-0 ml-6"
                            on:click={addCategory}
                        >
                            <span
                                class="material-symbols-outlined"
                                style="font-size:18px">add</span
                            >
                            새 카테고리 추가
                        </button>
                    </header>

                    <div
                        class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
                    >
                        {#each categories as cat, i (cat.id)}
                            <div
                                class="bg-surface-container-lowest p-6 rounded-[1.25rem] shadow-sm flex flex-col gap-5 hover:shadow-md transition-all"
                            >
                                <!-- Top: color icon + edit/delete -->
                                <div class="flex justify-between items-start">
                                    <div
                                        class="relative w-16 h-16 rounded-2xl flex items-center justify-center cursor-pointer overflow-hidden"
                                        style="background-color: {cat.color}20"
                                    >
                                        <input
                                            type="color"
                                            bind:value={cat.color}
                                            class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                        <span
                                            class="material-symbols-outlined"
                                            style="font-size:28px; color: {cat.color}"
                                            >palette</span
                                        >
                                    </div>
                                    <div class="flex gap-1">
                                        <button
                                            class="p-2 hover:bg-surface-container-low rounded-lg transition-colors text-on-surface-variant"
                                            on:click={() =>
                                                (editingCatId =
                                                    editingCatId === cat.id
                                                        ? null
                                                        : cat.id)}
                                        >
                                            <span
                                                class="material-symbols-outlined"
                                                style="font-size:20px"
                                                >edit</span
                                            >
                                        </button>
                                        <button
                                            class="p-2 hover:bg-error-container/30 rounded-lg transition-colors text-on-surface-variant hover:text-error"
                                            on:click={() =>
                                                removeCategory(cat.id)}
                                        >
                                            <span
                                                class="material-symbols-outlined"
                                                style="font-size:20px"
                                                >delete</span
                                            >
                                        </button>
                                    </div>
                                </div>

                                <!-- Name -->
                                <div>
                                    {#if editingCatId === cat.id}
                                        <input
                                            type="text"
                                            class="text-xl font-headline font-bold text-on-surface bg-surface-container-low rounded-xl px-3 py-1.5 w-full outline-none border-none focus:ring-2 focus:ring-primary/20"
                                            bind:value={cat.name}
                                            on:blur={() =>
                                                (editingCatId = null)}
                                        />
                                    {:else}
                                        <h3
                                            class="text-xl font-headline font-bold text-on-surface"
                                        >
                                            {cat.name}
                                        </h3>
                                    {/if}
                                    <span
                                        class="inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded"
                                        style="color: {cat.color}; background-color: {cat.color}15"
                                    >
                                        Linked Menus: {menuCountMap[cat.id] ??
                                            0}
                                    </span>
                                </div>

                                <!-- Bottom: color picker button -->
                                <div
                                    class="pt-4 border-t border-surface-container-low mt-auto"
                                >
                                    <label
                                        class="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider hover:bg-primary/5 px-3 py-2 rounded-lg transition-colors cursor-pointer w-fit relative"
                                    >
                                        <input
                                            type="color"
                                            bind:value={cat.color}
                                            class="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                                        />
                                        <span
                                            class="material-symbols-outlined"
                                            style="font-size:16px">palette</span
                                        >
                                        대표 색상 선택
                                    </label>
                                </div>
                            </div>
                        {/each}

                        <!-- Add placeholder card -->
                        <button
                            class="bg-surface-container-low border-2 border-dashed border-outline-variant p-6 rounded-[1.25rem] flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-surface-container-high transition-all group min-h-[180px]"
                            on:click={addCategory}
                        >
                            <div
                                class="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center group-hover:scale-110 transition-transform"
                            >
                                <span
                                    class="material-symbols-outlined text-outline"
                                    style="font-size:24px">add_circle</span
                                >
                            </div>
                            <span
                                class="text-sm font-bold text-on-surface-variant"
                                >새 카테고리 만들기</span
                            >
                        </button>
                    </div>
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    :global(.animate-in) {
        animation: animate-in 0.3s ease-out;
    }
    @keyframes animate-in {
        from {
            opacity: 0;
            transform: translateY(8px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
</style>
