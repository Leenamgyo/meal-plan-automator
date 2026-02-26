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

    // AI Chat Integration
    import { askGemini } from "$lib/gemini";
    import { PUBLIC_GEMINI_API_KEY } from "$env/static/public";

    interface Message {
        role: "user" | "ai";
        text: string;
    }

    let inputText = "";
    let messages: Message[] = [];
    let isConverting = false;

    async function handleSend() {
        if (!inputText.trim() || isConverting) return;

        const userMsg = inputText.trim();
        inputText = "";

        // Add user message
        messages = [...messages, { role: "user", text: userMsg }];

        // Check API Key
        const apiKey = PUBLIC_GEMINI_API_KEY || geminiKey;
        if (!apiKey) {
            messages = [
                ...messages,
                {
                    role: "ai",
                    text: "오류: Gemini API 키가 설정되지 않았습니다. 환경설정 탭에서 키를 입력해주세요.",
                },
            ];
            return;
        }

        isConverting = true;

        try {
            const aiResponse = await askGemini(userMsg, apiKey);
            messages = [...messages, { role: "ai", text: aiResponse }];
        } catch (error: any) {
            console.error(error);
            messages = [
                ...messages,
                { role: "ai", text: `오류 발생: ${error.message}` },
            ];
        } finally {
            isConverting = false;

            // Auto scroll to bottom
            setTimeout(() => {
                const chatContainer = document.querySelector(".chat-messages");
                if (chatContainer)
                    chatContainer.scrollTop = chatContainer.scrollHeight;
            }, 10);
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }
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
        <!-- Main Tab: Simple AI Chat -->
        <div class="chat-container">
            <div class="chat-messages">
                <div class="message ai">안녕하세요! 무엇을 도와드릴까요?</div>

                {#each messages as msg}
                    <div class="message {msg.role}">
                        {msg.text}
                    </div>
                {/each}

                {#if isConverting}
                    <div class="message ai">
                        <div class="loading-dots">
                            <div class="dot"></div>
                            <div class="dot"></div>
                            <div class="dot"></div>
                        </div>
                    </div>
                {/if}
            </div>

            <div class="chat-input-area">
                <textarea
                    class="chat-input"
                    placeholder="질문을 입력하세요..."
                    rows="1"
                    bind:value={inputText}
                    on:keydown={handleKeydown}
                ></textarea>
                <button
                    class="btn-send"
                    on:click={handleSend}
                    disabled={isConverting || !inputText.trim()}
                    aria-label="메시지 전송"
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
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
