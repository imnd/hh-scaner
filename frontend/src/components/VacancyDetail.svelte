<script lang="ts">
  import { generateLetter, updateVacancyStatus } from "../api";

  type Vacancy = {
    id: number;
    title: string;
    company: string;
    salary: string;
    status: string;
    description: string;
    contacts: string;
    link: string;
  };
  export let vacancy: Vacancy;
  export let onClose: Function;
  export let onStatusUpdate: Function;

  let isGenerating = false;
  let letterDraft = vacancy.letter || "";

  async function handleGenerate() {
    isGenerating = true;
    try {
      const res = await generateLetter(vacancy.id);
      letterDraft = res.letter;
      // Auto update status in parent
      onStatusUpdate(vacancy.id, "draft_ready");
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      }
    } finally {
      isGenerating = false;
    }
  }

  async function markAsSent() {
    try {
      await updateVacancyStatus(vacancy.id, "sent");
      onStatusUpdate(vacancy.id, "sent");
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      }
    }
  }

  function openMailto() {
    // If we parsed an email from contacts, we'd use it here.
    // Fallback: just open standard mailto
    const subject = encodeURIComponent(`Отклик на вакансию: ${vacancy.title}`);
    const body = encodeURIComponent(letterDraft);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  }
</script>

<svelte:window on:keydown={(e) => e.key === 'Escape' && onClose()} />

<div class="modal-backdrop animate-fade-in">
  <div class="modal glass-panel">
    <div class="modal-header">
      <div class="titles">
        <h2>{vacancy.title}</h2>
        <a href={vacancy.link} target="_blank" class="company-link"
          >{vacancy.company} ↗</a
        >
      </div>
      <button class="close-btn" on:click={() => onClose()}>✕</button>
    </div>

    <div class="modal-body">
      <div class="split-view">
        <!-- Left: Vacancy Details -->
        <div class="vacancy-details">
          <div class="info-badges">
            {#if vacancy.salary}
              <span class="badge salary">💰 {vacancy.salary}</span>
            {/if}
            <span class="badge status">Status: {vacancy.status}</span>
          </div>

          <div class="description-box">
            <h4>Description</h4>
            <div class="text-content">
              {@html vacancy.description}
            </div>
          </div>

          {#if vacancy.contacts}
            <div class="contacts-box">
              <h4>Contacts Found</h4>
              <p>{@html vacancy.contacts.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color: var(--accent-primary); text-decoration: underline;">$1</a>').replace(/\n/g, "<br>")}</p>
            </div>
          {/if}
        </div>

        <!-- Right: Cover Letter Generation -->
        <div class="generator-section">
          {#if !letterDraft}
            <div class="empty-state">
              <p>No cover letter generated yet.</p>
              <button
                class="btn-primary"
                on:click={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating
                  ? "🤖 Generating with Ollama..."
                  : "✨ Generate Cover Letter"}
              </button>
            </div>
          {:else}
            <div class="editor-header">
              <h4>Generated Draft</h4>
              <button
                class="btn-secondary small"
                on:click={handleGenerate}
                disabled={isGenerating}
              >
                Regenerate
              </button>
            </div>
            <textarea bind:value={letterDraft} class="letter-editor"></textarea>

            <div class="action-buttons">
              <button class="btn-secondary" on:click={openMailto}
                >📧 Open in Mail</button
              >
              <button class="btn-primary" on:click={markAsSent}
                >✓ Mark as Sent</button
              >
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .modal {
    width: 90%;
    max-width: 1200px;
    height: 85vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal-header {
    padding: 24px;
    border-bottom: 1px solid var(--border-glass);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .titles h2 {
    margin: 0 0 8px 0;
    font-size: 1.5rem;
  }

  .company-link {
    color: var(--accent-primary);
    text-decoration: none;
    font-weight: 500;
  }

  .company-link:hover {
    text-decoration: underline;
  }

  .close-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 1.5rem;
    cursor: pointer;
  }
  .close-btn:hover {
    color: white;
  }

  .modal-body {
    flex: 1;
    overflow: hidden;
  }

  .split-view {
    display: flex;
    height: 100%;
  }

  .vacancy-details,
  .generator-section {
    flex: 1;
    padding: 24px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .vacancy-details {
    border-right: 1px solid var(--border-glass);
    background: rgba(0, 0, 0, 0.1);
  }

  .info-badges {
    display: flex;
    gap: 12px;
    margin-bottom: 24px;
  }

  .badge {
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
  }
  .badge.salary {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
  }
  .badge.status {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  h4 {
    margin: 0 0 12px 0;
    color: var(--text-main);
  }

  .description-box,
  .contacts-box {
    background: rgba(255, 255, 255, 0.03);
    padding: 16px;
    border-radius: 8px;
    border: 1px solid var(--border-glass);
    margin-bottom: 20px;
  }

  .text-content {
    white-space: pre-wrap;
    font-size: 0.95rem;
    color: var(--text-muted);
    line-height: 1.6;
  }

  /* Generator Section */
  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    color: var(--text-muted);
  }

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .small {
    padding: 6px 12px;
    font-size: 0.85rem;
  }

  .letter-editor {
    flex: 1;
    width: 100%;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--border-glass);
    border-radius: 8px;
    padding: 16px;
    color: var(--text-main);
    font-family: inherit;
    font-size: 0.95rem;
    resize: none;
    box-sizing: border-box;
    margin-bottom: 20px;
  }
  .letter-editor:focus {
    outline: none;
    border-color: var(--accent-primary);
  }

  .action-buttons {
    display: flex;
    gap: 16px;
    justify-content: flex-end;
  }
</style>
