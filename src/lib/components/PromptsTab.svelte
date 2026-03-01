<script lang="ts">
    import { onMount } from "svelte";
    import {
        fetchPrompts,
        updatePrompt,
        createPrompt,
        deletePrompt,
    } from "$lib/services/prompts";
    import type { Prompt } from "$lib/types/models";

    const SYSTEM_PROMPT_IDS = new Set(["json_parser", "chat_base", "auto_gen"]);

    let prompts: Prompt[] = [];
    let selectedId: string | null = null;
    let isCreating = false;
    let isSaving = false;
    let saveMsg = "";

    // 에디터 상태
    let editId = "";
    let editDescription = "";
    let editVersion = "";
    let editContent = "";
    let idError = "";

    onMount(async () => {
        prompts = await fetchPrompts();
        if (prompts.length > 0) selectPrompt(prompts[0].id);
    });

    function selectPrompt(id: string) {
        isCreating = false;
        selectedId = id;
        idError = "";
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
    }

    async function handleSave() {
        if (!editContent.trim()) return;
        isSaving = true;
        saveMsg = "";
        try {
            if (isCreating) {
                if (!editId.trim()) { idError = "ID는 필수입니다."; return; }
                if (!/^[a-z0-9_]+$/.test(editId)) {
                    idError = "영소문자, 숫자, 밑줄(_)만 사용 가능합니다.";
                    return;
                }
                const created = await createPrompt({
                    id: editId.trim(),
                    description: editDescription,
                    content: editContent,
                    version: editVersion || "1.0",
                });
                prompts = [...prompts, created];
                isCreating = false;
                selectedId = created.id;
                saveMsg = "생성됨!";
            } else if (selectedId) {
                await updatePrompt(selectedId, {
                    content: editContent,
                    version: editVersion,
                });
                // 로컬 목록 업데이트
                prompts = prompts.map((p) =>
                    p.id === selectedId
                        ? { ...p, content: editContent, version: editVersion, description: editDescription }
                        : p
                );
                saveMsg = "저장됨!";
            }
        } catch (e: any) {
            saveMsg = `오류: ${e.message}`;
        } finally {
            isSaving = false;
            setTimeout(() => (saveMsg = ""), 2500);
        }
    }

    async function handleDelete() {
        if (!selectedId || SYSTEM_PROMPT_IDS.has(selectedId)) return;
        if (!confirm(`'${selectedId}' 프롬프트를 삭제하시겠습니까?`)) return;
        const ok = await deletePrompt(selectedId);
        if (ok) {
            prompts = prompts.filter((p) => p.id !== selectedId);
            selectedId = prompts.length > 0 ? prompts[0].id : null;
            if (selectedId) selectPrompt(selectedId);
            else { editId = ""; editContent = ""; editDescription = ""; editVersion = ""; }
        }
    }

    $: isSystem = !isCreating && !!selectedId && SYSTEM_PROMPT_IDS.has(selectedId ?? "");
</script>

<div class="prompts-layout">
    <!-- ── 왼쪽 목록 ── -->
    <aside class="prompts-list-panel">
        <div class="list-header">
            <span class="list-title">프롬프트</span>
            <button class="btn-new" on:click={startCreate} title="새 프롬프트">+</button>
        </div>

        <ul class="prompt-list">
            {#each prompts as p (p.id)}
                <li>
                    <button
                        class="prompt-item"
                        class:active={selectedId === p.id && !isCreating}
                        on:click={() => selectPrompt(p.id)}
                    >
                        <div class="item-name">{p.id}</div>
                        <div class="item-desc">{p.description || "설명 없음"}</div>
                        {#if SYSTEM_PROMPT_IDS.has(p.id)}
                            <span class="sys-dot" title="시스템 프롬프트"></span>
                        {/if}
                    </button>
                </li>
            {/each}
        </ul>

        <div class="list-legend">
            <span class="sys-dot"></span> 시스템 관리
        </div>
    </aside>

    <!-- ── 오른쪽 에디터 ── -->
    <div class="prompts-editor-panel">
        {#if isCreating || selectedId}
            <div class="editor-header">
                <div class="editor-title">
                    {#if isCreating}
                        새 프롬프트
                    {:else}
                        <span>{selectedId}</span>
                        {#if isSystem}
                            <span class="badge-system">시스템 관리</span>
                        {/if}
                    {/if}
                </div>
                <div class="editor-actions">
                    {#if !isCreating && !isSystem}
                        <button class="btn-delete" on:click={handleDelete}>삭제</button>
                    {/if}
                    <button
                        class="btn-save"
                        on:click={handleSave}
                        disabled={isSaving || !editContent.trim()}
                    >
                        {isSaving ? "저장 중..." : isCreating ? "생성" : "저장"}
                    </button>
                    {#if saveMsg}
                        <span class="save-msg" class:err={saveMsg.startsWith("오류")}>{saveMsg}</span>
                    {/if}
                </div>
            </div>

            <div class="editor-fields">
                {#if isCreating}
                    <div class="field-row">
                        <label class="field-label" for="prompt-id">ID <span class="required">*</span></label>
                        <input
                            id="prompt-id"
                            type="text"
                            bind:value={editId}
                            placeholder="my_prompt (영소문자·숫자·_ 만)"
                            class="field-input"
                            class:error={!!idError}
                        />
                        {#if idError}<span class="field-error">{idError}</span>{/if}
                    </div>
                {/if}

                <div class="meta-row">
                    <div class="field-row" style="flex: 1;">
                        <label class="field-label" for="prompt-desc">설명</label>
                        <input
                            id="prompt-desc"
                            type="text"
                            bind:value={editDescription}
                            placeholder="이 프롬프트의 용도를 입력하세요"
                            class="field-input"
                            disabled={!isCreating && isSystem}
                        />
                    </div>
                    <div class="field-row" style="width: 90px; flex-shrink: 0;">
                        <label class="field-label" for="prompt-ver">버전</label>
                        <input
                            id="prompt-ver"
                            type="text"
                            bind:value={editVersion}
                            placeholder="1.0"
                            class="field-input"
                        />
                    </div>
                </div>

                {#if isSystem}
                    <div class="system-notice">
                        ⚠️ 이 프롬프트는 앱 재시작 시 시스템에 의해 초기화됩니다. 현재 세션에서만 수정이 유지됩니다.
                    </div>
                {/if}

                <div class="field-row" style="flex: 1; display: flex; flex-direction: column;">
                    <label class="field-label">내용</label>
                    <textarea
                        bind:value={editContent}
                        class="prompt-textarea"
                        placeholder="프롬프트 내용을 입력하세요..."
                    ></textarea>
                </div>
            </div>
        {:else}
            <div class="empty-editor">
                <p>왼쪽에서 프롬프트를 선택하거나</p>
                <button class="btn-save" on:click={startCreate}>+ 새 프롬프트 만들기</button>
            </div>
        {/if}
    </div>
</div>

<style>
    .prompts-layout {
        display: flex;
        height: 100%;
        overflow: hidden;
        background: #f5f5f7;
    }

    /* ── 목록 패널 ── */
    .prompts-list-panel {
        width: 220px;
        flex-shrink: 0;
        background: #ebebeb;
        border-right: 1px solid #c8c8c8;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .list-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 14px 10px;
        flex-shrink: 0;
    }

    .list-title {
        font-size: 0.72rem;
        font-weight: 700;
        color: #999;
        text-transform: uppercase;
        letter-spacing: 0.08em;
    }

    .btn-new {
        width: 22px;
        height: 22px;
        border: none;
        background: #007aff;
        color: white;
        border-radius: 50%;
        font-size: 1rem;
        line-height: 1;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        padding: 0;
    }

    .btn-new:hover { background: #006ae6; }

    .prompt-list {
        list-style: none;
        margin: 0;
        padding: 0 8px;
        overflow-y: auto;
        flex: 1;
    }

    .prompt-item {
        width: 100%;
        padding: 9px 10px;
        border: none;
        border-radius: 8px;
        background: transparent;
        text-align: left;
        cursor: pointer;
        font-family: inherit;
        display: flex;
        flex-direction: column;
        gap: 2px;
        position: relative;
        transition: background 0.15s;
        margin-bottom: 2px;
    }

    .prompt-item:hover { background: #dcdcdc; }
    .prompt-item.active { background: #007aff; }
    .prompt-item.active .item-name { color: white; }
    .prompt-item.active .item-desc { color: rgba(255,255,255,0.75); }

    .item-name {
        font-size: 0.84rem;
        font-weight: 600;
        color: #333;
        font-family: "SF Mono", monospace;
    }

    .item-desc {
        font-size: 0.73rem;
        color: #888;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .sys-dot {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #ffbd2e;
        flex-shrink: 0;
    }

    .list-legend {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 8px 14px;
        font-size: 0.72rem;
        color: #aaa;
        border-top: 1px solid #d0d0d0;
        flex-shrink: 0;
    }

    .list-legend .sys-dot {
        position: static;
        transform: none;
    }

    /* ── 에디터 패널 ── */
    .prompts-editor-panel {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        background: white;
    }

    .editor-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 24px;
        border-bottom: 1px solid #eee;
        flex-shrink: 0;
        gap: 12px;
    }

    .editor-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.95rem;
        font-weight: 700;
        color: #1c1c1e;
        font-family: "SF Mono", monospace;
    }

    .badge-system {
        font-size: 0.7rem;
        background: #fff3cd;
        color: #856404;
        padding: 2px 7px;
        border-radius: 10px;
        font-weight: 500;
        font-family: -apple-system, sans-serif;
    }

    .editor-actions {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .btn-save {
        padding: 6px 16px;
        background: #007aff;
        color: white;
        border: none;
        border-radius: 7px;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        font-family: inherit;
        transition: background 0.15s;
    }

    .btn-save:hover:not(:disabled) { background: #006ae6; }
    .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

    .btn-delete {
        padding: 6px 14px;
        background: none;
        color: #ff3b30;
        border: 1px solid #ff3b30;
        border-radius: 7px;
        font-size: 0.85rem;
        cursor: pointer;
        font-family: inherit;
        transition: all 0.15s;
    }

    .btn-delete:hover {
        background: #ff3b30;
        color: white;
    }

    .save-msg {
        font-size: 0.8rem;
        color: #27c93f;
        font-weight: 500;
    }

    .save-msg.err { color: #ff3b30; }

    .editor-fields {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 20px 24px;
        overflow-y: auto;
    }

    .field-row {
        display: flex;
        flex-direction: column;
        gap: 5px;
    }

    .meta-row {
        display: flex;
        gap: 12px;
    }

    .field-label {
        font-size: 0.78rem;
        font-weight: 600;
        color: #666;
    }

    .required { color: #ff3b30; }

    .field-input {
        padding: 8px 12px;
        border: 1px solid #d0d0d0;
        border-radius: 8px;
        font-size: 0.88rem;
        outline: none;
        font-family: inherit;
        transition: border-color 0.2s, box-shadow 0.2s;
    }

    .field-input:focus {
        border-color: #007aff;
        box-shadow: 0 0 0 3px rgba(0,122,255,0.15);
    }

    .field-input.error { border-color: #ff3b30; }
    .field-input:disabled { background: #f5f5f7; color: #aaa; }

    .field-error {
        font-size: 0.75rem;
        color: #ff3b30;
    }

    .system-notice {
        font-size: 0.78rem;
        color: #856404;
        background: #fff8e1;
        border: 1px solid #ffe082;
        border-radius: 8px;
        padding: 9px 13px;
        line-height: 1.5;
    }

    .prompt-textarea {
        flex: 1;
        min-height: 300px;
        padding: 12px;
        border: 1px solid #d0d0d0;
        border-radius: 8px;
        font-size: 0.83rem;
        font-family: "SF Mono", "Menlo", monospace;
        resize: vertical;
        outline: none;
        line-height: 1.6;
        color: #333;
        transition: border-color 0.2s, box-shadow 0.2s;
    }

    .prompt-textarea:focus {
        border-color: #007aff;
        box-shadow: 0 0 0 3px rgba(0,122,255,0.15);
    }

    .empty-editor {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        color: #aaa;
        font-size: 0.9rem;
    }
</style>
