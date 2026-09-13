/**
 * HOMEWORK MANAGER - MINIMALIST CLIENT APPLICATION
 * Clean, distraction-free, robust offline & cross-device sync (Subjects Only)
 */

// Fallback subjects if backend is offline
const DEFAULT_SUBJECTS = [
  { id: "kelajak-soati", name: "Kelajak soati", category: "Social & Ethics", type: "regular" },
  { id: "ingliz-tili", name: "Ingliz tili", category: "Languages", type: "regular" },
  { id: "ona-tili", name: "Ona tili", category: "Languages", type: "regular" },
  { id: "adabiyot", name: "Adabiyot", category: "Literature", type: "regular" },
  { id: "kimyo", name: "Kimyo", category: "Natural Sciences", type: "regular" },
  { id: "tarbiya", name: "Tarbiya", category: "Social & Ethics", type: "regular" },
  { id: "texnologiya", name: "Texnologiya", category: "Applied Arts", type: "regular" },
  { id: "iqtisodiyot", name: "Iqtisodiyot", category: "Social Studies", type: "regular" },
  { id: "biologiya", name: "Biologiya", category: "Natural Sciences", type: "regular" },
  { id: "geometriya", name: "Geometriya", category: "Exact Sciences", type: "regular" },
  { id: "rus-tili", name: "Rus tili", category: "Languages", type: "regular" },
  { id: "informatika", name: "Informatika", category: "Computer Science", type: "regular" },
  { id: "fizika", name: "Fizika", category: "Exact Sciences", type: "regular" },
  { id: "ozbekiston-tarixi", name: "O'zbekiston tarixi", category: "History", type: "regular" },
  { id: "geografiya", name: "Geografiya", category: "Natural Sciences", type: "regular" },
  { id: "huquq", name: "Huquq", category: "Social Studies", type: "regular" },
  { id: "algebra", name: "Algebra", category: "Exact Sciences", type: "regular" },
  { id: "umumjahon-tarixi", name: "Umumjahon tarixi", category: "History", type: "regular" },
  { id: "chizmachilik", name: "Chizmachilik", category: "Applied Arts", type: "regular" },
  { id: "it-qoshimcha", name: "IT (Qo'shimcha dars)", category: "Extra Courses", type: "extra" },
  { id: "matematika-qoshimcha", name: "Matematika (Qo'shimcha dars)", category: "Extra Courses", type: "extra" }
];

// App State
const state = {
  subjects: [...DEFAULT_SUBJECTS],
  homework: {},
  subjectFilter: 'all',
  searchQuery: '',
  wsConnected: false
};

// DOM References
const elements = {
  progressPercent: document.getElementById('progressPercent'),
  progressBar: document.getElementById('progressBar'),
  progressSummaryText: document.getElementById('progressSummaryText'),
  markAllBtn: document.getElementById('markAllBtn'),
  resetBtn: document.getElementById('resetBtn'),

  subjectsList: document.getElementById('subjectsList'),
  subjectSearch: document.getElementById('subjectSearch'),
  clearSearch: document.getElementById('clearSearch'),
  subjectFilterTags: document.getElementById('subjectFilterTags'),

  editSubjectModal: document.getElementById('editSubjectModal'),
  editSubjectForm: document.getElementById('editSubjectForm'),
  editSubjectId: document.getElementById('editSubjectId'),
  modalSubjectTitle: document.getElementById('modalSubjectTitle'),
  editAssignment: document.getElementById('editAssignment'),
  editDeadline: document.getElementById('editDeadline'),
  editNote: document.getElementById('editNote'),

  themeToggleBtn: document.getElementById('themeToggleBtn'),
  themeIcon: document.getElementById('themeIcon'),
  syncDot: document.getElementById('syncDot')
};

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

/* ==========================================================================
   PERSISTENCE HELPERS (LOCALSTORAGE + SMART MERGE)
   ========================================================================== */
function saveHomeworkLocal(data) {
  try {
    localStorage.setItem('homework_data', JSON.stringify(data));
  } catch (e) {
    console.warn('Could not save to localStorage', e);
  }
}

function loadHomeworkLocal() {
  try {
    const raw = localStorage.getItem('homework_data');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Could not load from localStorage', e);
  }
  return null;
}

function mergeHomeworkStates(local, server) {
  if (!server && !local) return {};
  if (!server) return local;
  if (!local) return server;

  const merged = { ...server };

  Object.keys(local).forEach(id => {
    const localItem = local[id];
    const serverItem = server[id];

    if (!serverItem) {
      merged[id] = localItem;
      return;
    }

    const localTime = localItem.updatedAt ? new Date(localItem.updatedAt).getTime() : 0;
    const serverTime = serverItem.updatedAt ? new Date(serverItem.updatedAt).getTime() : 0;

    // If local was updated more recently, preserve local state
    if (localTime > serverTime) {
      merged[id] = { ...serverItem, ...localItem };
    } else if (localTime === serverTime) {
      merged[id] = {
        ...serverItem,
        completed: localItem.completed !== undefined ? localItem.completed : serverItem.completed,
        assignment: localItem.assignment || serverItem.assignment || '',
        note: localItem.note || serverItem.note || '',
        deadline: localItem.deadline || serverItem.deadline || ''
      };
    } else {
      merged[id] = serverItem;
    }
  });

  return merged;
}

/* ==========================================================================
   API CLIENT
   ========================================================================== */
const API = {
  async fetchSubjects() {
    try {
      const res = await fetch('/api/subjects');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          return data.data;
        }
      }
    } catch (e) {
      console.warn('Offline mode for subjects');
    }
    return DEFAULT_SUBJECTS;
  },

  async fetchHomework() {
    const local = loadHomeworkLocal();
    let serverData = null;

    try {
      const res = await fetch('/api/homework');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          serverData = data.data;
        }
      }
    } catch (e) {
      console.warn('Offline mode for homework fetch');
    }

    if (!serverData && !local) {
      const initial = {};
      state.subjects.forEach(sub => {
        initial[sub.id] = { completed: false, assignment: '', note: '', deadline: '', updatedAt: new Date().toISOString() };
      });
      saveHomeworkLocal(initial);
      return initial;
    }

    if (!serverData) return local;
    if (!local) {
      saveHomeworkLocal(serverData);
      return serverData;
    }

    const merged = mergeHomeworkStates(local, serverData);
    saveHomeworkLocal(merged);

    // If client had newer updates than server, sync to backend in the background
    let clientIsNewer = false;
    Object.keys(local).forEach(id => {
      const lTime = local[id]?.updatedAt ? new Date(local[id].updatedAt).getTime() : 0;
      const sTime = serverData[id]?.updatedAt ? new Date(serverData[id].updatedAt).getTime() : 0;
      if (lTime > sTime) clientIsNewer = true;
    });

    if (clientIsNewer) {
      this.syncHomework(merged).catch(() => {});
    }

    return merged;
  },

  async syncHomework(homeworkData) {
    try {
      const res = await fetch('/api/homework/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homework: homeworkData })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) return data.data;
      }
    } catch (e) {
      // offline sync ignored
    }
    return homeworkData;
  },

  async toggleSubject(subjectId, forceState = null) {
    if (!state.homework[subjectId]) {
      state.homework[subjectId] = { completed: false, assignment: '', note: '', deadline: '' };
    }

    const current = Boolean(state.homework[subjectId].completed);
    const nextCompleted = forceState !== null ? Boolean(forceState) : !current;

    // 1. Optimistic instant local update
    state.homework[subjectId].completed = nextCompleted;
    state.homework[subjectId].updatedAt = new Date().toISOString();
    saveHomeworkLocal(state.homework);

    // 2. Persist to server
    try {
      const res = await fetch('/api/homework/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId, completed: nextCompleted })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data && data.data.status) {
          state.homework[subjectId] = data.data.status;
          saveHomeworkLocal(state.homework);
          return data.data;
        }
      }
    } catch (e) {
      console.warn('Offline toggle');
    }

    return { subjectId, status: state.homework[subjectId] };
  },

  async updateSubjectDetails(subjectId, details) {
    if (!state.homework[subjectId]) {
      state.homework[subjectId] = { completed: false };
    }
    Object.assign(state.homework[subjectId], details);
    state.homework[subjectId].updatedAt = new Date().toISOString();
    saveHomeworkLocal(state.homework);

    try {
      const res = await fetch(`/api/homework/subjects/${subjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          Object.assign(state.homework[subjectId], data.data);
          saveHomeworkLocal(state.homework);
          return data.data;
        }
      }
    } catch (e) {
      console.warn('Offline details update');
    }

    return state.homework[subjectId];
  },

  async markAllHomework(completed = true) {
    const now = new Date().toISOString();
    Object.keys(state.homework).forEach(id => {
      state.homework[id].completed = Boolean(completed);
      state.homework[id].updatedAt = now;
    });
    saveHomeworkLocal(state.homework);

    try {
      const res = await fetch('/api/homework/mark-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          state.homework = data.data;
          saveHomeworkLocal(state.homework);
          return data.data;
        }
      }
    } catch (e) {
      console.warn('Offline mark all');
    }

    return state.homework;
  },

  async resetHomework() {
    const now = new Date().toISOString();
    const resetData = {};
    state.subjects.forEach(sub => {
      resetData[sub.id] = { completed: false, assignment: '', note: '', deadline: '', updatedAt: now };
    });
    state.homework = resetData;
    saveHomeworkLocal(state.homework);

    try {
      const res = await fetch('/api/homework/reset', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          state.homework = data.data;
          saveHomeworkLocal(state.homework);
          return data.data;
        }
      }
    } catch (e) {
      console.warn('Offline reset');
    }

    return state.homework;
  }
};

/* ==========================================================================
   REAL-TIME WEBSOCKET (SILENT - NO TOAST NOISE)
   ========================================================================== */
let ws = null;

function setupWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      state.wsConnected = true;
      elements.syncDot.className = 'sync-dot online';
      elements.syncDot.title = 'Real-time sync active';
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        handleSocketEvent(msg);
      } catch (err) {
        console.error(err);
      }
    };

    ws.onclose = () => {
      state.wsConnected = false;
      elements.syncDot.className = 'sync-dot';
      elements.syncDot.title = 'Local/Cloud sync';
      setTimeout(setupWebSocket, 5000);
    };

    ws.onerror = () => {
      state.wsConnected = false;
      elements.syncDot.className = 'sync-dot';
    };
  } catch (e) {
    elements.syncDot.className = 'sync-dot';
  }
}

function handleSocketEvent(msg) {
  const { event, payload } = msg;

  if (event === 'HOMEWORK_TOGGLED' || event === 'SUBJECT_TOGGLED') {
    state.homework[payload.subjectId] = payload.status;
    saveHomeworkLocal(state.homework);
    renderSubjects();
    updateOverview();
  } else if (event === 'HOMEWORK_DETAILS_UPDATED' || event === 'SUBJECT_DETAILS_UPDATED') {
    if (!state.homework[payload.subjectId]) state.homework[payload.subjectId] = {};
    Object.assign(state.homework[payload.subjectId], payload.details);
    saveHomeworkLocal(state.homework);
    renderSubjects();
  } else if (event === 'HOMEWORK_RESET' || event === 'WEEK_RESET') {
    state.homework = payload.homework || (payload.week && payload.week.subjects) || {};
    saveHomeworkLocal(state.homework);
    renderSubjects();
    updateOverview();
  } else if (event === 'HOMEWORK_MARKED_ALL' || event === 'WEEK_MARKED_ALL') {
    state.homework = payload.homework || (payload.week && payload.week.subjects) || {};
    saveHomeworkLocal(state.homework);
    renderSubjects();
    updateOverview();
  } else if (event === 'HOMEWORK_SYNCED') {
    if (payload.homework) {
      state.homework = payload.homework;
      saveHomeworkLocal(state.homework);
      renderSubjects();
      updateOverview();
    }
  }
}

/* ==========================================================================
   RENDER SUBJECTS
   ========================================================================== */
function renderSubjects() {
  const query = state.searchQuery.trim().toLowerCase();
  const filter = state.subjectFilter;

  const filtered = state.subjects.filter(sub => {
    if (query && !sub.name.toLowerCase().includes(query)) return false;

    const status = state.homework[sub.id] || {};
    const isCompleted = Boolean(status.completed);

    if (filter === 'completed') return isCompleted;
    if (filter === 'pending') return !isCompleted;
    if (filter === 'extra') return sub.type === 'extra';
    return true;
  });

  if (filtered.length === 0) {
    elements.subjectsList.innerHTML = `<div class="empty-box">No subjects found</div>`;
    return;
  }

  elements.subjectsList.innerHTML = filtered.map(sub => {
    const status = state.homework[sub.id] || {};
    const isCompleted = Boolean(status.completed);
    const hasAssignment = Boolean(status.assignment && status.assignment.trim());
    const hasDeadline = Boolean(status.deadline);
    const hasNote = Boolean(status.note && status.note.trim());

    return `
      <div class="item-row ${isCompleted ? 'is-completed' : ''}" data-subject-id="${sub.id}">
        <div class="item-main">
          <div class="item-left">
            <div class="minimal-checkbox" data-action="toggle" data-id="${sub.id}" aria-label="Toggle completed status">
              <i data-feather="check"></i>
            </div>
            <div class="item-info">
              <span class="item-name">${escapeHTML(sub.name)}</span>
              <span class="item-category">${escapeHTML(sub.category)}</span>
            </div>
          </div>
          <div class="item-right">
            <button class="icon-btn-subtle" data-action="edit" data-id="${sub.id}" title="Edit assignment">
              <i data-feather="edit-2"></i>
            </button>
          </div>
        </div>

        ${(hasAssignment || hasDeadline || hasNote) ? `
          <div class="item-details">
            ${hasAssignment ? `<div class="assignment-text">${escapeHTML(status.assignment)}</div>` : ''}
            <div class="meta-tags-line">
              ${hasDeadline ? `<span>Due: ${escapeHTML(status.deadline)}</span>` : ''}
              ${hasNote ? `<span>• ${escapeHTML(status.note)}</span>` : ''}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  feather.replace({ parent: elements.subjectsList });
}

function updateOverview() {
  const total = state.subjects.length;
  let completed = 0;

  state.subjects.forEach(sub => {
    if (state.homework[sub.id] && state.homework[sub.id].completed) {
      completed++;
    }
  });

  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  elements.progressPercent.textContent = `${percent}%`;
  elements.progressBar.style.width = `${percent}%`;
  elements.progressSummaryText.textContent = `${completed} of ${total} completed`;
}

/* ==========================================================================
   MODAL CONTROLS
   ========================================================================== */
function openModal(modal) {
  modal.classList.add('active');
}

function closeModal(modal) {
  modal.classList.remove('active');
}

function openEditSubjectModal(subjectId) {
  const sub = state.subjects.find(s => s.id === subjectId);
  if (!sub) return;

  const item = state.homework[subjectId] || {};
  elements.editSubjectId.value = subjectId;
  elements.modalSubjectTitle.textContent = `${sub.name} - Assignment`;
  elements.editAssignment.value = item.assignment || '';
  elements.editDeadline.value = item.deadline || '';
  elements.editNote.value = item.note || '';

  openModal(elements.editSubjectModal);
  elements.editAssignment.focus();
}

/* ==========================================================================
   EVENT LISTENERS
   ========================================================================== */
function setupEventListeners() {
  // Mark All & Reset
  elements.markAllBtn.addEventListener('click', async () => {
    state.homework = await API.markAllHomework(true);
    renderSubjects();
    updateOverview();
  });

  elements.resetBtn.addEventListener('click', async () => {
    if (confirm("Are you sure you want to reset all subjects for a new week?")) {
      state.homework = await API.resetHomework();
      renderSubjects();
      updateOverview();
    }
  });

  // Search
  elements.subjectSearch.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    elements.clearSearch.style.display = state.searchQuery ? 'block' : 'none';
    renderSubjects();
  });

  elements.clearSearch.addEventListener('click', () => {
    elements.subjectSearch.value = '';
    state.searchQuery = '';
    elements.clearSearch.style.display = 'none';
    renderSubjects();
  });

  // Filter Tags
  elements.subjectFilterTags.addEventListener('click', (e) => {
    const btn = e.target.closest('.tag-btn');
    if (!btn) return;
    elements.subjectFilterTags.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.subjectFilter = btn.dataset.filter;
    renderSubjects();
  });

  // Subjects List Interaction
  elements.subjectsList.addEventListener('click', async (e) => {
    const toggle = e.target.closest('[data-action="toggle"]');
    if (toggle) {
      e.stopPropagation();
      const id = toggle.dataset.id;
      await API.toggleSubject(id);
      renderSubjects();
      updateOverview();
      return;
    }

    const edit = e.target.closest('[data-action="edit"]');
    if (edit) {
      e.stopPropagation();
      openEditSubjectModal(edit.dataset.id);
    }
  });

  // Edit Subject Form Submit
  elements.editSubjectForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = elements.editSubjectId.value;
    const assignment = elements.editAssignment.value.trim();
    const deadline = elements.editDeadline.value;
    const note = elements.editNote.value.trim();

    await API.updateSubjectDetails(id, { assignment, deadline, note });
    closeModal(elements.editSubjectModal);
    renderSubjects();
  });

  // Close modals
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modalId = e.target.dataset.close || e.target.closest('[data-close]').dataset.close;
      closeModal(document.getElementById(modalId));
    });
  });

  document.querySelectorAll('.modal-backdrop').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  // Dark/Light Mode
  const savedTheme = localStorage.getItem('homework_theme') || 'dark';
  applyTheme(savedTheme);

  elements.themeToggleBtn.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('homework_theme', theme);
  elements.themeIcon.setAttribute('data-feather', theme === 'dark' ? 'sun' : 'moon');
  feather.replace({ parent: elements.themeToggleBtn });
}

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */
async function init() {
  setupEventListeners();
  setupWebSocket();

  // 1. Instant local render (Zero lag, zero flash of undone tasks on refresh!)
  const localHomework = loadHomeworkLocal();
  if (localHomework && Object.keys(localHomework).length > 0) {
    state.homework = localHomework;
    renderSubjects();
    updateOverview();
  }

  // 2. Fetch fresh subjects & homework from server, smart-merge and update
  const fetchedSubjects = await API.fetchSubjects();
  if (fetchedSubjects && fetchedSubjects.length > 0) {
    state.subjects = fetchedSubjects;
  }

  const fetchedHomework = await API.fetchHomework();
  if (fetchedHomework) {
    state.homework = fetchedHomework;
    renderSubjects();
    updateOverview();
  }

  // 3. Visibility change listener (re-sync silently when user returns to tab)
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      const refreshed = await API.fetchHomework();
      if (refreshed) {
        state.homework = refreshed;
        renderSubjects();
        updateOverview();
      }
    }
  });

  // 4. Polling fallback when WebSocket is not active (e.g. on Vercel)
  setInterval(async () => {
    if (!state.wsConnected && document.visibilityState === 'visible') {
      const polled = await API.fetchHomework();
      if (polled) {
        state.homework = polled;
        renderSubjects();
        updateOverview();
      }
    }
  }, 10000);
}

document.addEventListener('DOMContentLoaded', init);
