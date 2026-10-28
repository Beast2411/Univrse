const assignmentList = document.querySelector('#assignment-list');
const searchInput = document.querySelector('#search-univrse');
const filterButtons = [...document.querySelectorAll('[data-filter]')];
const sortSelect = document.querySelector('#assignment-sort');
const loadingMessage = document.querySelector('#assignment-loading');
const errorMessage = document.querySelector('#assignment-error');
const summaryGrid = document.querySelector('.summary-grid');
const retryButton = document.querySelector('#assignment-retry');
const emptyMessage = document.querySelector('#assignment-empty');
const deadlineList = document.querySelector('#deadline-list');
const deadlineEmpty = document.querySelector('#deadline-empty');
const completedList = document.querySelector('#completed-list');
const completedEmpty = document.querySelector('#completed-empty');
const progressTrack = document.querySelector('#completion-track');
const completionStorageKey = 'univrse.assignmentCompletion.v1';

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

function daysUntilDue(dateString) {
  const dueDate = parseDueDate(dateString);
  if (!dueDate) return null;
  const today = startOfToday();
  const dueUtc = Date.UTC(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((dueUtc - todayUtc) / 86400000);
}

function getEffectiveStatus(assignment) {
  const hasSavedCompletion = Object.prototype.hasOwnProperty.call(completionOverrides, assignment.id);
  const isComplete = hasSavedCompletion
    ? completionOverrides[assignment.id]
    : assignment.status === 'submitted';
  if (isComplete) return 'completed';
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
  if (!dateString) return '';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(dateString));
}

function statusMarkup(status) {
  const labels = { pending: 'Pending', overdue: 'Overdue', completed: 'Completed' };
  const classes = { pending: 'status-pill--pending', overdue: 'status-pill--overdue', completed: 'status-pill--done' };
  return `<span class="status-pill ${classes[status]}">${labels[status]}</span>`;
}

function renderAssignmentCard(assignment) {
  const status = getEffectiveStatus(assignment);
  const isCompleted = status === 'completed';
  const priorityClass = ['high', 'medium', 'low'].includes(assignment.priority) ? assignment.priority : 'low';
  const progress = isCompleted ? 100 : Math.max(0, Math.min(100, Number(assignment.progress) || 0));
  const submissionNote = assignment.submission?.note
    ? `<p class="assignment-submission">${escapeHtml(assignment.submission.note)}</p>`
    : '';
  const grade = assignment.submission?.grade
    ? `<span class="submission-grade">Grade ${escapeHtml(assignment.submission.grade)}</span>`
    : '';
  const dueCountdown = countdownLabel(assignment, status);
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

  return `
    <article class="assignment-card assignment-card--${status}" data-id="${escapeHtml(assignment.id)}" data-status="${status}">
      <div class="assignment-top">
        <span class="assignment-subject">${escapeHtml(assignment.subject)}</span>
        <span class="priority-tag priority-tag--${priorityClass}">${priorityClass[0].toUpperCase()}${priorityClass.slice(1)} priority</span>
      </div>
      <h3 class="assignment-title">${escapeHtml(assignment.title)}</h3>
      <p class="assignment-desc">${escapeHtml(assignment.description)}</p>
      ${submissionNote}
      <div class="assignment-meta">
        <span class="meta-item"><span class="meta-icon" aria-hidden="true">&#128197;</span>${escapeHtml(formatDate(assignment.dueDate))}</span>
        <span class="deadline-countdown ${countdownClass}">${escapeHtml(dueCountdown)}</span>
        ${statusMarkup(status)}
      </div>
      ${isCompleted && assignment.submission?.submittedAt ? `<div class="submission-meta"><span class="meta-item">Submitted ${escapeHtml(formatSubmissionDate(assignment.submission.submittedAt))}</span>${grade}</div>` : ''}
      <div class="progress-block">
        <div class="progress-labels"><span>${isCompleted ? 'Completed' : 'Progress'}</span><span>${progress}%</span></div>
        <div class="progress-track" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100" aria-label="Assignment progress ${progress} percent">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
      </div>
      <button class="assignment-action" type="button" data-toggle-completion="${escapeHtml(assignment.id)}" aria-pressed="${isCompleted}">${isCompleted ? 'Undo' : 'Mark as Done'}</button>
    </article>`;
}

function renderSummary() {
  const total = assignments.length;
  const pending = assignments.filter(item => getEffectiveStatus(item) === 'pending').length;
  const completed = assignments.filter(item => getEffectiveStatus(item) === 'completed').length;
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
  document.querySelector('#completed-section-count').textContent = `${completed} submitted`;
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

function renderAssignments() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  const sortBy = sortSelect.value;
  const visible = assignments
    .filter(item => activeFilter === 'all' || getEffectiveStatus(item) === activeFilter)
    .filter(item => `${item.subject} ${item.title} ${item.description}`.toLocaleLowerCase().includes(query))
    .sort((first, second) => {
      if (sortBy === 'title' || sortBy === 'subject') return first[sortBy].localeCompare(second[sortBy]);
      return String(first.dueDate || '').localeCompare(String(second.dueDate || ''));
    });

  assignmentList.innerHTML = visible.map(renderAssignmentCard).join('');
  document.querySelector('#assignment-result-count').textContent = `${visible.length} ${visible.length === 1 ? 'assignment' : 'assignments'}`;
  emptyMessage.hidden = visible.length > 0;
  emptyMessage.textContent = query ? 'No assignments found. Try another search or status filter.' : 'No assignments match this status filter.';

  const completedSection = completedList.closest('.section');
  completedSection.hidden = activeFilter !== 'all';
  const completedCards = [...completedList.querySelectorAll('.completed-card')];
  const completedMatches = completedCards.filter(card => {
    const matchesSearch = card.textContent.toLocaleLowerCase().includes(query);
    card.hidden = !matchesSearch;
    return matchesSearch;
  });
  completedEmpty.hidden = activeFilter !== 'all' || completedMatches.length > 0;
}

function renderPage() {
  renderSummary();
  renderDeadlines();
  renderCompleted();
  renderAssignments();
}

function validateAssignments(data) {
  if (!Array.isArray(data)) throw new Error('Assignment data must be a JSON array.');
  return data.map(item => {
    if (!item.id || !item.subject || !item.title || !['pending', 'overdue', 'submitted'].includes(item.status)) {
      throw new Error('An assignment is missing required fields or has an invalid status.');
    }
    return item;
  });
}

function loadCompletionOverrides() {
  try {
    const saved = JSON.parse(localStorage.getItem(completionStorageKey) || '{}');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      completionOverrides = Object.fromEntries(
        Object.entries(saved).filter(([, isCompleted]) => typeof isCompleted === 'boolean')
      );
    }
  } catch (error) {
    completionOverrides = {};
    console.warn('Saved assignment completion states could not be read.', error);
  }
}

function saveCompletionOverrides() {
  try {
    localStorage.setItem(completionStorageKey, JSON.stringify(completionOverrides));
  } catch (error) {
    console.warn('Assignment completion could not be saved in this browser.', error);
  }
}

function toggleCompletion(assignmentId) {
  const assignment = assignments.find(item => item.id === assignmentId);
  if (!assignment) return;

  const currentlyCompleted = getEffectiveStatus(assignment) === 'completed';
  const nextCompleted = !currentlyCompleted;
  const originalCompleted = assignment.status === 'submitted';
  if (nextCompleted === originalCompleted) {
    delete completionOverrides[assignment.id];
  } else {
    completionOverrides[assignment.id] = nextCompleted;
  }

  saveCompletionOverrides();
  renderPage();
}

async function loadAssignments() {
  loadingMessage.hidden = false;
  errorMessage.hidden = true;
  summaryGrid.setAttribute('aria-busy', 'true');
  assignmentList.innerHTML = '';

  try {
    const response = await fetch('data/assignments.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Request failed with status ${response.status}.`);
    assignments = validateAssignments(await response.json());
    renderPage();
    loadingMessage.hidden = true;
  } catch (error) {
    console.error('Unable to load assignments:', error);
    loadingMessage.hidden = true;
    errorMessage.hidden = false;
    emptyMessage.hidden = true;
    deadlineList.innerHTML = '';
    completedList.innerHTML = '';
    summaryGrid.setAttribute('aria-busy', 'false');
  } finally {
    summaryGrid.setAttribute('aria-busy', 'false');
  }
}

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
  const button = event.target.closest('[data-toggle-completion]');
  if (button) toggleCompletion(button.dataset.toggleCompletion);
});

searchInput.addEventListener('input', renderAssignments);
sortSelect.addEventListener('change', renderAssignments);
retryButton.addEventListener('click', loadAssignments);
loadCompletionOverrides();
loadAssignments();
