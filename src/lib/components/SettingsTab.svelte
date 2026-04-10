<script lang="ts">
    import { onMount } from "svelte";
    import { geminiKey } from "$lib/stores";
    import {
        createCategory,
        deleteCategory,
        updateCategory,
        fetchCategories,
    } from "$lib/services/categories";
    import {
        fetchPrompts,
        updatePrompt,
        createPrompt,
        deletePrompt,
    } from "$lib/services/prompts";
    import { fetchMenuItems } from "$lib/services/menuItems";
    import type { Category } from "$lib/types/models";
    import type { Prompt } from "$lib/types/models";
    import { moveItemUp, moveItemDown } from "$lib/utils/arrayUtils";

    // ── Sidebar ──────────────────────────────────────────────
    let activeSection: "profile" | "categories" | "prompts" = "profile";

    const sections = [
        { id: "profile",    icon: "storefront", label: "Restaurant Profile" },
        { id: "categories", icon: "category",   label: "Category Management" },
        { id: "prompts",    icon: "terminal",   label: "AI Prompt Management" },
    ] as const;

    // ── Profile ──────────────────────────────────────────────
    let saveMsgVisible = false;
    let restaurantName = "";
    let restaurantDesc = "";

    // ── Categories ───────────────────────────────────────────
    let categories: Category[] = [];
    let menuCountMap: Record<number, number> = {};
    let editingCatId: number | null = null;

    // ── Prompts ──────────────────────────────────────────────
    const SYSTEM_PROMPT_IDS = new Set(["json_parser", "chat_base", "auto_gen"]);
    let prompts: Prompt[] = [];
    let selectedId: string | null = null;
    let isCreating = false;
    let isSaving = false;
    let saveMsg = "";
    let editId = "";
    let editDescription = "";
    let editVersion = "";
    let editContent = "";
    let idError = "";
    let showHistory = false;

    $: lineNumbers = editContent ? editContent.split("\n").length : 1;

    onMount(async () => {
        restaurantName = localStorage.getItem("restaurantName") ?? "";
        restaurantDesc = localStorage.getItem("restaurantDesc") ?? "";

        categories = await fetchCategories();
        categories.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

        const items = await fetchMenuItems();
        for (const item of items) {
            if (item.category_id != null) {
                menuCountMap[item.category_id] = (menuCountMap[item.category_id] ?? 0) + 1;
            }
        }
        menuCountMap = { ...menuCountMap };

        prompts = await fetchPrompts();
        if (prompts.length > 0) selectPrompt(prompts[0].id);
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
        if (await deleteCategory(id)) categories = categories.filter((c) => c.id !== id);
    }

    // ── Profile save ─────────────────────────────────────────
    async function saveSettings() {
        localStorage.setItem("geminiKey", $geminiKey);
        localStorage.setItem("restaurantName", restaurantName);
        localStorage.setItem("restaurantDesc", restaurantDesc);
        for (let i = 0; i < categories.length; i++) {
            const cat = categories[i];
            await updateCategory(cat.id, { name: cat.name, color: cat.color, sort_order: i });
            cat.sort_order = i;
        }
        saveMsgVisible = true;
        setTimeout(() => (saveMsgVisible = false), 2000);
    }

    // ── Prompt actions ───────────────────────────────────────
    function selectPrompt(id: string) {
        isCreating = false;
        selectedId = id;
        idError = "";
        showHistory = false;
        const p = prompts.find((p) => p.id === id);
        if (!p) return;
        editId = p.id;
        editDescription = p.description ?? "";
        editVersion = p.version ?? "1.0";
        editContent = p.content;
    }

    function startCreate() {
        isCreating = true;
        selectedId = null;
        editId = "";
        editDescription = "";
        editVersion = "1.0";
        editContent = "";
        idError = "";
        showHistory = false;
    }

    async function handleSave() {
        if (!editContent.trim()) return;
        isSaving = true;
        saveMsg = "";
        try {
            if (isCreating) {
                if (!editId.trim()) { idError = "ID is required."; return; }
                if (!/^[a-z0-9_]+$/.test(editId)) { idError = "Only lowercase, numbers, and underscores allowed."; return; }
                const created = await createPrompt({ id: editId.trim(), description: editDescription, content: editContent, version: editVersion || "1.0" });
                prompts = [...prompts, created];
                isCreating = false;
                selectedId = created.id;
                selectPrompt(created.id);
                saveMsg = "Created!";
            } else if (selectedId) {
                await updatePrompt(selectedId, { content: editContent, version: editVersion });
                prompts = prompts.map((p) => p.id === selectedId ? { ...p, content: editContent, version: editVersion, description: editDescription } : p);
                saveMsg = "Saved!";
            }
        } catch (e: any) {
            saveMsg = `Error: ${e.message}`;
        } finally {
            isSaving = false;
            setTimeout(() => (saveMsg = ""), 2500);
        }
    }

    async function handleDelete() {
        if (!selectedId || SYSTEM_PROMPT_IDS.has(selectedId)) return;
        if (!confirm(`'${selectedId}' 프롬프트를 삭제할까요?`)) return;
        const ok = await deletePrompt(selectedId);
        if (ok) {
            prompts = prompts.filter((p) => p.id !== selectedId);
            selectedId = prompts.length > 0 ? prompts[0].id : null;
            if (selectedId) selectPrompt(selectedId);
        }
    }

    $: isSystem = !isCreating && !!selectedId && SYSTEM_PROMPT_IDS.has(selectedId ?? "");
    $: currentPrompt = prompts.find((p) => p.id === selectedId);
</script>

<div class="flex h-full bg-surface overflow-hidden no-drag">

    <!-- Left: Navigation Sidebar -->
    <nav class="w-64 bg-surface-container-low p-4 flex flex-col flex-shrink-0">
        <div class="mb-8 px-2">
            <h2 class="font-headline font-bold text-lg text-primary">Settings</h2>
            <p class="text-xs text-on-surface-variant mt-0.5">Local Configuration</p>
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
                    <span class="material-symbols-outlined" style="font-size:20px; line-height:1">{sec.icon}</span>
                    {sec.label}
                </button>
            {/each}
        </div>

        {#if activeSection !== "prompts"}
            <div class="mt-auto pt-4 space-y-3">
                {#if saveMsgVisible}
                    <div class="bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest py-2 px-4 rounded-full text-center">
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
        {/if}
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
                        <span class="text-[10px] font-bold text-primary uppercase tracking-widest">CONFIGURATION</span>
                        <h1 class="text-3xl font-headline font-extrabold tracking-tight text-on-surface mt-1">Restaurant Profile</h1>
                        <p class="text-sm text-on-surface-variant mt-1 leading-relaxed">식당의 기본 정보와 앱 동작 설정을 관리합니다.</p>
                    </header>

                    <!-- Identity -->
                    <div class="bg-surface-container-low rounded-2xl p-8 space-y-5">
                        <h3 class="text-sm font-bold text-on-surface">기본 정보</h3>
                        <div class="space-y-1.5">
                            <label class="text-[10px] font-bold uppercase tracking-widest text-outline">식당 이름</label>
                            <input
                                type="text"
                                class="w-full bg-surface-container-lowest rounded-xl py-3.5 px-5 text-lg font-headline font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none border-none"
                                bind:value={restaurantName}
                                placeholder="예: 더 리빙 키친"
                            />
                        </div>
                        <div class="space-y-1.5">
                            <label class="text-[10px] font-bold uppercase tracking-widest text-outline">소개 및 운영 철학</label>
                            <textarea
                                class="w-full bg-surface-container-lowest rounded-xl py-3.5 px-5 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none border-none custom-scrollbar"
                                rows="4"
                                bind:value={restaurantDesc}
                                placeholder="식당 소개, 특별한 메뉴 구성, 고객에게 전달할 메시지를 입력하세요."
                            ></textarea>
                        </div>
                    </div>

                    <!-- Gemini API Key -->
                    <div class="bg-surface-container-low rounded-2xl p-8 space-y-4">
                        <h3 class="text-sm font-bold text-on-surface">Gemini API Key</h3>
                        <div class="relative">
                            <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline" style="font-size:20px">key</span>
                            <input
                                type="password"
                                class="w-full bg-surface-container-lowest rounded-xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none font-mono border-none"
                                bind:value={$geminiKey}
                                placeholder="Enter your Gemini API key..."
                            />
                        </div>
                        <p class="text-[11px] text-on-surface-variant leading-relaxed">
                            Google AI Studio에서 발급받은 키를 입력하세요. 로컬에만 저장됩니다.
                        </p>
                    </div>

                    <!-- System Status Footer -->
                    <div class="bg-surface-container-low rounded-2xl p-6 flex items-center gap-4">
                        <div class="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0"></div>
                        <div class="flex-1 min-w-0">
                            <div class="text-xs font-bold text-on-surface">System Normal</div>
                            <div class="text-[10px] text-on-surface-variant">Local database connected · http://127.0.0.1:3737</div>
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
                            <span class="text-[10px] font-bold text-primary uppercase tracking-widest">CONFIGURATION</span>
                            <h1 class="text-3xl font-headline font-extrabold tracking-tight text-on-surface mt-1">카테고리 관리</h1>
                            <p class="text-sm text-on-surface-variant mt-1 leading-relaxed">식단 분류를 위한 카테고리를 관리합니다. 아이콘, 색상 및 사용 여부를 설정할 수 있습니다.</p>
                        </div>
                        <button
                            class="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-full font-bold shadow-md shadow-primary/20 hover:opacity-90 transition-all text-sm flex-shrink-0 ml-6"
                            on:click={addCategory}
                        >
                            <span class="material-symbols-outlined" style="font-size:18px">add</span>
                            새 카테고리 추가
                        </button>
                    </header>

                    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {#each categories as cat, i (cat.id)}
                            <div class="bg-surface-container-lowest p-6 rounded-[1.25rem] shadow-sm flex flex-col gap-5 hover:shadow-md transition-all">
                                <!-- Top: color icon + edit/delete -->
                                <div class="flex justify-between items-start">
                                    <div class="relative w-16 h-16 rounded-2xl flex items-center justify-center cursor-pointer overflow-hidden"
                                         style="background-color: {cat.color}20">
                                        <input type="color" bind:value={cat.color}
                                               class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                        <span class="material-symbols-outlined" style="font-size:28px; color: {cat.color}">palette</span>
                                    </div>
                                    <div class="flex gap-1">
                                        <button class="p-2 hover:bg-surface-container-low rounded-lg transition-colors text-on-surface-variant"
                                                on:click={() => (editingCatId = editingCatId === cat.id ? null : cat.id)}>
                                            <span class="material-symbols-outlined" style="font-size:20px">edit</span>
                                        </button>
                                        <button class="p-2 hover:bg-error-container/30 rounded-lg transition-colors text-on-surface-variant hover:text-error"
                                                on:click={() => removeCategory(cat.id)}>
                                            <span class="material-symbols-outlined" style="font-size:20px">delete</span>
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
                                            on:blur={() => (editingCatId = null)}
                                        />
                                    {:else}
                                        <h3 class="text-xl font-headline font-bold text-on-surface">{cat.name}</h3>
                                    {/if}
                                    <span class="inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded"
                                          style="color: {cat.color}; background-color: {cat.color}15">
                                        Linked Menus: {menuCountMap[cat.id] ?? 0}
                                    </span>
                                </div>

                                <!-- Bottom: color picker button -->
                                <div class="pt-4 border-t border-surface-container-low mt-auto">
                                    <label class="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider hover:bg-primary/5 px-3 py-2 rounded-lg transition-colors cursor-pointer w-fit relative">
                                        <input type="color" bind:value={cat.color}
                                               class="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" />
                                        <span class="material-symbols-outlined" style="font-size:16px">palette</span>
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
                            <div class="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center group-hover:scale-110 transition-transform">
                                <span class="material-symbols-outlined text-outline" style="font-size:24px">add_circle</span>
                            </div>
                            <span class="text-sm font-bold text-on-surface-variant">새 카테고리 만들기</span>
                        </button>
                    </div>
                </div>
            </div>

        <!-- ══════════════════════════════════════════════════
             AI Prompt Management
        ══════════════════════════════════════════════════ -->
        {:else if activeSection === "prompts"}
            <div class="flex-1 overflow-hidden flex flex-col">

                <!-- Top: header + tab bar -->
                <div class="px-8 pt-8 pb-4 space-y-5 flex-shrink-0">
                    <header>
                        <span class="text-[10px] font-bold text-primary uppercase tracking-widest">CONFIGURATION</span>
                        <h1 class="text-3xl font-headline font-extrabold tracking-tight text-on-surface mt-1">AI Prompt Management</h1>
                    </header>

                    <!-- Function Tab Bar -->
                    <div class="bg-surface-container-low p-1.5 rounded-2xl flex gap-1 flex-wrap shadow-sm border border-outline-variant/20">
                        {#each prompts as p (p.id)}
                            <button
                                class="px-5 py-2.5 rounded-xl text-sm font-bold transition-all
                                       {selectedId === p.id && !isCreating
                                         ? 'bg-white text-primary shadow-sm'
                                         : 'text-on-surface-variant hover:bg-white/50 font-medium'}"
                                on:click={() => selectPrompt(p.id)}
                            >
                                {p.description || p.id}
                            </button>
                        {/each}
                        <button
                            class="px-4 py-2.5 rounded-xl text-sm font-bold transition-all
                                   {isCreating ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant hover:bg-white/50 font-medium'}"
                            on:click={startCreate}
                            title="새 프롬프트 추가"
                        >
                            <span class="material-symbols-outlined" style="font-size:18px; line-height:1">add</span>
                        </button>
                    </div>
                </div>

                <!-- Bottom: editor + history sidebar (flex row) -->
                <div class="flex-1 overflow-hidden flex">

                    <!-- Editor column -->
                    <div class="flex-1 overflow-y-auto custom-scrollbar px-8 pb-8 space-y-5">
                        {#if isCreating || selectedId}
                            <!-- Title row + action buttons -->
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <span class="material-symbols-outlined text-primary" style="font-size:22px">edit_note</span>
                                    <h2 class="font-headline font-bold text-xl text-on-surface">
                                        {#if isCreating}새 프롬프트 작성{:else}{currentPrompt?.description || selectedId} 편집{/if}
                                    </h2>
                                    {#if isSystem}
                                        <span class="px-2 py-0.5 bg-tertiary/10 text-tertiary text-[10px] font-bold rounded-full uppercase tracking-tighter">System Core</span>
                                    {/if}
                                </div>
                                <div class="flex items-center gap-2">
                                    {#if saveMsg}
                                        <span class="text-[10px] font-bold text-primary">{saveMsg}</span>
                                    {/if}
                                    {#if !isCreating && !isSystem}
                                        <button class="px-4 py-2 text-error text-xs font-bold uppercase tracking-widest hover:bg-error/10 rounded-xl transition-colors"
                                                on:click={handleDelete}>Delete</button>
                                    {/if}
                                    <button
                                        class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border
                                               {showHistory
                                                 ? 'bg-surface-container-highest border-outline-variant/50'
                                                 : 'bg-surface-container-high hover:bg-surface-container-highest border-outline-variant/30'}"
                                        on:click={() => (showHistory = !showHistory)}
                                    >
                                        <span class="material-symbols-outlined" style="font-size:18px">history</span> History
                                    </button>
                                    <button
                                        class="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50"
                                        on:click={handleSave}
                                        disabled={isSaving || !editContent.trim()}
                                    >
                                        <span class="material-symbols-outlined" style="font-size:18px">save</span>
                                        {isSaving ? "Saving..." : isCreating ? "Create" : "Save Changes"}
                                    </button>
                                </div>
                            </div>

                            <!-- New prompt fields -->
                            {#if isCreating}
                                <div class="grid grid-cols-2 gap-4">
                                    <div class="space-y-1.5">
                                        <label class="text-[10px] font-bold uppercase tracking-widest text-outline">Identifier</label>
                                        <input type="text"
                                               class="w-full bg-surface-container-low rounded-xl py-3 px-4 text-sm font-mono focus:ring-2 focus:ring-primary/10 outline-none border-none {idError ? 'ring-2 ring-error/20' : ''}"
                                               bind:value={editId}
                                               placeholder="예: meal_logic_v2" />
                                        {#if idError}<p class="text-[10px] text-error font-bold">{idError}</p>{/if}
                                    </div>
                                    <div class="space-y-1.5">
                                        <label class="text-[10px] font-bold uppercase tracking-widest text-outline">Description (탭 이름)</label>
                                        <input type="text"
                                               class="w-full bg-surface-container-low rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/10 outline-none border-none"
                                               bind:value={editDescription}
                                               placeholder="예: 메뉴 생성용" />
                                    </div>
                                </div>
                            {/if}

                            <!-- Dark Code Editor -->
                            <div class="flex flex-col bg-[#1e1e1e] rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl" style="min-height: 420px;">
                                <div class="bg-zinc-900 px-4 py-2.5 flex items-center justify-between border-b border-zinc-800 flex-shrink-0">
                                    <div class="flex items-center gap-4">
                                        <div class="flex gap-1.5">
                                            <div class="w-3 h-3 rounded-full bg-red-500/50"></div>
                                            <div class="w-3 h-3 rounded-full bg-amber-500/50"></div>
                                            <div class="w-3 h-3 rounded-full bg-emerald-500/50"></div>
                                        </div>
                                        <span class="text-xs font-mono text-zinc-500 uppercase tracking-widest">system_prompt.md</span>
                                    </div>
                                    <span class="text-[10px] font-mono text-zinc-600">UTF-8 · Markdown</span>
                                </div>
                                <div class="flex flex-1 overflow-hidden">
                                    <div class="w-12 bg-zinc-900/50 border-r border-zinc-800 py-6 flex flex-col items-center text-zinc-600 font-mono text-xs select-none flex-shrink-0 overflow-hidden" style="line-height: 1.625rem">
                                        {#each Array(Math.max(lineNumbers, 1)) as _, n}
                                            <div class="w-full text-center">{n + 1}</div>
                                        {/each}
                                    </div>
                                    <textarea
                                        bind:value={editContent}
                                        class="flex-1 bg-transparent border-none focus:ring-0 text-zinc-300 font-mono text-sm p-6 resize-none outline-none custom-scrollbar"
                                        style="line-height: 1.625rem; min-height: 420px"
                                        placeholder="# Prompt content here..."
                                        spellcheck="false"
                                    ></textarea>
                                </div>
                            </div>
                        {:else}
                            <!-- Empty state -->
                            <div class="flex flex-col items-center justify-center py-24 text-center">
                                <div class="w-20 h-20 rounded-2xl bg-surface-container-low flex items-center justify-center mb-6">
                                    <span class="material-symbols-outlined text-outline" style="font-size:40px">cognition</span>
                                </div>
                                <h3 class="text-xl font-headline font-extrabold text-on-surface mb-2">AI Instruction Engine</h3>
                                <p class="text-sm text-on-surface-variant max-w-xs mx-auto leading-relaxed mb-6">위 탭에서 프롬프트를 선택하거나 새 프롬프트를 추가하세요.</p>
                            </div>
                        {/if}
                    </div>

                    <!-- History Sidebar (right panel, toggleable) -->
                    {#if showHistory && (isCreating || selectedId)}
                        <aside class="w-72 flex-shrink-0 border-l border-surface-container-high overflow-y-auto custom-scrollbar bg-surface-container-low/50">
                            <div class="p-6 space-y-4">
                                <div class="flex items-center justify-between">
                                    <h3 class="font-headline font-bold text-base text-on-surface">Version History</h3>
                                    <button class="p-1.5 hover:bg-surface-container-high rounded-lg transition-colors text-on-surface-variant"
                                            on:click={() => (showHistory = false)}>
                                        <span class="material-symbols-outlined" style="font-size:18px">close</span>
                                    </button>
                                </div>
                                <p class="text-[10px] text-on-surface-variant font-medium">수정 이력 · Click to restore</p>

                                <div class="space-y-2 mt-2">
                                    {#if currentPrompt}
                                        <div class="flex items-start justify-between p-4 bg-white rounded-xl border border-primary/20 cursor-default group hover:border-primary transition-all">
                                            <div class="flex items-start gap-3">
                                                <div class="p-1.5 bg-primary/10 rounded-lg text-primary flex-shrink-0 mt-0.5">
                                                    <span class="material-symbols-outlined" style="font-size:16px">history</span>
                                                </div>
                                                <div>
                                                    <p class="text-xs font-bold text-on-surface">v{currentPrompt.version} — {currentPrompt.description || currentPrompt.id}</p>
                                                    <p class="text-[10px] text-on-surface-variant mt-0.5">{SYSTEM_PROMPT_IDS.has(currentPrompt.id) ? 'System Managed' : 'User Defined'} · ID: {currentPrompt.id}</p>
                                                </div>
                                            </div>
                                            <span class="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">CURRENT</span>
                                        </div>
                                    {:else}
                                        <p class="text-sm text-on-surface-variant text-center py-8">No history available.</p>
                                    {/if}
                                </div>

                                <div class="pt-4 border-t border-surface-container-high">
                                    <p class="text-[10px] text-on-surface-variant leading-relaxed">
                                        전체 버전 이력 추적 기능은 향후 업데이트에서 제공될 예정입니다.
                                    </p>
                                </div>
                            </div>
                        </aside>
                    {/if}

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
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
    }
</style>
