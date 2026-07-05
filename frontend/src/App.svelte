<script>
  import VacanciesList from "./components/VacanciesList.svelte";
  import Settings from "./components/Settings.svelte";

  let currentView = "vacancies"; // 'vacancies' | 'settings'
  let isCollapsed = false;
</script>

<div class="app-layout">
  <aside class="sidebar glass-panel {isCollapsed ? 'collapsed' : ''}">
    <div class="sidebar-header">
      <div class="logo" class:hidden={isCollapsed}>
        <h2>HH Scanner</h2>
        <div class="badge">Pro</div>
      </div>
      <button
        class="toggle-btn"
        on:click={() => {
          isCollapsed = !isCollapsed;
        }}
        title="Toggle Sidebar"
      >
        {isCollapsed ? "❯" : "❮"}
      </button>
    </div>

    <nav class="nav-menu">
      <button
        class="nav-item {currentView === 'vacancies' ? 'active' : ''}"
        on:click={() => (currentView = "vacancies")}
        title="Vacancies"
      >
        <span class="icon">📊</span>
        <span class="text" class:hidden={isCollapsed}>Vacancies</span>
      </button>
      <button
        class="nav-item {currentView === 'settings' ? 'active' : ''}"
        on:click={() => (currentView = "settings")}
        title="Upload resume"
      >
        <span class="icon">⚙️</span>
        <span class="text" class:hidden={isCollapsed}>Upload resume</span>
      </button>
    </nav>
  </aside>

  <main class="main-content">
    {#if currentView === "vacancies"}
      <VacanciesList />
    {:else if currentView === "settings"}
      <Settings />
    {/if}
  </main>
</div>

<style>
  .app-layout {
    display: flex;
    height: 100vh;
    overflow: hidden;
  }

  .sidebar {
    width: 280px;
    display: flex;
    flex-direction: column;
    padding: 24px 16px;
    border-radius: 0;
    border-top: none;
    border-bottom: none;
    border-left: none;
    z-index: 10;
    transition: width 0.3s ease;
    overflow-x: hidden;
  }

  .sidebar.collapsed {
    width: 80px;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 40px;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 12px;
    transition: opacity 0.2s;
    white-space: nowrap;
  }

  .logo.hidden {
    opacity: 0;
    pointer-events: none;
    width: 0;
    overflow: hidden;
    gap: 0;
  }

  .toggle-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-glass);
    color: var(--text-muted);
    border-radius: 8px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    margin-left: auto;
  }

  .toggle-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .logo h2 {
    margin: 0;
    font-size: 1.5rem;
    background: var(--accent-gradient);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .badge {
    background: rgba(139, 92, 246, 0.2);
    color: #c4b5fd;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .nav-menu {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 1rem;
    font-weight: 500;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    white-space: nowrap;
  }

  .nav-item .icon {
    font-size: 1.2rem;
    min-width: 24px;
    text-align: center;
  }

  .nav-item .text {
    transition:
      opacity 0.2s,
      width 0.2s;
  }

  .nav-item .text.hidden {
    opacity: 0;
    width: 0;
    pointer-events: none;
  }

  .nav-item:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-main);
  }

  .nav-item.active {
    background: rgba(59, 130, 246, 0.1);
    color: var(--accent-primary);
    border-left: 3px solid var(--accent-primary);
  }

  .main-content {
    flex: 1;
    overflow-y: auto;
    padding: 40px;
    position: relative;
  }
</style>
