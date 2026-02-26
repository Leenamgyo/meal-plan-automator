<script lang="ts">
    import "../app.css";

    let activeTab = "main";

    let geminiKey = "";
    let supabaseUrl = "";
    let supabaseKey = "";
    let saveMsgVisible = false;

    // Load settings
    import { onMount } from "svelte";
    onMount(() => {
        geminiKey = localStorage.getItem("geminiKey") || "";
        supabaseUrl = localStorage.getItem("supabaseUrl") || "";
        supabaseKey = localStorage.getItem("supabaseKey") || "";
    });

    function saveSettings() {
        localStorage.setItem("geminiKey", geminiKey);
        localStorage.setItem("supabaseUrl", supabaseUrl);
        localStorage.setItem("supabaseKey", supabaseKey);

        saveMsgVisible = true;
        setTimeout(() => {
            saveMsgVisible = false;
        }, 2000);
    }

    let activeSidebar = "새 식단 입력";
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
            class:active={activeTab === "main"}
            on:click={() => (activeTab = "main")}
        >
            <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
            >
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            </svg>
            식단 변환기
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
    {#if activeTab === "main"}
        <!-- Main Tab (Split Layout) -->
        <div class="tab-content active" style="display: flex;">
            <!-- Sidebar -->
            <div class="sidebar">
                <div
                    style="font-weight:600; font-size: 0.85rem; color:#888; margin-bottom: 8px;"
                >
                    메뉴
                </div>
                <button
                    class="sidebar-item"
                    class:selected={activeSidebar === "새 식단 입력"}
                    on:click={() => (activeSidebar = "새 식단 입력")}
                >
                    새 식단 입력
                </button>
                <button
                    class="sidebar-item"
                    class:selected={activeSidebar === "최근 변환 기록"}
                    on:click={() => (activeSidebar = "최근 변환 기록")}
                >
                    최근 변환 기록
                </button>
                <button
                    class="sidebar-item"
                    class:selected={activeSidebar === "저장된 식단 목록"}
                    on:click={() => (activeSidebar = "저장된 식단 목록")}
                >
                    저장된 식단 목록
                </button>
            </div>

            <!-- Content Area -->
            <div class="content-area">
                <div class="action-toolbar">
                    <button class="btn-mac" id="btn-convert"
                        >AI 변환 실행하기</button
                    >
                    <span style="font-size: 0.9rem; color: #666;"
                        >대기 중...</span
                    >
                </div>

                <div class="input-area">
                    <div style="display: flex; gap: 1rem; height: 100%;">
                        <div
                            style="flex: 1; display: flex; flex-direction: column;"
                        >
                            <label
                                style="font-size:0.85rem; font-weight:600; margin-bottom:8px; color:#555;"
                                >입력 (원문 텍스트)</label
                            >
                            <textarea
                                class="mac-textarea"
                                placeholder="여기에 식단 텍스트를 붙여넣으세요..."
                            ></textarea>
                        </div>
                        <div
                            style="flex: 1; display: flex; flex-direction: column;"
                        >
                            <label
                                style="font-size:0.85rem; font-weight:600; margin-bottom:8px; color:#555;"
                                >출력 (정형화된 데이터)</label
                            >
                            <textarea
                                class="mac-textarea"
                                placeholder="Gemini API 변환 결과가 이곳에 표시됩니다..."
                                readonly
                                style="background:#f9f9f9;"
                            ></textarea>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    {:else if activeTab === "settings"}
        <!-- Settings Tab -->
        <div class="tab-content active" style="display: block; padding: 2rem;">
            <div class="settings-container">
                <h2>환경설정</h2>
                <div class="subtitle">
                    API 연동을 위한 키와 URL을 설정합니다.
                </div>

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
                    <label for="supabase-key"
                        >Supabase API 키 (anon/public)</label
                    >
                    <input
                        type="password"
                        id="supabase-key"
                        bind:value={supabaseKey}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    />
                </div>

                <div style="margin-top: 1.5rem;">
                    <button on:click={saveSettings} class="btn-mac"
                        >설정 저장</button
                    >
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
    {/if}
</main>
