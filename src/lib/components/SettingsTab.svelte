<script lang="ts">
    import { onMount } from "svelte";

    export let geminiKey: string;

    let saveMsgVisible = false;
    let confirmDelete = true;

    interface Category {
        id: number;
        name: string;
        color: string;
        sort_order?: number; // Added sort_order to interface
    }

    let categories: Category[] = [];
    let prompts: Prompt[] = [];

    import {
        createCategory,
        deleteCategory,
        updateCategory,
        fetchCategories,
        fetchPrompts,
        updatePrompt,
        type Prompt,
    } from "$lib/db";

    onMount(async () => {
        const cd = localStorage.getItem("confirmDelete");
        confirmDelete = cd === null ? true : cd === "true";

        categories = await fetchCategories();
        // ensure existing categories without sort_order don't break
        categories.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

        prompts = await fetchPrompts();
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
        if (index > 0) {
            const temp = categories[index];
            categories[index] = categories[index - 1];
            categories[index - 1] = temp;
            categories = [...categories];
        }
    }

    function moveCategoryDown(index: number) {
        if (index < categories.length - 1) {
            const temp = categories[index];
            categories[index] = categories[index + 1];
            categories[index + 1] = temp;
            categories = [...categories];
        }
    }

    async function saveSettings() {
        localStorage.setItem("geminiKey", geminiKey);
        localStorage.setItem("confirmDelete", String(confirmDelete));

        // Update all categories in DB
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

        // Update all prompts in DB
        for (const prompt of prompts) {
            await updatePrompt(prompt.id, {
                content: prompt.content,
                version: prompt.version,
            });
        }
        localStorage.setItem("prompts", JSON.stringify(prompts));

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
            <div
                class="category-list"
                style="max-height: 400px; overflow-y: auto; padding-right: 8px;"
            >
                {#each categories as cat, i (cat.id)}
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
                        <div
                            style="display: flex; gap: 4px; margin-left: auto;"
                        >
                            <button
                                class="btn-icon"
                                style="width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem;"
                                on:click={() => moveCategoryUp(i)}
                                disabled={i === 0}
                                aria-label="위로"
                            >
                                ▲
                            </button>
                            <button
                                class="btn-icon"
                                style="width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem;"
                                on:click={() => moveCategoryDown(i)}
                                disabled={i === categories.length - 1}
                                aria-label="아래로"
                            >
                                ▼
                            </button>
                            <button
                                class="btn-remove-category"
                                on:click={() => removeCategory(cat.id)}
                                aria-label="삭제">×</button
                            >
                        </div>
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
                AI 프롬프트 설정
            </h3>
            <div class="subtitle" style="margin-bottom: 12px;">
                AI 자동 생성 시 사용될 프롬프트를 버저닝하여 관리할 수 있습니다.
            </div>

            <div
                class="prompt-list"
                style="display: flex; flex-direction: column; gap: 20px;"
            >
                {#each prompts as prompt (prompt.id)}
                    <div
                        class="prompt-card"
                        style="border: 1px solid var(--mac-border); border-radius: 8px; padding: 16px; background: #fafafa;"
                    >
                        <div
                            style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;"
                        >
                            <strong style="font-size: 0.9rem; color: #333;"
                                >{prompt.description}</strong
                            >
                            <div
                                style="display: flex; align-items: center; gap: 8px;"
                            >
                                <label style="font-size: 0.8rem; color: #666;"
                                    >버전:</label
                                >
                                <input
                                    type="text"
                                    bind:value={prompt.version}
                                    class="form-control"
                                    style="width: 60px; padding: 4px; font-size: 0.8rem;"
                                />
                            </div>
                        </div>
                        <textarea
                            bind:value={prompt.content}
                            class="form-control"
                            style="width: 100%; min-height: 120px; font-size: 0.85rem; font-family: monospace; resize: vertical;"
                            placeholder="프롬프트 내용을 입력하세요..."
                        ></textarea>
                    </div>
                {/each}
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
