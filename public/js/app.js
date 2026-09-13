/**
 * HOMEWORK MANAGER - MINIMALIST CLIENT APPLICATION
 * Clean, distraction-free, silent real-time sync (Subjects Only)
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
   API CLIENT
   ========================================================================== */
const API = {
  async fetchSubjects() {
    try {
      const res = await fetch('/api/subjects');
      const data = await res.json();
      if (data.success) return data.data;
    } catch (e) {
      console.warn('Offline mode for subjects');
    }
    return DEFAULT_SUBJECTS;
  },

  async fetchHomework() {
    try {
      const res = await fetch('/api/homework');
      const data = await res.json();
      if (data.success) return data.data;
    } catch (e) {
      console.warn('Offline mode for homework');
    }

    const local = localStorage.getItem('homework_data');
    if (local) return JSON.parse(local);

    const initial = {};
    state.subjects.forEach(sub => {
      initial[sub.id] = { completed: false, assignment: '', note: '', deadline: '' };
    });
    return initial;
  },

  async toggleSubject(subjectId, completed = null) {
    try {
      const res = await fetch('/api/homework/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId, completed })
      });
      const data = await res.json();
      if (data.success) return data.data;
    } catch (e) {
      console.warn('Offline toggle');
    }

    if (!state.homework[subjectId]) {
      state.homework[subjectId] = { completed: false, assignment: '', note: '', deadline: '' };
    }
    const current = Boolean(state.homework[subjectId].completed);
    state.homework[subjectId].completed = completed !== null ? completed : !current;
    localStorage.setItem('homework_data', JSON.stringify(state.homework));
    return { subjectId, status: state.homework[subjectId] };
  },

  async updateSubjectDetails(subjectId, details) {
    try {
      const res = await fetch(`/api/homework/subjects/${subjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details)
      });
      const data = await res.json();
      if (data.success) return data.data;
    } catch (e) {
      console.warn('Offline details update');
    }

    if (!state.homework[subjectId]) {
      state.homework[subjectId] = { completed: false };
    }
    Object.assign(state.homework[subjectId], details);
    localStorage.setItem('homework_data', JSON.stringify(state.homework));
    return state.homework[subjectId];
  },

  async markAllHomework(completed = true) {
    try {
      const res = await fetch('/api/homework/mark-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed })
      });
      const data = await res.json();
      if (data.success) return data.data;
    } catch (e) {
      console.warn('Offline mark all');
    }

    Object.keys(state.homework).forEach(id => {
      state.homework[id].completed = completed;
    });
    localStorage.setItem('homework_data', JSON.stringify(state.homework));
    return state.homework;
  },

  async resetHomework() {
    try {
      const res = await fetch('/api/homework/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) return data.data;
    } catch (e) {
      console.warn('Offline reset');
    }

    const resetData = {};
    state.subjects.forEach(sub => {
      resetData[sub.id] = { completed: false, assignment: '', note: '', deadline: '' };
    });
    state.homework = resetData;
    localStorage.setItem('homework_data', JSON.stringify(state.homework));
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
      elements.syncDot.title = 'Reconnecting...';
      setTimeout(setupWebSocket, 3000);
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
    renderSubjects();
    updateOverview();
  } else if (event === 'HOMEWORK_DETAILS_UPDATED' || event === 'SUBJECT_DETAILS_UPDATED') {
    if (!state.homework[payload.subjectId]) state.homework[payload.subjectId] = {};
    Object.assign(state.homework[payload.subjectId], payload.details);
    renderSubjects();
  } else if (event === 'HOMEWORK_RESET' || event === 'WEEK_RESET') {
    state.homework = payload.homework || (payload.week && payload.week.subjects) || {};
    renderSubjects();
    updateOverview();
  } else if (event === 'HOMEWORK_MARKED_ALL' || event === 'WEEK_MARKED_ALL') {
    state.homework = payload.homework || (payload.week && payload.week.subjects) || {};
    renderSubjects();
    updateOverview();
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
      const res = await API.toggleSubject(id);
      if (res && res.status) {
        state.homework[id] = res.status;
        renderSubjects();
        updateOverview();
      }
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

  state.subjects = await API.fetchSubjects();
  state.homework = await API.fetchHomework();

  renderSubjects();
  updateOverview();
}

document.addEventListener('DOMContentLoaded', init);
