<script>
  import { onMount, onDestroy } from 'svelte';
  import { getVacancies, parseVacancies, getParseProgress } from '../api';
  import VacancyDetail from './VacancyDetail.svelte';

  let vacancies = [];
  let isLoading = true;
  let error = null;
  let selectedVacancy = null;
  
  // Parsing State
  let parseKeyword = typeof localStorage !== 'undefined' ? localStorage.getItem('hh_scaner_keyword') || '' : '';
  $: if (typeof localStorage !== 'undefined' && parseKeyword !== null) {
    localStorage.setItem('hh_scaner_keyword', parseKeyword);
  }
  let isParsing = false;
  let progressState = null;
  let parsePollInterval = null;

  // List auto-refresh interval
  let listPollInterval;

  async function loadVacancies() {
    try {
      vacancies = await getVacancies();
      error = null;
    } catch (err) {
      error = err.message;
    } finally {
      isLoading = false;
    }
  }

  async function handleParse() {
    if (!parseKeyword) return;
    isParsing = true;
    try {
      await parseVacancies(parseKeyword);
      startProgressPolling();
    } catch (err) {
      alert('Error starting parse: ' + err.message);
      isParsing = false;
    }
  }

  function startProgressPolling() {
    if (parsePollInterval) clearInterval(parsePollInterval);
    parsePollInterval = setInterval(async () => {
      try {
        const state = await getParseProgress();
        progressState = state;
        if (!state.isRunning) {
          clearInterval(parsePollInterval);
          isParsing = false;
          progressState = null;
          loadVacancies(); // Force refresh list when done
          playNotificationSound();
        }
      } catch (err) {
        console.error('Failed to poll progress', err);
      }
    }, 1000);
  }

  function playNotificationSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const playBeep = (freq, startTime, duration) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      const now = audioCtx.currentTime;
      playBeep(880, now, 0.15); // A5
      playBeep(1046.50, now + 0.2, 0.3); // C6
    } catch (e) {
      console.error('Audio not supported', e);
    }
  }

  onMount(async () => {
    loadVacancies();
    listPollInterval = setInterval(loadVacancies, 10000); // Check every 10s

    // Check if parsing is already running on the backend
    try {
      const state = await getParseProgress();
      if (state.isRunning) {
        isParsing = true;
        progressState = state;
        parseKeyword = state.keyword || parseKeyword;
        startProgressPolling();
      }
    } catch (err) {
      console.error('Error checking initial parse state', err);
    }
  });

  onDestroy(() => {
    if (listPollInterval) clearInterval(listPollInterval);
    if (parsePollInterval) clearInterval(parsePollInterval);
  });

  function handleStatusUpdate(id, newStatus) {
    vacancies = vacancies.map(v => v.id === id ? { ...v, status: newStatus } : v);
    if (selectedVacancy && selectedVacancy.id === id) {
      selectedVacancy.status = newStatus;
    }
  }

  function getStatusClass(status) {
    switch(status) {
      case 'new': return 'status-new';
      case 'draft_ready': return 'status-draft';
      case 'sent': return 'status-sent';
      case 'replied': return 'status-replied';
      default: return '';
    }
  }
</script>

<div class="vacancies-container animate-fade-in">
  <div class="header">
    <div class="header-titles">
      <h1>Vacancies Dashboard</h1>
      <p class="subtitle">Review parsed vacancies and generate cover letters.</p>
    </div>

    <div class="parse-widget glass-panel">
      {#if isParsing && progressState}
        <div class="progress-box">
          <p class="progress-step">{progressState.step}</p>
          {#if progressState.total > 0}
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" style="width: {(progressState.current / progressState.total) * 100}%"></div>
            </div>
            <p class="progress-text">{progressState.current} / {progressState.total}</p>
          {/if}
        </div>
      {:else}
        <div class="search-form">
          <input type="text" bind:value={parseKeyword} placeholder="Keyword (e.g. Node.js)" />
          <button class="btn-primary" on:click={handleParse}>Parse HH.ru</button>
        </div>
      {/if}
    </div>
  </div>

  {#if isLoading && vacancies.length === 0}
    <div class="loading">Loading vacancies...</div>
  {:else if error}
    <div class="error">{error}</div>
  {:else if vacancies.length === 0}
    <div class="empty-state glass-panel">
      {#if isParsing}
        <h3>Parsing in progress...</h3>
        <p>Please wait while we gather vacancies and extract contacts.</p>
      {:else}
        <h3>No vacancies found</h3>
        <p>Use the search form above to start parsing a keyword.</p>
      {/if}
    </div>
  {:else}
    <div class="table-container glass-panel">
      <table class="vacancies-table">
        <thead>
          <tr>
            <th>Date Added</th>
            <th>Company</th>
            <th>Title</th>
            <th>Salary</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {#each vacancies as vac}
            <tr class="row" on:click={() => selectedVacancy = vac}>
              <td class="date">{vac.published_at || '—'}</td>
              <td class="company">{vac.company}</td>
              <td class="title">{vac.title}</td>
              <td class="salary">{vac.salary || '—'}</td>
              <td>
                <span class="status-badge {getStatusClass(vac.status)}">
                  {vac.status.replace('_', ' ')}
                </span>
              </td>
              <td>
                <button class="btn-secondary small">Review</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

{#if selectedVacancy}
  <VacancyDetail 
    vacancy={selectedVacancy} 
    onClose={() => selectedVacancy = null} 
    onStatusUpdate={handleStatusUpdate}
  />
{/if}

<style>
  .vacancies-container {
    max-width: 1200px;
    margin: 0 auto;
  }

  .header {
    margin-bottom: 30px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
  }

  .header-titles h1 {
    font-size: 2rem;
    margin: 0 0 8px 0;
  }

  .subtitle {
    color: var(--text-muted);
    margin: 0;
  }

  .parse-widget {
    padding: 16px;
    min-width: 450px;
    flex-shrink: 0;
  }

  .search-form {
    display: flex;
    gap: 8px;
  }

  .search-form input {
    flex: 1;
    padding: 10px 16px;
    border-radius: 8px;
    border: 1px solid var(--border-glass);
    background: rgba(255, 255, 255, 0.05);
    color: white;
    box-sizing: border-box;
  }

  .search-form input:focus {
    outline: none;
    border-color: var(--accent-primary);
  }

  .progress-box {
    width: 100%;
  }

  .progress-step {
    margin: 0 0 8px 0;
    font-size: 0.85rem;
    color: var(--accent-primary);
    font-weight: 500;
  }

  .progress-bar-bg {
    height: 6px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 6px;
  }

  .progress-bar-fill {
    height: 100%;
    background: var(--accent-gradient);
    transition: width 0.3s ease;
  }

  .progress-text {
    margin: 0;
    font-size: 0.75rem;
    color: var(--text-muted);
    text-align: right;
  }

  .loading, .error {
    text-align: center;
    padding: 40px;
    color: var(--text-muted);
  }

  .error {
    color: #fca5a5;
  }

  .empty-state {
    padding: 60px;
    text-align: center;
    color: var(--text-muted);
  }

  .empty-state h3 {
    color: var(--text-main);
    margin-bottom: 8px;
  }

  .table-container {
    overflow-x: auto;
  }

  .vacancies-table {
    width: 100%;
    border-collapse: collapse;
  }

  th, td {
    padding: 16px;
    text-align: left;
    border-bottom: 1px solid var(--border-glass);
  }

  th {
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    font-weight: 600;
  }

  .row {
    cursor: pointer;
    transition: background 0.2s;
  }

  .row:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .row:last-child td {
    border-bottom: none;
  }

  .date {
    color: var(--text-muted);
    font-size: 0.85rem;
    white-space: nowrap;
  }

  .company {
    font-weight: 600;
    color: var(--text-main);
  }

  .title {
    color: var(--text-muted);
  }

  .salary {
    color: #34d399;
    font-weight: 500;
  }

  .status-badge {
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .status-new {
    background: rgba(59, 130, 246, 0.15);
    color: var(--status-new);
  }

  .status-draft {
    background: rgba(234, 179, 8, 0.15);
    color: var(--status-draft);
  }

  .status-sent {
    background: rgba(16, 185, 129, 0.15);
    color: var(--status-sent);
  }

  .status-replied {
    background: rgba(168, 85, 247, 0.15);
    color: var(--status-replied);
  }

  .small {
    padding: 6px 12px;
    font-size: 0.85rem;
  }
</style>
