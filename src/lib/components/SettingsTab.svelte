<script lang="ts">
    import { onMount } from "svelte";
    import {
        dummyCategories,
        generateDummyMenus,
        generateRandomMealPlan,
    } from "$lib/dummyData";

    export let geminiKey: string;

    let saveMsgVisible = false;
    let confirmDelete = true;

    interface Category {
        id: string;
        name: string;
        color: string;
    }

    const defaultCategories: Category[] = [...dummyCategories];

    let categories: Category[] = [];

    onMount(() => {
        const cd = localStorage.getItem("confirmDelete");
        confirmDelete = cd === null ? true : cd === "true";

        const savedCats = localStorage.getItem("menuCategories");
        if (savedCats) {
            categories = JSON.parse(savedCats);
        } else {
            categories = [...defaultCategories];
            localStorage.setItem("menuCategories", JSON.stringify(categories));
        }
    });

    function addCategory() {
        categories = [
            ...categories,
            { id: `cat-${Date.now()}`, name: "새 카테고리", color: "#cccccc" },
        ];
    }

    function removeCategory(id: string) {
        categories = categories.filter((c) => c.id !== id);
    }

    function saveSettings() {
        localStorage.setItem("geminiKey", geminiKey);
        localStorage.setItem("confirmDelete", String(confirmDelete));
        localStorage.setItem("menuCategories", JSON.stringify(categories));
        saveMsgVisible = true;
        setTimeout(() => {
            saveMsgVisible = false;
        }, 2000);
    }
</script>

<div class="tab-content active" style="display: block; padding: 2rem;">
    <div class="settings-container">
        <h2>환경설정</h2>
        <div class="subtitle">API 연동을 위한 키와 URL을 설정합니다.</div>

        <div class="form-group">
            <label for="gemini-key">Gemini API 키</label>
            <input
                type="password"
                id="gemini-key"
                bind:value={geminiKey}
                placeholder="AIzaSy..."
            />
        </div>

        <div class="form-group" style="margin-top: 2rem;">
            <h3
                style="margin: 0 0 12px 0; font-size: 0.95rem; font-weight: 600;"
            >
                카테고리 설정
            </h3>
            <div class="subtitle" style="margin-bottom: 12px;">
                식단표에 표시될 카테고리와 식상(색상)을 설정합니다.
            </div>
            <div class="category-list">
                {#each categories as cat (cat.id)}
                    <div class="category-row">
                        <input
                            type="color"
                            bind:value={cat.color}
                            class="color-picker"
                        />
                        <input
                            type="text"
                            bind:value={cat.name}
                            class="category-name-input"
                            placeholder="카테고리명"
                        />
                        <button
                            class="btn-remove-category"
                            on:click={() => removeCategory(cat.id)}
                            aria-label="삭제">×</button
                        >
                    </div>
                {/each}
                <button class="btn-add-category" on:click={addCategory}
                    >+ 카테고리 추가</button
                >
            </div>
        </div>

        <div class="form-group" style="margin-top: 2rem;">
            <h3
                style="margin: 0 0 12px 0; font-size: 0.95rem; font-weight: 600;"
            >
                일반 설정
            </h3>
            <label
                class="toggle-label"
                for="confirm-delete"
                style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.9rem;"
            >
                <input
                    type="checkbox"
                    id="confirm-delete"
                    bind:checked={confirmDelete}
                    style="width: 16px; height: 16px; cursor: pointer;"
                />
                메뉴 삭제 시 확인 대화 상자 표시
            </label>
        </div>

        <div
            style="margin-top: 1.5rem; display: flex; gap: 12px; align-items: center; flex-wrap: wrap;"
        >
            <button on:click={saveSettings} class="btn-mac">설정 저장</button>
            {#if saveMsgVisible}
                <span
                    style="margin-left:12px; font-size:0.85rem; color:#27c93f;"
                    >저장되었습니다!</span
                >
            {/if}
        </div>
    </div>
    <div class="version-footer">Meal Chart App - SvelteKit Edition</div>
</div>
