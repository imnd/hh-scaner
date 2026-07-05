<script>
  import { onMount } from "svelte";
  import { getResume, updateResume } from "../api";

  let resumeText = "";
  let isLoading = true;
  let isSaving = false;

  onMount(async () => {
    try {
      const data = await getResume();
      resumeText = data.resume || "";
    } catch (err) {
      console.error(err);
    } finally {
      isLoading = false;
    }
  });

  async function handleSave() {
    isSaving = true;
    try {
      await updateResume(resumeText);
      alert("Resume saved successfully!");
    } catch (err) {
      alert("Failed to save resume.");
    } finally {
      isSaving = false;
    }
  }

  function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      resumeText = e.target.result;
    };
    reader.readAsText(file);
    // Reset input so the same file can be uploaded again if needed
    event.target.value = "";
  }
</script>

<div class="settings-container animate-fade-in">
  <div class="header">
    <h1>Update resume</h1>
    <p class="subtitle">
      Update your base resume used for cover letter generation.
    </p>
  </div>

  <div class="glass-panel editor-panel">
    {#if isLoading}
      <div class="loading">Loading resume...</div>
    {:else}
      <textarea
        bind:value={resumeText}
        placeholder="Paste your resume text here..."
      ></textarea>

      <div
        class="actions"
        style="display: flex; justify-content: space-between; align-items: center;"
      >
        <label class="btn-secondary" style="cursor: pointer;">
          📄 Upload .txt File
          <input
            type="file"
            accept=".txt"
            on:change={handleFileUpload}
            style="display: none;"
          />
        </label>
        <button class="btn-primary" on:click={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Resume"}
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .settings-container {
    max-width: 800px;
    margin: 0 auto;
  }

  .header {
    margin-bottom: 30px;
  }

  h1 {
    font-size: 2rem;
    margin: 0 0 8px 0;
  }

  .subtitle {
    color: var(--text-muted);
    margin: 0;
  }

  .editor-panel {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  textarea {
    width: 100%;
    height: 400px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--border-glass);
    border-radius: 8px;
    color: var(--text-main);
    padding: 16px;
    font-family: monospace;
    font-size: 0.95rem;
    resize: vertical;
    box-sizing: border-box;
  }

  textarea:focus {
    outline: none;
    border-color: var(--accent-primary);
  }

  .actions {
    display: flex;
    justify-content: flex-end;
  }

  .loading {
    color: var(--text-muted);
    text-align: center;
    padding: 40px;
  }
</style>
