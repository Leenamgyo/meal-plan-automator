<script lang="ts">
    import { askGemini } from "$lib/gemini";
    import { PUBLIC_GEMINI_API_KEY } from "$env/static/public";

    export let geminiKey: string;

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
        messages = [...messages, { role: "user", text: userMsg }];

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

<div class="chat-container">
    <div class="chat-messages">
        <div class="message ai">안녕하세요! 무엇을 도와드릴까요?</div>

        {#each messages as msg}
            <div class="message {msg.role}">{msg.text}</div>
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
