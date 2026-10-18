(() => {
  "use strict";

  const STORAGE_KEY = "orbit-ai-dashboard-tools-v1";
  const USAGE_KEY = "orbit-ai-dashboard-usage-v1";

  const defaultTools = [
    { id: "claude", name: "Claude.ai", url: "https://claude.ai/", category: "AI Chat", description: "Think, write, analyze, and work through ideas with Claude.", icon: "✳", bg: "#332747", color: "#f5b88b" },
    { id: "claude-code", name: "Claude Code", url: "https://claude.ai/code", category: "Coding", description: "Open Claude Code on the web for supported cloud coding workflows.", icon: "⌘", bg: "#302743", color: "#d5b9ff" },
    { id: "chatgpt", name: "ChatGPT", url: "https://chatgpt.com/", category: "AI Chat", description: "Chat, brainstorm, write, learn, and solve problems with AI.", icon: "✳", bg: "#153c3b", color: "#79e5cb" },
    { id: "gemini", name: "Google Gemini", url: "https://gemini.google.com/", category: "AI Chat", description: "Explore ideas and work with Google's AI assistant.", icon: "✦", bg: "#202f53", color: "#9dbaff" },
    { id: "lovable", name: "Lovable AI", url: "https://lovable.dev/", category: "Web Development", description: "Build and iterate on web app ideas with an AI-powered workflow.", icon: "♡", bg: "#4a243e", color: "#ff9fce" },
    { id: "ai-studio", name: "Google AI Studio", url: "https://aistudio.google.com/", category: "AI Development", description: "Experiment with Google's AI models and developer tools.", icon: "◈", bg: "#203b55", color: "#8ed8ff" },
    { id: "github", name: "GitHub", url: "https://github.com/", category: "Development", description: "Browse repositories, review code, and collaborate on projects.", icon: "⌘", bg: "#292e3d", color: "#e2e8f0" },
    { id: "uiux-pro-max", name: "UI/UX Pro Max (GitHub)", url: "https://github.com/nextlevelbuilder/ui-ux-pro-max-skill", category: "Design", description: "Open the UI/UX Pro Max repository and read its setup instructions.", icon: "✧", bg: "#342752", color: "#c7b5ff" },
    { id: "npm", name: "npm", url: "https://www.npmjs.com/", category: "Development", description: "Browse the npm package registry. This is a website shortcut only.", icon: "npm", bg: "#4b252c", color: "#ff9b9b" },
    { id: "vscode", name: "VS Code", url: "https://code.visualstudio.com/", category: "Development", description: "Open the official Visual Studio Code website.", icon: "‹›", bg: "#1b3558", color: "#8cc8ff" }
  ];

  const iconPalette = [
    ["#332747", "#f5b88b"], ["#153c3b", "#79e5cb"], ["#202f53", "#9dbaff"],
    ["#4a243e", "#ff9fce"], ["#203b55", "#8ed8ff"], ["#342752", "#c7b5ff"],
    ["#4b252c", "#ff9b9b"], ["#26364a", "#a8c5ff"]
  ];

  const $ = (selector) => document.querySelector(selector);
  const toolGrid = $("#toolGrid");
  const searchInput = $("#searchInput");
  const sortSelect = $("#sortSelect");
  const toolDialog = $("#toolDialog");
  const toolForm = $("#toolForm");
  const confirmDialog = $("#confirmDialog");
  const toast = $("#toast");

  let tools = loadTools();
  let activeFilter = "all";
  let query = "";
  let menuOpenFor = null;
  let toastTimer = null;

  function loadTools() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter(isValidTool).map(normalizeTool);
      }
    } catch (error) {
      console.warn("Dashboard storage could not be read:", error);
    }
    return defaultTools.map(tool => ({ ...tool, favorite: false }));
  }

  function isValidTool(tool) {
    return tool && typeof tool.id === "string" && typeof tool.name === "string" &&
      typeof tool.url === "string" && typeof tool.category === "string";
  }

  function normalizeTool(tool, index) {
    const palette = iconPalette[index % iconPalette.length];
    return {
      id: tool.id || createId(),
      name: String(tool.name || "Untitled tool"),
      url: safeUrl(String(tool.url || "")) || "https://example.com/",
      category: String(tool.category || "Other"),
      description: String(tool.description || "Your saved website shortcut."),
      icon: String(tool.icon || getInitials(tool.name || "AI")),
      bg: tool.bg || palette[0],
      color: tool.color || palette[1],
      favorite: Boolean(tool.favorite)
    };
  }

  function saveTools(nextTools = tools) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTools));
      tools = nextTools;
      updateCounts();
      return true;
    } catch (error) {
      console.warn("Dashboard storage could not be written:", error);
      showToast("Could not save. Browser storage may be disabled or full.");
      return false;
    }
  }

  function createId() {
    return "tool-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function getInitials(name) {
    const words = String(name).trim().split(/\s+/).filter(Boolean);
    if (!words.length) return "AI";
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  function safeUrl(value) {
    try {
      const trimmed = value.trim();
      if (!trimmed) return null;
      const hasProtocol = /^[a-z][a-z\d+.-]*:/i.test(trimmed);
      const parsed = new URL(hasProtocol ? trimmed : `https://${trimmed}`);
      if ((parsed.protocol === "https:" || parsed.protocol === "http:") && parsed.hostname) return parsed.href;
    } catch (_) {}
    return null;
  }

  function getDomain(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); }
    catch (_) { return url; }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function currentCategory() {
    if (activeFilter === "all") return "All tools";
    if (activeFilter === "favorites") return "Favorites";
    return activeFilter;
  }

  function renderCategories() {
    const categories = [...new Set(tools.map(tool => tool.category).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
    const container = $("#categoryNav");
    container.innerHTML = categories.map(category => {
      const count = tools.filter(tool => tool.category === category).length;
      const active = activeFilter === category ? " active" : "";
      return `<button class="nav-item${active}" data-filter="${escapeHtml(category)}">
        <span class="nav-icon">◇</span><span>${escapeHtml(category)}</span><span class="nav-count">${count}</span>
      </button>`;
    }).join("");
    container.querySelectorAll("[data-filter]").forEach(button => {
      button.addEventListener("click", () => setFilter(button.dataset.filter));
    });
    document.querySelectorAll('.side-nav [data-filter="all"], .side-nav [data-filter="favorites"]').forEach(button => {
      button.classList.toggle("active", button.dataset.filter === activeFilter);
    });
  }

  function getVisibleTools() {
    let visible = tools.filter(tool => {
      const filterMatch = activeFilter === "all" ||
        (activeFilter === "favorites" ? tool.favorite : tool.category === activeFilter);
      const searchText = `${tool.name} ${tool.category} ${tool.url} ${tool.description}`.toLowerCase();
      return filterMatch && searchText.includes(query.toLowerCase().trim());
    });
    const sort = sortSelect.value;
    if (sort === "category") visible.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    else if (sort === "recent") {
      const usage = getUsage();
      visible.sort((a, b) => (usage[b.id] || 0) - (usage[a.id] || 0) || a.name.localeCompare(b.name));
    } else visible.sort((a, b) => a.name.localeCompare(b.name));
    return visible;
  }

  function render() {
    renderCategories();
    const visible = getVisibleTools();
    $("#currentView").textContent = currentCategory();
    $("#sectionTitle").innerHTML = `${escapeHtml(activeFilter === "all" ? "Your tools" : currentCategory())} <span class="heading-count" id="visibleCount">${visible.length}</span>`;
    $("#sectionSubtitle").textContent = query ? `Search results for “${query}”.` : activeFilter === "favorites" ? "Your starred shortcuts, ready when you are." : "Pick a tool and get straight to work.";
    $("#footerToolCount").textContent = tools.length;
    toolGrid.innerHTML = visible.map(renderCard).join("");
    $("#emptyState").hidden = visible.length > 0;
    toolGrid.hidden = visible.length === 0;
    updateCounts();
    attachCardEvents();
  }

  function renderCard(tool) {
    const safeName = escapeHtml(tool.name);
    const safeCategory = escapeHtml(tool.category);
    const safeDescription = escapeHtml(tool.description || "Your saved website shortcut.");
    const safeDomain = escapeHtml(getDomain(tool.url));
    const safeIcon = escapeHtml(tool.icon || getInitials(tool.name));
    const favClass = tool.favorite ? " favorite" : "";
    const favLabel = tool.favorite ? "Remove from favorites" : "Add to favorites";
    const isMenuOpen = menuOpenFor === tool.id;
    return `<article class="tool-card" style="--icon-bg:${escapeHtml(tool.bg)};--icon-color:${escapeHtml(tool.color)};--accent:${escapeHtml(tool.color)}" data-id="${escapeHtml(tool.id)}">
      <div class="card-top">
        <div class="tool-identity">
          <div class="tool-logo" aria-hidden="true">${safeIcon}</div>
          <div class="tool-name-wrap"><h3 class="tool-name">${safeName}</h3><span class="tool-category">${safeCategory}</span></div>
        </div>
        <div class="card-menu">
          <button class="icon-button${favClass}" data-action="favorite" title="${favLabel}" aria-label="${favLabel}">${tool.favorite ? "★" : "☆"}</button>
          <button class="icon-button" data-action="menu" title="Tool options" aria-label="Tool options">···</button>
        </div>
      </div>
      <p class="card-description">${safeDescription}</p>
      <div class="card-bottom"><span class="domain" title="${escapeHtml(tool.url)}">${safeDomain}</span><button class="open-button" data-action="open">Open tool <span>↗</span></button></div>
      ${isMenuOpen ? `<div class="card-edit-menu">
        <button data-action="edit">✎ &nbsp; Edit details</button>
        <button class="delete-action" data-action="delete">⌫ &nbsp; Delete shortcut</button>
      </div>` : ""}
    </article>`;
  }

  function attachCardEvents() {
    toolGrid.querySelectorAll(".tool-card").forEach(card => {
      const id = card.dataset.id;
      card.querySelectorAll("[data-action]").forEach(button => {
        button.addEventListener("click", event => {
          event.stopPropagation();
          const action = button.dataset.action;
          const tool = tools.find(item => item.id === id);
          if (!tool) return;
          if (action === "open") openTool(tool);
          if (action === "favorite") toggleFavorite(tool);
          if (action === "menu") { menuOpenFor = menuOpenFor === id ? null : id; render(); }
          if (action === "edit") { menuOpenFor = null; openEditor(tool); }
          if (action === "delete") { menuOpenFor = null; deleteTool(tool); }
        });
      });
    });
  }

  function openTool(tool) {
    const url = safeUrl(tool.url);
    if (!url) return showToast("This URL is invalid. Edit the shortcut and use http:// or https://.");
    try {
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (!opened) showToast("The browser may have blocked the new tab. Allow pop-ups for this local page.");
      else showToast(`Opening ${tool.name}…`);
    } catch (_) {
      showToast("Could not open this site in a new tab.");
    }
    const usage = getUsage();
    usage[tool.id] = Date.now();
    try { localStorage.setItem(USAGE_KEY, JSON.stringify(usage)); } catch (_) {}
    if (sortSelect.value === "recent") render();
  }

  function getUsage() {
    try { return JSON.parse(localStorage.getItem(USAGE_KEY) || "{}"); }
    catch (_) { return {}; }
  }

  function toggleFavorite(tool) {
    tool.favorite = !tool.favorite;
    saveTools();
    render();
    showToast(tool.favorite ? "Added to favorites." : "Removed from favorites.");
  }

  function openEditor(tool = null) {
    $("#toolForm").reset();
    $("#formError").textContent = "";
    $("#dialogTitle").textContent = tool ? "Edit tool" : "Add a tool";
    $("#saveToolBtn").innerHTML = tool ? "Save changes <span>↗</span>" : "Save tool <span>↗</span>";
    $("#toolId").value = tool ? tool.id : "";
    $("#toolName").value = tool ? tool.name : "";
    $("#toolUrl").value = tool ? tool.url : "";
    $("#toolDescription").value = tool ? tool.description : "";
    $("#toolCategory").value = tool ? tool.category : "";
    toolDialog.showModal();
    setTimeout(() => $("#toolName").focus(), 30);
  }

  function closeEditor() {
    if (toolDialog.open) toolDialog.close();
  }

  function saveFromForm(event) {
    event.preventDefault();
    const id = $("#toolId").value;
    const name = $("#toolName").value.trim();
    const rawUrl = $("#toolUrl").value.trim();
    const url = safeUrl(rawUrl);
    const description = $("#toolDescription").value.trim() || "Your saved website shortcut.";
    const category = $("#toolCategory").value.trim() || "Other";
    const error = $("#formError");
    error.textContent = "";
    if (!name) { error.textContent = "Please enter a tool name."; return; }
    if (!url) { error.textContent = "Enter a valid website URL, such as example.com or https://example.com."; return; }
    const existing = id ? tools.find(tool => tool.id === id) : null;
    let updatedTools;
    if (existing) {
      updatedTools = tools.map(tool => tool.id === id
        ? { ...tool, name, url, category, description }
        : tool);
    } else {
      const palette = iconPalette[tools.length % iconPalette.length];
      updatedTools = [...tools, { id: createId(), name, url, category, description, icon: getInitials(name), bg: palette[0], color: palette[1], favorite: false }];
    }
    if (!saveTools(updatedTools)) return;
    closeEditor();
    activeFilter = "all";
    query = "";
    searchInput.value = "";
    render();
    showToast(existing ? "Tool details updated." : "Tool added to your dashboard.");
  }

  function deleteTool(tool) {
    const okay = window.confirm(`Delete "${tool.name}" from your dashboard?`);
    if (!okay) return;
    tools = tools.filter(item => item.id !== tool.id);
    saveTools();
    render();
    showToast("Shortcut deleted.");
  }

  function setFilter(filter) {
    activeFilter = filter;
    menuOpenFor = null;
    render();
  }

  function updateCounts() {
    $("#allCount").textContent = tools.length;
    $("#favoriteCount").textContent = tools.filter(tool => tool.favorite).length;
    $("#footerToolCount").textContent = tools.length;
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2700);
  }

  document.querySelectorAll('.side-nav [data-filter="all"], .side-nav [data-filter="favorites"]').forEach(button => {
    button.addEventListener("click", () => setFilter(button.dataset.filter));
  });
  searchInput.addEventListener("input", () => { query = searchInput.value; render(); });
  sortSelect.addEventListener("change", render);
  $("#addToolBtn").addEventListener("click", () => openEditor());
  $("#emptyAddBtn").addEventListener("click", () => openEditor());
  $("#closeDialogBtn").addEventListener("click", closeEditor);
  $("#cancelDialogBtn").addEventListener("click", closeEditor);
  toolForm.addEventListener("submit", saveFromForm);
  $("#homeLink").addEventListener("click", event => { event.preventDefault(); query = ""; searchInput.value = ""; setFilter("all"); });
  $("#restoreBtn").addEventListener("click", () => confirmDialog.showModal());
  $("#keepToolsBtn").addEventListener("click", () => confirmDialog.close());
  $("#confirmRestoreBtn").addEventListener("click", () => {
    tools = defaultTools.map(tool => ({ ...tool, favorite: false }));
    try { localStorage.removeItem(USAGE_KEY); } catch (_) {}
    saveTools();
    activeFilter = "all";
    query = "";
    searchInput.value = "";
    confirmDialog.close();
    render();
    showToast("Default shortcuts restored.");
  });
  toolDialog.addEventListener("click", event => {
    if (event.target === toolDialog) closeEditor();
  });
  confirmDialog.addEventListener("click", event => {
    if (event.target === confirmDialog) confirmDialog.close();
  });
  document.addEventListener("click", event => {
    if (menuOpenFor && !event.target.closest(".card-menu") && !event.target.closest(".card-edit-menu")) {
      menuOpenFor = null;
      render();
    }
  });
  document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      searchInput.focus();
    }
    if (event.key === "Escape") menuOpenFor = null;
  });

  render();
})();
