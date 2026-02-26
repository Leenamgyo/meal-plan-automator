<script lang="ts">
    import { onMount } from "svelte";

    export let geminiKey: string;
    export let supabaseUrl: string;
    export let supabaseKey: string;

    let saveMsgVisible = false;
    let confirmDelete = true;

    onMount(() => {
        const cd = localStorage.getItem("confirmDelete");
        confirmDelete = cd === null ? true : cd === "true";
    });

    function saveSettings() {
        localStorage.setItem("geminiKey", geminiKey);
        localStorage.setItem("supabaseUrl", supabaseUrl);
        localStorage.setItem("supabaseKey", supabaseKey);
        localStorage.setItem("confirmDelete", String(confirmDelete));
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

        <div class="form-group" style="margin-top:2rem;">
            <label for="supabase-url">Supabase 프로젝트 URL</label>
            <input
                type="text"
                id="supabase-url"
                bind:value={supabaseUrl}
                placeholder="https://your-project.supabase.co"
            />
        </div>

        <div class="form-group">
            <label for="supabase-key">Supabase API 키 (anon/public)</label>
            <input
                type="password"
                id="supabase-key"
                bind:value={supabaseKey}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            />
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

        <div style="margin-top: 1.5rem;">
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
