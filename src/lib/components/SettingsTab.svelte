<script lang="ts">
    import { onMount } from "svelte";
    import { geminiKey } from "$lib/stores";
    import {
        createCategory,
        deleteCategory,
        updateCategory,
        fetchCategories,
    } from "$lib/services/categories";
    import type { Category } from "$lib/types/models";
    import { moveItemUp, moveItemDown } from "$lib/utils/arrayUtils";

    let saveMsgVisible = false;
    let confirmDelete = true;
    let activeSection: "api" | "categories" | "general" = "api";

    let categories: Category[] = [];

    onMount(async () => {
        const cd = localStorage.getItem("confirmDelete");
        confirmDelete = cd === null ? true : cd === "true";

        categories = await fetchCategories();
        categories.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    });

    async function addCategory() {
        const newCat = await createCategory("새 카테고리", "#cccccc");
        if (newCat) {
            categories = [...categories, newCat];
        }
    }

    async function removeCategory(id: number) {
        const success = await deleteCategory(id);
        if (success) {
            categories = categories.filter((c) => c.id !== id);
        }
    }

    function moveCategoryUp(index: number) {
        categories = moveItemUp(categories, index);
    }

    function moveCategoryDown(index: number) {
        categories = moveItemDown(categories, index);
    }

    async function saveSettings() {
        localStorage.setItem("geminiKey", $geminiKey);
        localStorage.setItem("confirmDelete", String(confirmDelete));

        for (let i = 0; i < categories.length; i++) {
            const cat = categories[i];
            await updateCategory(cat.id, {
                name: cat.name,
                color: cat.color,
                sort_order: i,
            });
            cat.sort_order = i;
        }
        localStorage.setItem("menuCategories", JSON.stringify(categories));

        saveMsgVisible = true;
        setTimeout(() => {
            saveMsgVisible = false;
        }, 2000);
    }

    const sectionMeta = [
        { id: "api",        icon: "🔑", label: "API 연동" },
        { id: "categories", icon: "🏷️", label: "카테고리" },
        { id: "general",    icon: "⚙️", label: "일반" },
    ] as const;
</script>

<div class="settings-layout">
    <!-- ── 왼쪽 사이드바 ── -->
    <nav class="settings-nav">
        <div class="nav-title">환경설정</div>

        {#each sectionMeta as sec}
            <button
                class="nav-item"
                class:active={activeSection === sec.id}
                on:click={() => (activeSection = sec.id)}
            >
                <span class="nav-icon">{sec.icon}</span>
                {sec.label}
            </button>
        {/each}

        <div class="nav-footer">
            <button class="btn-save" on:click={saveSettings}>저장</button>
            {#if saveMsgVisible}
                <div class="save-toast">저장됨 ✓</div>
            {/if}
        </div>
    </nav>

    <!-- ── 오른쪽 컨텐츠 ── -->
    <div class="settings-content">

        <!-- API 연동 -->
        {#if activeSection === "api"}
            <div class="section-header">
                <h2>API 연동</h2>
                <p>AI 기능 사용을 위한 Gemini API 키를 설정합니다.</p>
            </div>

            <div class="settings-card">
                <div class="field-label">Gemini API 키</div>
                <input
                    type="password"
                    bind:value={$geminiKey}
                    placeholder="AIzaSy..."
                    class="field-input"
                />
                <div class="field-hint">
                    런타임 키는 환경변수 <code>PUBLIC_GEMINI_API_KEY</code>보다 우선 적용됩니다.
                    설정 저장 후 즉시 반영됩니다.
                </div>
            </div>

        <!-- 카테고리 -->
        {:else if activeSection === "categories"}
            <div class="section-header">
                <h2>카테고리</h2>
                <p>메뉴에 붙는 카테고리와 색상을 관리합니다. 순서를 조정하면 필터 바에도 반영됩니다.</p>
            </div>

            <div class="settings-card cat-card">
                {#each categories as cat, i (cat.id)}
                    <div class="category-row">
                        <input
                            type="color"
                            bind:value={cat.color}
                            class="color-picker"
                            title="색상 선택"
                        />
                        <div
                            class="cat-color-swatch"
                            style="background:{cat.color};"
                        ></div>
                        <input
                            type="text"
                            bind:value={cat.name}
                            class="category-name-input"
                            placeholder="카테고리명"
                        />
                        <div class="cat-actions">
                            <button
                                class="cat-order-btn"
                                on:click={() => moveCategoryUp(i)}
                                disabled={i === 0}
                                aria-label="위로"
                            >▲</button>
                            <button
                                class="cat-order-btn"
                                on:click={() => moveCategoryDown(i)}
                                disabled={i === categories.length - 1}
                                aria-label="아래로"
                            >▼</button>
                            <button
                                class="cat-remove-btn"
                                on:click={() => removeCategory(cat.id)}
                                aria-label="삭제"
                            >×</button>
                        </div>
                    </div>
                {/each}
                <button class="btn-add-category" on:click={addCategory}>
                    + 카테고리 추가
                </button>
            </div>

        <!-- 일반 -->
        {:else if activeSection === "general"}
            <div class="section-header">
                <h2>일반</h2>
                <p>앱의 기본 동작 방식을 설정합니다.</p>
            </div>

            <div class="settings-card">
                <label class="toggle-row">
                    <div class="toggle-info">
                        <div class="toggle-title">삭제 확인 대화 상자</div>
                        <div class="toggle-desc">메뉴 삭제 시 확인 창을 표시합니다.</div>
                    </div>
                    <input
                        type="checkbox"
                        bind:checked={confirmDelete}
                        class="toggle-checkbox"
                    />
                </label>
            </div>
        {/if}
    </div>
</div>

<style>
    .settings-layout {
        display: flex;
        height: 100%;
        overflow: hidden;
        background: #f5f5f7;
    }

    /* ── 사이드바 ── */
    .settings-nav {
        width: 180px;
        flex-shrink: 0;
        background: #ebebeb;
        border-right: 1px solid #c8c8c8;
        display: flex;
        flex-direction: column;
        padding: 1.2rem 0.75rem;
        gap: 2px;
    }

    .nav-title {
        font-size: 0.7rem;
        font-weight: 700;
        color: #999;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        padding: 0 8px;
        margin-bottom: 10px;
    }

    .nav-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 7px 10px;
        border: none;
        border-radius: 7px;
        background: transparent;
        font-size: 0.88rem;
        color: #444;
        cursor: pointer;
        text-align: left;
        transition: background 0.15s;
        font-family: inherit;
    }

    .nav-item:hover {
        background: #dcdcdc;
    }

    .nav-item.active {
        background: #007aff;
        color: white;
        font-weight: 500;
    }

    .nav-icon {
        font-size: 1rem;
        flex-shrink: 0;
    }

    .nav-footer {
        margin-top: auto;
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding-top: 16px;
    }

    .btn-save {
        width: 100%;
        padding: 8px;
        background: #007aff;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 0.88rem;
        font-weight: 600;
        cursor: pointer;
        font-family: inherit;
        transition: background 0.15s;
    }

    .btn-save:hover {
        background: #006ae6;
    }

    .save-toast {
        text-align: center;
        font-size: 0.78rem;
        color: #27c93f;
        font-weight: 500;
    }

    /* ── 컨텐츠 영역 ── */
    .settings-content {
        flex: 1;
        padding: 2rem 2.5rem;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .section-header {
        margin-bottom: 4px;
    }

    .section-header h2 {
        margin: 0 0 4px;
        font-size: 1.15rem;
        font-weight: 700;
        color: #1c1c1e;
    }

    .section-header p {
        margin: 0;
        font-size: 0.83rem;
        color: #888;
    }

    /* ── 공통 카드 ── */
    .settings-card {
        background: white;
        border: 1px solid #d8d8d8;
        border-radius: 12px;
        padding: 18px 20px;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .field-label {
        font-size: 0.82rem;
        font-weight: 600;
        color: #555;
    }

    .field-input {
        padding: 9px 13px;
        border: 1px solid #c8c8c8;
        border-radius: 8px;
        font-size: 0.9rem;
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
        font-family: inherit;
    }

    .field-input:focus {
        border-color: #007aff;
        box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.18);
    }

    .field-hint {
        font-size: 0.78rem;
        color: #999;
        line-height: 1.5;
    }

    .field-hint code {
        background: #f1f3f5;
        padding: 1px 5px;
        border-radius: 4px;
        font-size: 0.75rem;
        color: #555;
    }

    /* ── 카테고리 ── */
    .cat-card {
        padding: 12px;
        gap: 6px;
    }

    .category-row {
        display: flex;
        align-items: center;
        gap: 10px;
        background: #f8f9fa;
        padding: 8px 10px;
        border-radius: 8px;
        border: 1px solid #eeeeee;
    }

    .cat-color-swatch {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        flex-shrink: 0;
        border: 1px solid rgba(0,0,0,0.1);
        margin-left: -6px;
    }

    .cat-actions {
        display: flex;
        gap: 3px;
        margin-left: auto;
    }

    .cat-order-btn {
        width: 26px;
        height: 26px;
        border: 1px solid #ddd;
        background: white;
        border-radius: 5px;
        font-size: 0.65rem;
        cursor: pointer;
        color: #666;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        transition: background 0.15s;
    }

    .cat-order-btn:hover:not(:disabled) {
        background: #f0f0f0;
    }

    .cat-order-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }

    .cat-remove-btn {
        width: 26px;
        height: 26px;
        border: none;
        background: none;
        border-radius: 5px;
        font-size: 1.1rem;
        cursor: pointer;
        color: #bbb;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        transition: color 0.15s;
    }

    .cat-remove-btn:hover {
        color: #fa5252;
    }

    /* ── 프롬프트 아코디언 ── */
    .prompt-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .prompt-accordion {
        background: white;
        border: 1px solid #d8d8d8;
        border-radius: 12px;
        overflow: hidden;
        transition: box-shadow 0.2s;
    }

    .prompt-accordion.open {
        box-shadow: 0 2px 12px rgba(0,0,0,0.07);
    }

    .prompt-accordion-header {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 18px;
        border: none;
        background: transparent;
        cursor: pointer;
        font-family: inherit;
        text-align: left;
        gap: 10px;
    }

    .prompt-accordion-header:hover {
        background: #fafafa;
    }

    .prompt-title-group {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
    }

    .prompt-name {
        font-size: 0.9rem;
        font-weight: 600;
        color: #333;
    }

    .prompt-id-badge {
        font-size: 0.72rem;
        background: #f1f3f5;
        color: #666;
        padding: 2px 7px;
        border-radius: 10px;
        font-family: monospace;
    }

    .system-badge {
        font-size: 0.7rem;
        background: #fff3cd;
        color: #856404;
        padding: 2px 7px;
        border-radius: 10px;
        font-weight: 500;
    }

    .accordion-chevron {
        font-size: 0.65rem;
        color: #aaa;
        flex-shrink: 0;
    }

    .prompt-accordion-body {
        padding: 0 18px 18px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        border-top: 1px solid #f0f0f0;
        padding-top: 14px;
    }

    .prompt-desc {
        font-size: 0.78rem;
        color: #888;
    }

    .system-notice {
        font-size: 0.78rem;
        color: #856404;
        background: #fff8e1;
        border: 1px solid #ffe082;
        border-radius: 7px;
        padding: 8px 12px;
        line-height: 1.5;
    }

    .prompt-meta-row {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .meta-label {
        font-size: 0.78rem;
        color: #888;
        font-weight: 500;
    }

    .version-input {
        width: 64px;
        padding: 4px 8px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 0.8rem;
        outline: none;
        font-family: monospace;
    }

    .version-input:focus {
        border-color: #007aff;
    }

    .prompt-textarea {
        width: 100%;
        min-height: 160px;
        padding: 10px 12px;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 0.82rem;
        font-family: "SF Mono", "Menlo", monospace;
        resize: vertical;
        outline: none;
        line-height: 1.55;
        box-sizing: border-box;
        color: #333;
    }

    .prompt-textarea:focus {
        border-color: #007aff;
        box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.15);
    }

    /* ── 일반 ── */
    .toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        cursor: pointer;
    }

    .toggle-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .toggle-title {
        font-size: 0.88rem;
        font-weight: 500;
        color: #333;
    }

    .toggle-desc {
        font-size: 0.78rem;
        color: #999;
    }

    .toggle-checkbox {
        width: 18px;
        height: 18px;
        cursor: pointer;
        flex-shrink: 0;
        accent-color: #007aff;
    }
</style>
