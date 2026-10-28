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

let assignments = [];
let activeFilter = 'all';

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

function getEffectiveStatus(assignment) {
  if (assignment.status === 'submitted') return 'submitted';
  const due = new Date(`${assignment.dueDate}T00:00:00`);
  return due < startOfToday() ? 'overdue' : 'pending';
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    .format(new Date(`${dateString}T00:00:00`));
}

function formatSubmissionDate(dateString) {
  if (!dateString) return '';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(dateString));
}

function statusMarkup(status) {
  const labels = { pending: 'Pending', overdue: 'Overdue', submitted: 'Submitted' };
  const classes = { pending: 'status-pill--pending', overdue: 'status-pill--overdue', submitted: 'status-pill--done' };
  return `<span class="status-pill ${classes[status]}">${labels[status]}</span>`;
}

function renderAssignmentCard(assignment) {
  const status = getEffectiveStatus(assignment);
  const priorityClass = ['high', 'medium', 'low'].includes(assignment.priority) ? assignment.priority : 'low';
  const progress = status === 'submitted' ? 100 : Math.max(0, Math.min(100, Number(assignment.progress) || 0));
  const submissionNote = assignment.submission?.note
    ? `<p class="assignment-submission">${escapeHtml(assignment.submission.note)}</p>`
    : '';
  const grade = assignment.submission?.grade
    ? `<span class="submission-grade">Grade ${escapeHtml(assignment.submission.grade)}</span>`
    : '';
  const submittedDate = assignment.submission?.submittedAt
    ? `<span class="meta-item">Submitted ${escapeHtml(formatSubmissionDate(assignment.submission.submittedAt))}</span>`
    : '';

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
        <span class="meta-item"><span class="meta-icon" aria-hidden="true">&#128197;</span>Due ${escapeHtml(formatDate(assignment.dueDate))}</span>
        ${statusMarkup(status)}
      </div>
      ${status === 'submitted' ? `<div class="submission-meta">${submittedDate}${grade}</div>` : `
        <div class="progress-block">
          <div class="progress-labels"><span>Progress</span><span>${progress}%</span></div>
          <div class="progress-track" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100" aria-label="Assignment progress ${progress} percent">
            <div class="progress-fill" style="width: ${progress}%"></div>
          </div>
        </div>`}
    </article>`;
}

function renderSummary() {
  const total = assignments.length;
  const pending = assignments.filter(item => getEffectiveStatus(item) !== 'submitted').length;
  const completed = assignments.filter(item => getEffectiveStatus(item) === 'submitted').length;
  const today = startOfToday();
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const upcoming = assignments.filter(item => {
    if (getEffectiveStatus(item) === 'submitted') return false;
    const due = new Date(`${item.dueDate}T00:00:00`);
    return due >= today && due <= nextWeek;
  }).length;

  document.querySelector('#total-count').textContent = total;
  document.querySelector('#pending-count').textContent = pending;
  document.querySelector('#upcoming-count').textContent = upcoming;
  document.querySelector('#completed-count').textContent = completed;
  document.querySelector('#completed-section-count').textContent = `${completed} submitted`;
}

function renderDeadlines() {
  const today = startOfToday();
  const upcoming = assignments
    .filter(item => getEffectiveStatus(item) !== 'submitted' && new Date(`${item.dueDate}T00:00:00`) >= today)
    .sort((first, second) => first.dueDate.localeCompare(second.dueDate))
    .slice(0, 5);

  deadlineList.innerHTML = upcoming.map(item => `
    <article class="deadline-item">
      <div class="deadline-info"><span class="deadline-title">${escapeHtml(item.title)}</span><span class="deadline-subject">${escapeHtml(item.subject)}</span></div>
      <span class="deadline-date">${escapeHtml(formatDate(item.dueDate))}</span>
    </article>`).join('');
  deadlineEmpty.hidden = upcoming.length > 0;
}

function renderCompleted() {
  const completed = assignments
    .filter(item => getEffectiveStatus(item) === 'submitted')
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
    .filter(item => `${item.subject} ${item.title} ${item.description} ${item.status}`.toLocaleLowerCase().includes(query))
    .sort((first, second) => {
      if (sortBy === 'title' || sortBy === 'subject') return first[sortBy].localeCompare(second[sortBy]);
      return first.dueDate.localeCompare(second.dueDate);
    });

  assignmentList.innerHTML = visible.map(renderAssignmentCard).join('');
  document.querySelector('#assignment-result-count').textContent = `${visible.length} ${visible.length === 1 ? 'assignment' : 'assignments'}`;
  emptyMessage.hidden = visible.length > 0;

  const completedSection = completedList.closest('.section');
  completedSection.hidden = activeFilter !== 'all' && activeFilter !== 'submitted';
  const completedCards = [...completedList.querySelectorAll('.completed-card')];
  const completedMatches = completedCards.filter(card => {
    const matchesSearch = card.textContent.toLocaleLowerCase().includes(query);
    card.hidden = !matchesSearch;
    return matchesSearch;
  });
  completedEmpty.hidden = completedMatches.length > 0 || (activeFilter !== 'submitted' && completedCards.length > 0);
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
    if (!item.id || !item.subject || !item.title || !item.dueDate || !['pending', 'overdue', 'submitted'].includes(item.status)) {
      throw new Error('An assignment is missing required fields or has an invalid status.');
    }
    if (Number.isNaN(new Date(`${item.dueDate}T00:00:00`).getTime())) {
      throw new Error(`Invalid due date for ${item.title}.`);
    }
    return item;
  });
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

searchInput.addEventListener('input', renderAssignments);
sortSelect.addEventListener('change', renderAssignments);
retryButton.addEventListener('click', loadAssignments);
loadAssignments();
