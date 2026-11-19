// Use localStorage only for temporary local-only work.
const DATA_MODE = 'api';
const API_BASE_URL = (window.UNIVRSE_API_BASE || document.querySelector('meta[name="api-base-url"]')?.content || '').trim().replace(/\/+$/, '');
const ASSIGNMENTS_STORAGE_KEY = 'univrse.assignments.v2';
const completionStorageKey = 'univrse.assignmentCompletion.v1';

const assignmentList = document.querySelector('#assignment-list');
const searchInput = document.querySelector('#search-univrse');
const filterButtons = [...document.querySelectorAll('[data-filter]')];
const sortSelect = document.querySelector('#assignment-sort');
const subjectFilter = document.querySelector('#assignment-subject-filter');
const priorityFilter = document.querySelector('#assignment-priority-filter');
const loadingMessage = document.querySelector('#assignment-loading');
const errorMessage = document.querySelector('#assignment-error');
const errorText = document.querySelector('#assignment-error-message');
const summaryGrid = document.querySelector('.summary-grid');
const retryButton = document.querySelector('#assignment-retry');
const emptyMessage = document.querySelector('#assignment-empty');
const deadlineList = document.querySelector('#deadline-list');
const deadlineEmpty = document.querySelector('#deadline-empty');
const completedList = document.querySelector('#completed-list');
const completedEmpty = document.querySelector('#completed-empty');
const progressTrack = document.querySelector('#completion-track');
const editorDialog = document.querySelector('#assignment-dialog');
const editorForm = document.querySelector('#assignment-form');
const editorError = document.querySelector('#assignment-form-error');
const saveButton = document.querySelector('#assignment-save');

let assignments = [];
let activeFilter = 'all';
let completionOverrides = {};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function parseDueDate(dateString) {
  if (typeof dateString !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function normalizeDueDate(value) {
  const datePart = typeof value === 'string' ? value.match(/^(\d{4}-\d{2}-\d{2})(?:T.*)?$/)?.[1] : null;
  return datePart && parseDueDate(datePart) ? datePart : null;
}

function daysUntilDue(dateString) {
  const dueDate = parseDueDate(dateString);
  if (!dueDate) return null;
  const today = startOfToday();
  const dueUtc = Date.UTC(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((dueUtc - todayUtc) / 86400000);
}

function getEffectiveStatus(assignment) {
  if (assignment.status === 'Completed') return 'completed';
  const days = daysUntilDue(assignment.dueDate);
  return days !== null && days < 0 ? 'overdue' : 'pending';
}

function formatDate(dateString) {
  const date = parseDueDate(dateString);
  if (!date) return 'Deadline unavailable';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function countdownLabel(assignment, status) {
  if (status === 'completed') return 'Completed';
  const days = daysUntilDue(assignment.dueDate);
  if (days === null) return 'Deadline unavailable';
  if (days < 0) return `Overdue by ${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'}`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days} days`;
}

function formatSubmissionDate(dateString) {
  if (!dateString || Number.isNaN(new Date(dateString).getTime())) return '';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(dateString));
}

function normalizeAssignment(item) {
  if (!item || typeof item !== 'object') throw new Error('An assignment record is invalid.');
  const id = item._id ?? item.id;
  const priorityValue = String(item.priority ?? '').toLowerCase();
  const statusValue = String(item.status ?? 'Pending').toLowerCase();
  const priority = { low: 'Low', medium: 'Medium', high: 'High' }[priorityValue];
  const dueDate = normalizeDueDate(item.dueDate);
  if (!id || !item.title || !item.subject || !dueDate || !priority) {
    throw new Error('An assignment is missing required fields or has an invalid priority or due date.');
  }
  if (!['pending', 'overdue', 'completed', 'submitted'].includes(statusValue)) {
    throw new Error('An assignment has an unsupported status.');
  }
  return {
    ...item,
    id: String(id),
    title: String(item.title),
    subject: String(item.subject),
    description: String(item.description ?? ''),
    dueDate,
    priority,
    status: ['completed', 'submitted'].includes(statusValue) ? 'Completed' : 'Pending',
    progress: Number(item.progress) || 0,
    submission: item.submission && typeof item.submission === 'object' ? item.submission : {}
  };
}

function validateAssignments(data) {
  if (!Array.isArray(data)) throw new Error('Assignment data must be a JSON array.');
  const normalized = data.map(normalizeAssignment);
  const ids = new Set();
  for (const assignment of normalized) {
    if (ids.has(assignment.id)) throw new Error('Assignment data contains duplicate IDs.');
    ids.add(assignment.id);
  }
  return normalized;
}

function getAssignmentPayload(formData) {
  return {
    title: String(formData.get('title')).trim(),
    subject: String(formData.get('subject')).trim(),
    description: String(formData.get('description')).trim(),
    dueDate: String(formData.get('dueDate')),
    priority: String(formData.get('priority')),
    status: String(formData.get('status'))
  };
}

async function apiRequest(path, options = {}) {
  if (!API_BASE_URL) {
    throw new Error('The API base URL is not configured. Set the api-base-url meta value in assignments.html.');
  }
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers
      }
    });
  } catch (error) {
    throw new Error(`Could not connect to ${API_BASE_URL}. Check the backend address, network access, and CORS configuration. ${error.message}`);
  }

  if (response.status === 204) return null;
  const responseText = await response.text();
  let result = null;
  if (responseText) {
    try {
      result = JSON.parse(responseText);
    } catch (error) {
      throw new Error(response.ok ? 'The backend returned an invalid JSON response.' : responseText);
    }
  }
  if (!response.ok || result?.success === false) {
    throw new Error(result?.message || responseText || `Request failed with status ${response.status}.`);
  }
  if (result && Object.prototype.hasOwnProperty.call(result, 'data')) return result.data;
  return result;
}

const apiRepository = {
  async getAll() {
    return validateAssignments(await apiRequest('/assignments'));
  },
  async getById(id) {
    return normalizeAssignment(await apiRequest(`/assignments/${encodeURIComponent(id)}`));
  },
  async create(payload) {
    await apiRequest('/assignments', { method: 'POST', body: JSON.stringify(payload) });
  },
  async update(id, payload) {
    await apiRequest(`/assignments/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) });
  },
  async setStatus(id, status) {
    await apiRequest(`/assignments/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },
  async remove(id) {
    await apiRequest(`/assignments/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }
};

function readLegacyCompletionOverrides() {
  try {
    const saved = JSON.parse(localStorage.getItem(completionStorageKey) || '{}');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      completionOverrides = Object.fromEntries(
        Object.entries(saved).filter(([, isCompleted]) => typeof isCompleted === 'boolean')
      );
    }
  } catch (error) {
    console.warn('Saved assignment completion states could not be read.', error);
    completionOverrides = {};
  }
}

function persistLocalAssignments(records) {
  localStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(records));
}

const localRepository = {
  async getAll() {
    const saved = localStorage.getItem(ASSIGNMENTS_STORAGE_KEY);
    if (saved !== null) return validateAssignments(JSON.parse(saved));

    const response = await fetch('data/assignments.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Local assignment data could not be loaded (HTTP ${response.status}).`);
    const records = validateAssignments(await response.json()).map(assignment => {
      if (!Object.prototype.hasOwnProperty.call(completionOverrides, assignment.id)) return assignment;
      return {
        ...assignment,
        status: completionOverrides[assignment.id] ? 'Completed' : 'Pending'
      };
    });
    persistLocalAssignments(records);
    return records;
  },
  async getById(id) {
    const assignment = assignments.find(item => item.id === id);
    if (!assignment) throw new Error('That assignment no longer exists. Refresh and try again.');
    return assignment;
  },
  async create(payload) {
    const records = await this.getAll();
    records.push(normalizeAssignment({ ...payload, id: `local-${crypto.randomUUID()}` }));
    persistLocalAssignments(records);
  },
  async update(id, payload) {
    const records = await this.getAll();
    const index = records.findIndex(item => item.id === id);
    if (index < 0) throw new Error('That assignment no longer exists. Refresh and try again.');
    records[index] = normalizeAssignment({ ...records[index], ...payload, id });
    persistLocalAssignments(records);
  },
  async setStatus(id, status) {
    const records = await this.getAll();
    const index = records.findIndex(item => item.id === id);
    if (index < 0) throw new Error('That assignment no longer exists. Refresh and try again.');
    records[index] = normalizeAssignment({
      ...records[index],
      status,
      progress: status === 'Completed' ? 100 : 0,
      submission: status === 'Completed'
        ? { ...records[index].submission, submittedAt: new Date().toISOString() }
        : { ...records[index].submission, submittedAt: null, grade: null }
    });
    persistLocalAssignments(records);
  },
  async remove(id) {
    const records = await this.getAll();
    const nextRecords = records.filter(item => item.id !== id);
    if (nextRecords.length === records.length) throw new Error('That assignment no longer exists. Refresh and try again.');
    persistLocalAssignments(nextRecords);
  }
};

const repository = DATA_MODE === 'api' ? apiRepository : localRepository;

function statusMarkup(status) {
  const labels = { pending: 'Pending', overdue: 'Overdue', completed: 'Completed' };
  const classes = { pending: 'status-pill--pending', overdue: 'status-pill--overdue', completed: 'status-pill--done' };
  return `<span class="status-pill ${classes[status]}">${labels[status]}</span>`;
}

function renderAssignmentCard(assignment) {
  const status = getEffectiveStatus(assignment);
  const isCompleted = status === 'completed';
  const priorityClass = assignment.priority.toLowerCase();
  const dueDays = daysUntilDue(assignment.dueDate);
  const countdownClass = status === 'completed'
    ? 'countdown--completed'
    : status === 'overdue'
      ? 'countdown--overdue'
      : dueDays === null
        ? 'countdown--unavailable'
        : dueDays <= 2
          ? 'countdown--urgent'
          : 'countdown--upcoming';
  const progress = isCompleted ? 100 : Math.max(0, Math.min(100, Number(assignment.progress) || 0));

  return `
    <article class="assignment-card assignment-card--${status}" data-id="${escapeHtml(assignment.id)}" data-status="${status}">
      <div class="assignment-top">
        <span class="assignment-subject">${escapeHtml(assignment.subject)}</span>
        <span class="priority-tag priority-tag--${priorityClass}">${escapeHtml(assignment.priority)} priority</span>
      </div>
      <h3 class="assignment-title">${escapeHtml(assignment.title)}</h3>
      <p class="assignment-desc">${escapeHtml(assignment.description)}</p>
      <div class="assignment-meta">
        <span class="meta-item"><span class="meta-icon" aria-hidden="true">&#128197;</span>${escapeHtml(formatDate(assignment.dueDate))}</span>
        <span class="deadline-countdown ${countdownClass}">${escapeHtml(countdownLabel(assignment, status))}</span>
        ${statusMarkup(status)}
      </div>
      <div class="progress-block">
        <div class="progress-labels"><span>${isCompleted ? 'Completed' : 'Progress'}</span><span>${progress}%</span></div>
        <div class="progress-track" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100" aria-label="Assignment progress ${progress} percent">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
      </div>
      <div class="assignment-card-actions">
        <button class="assignment-action" type="button" data-toggle-completion="${escapeHtml(assignment.id)}" aria-pressed="${isCompleted}">${isCompleted ? 'Mark pending' : 'Mark completed'}</button>
        <button class="assignment-action assignment-action--secondary" type="button" data-edit-assignment="${escapeHtml(assignment.id)}">Edit</button>
        <button class="assignment-action assignment-action--danger" type="button" data-delete-assignment="${escapeHtml(assignment.id)}">Delete</button>
      </div>
    </article>`;
}

function renderSummary() {
  const total = assignments.length;
  const completed = assignments.filter(item => getEffectiveStatus(item) === 'completed').length;
  const pending = total - completed;
  const upcoming = assignments.filter(item => {
    if (getEffectiveStatus(item) === 'completed') return false;
    const days = daysUntilDue(item.dueDate);
    return days !== null && days >= 0 && days <= 7;
  }).length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  document.querySelector('#total-count').textContent = total;
  document.querySelector('#pending-count').textContent = pending;
  document.querySelector('#upcoming-count').textContent = upcoming;
  document.querySelector('#completed-count').textContent = completed;
  document.querySelector('#completed-section-count').textContent = `${completed} completed`;
  document.querySelector('#progress-completed-count').textContent = completed;
  document.querySelector('#progress-total-count').textContent = total;
  document.querySelector('#completion-percentage').textContent = `${percentage}%`;
  document.querySelector('#completion-fill').style.width = `${percentage}%`;
  progressTrack.setAttribute('aria-valuenow', percentage);
}

function renderDeadlines() {
  const upcoming = assignments
    .filter(item => getEffectiveStatus(item) !== 'completed' && daysUntilDue(item.dueDate) !== null && daysUntilDue(item.dueDate) >= 0)
    .sort((first, second) => first.dueDate.localeCompare(second.dueDate))
    .slice(0, 5);

  deadlineList.innerHTML = upcoming.map(item => `
    <article class="deadline-item">
      <div class="deadline-info"><span class="deadline-title">${escapeHtml(item.title)}</span><span class="deadline-subject">${escapeHtml(item.subject)}</span></div>
      <span class="deadline-date">${escapeHtml(countdownLabel(item, getEffectiveStatus(item)))}</span>
    </article>`).join('');
  deadlineEmpty.hidden = upcoming.length > 0;
}

function renderCompleted() {
  const completed = assignments
    .filter(item => getEffectiveStatus(item) === 'completed')
    .sort((first, second) => (second.submission?.submittedAt || '').localeCompare(first.submission?.submittedAt || ''))
    .slice(0, 5);

  completedList.innerHTML = completed.map(item => `
    <article class="completed-card">
      <span class="completed-check" aria-hidden="true">&#10003;</span>
      <div class="completed-info"><span class="completed-title">${escapeHtml(item.title)}</span><span class="completed-subject">${escapeHtml(item.subject)}</span></div>
      ${item.submission?.grade ? `<span class="submission-grade">${escapeHtml(item.submission.grade)}</span>` : ''}
      <span class="completed-date">${escapeHtml(formatSubmissionDate(item.submission?.submittedAt))}</span>
    </article>`).join('');
  completedEmpty.hidden = completed.length > 0;
}

function renderSubjectOptions() {
  const selectedSubject = subjectFilter.value;
  const subjects = [...new Set(assignments.map(item => item.subject))].sort((a, b) => a.localeCompare(b));
  subjectFilter.innerHTML = '<option value="">All subjects</option>' + subjects.map(subject =>
    `<option value="${escapeHtml(subject)}">${escapeHtml(subject)}</option>`
  ).join('');
  if (subjects.includes(selectedSubject)) subjectFilter.value = selectedSubject;
}

function renderAssignments() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  const selectedSubject = subjectFilter.value.toLocaleLowerCase();
  const selectedPriority = priorityFilter.value;
  const sortBy = sortSelect.value;
  const visible = assignments
    .filter(item => activeFilter === 'all' || getEffectiveStatus(item) === activeFilter)
    .filter(item => item.title.toLocaleLowerCase().includes(query))
    .filter(item => !selectedSubject || item.subject.toLocaleLowerCase() === selectedSubject)
    .filter(item => !selectedPriority || item.priority === selectedPriority)
    .sort((first, second) => {
      if (sortBy === 'title' || sortBy === 'subject') return first[sortBy].localeCompare(second[sortBy]);
      return first.dueDate.localeCompare(second.dueDate);
    });

  assignmentList.innerHTML = visible.map(renderAssignmentCard).join('');
  document.querySelector('#assignment-result-count').textContent = `${visible.length} ${visible.length === 1 ? 'assignment' : 'assignments'}`;
  emptyMessage.hidden = visible.length > 0;
  emptyMessage.textContent = assignments.length === 0
    ? 'No assignments yet. Add one to get started.'
    : 'No assignments match your search and filters.';

  const completedSection = completedList.closest('.section');
  completedSection.hidden = activeFilter !== 'all';
  const completedCards = [...completedList.querySelectorAll('.completed-card')];
  const completedMatches = completedCards.filter(card => {
    const matchesSearch = card.textContent.toLocaleLowerCase().includes(query)
      && (!selectedSubject || card.querySelector('.completed-subject').textContent.toLocaleLowerCase() === selectedSubject)
      && (!selectedPriority || assignments.find(item => item.title === card.querySelector('.completed-title').textContent)?.priority === selectedPriority);
    card.hidden = !matchesSearch;
    return matchesSearch;
  });
  completedEmpty.hidden = activeFilter !== 'all' || completedMatches.length > 0;
}

function renderPage() {
  renderSummary();
  renderDeadlines();
  renderCompleted();
  renderSubjectOptions();
  renderAssignments();
}

function showPageError(message) {
  errorText.textContent = message;
  errorMessage.hidden = false;
}

async function loadAssignments() {
  loadingMessage.hidden = false;
  errorMessage.hidden = true;
  summaryGrid.setAttribute('aria-busy', 'true');
  assignmentList.innerHTML = '';

  try {
    assignments = await repository.getAll();
    renderPage();
    loadingMessage.hidden = true;
  } catch (error) {
    console.error('Unable to load assignments:', error);
    loadingMessage.hidden = true;
    errorMessage.hidden = false;
    emptyMessage.hidden = true;
    deadlineList.innerHTML = '';
    completedList.innerHTML = '';
    showPageError(DATA_MODE === 'api'
      ? `Assignments could not be loaded from the API (${error.message}). Configured base URL: ${API_BASE_URL || 'not set'}. Confirm the backend is reachable from this browser and allows this page's origin through CORS.`
      : `Assignments could not be loaded from local data (${error.message}). Check your connection and try again.`);
  } finally {
    summaryGrid.setAttribute('aria-busy', 'false');
  }
}

function openEditor(assignment = null) {
  editorForm.reset();
  editorError.hidden = true;
  editorError.textContent = '';
  document.querySelector('#assignment-id').value = assignment?.id || '';
  document.querySelector('#assignment-title-input').value = assignment?.title || '';
  document.querySelector('#assignment-subject-input').value = assignment?.subject || '';
  document.querySelector('#assignment-description-input').value = assignment?.description || '';
  document.querySelector('#assignment-due-date-input').value = assignment?.dueDate || '';
  document.querySelector('#assignment-priority-input').value = assignment?.priority || 'Medium';
  document.querySelector('#assignment-status-input').value = assignment?.status || 'Pending';
  document.querySelector('#assignment-dialog-title').textContent = assignment ? 'Edit assignment' : 'Add assignment';
  saveButton.textContent = assignment ? 'Save changes' : 'Save assignment';
  editorDialog.showModal();
  document.querySelector('#assignment-title-input').focus();
}

async function handleEdit(id) {
  try {
    const assignment = await repository.getById(id);
    openEditor(assignment);
  } catch (error) {
    showPageError(`Could not load this assignment for editing (${error.message}).`);
  }
}

async function handleDelete(id) {
  const assignment = assignments.find(item => item.id === id);
  if (!assignment || !window.confirm(`Delete "${assignment.title}"? This cannot be undone.`)) return;
  try {
    await repository.remove(id);
    await loadAssignments();
  } catch (error) {
    showPageError(`Could not delete the assignment (${error.message}).`);
  }
}

async function handleCompletionToggle(id) {
  const assignment = assignments.find(item => item.id === id);
  if (!assignment) return;
  const nextStatus = assignment.status === 'Completed' ? 'Pending' : 'Completed';
  try {
    await repository.setStatus(id, nextStatus);
    await loadAssignments();
  } catch (error) {
    showPageError(`Could not update the assignment status (${error.message}).`);
  }
}

editorForm.addEventListener('submit', async event => {
  event.preventDefault();
  editorError.hidden = true;
  if (!editorForm.reportValidity()) return;

  const formData = new FormData(editorForm);
  const payload = getAssignmentPayload(formData);
  if (!payload.title || !payload.subject || !parseDueDate(payload.dueDate)) {
    editorError.textContent = 'Enter a title, subject, and valid due date.';
    editorError.hidden = false;
    return;
  }

  const id = String(formData.get('id') || '');
  saveButton.disabled = true;
  saveButton.textContent = 'Saving...';
  try {
    if (id) await repository.update(id, payload);
    else await repository.create(payload);
    editorDialog.close();
    await loadAssignments();
  } catch (error) {
    console.error('Unable to save assignment:', error);
    editorError.textContent = `Could not save the assignment (${error.message}).`;
    editorError.hidden = false;
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = id ? 'Save changes' : 'Save assignment';
  }
});

filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach(filter => {
      const selected = filter === button;
      filter.classList.toggle('is-active', selected);
      filter.setAttribute('aria-pressed', String(selected));
    });
    renderAssignments();
  });
});

assignmentList.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.toggleCompletion) handleCompletionToggle(button.dataset.toggleCompletion);
  if (button.dataset.editAssignment) handleEdit(button.dataset.editAssignment);
  if (button.dataset.deleteAssignment) handleDelete(button.dataset.deleteAssignment);
});

searchInput.addEventListener('input', renderAssignments);
subjectFilter.addEventListener('change', renderAssignments);
priorityFilter.addEventListener('change', renderAssignments);
sortSelect.addEventListener('change', renderAssignments);
retryButton.addEventListener('click', loadAssignments);
document.querySelector('#add-assignment').addEventListener('click', () => openEditor());
document.querySelector('#assignment-dialog-close').addEventListener('click', () => editorDialog.close());
document.querySelector('#assignment-cancel').addEventListener('click', () => editorDialog.close());

if (DATA_MODE === 'localStorage') readLegacyCompletionOverrides();
document.querySelector('#assignment-data-mode').textContent = DATA_MODE === 'api'
  ? `Data source: API (${API_BASE_URL || 'base URL not configured'})`
  : 'Data source: this browser (localStorage)';
loadAssignments();
