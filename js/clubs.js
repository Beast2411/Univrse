const state = {
  clubs: [],
  events: [],
  eventsLoaded: false,
  eventsError: "",
  filter: "All",
  membershipsOnly: false,
  favouritesOnly: false,
  expandedAll: false
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);
const CLUB_PREFERENCES_KEY = "univrse.clubs.preferences.v1";
const EVENT_REGISTRATIONS_KEY = "univrse.event-registrations.v1";
const CLUB_API_BASE = (window.UNIVRSE_API_BASE || "http://localhost:5000/api").replace(/\/+$/, "");
const registeredEventIds = readRegisteredEventIds();
const registeringEventIds = new Set();

function readRegisteredEventIds() {
  try {
    const ids = JSON.parse(localStorage.getItem(EVENT_REGISTRATIONS_KEY) || "[]");
    return new Set(Array.isArray(ids) ? ids.map(String) : []);
  } catch {
    return new Set();
  }
}

function saveRegisteredEventIds() {
  try {
    localStorage.setItem(EVENT_REGISTRATIONS_KEY, JSON.stringify([...registeredEventIds]));
  } catch (error) {
    console.warn("Event registration state could not be saved in this browser:", error);
  }
}

function readClubPreferences() {
  try {
    const value = JSON.parse(localStorage.getItem(CLUB_PREFERENCES_KEY) || "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function saveClubPreferences() {
  try {
    const preferences = Object.fromEntries(state.clubs.map((club) => [String(club.id), {
      joined: Boolean(club.joined),
      favorite: Boolean(club.favorite),
    }]));
    localStorage.setItem(CLUB_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.warn("Club preferences could not be saved in this browser:", error);
  }
}

async function clubsRequest(path, options = {}) {
  const response = await fetch(`${CLUB_API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    }
  });
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error("The Clubs API returned an unreadable response."); }
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || `The Clubs API request failed (${response.status}).`);
  }
  return payload?.success === true ? payload.data : payload;
}

function normalizeClub(record, preferences = readClubPreferences(), current = null) {
  const saved = preferences[String(record._id)]
    || preferences[String(record.legacyId)]
    || current
    || {};
  return {
    ...record,
    id: String(record._id),
    joined: Boolean(saved.joined),
    favorite: Boolean(saved.favorite)
  };
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const clubs = await clubsRequest("/clubs");
    if (!Array.isArray(clubs)) throw new Error("Club data must be a JSON array.");
    const preferences = readClubPreferences();
    state.clubs = clubs.map((club) => normalizeClub(club, preferences));
  } catch (error) {
    console.error("Unable to initialize club controls:", error);
    const list = $("#clubsList");
    if (list) list.textContent = "Clubs could not load from the backend. Start the API and seed the initial club directory.";
    const resultText = $("#resultText");
    if (resultText) resultText.textContent = error.message;
    return;
  }

  setupHoverHints();
  setupButtons();
  render();
  void loadLiveEvents();
});

async function loadLiveEvents() {
  const base = (window.UNIVRSE_API_BASE || "http://localhost:5000/api").replace(/\/+$/, "");
  try {
    const response = await fetch(`${base}/events?period=upcoming`, { credentials: "include", headers: { Accept: "application/json" } });
    let payload;
    try { payload = await response.json(); }
    catch { throw new Error("The Events API returned unreadable data."); }
    if (!response.ok || payload?.success !== true || !Array.isArray(payload.data)) {
      throw new Error(payload?.message || `The Events API request failed (${response.status}).`);
    }
    state.events = payload.data;
    state.eventsError = "";
  } catch (error) {
    state.events = [];
    state.eventsError = error.message || "Events are unavailable right now.";
    console.error("Unable to load campus events:", error);
  } finally {
    state.eventsLoaded = true;
    render();
  }
}

function setupHoverHints() {
  const hintBox = $("#hoverHint");
  if (!hintBox) return;

  const defaultText = "Hover over any button to see what it does";

  $$("button[title], a[title], input[title], select[title], .stat-box[title]").forEach((el) => {
    el.addEventListener("mouseenter", () => {
      hintBox.textContent = el.getAttribute("title");
    });
    el.addEventListener("mouseleave", () => {
      hintBox.textContent = defaultText;
    });
  });
}

function setupButtons() {
  $("#searchInput").addEventListener("input", render);
  $("#createClubButton").addEventListener("click", () => openClubEditor());
  document.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit-club]");
    if (editButton) openClubEditor(state.clubs.find((club) => club.id === editButton.dataset.editClub));
    const deleteButton = event.target.closest("[data-delete-club]");
    if (deleteButton) void deleteClub(deleteButton.dataset.deleteClub);
  });

  $("#notificationButton").addEventListener("click", () => {
    $("#modalContent").innerHTML = `
      <p class="club-cat">NOVEMBER 2026 ALERTS</p>
      <h2>🔔 Campus Club Notifications</h2>
      <div class="modal-event-item">
        <div><strong>ACM BMU Code Sprint</strong><br><small>21 Nov · 3:00 PM · NB 105</small></div>
      </div>
      <div class="modal-event-item">
        <div><strong>Robotics BMU Build Night</strong><br><small>24 Nov · 4:00 PM · Innovation Lab</small></div>
      </div>
      <div class="modal-event-item">
        <div><strong>TSEC BMU Founder Talk</strong><br><small>27 Nov · 5:00 PM · Auditorium</small></div>
      </div>
    `;
    $("#modal").showModal();
  });

  $("#settingsLink").addEventListener("click", (e) => {
    e.preventDefault();
    $("#modalContent").innerHTML = `
      <p class="club-cat">PREFERENCES</p>
      <h2>⚙ Club Preferences</h2>
      <p><strong>Student:</strong> Aarush N · B.Tech CSE · Semester 3</p>
      <p><strong>Term:</strong> November 2026</p>
      <p>Use the buttons on any club card to <strong>Join</strong>, <strong>Favourite (♥)</strong>, or <strong>View details</strong>.</p>
    `;
    $("#modal").showModal();
  });

  $("#exploreButton").addEventListener("click", () => {
    resetAllFilters();
    toast("Showing all November 2026 campus clubs.");
    $("#clubsList").scrollIntoView({ behavior: "smooth" });
  });

  $("#membershipButton").addEventListener("click", () => {
    state.membershipsOnly = !state.membershipsOnly;
    $("#membershipButton").classList.toggle("active-toggle", state.membershipsOnly);
    render();
    toast(state.membershipsOnly ? "Showing your joined clubs." : "Showing all clubs.");
  });

  $("#favouritesButton").addEventListener("click", () => {
    state.favouritesOnly = !state.favouritesOnly;
    $("#favouritesButton").classList.toggle("active-toggle", state.favouritesOnly);
    render();
    toast(state.favouritesOnly ? "Showing your favourite clubs." : "Exited favourites filter.");
  });

  $("#clearFiltersButton").addEventListener("click", () => {
    resetAllFilters();
    toast("All filters, search, and sorting cleared.");
  });

  $$("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      $$("[data-filter]").forEach((btn) => btn.classList.remove("selected"));
      button.classList.add("selected");
      render();
    });
  });

  $("#sortSelect").addEventListener("change", render);

  $("#expandAllButton").addEventListener("click", () => {
    state.expandedAll = !state.expandedAll;
    render();
    toast(state.expandedAll ? "Expanded room & lead info on all cards." : "Collapsed extra card info.");
  });

  $("#randomClubButton").addEventListener("click", () => {
    if (!state.clubs.length) return;
    const randomIndex = Math.floor(Math.random() * state.clubs.length);
    const picked = state.clubs[randomIndex];
    toast(`Surprise pick: ${picked.name}!`);
    openClubModal(picked.id);
  });

  $("#openScheduleModalButton").addEventListener("click", () => {
    $("#modalContent").innerHTML = `
      <p class="club-cat">NOVEMBER 2026 TIMETABLE</p>
      <h2>◫ Weekly Club Slots</h2>
      <div class="modal-event-item">
        <div><strong>3:00 PM Slots</strong><br><small>NB 105 · Coding, AI, Debate & Finance</small></div>
      </div>
      <div class="modal-event-item">
        <div><strong>4:00 PM Slots</strong><br><small>Innovation Lab · Robotics, Drones, Hardware & Film</small></div>
      </div>
      <div class="modal-event-item">
        <div><strong>5:00 PM Slots</strong><br><small>Auditorium / Ground · E-Cell, Music, Dance & Sports</small></div>
      </div>
    `;
    $("#modal").showModal();
  });

  $("#viewAllEventsButton").addEventListener("click", openAllEventsModal);
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-register-event]");
    if (button) void registerForEvent(button.dataset.registerEvent);
  });

  $("#trendingButton").addEventListener("click", () => openClubModal(1));
  $("#questButton").addEventListener("click", () => {
    $("#modalContent").innerHTML = `
      <p class="club-cat">NOVEMBER 2026 CHALLENGE</p>
      <h2>🏆 Club Quest Week (23–29 Nov)</h2>
      <p>Complete club actions this November to boost your score and unlock badges:</p>
      <div class="modal-event-item"><div><strong>Join a Club</strong></div><span>+50 pts</span></div>
      <div class="modal-event-item"><div><strong>RSVP to an Event</strong></div><span>+30 pts</span></div>
      <div class="modal-event-item"><div><strong>Save a Favourite</strong></div><span>+20 pts</span></div>
    `;
    $("#modal").showModal();
  });

  $("#scoreButton").addEventListener("click", () => {
    const score = calculateScore();
    $("#modalContent").innerHTML = `
      <p class="club-cat">SCORE BREAKDOWN</p>
      <h2>🌟 Your Club Score: ${score} pts</h2>
      <p>Joined clubs: <strong>${state.clubs.filter((c) => c.joined).length}</strong> × 50 pts</p>
      <p>Event registrations in this browser: <strong>${registeredEventIds.size}</strong> × 30 pts</p>
      <p>Favourite clubs: <strong>${state.clubs.filter((c) => c.favorite).length}</strong> × 20 pts</p>
    `;
    $("#modal").showModal();
  });

  $("#auditionsButton").addEventListener("click", () => {
    $("#modalContent").innerHTML = `
      <p class="club-cat">NOVEMBER RECRUITMENT</p>
      <h2>🎤 Open Club Auditions & Pitches</h2>
      <div class="modal-event-item"><div><strong>Robotics & Drone Corps</strong><br><small>24 Nov · 4:00 PM · Innovation Lab</small></div></div>
      <div class="modal-event-item"><div><strong>Rhythm & Stagecraft</strong><br><small>26 Nov · 5:00 PM · Auditorium</small></div></div>
      <div class="modal-event-item"><div><strong>TSEC BMU Pitch Desk</strong><br><small>27 Nov · 5:00 PM · Auditorium</small></div></div>
    `;
    $("#modal").showModal();
  });

  $("#spotlightButton").addEventListener("click", () => {
    $("#modalContent").innerHTML = `
      <p class="club-cat">FEATURED EVENT · 28 NOV 2026</p>
      <h2>✦ Inter-Club Hackathon & Showcase</h2>
      <p>Collaborate across tech, robotics, business, and design clubs in November.</p>
      <p><strong>Time:</strong> 28 November 2026 · 3:00 PM – 6:00 PM</p>
      <p><strong>Venue:</strong> Innovation Lab & Main Auditorium</p>
    `;
    $("#modal").showModal();
  });

  $("#announcementButton").addEventListener("click", () => {
    $("#modalContent").innerHTML = `
      <p class="club-cat">CAMPUS NOTICE · NOVEMBER 2026</p>
      <h2>📣 November Club Registrations Open</h2>
      <p>All 16 student clubs are accepting members this November. Join clubs, save favourites, and RSVP to upcoming sessions before 30 November 2026.</p>
    `;
    $("#modal").showModal();
  });

  $("#closeModalButton").addEventListener("click", () => $("#modal").close());
}

function resetAllFilters() {
  state.filter = "All";
  state.membershipsOnly = false;
  state.favouritesOnly = false;
  $("#searchInput").value = "";
  $("#sortSelect").value = "popular";

  $$("[data-filter]").forEach((btn) => btn.classList.remove("selected"));
  const allBtn = $('[data-filter="All"]');
  if (allBtn) allBtn.classList.add("selected");

  $("#favouritesButton").classList.remove("active-toggle");
  $("#membershipButton").classList.remove("active-toggle");

  render();
}

function calculateScore() {
  const joinedCount = state.clubs.filter((c) => c.joined).length;
  const favCount = state.clubs.filter((c) => c.favorite).length;
  return joinedCount * 50 + registeredEventIds.size * 30 + favCount * 20;
}

function nextEventText(club) {
  const match = state.events
    .filter((event) => event.club?.toLocaleLowerCase() === club.name.toLocaleLowerCase())
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  if (!match) return "See the upcoming Events panel";
  const date = new Date(match.date);
  const when = Number.isNaN(date.getTime()) ? "Date not listed" : date.toLocaleDateString([], { day: "numeric", month: "short" });
  return `${match.title} · ${when}${match.time ? ` · ${match.time}` : ""}`;
}

function openClubEditor(club = null) {
  const content = $("#modalContent");
  content.replaceChildren();
  const heading = document.createElement("h2");
  heading.textContent = club ? `Edit ${club.name}` : "Add a club";
  content.append(heading);

  const form = document.createElement("form");
  form.className = "club-editor-form";
  const grid = document.createElement("div");
  grid.className = "club-form-grid";

  const addField = (labelText, name, value, options = {}) => {
    const label = document.createElement("label");
    label.className = `club-form-field${options.wide ? " wide" : ""}`;
    label.textContent = labelText;
    let input;
    if (options.select) {
      input = document.createElement("select");
      options.select.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.value;
        option.textContent = item.label;
        input.append(option);
      });
    } else if (options.multiline) {
      input = document.createElement("textarea");
      input.rows = 4;
    } else {
      input = document.createElement("input");
      input.type = options.type || "text";
    }
    input.name = name;
    input.value = value ?? "";
    if (options.required) input.required = true;
    if (options.maxLength) input.maxLength = options.maxLength;
    if (options.min !== undefined) input.min = String(options.min);
    if (options.step) input.step = options.step;
    label.append(input);
    grid.append(label);
  };

  addField("Club name", "name", club?.name, { required: true, maxLength: 120 });
  addField("Category", "category", club?.category, { required: true, maxLength: 80 });
  addField("Members", "members", club?.members ?? 0, { type: "number", min: 0, step: "1" });
  addField("Venue", "venue", club?.venue, { maxLength: 200 });
  addField("Club lead", "lead", club?.lead, { maxLength: 120 });
  addField("Icon", "icon", club?.icon || "✦", { maxLength: 24 });
  addField("Icon colour", "iconClass", club?.iconClass || "purple", {
    select: ["purple", "green", "orange", "pink", "blue", "yellow", "teal"].map((value) => ({ value, label: value }))
  });
  addField("Description", "description", club?.description, { multiline: true, maxLength: 3000, wide: true });

  const status = document.createElement("p");
  status.className = "club-form-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const actions = document.createElement("div");
  actions.className = "club-form-actions";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "club-form-cancel";
  cancel.textContent = "Cancel";
  cancel.addEventListener("click", () => $("#modal").close());
  const save = document.createElement("button");
  save.type = "submit";
  save.className = "primary-button";
  save.textContent = club ? "Save changes" : "Create club";
  actions.append(cancel, save);
  form.append(grid, status, actions);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void saveClub(form, club, status, save);
  });
  content.append(form);
  $("#modal").showModal();
}

async function saveClub(form, existingClub, status, submitButton) {
  const values = new FormData(form);
  const members = Number(values.get("members") || 0);
  if (!Number.isInteger(members) || members < 0) {
    status.textContent = "Member count must be a non-negative whole number.";
    return;
  }
  const payload = Object.fromEntries(["name", "category", "description", "venue", "lead", "icon", "iconClass"]
    .map((field) => [field, String(values.get(field) || "").trim()]));
  payload.members = members;
  submitButton.disabled = true;
  status.textContent = "Saving club...";
  try {
    const endpoint = existingClub ? `/clubs/${encodeURIComponent(existingClub.id)}` : "/clubs";
    const record = await clubsRequest(endpoint, {
      method: existingClub ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });
    const club = normalizeClub(record, {}, existingClub);
    const index = state.clubs.findIndex((item) => item.id === club.id);
    if (index < 0) state.clubs.push(club);
    else state.clubs[index] = club;
    saveClubPreferences();
    $("#modal").close();
    render();
    toast(existingClub ? `${club.name} was updated.` : `${club.name} was created.`);
  } catch (error) {
    status.textContent = error.message;
    submitButton.disabled = false;
  }
}

async function deleteClub(id) {
  const club = state.clubs.find((item) => item.id === id);
  if (!club || !window.confirm(`Delete ${club.name} from the club directory? Related events remain in the Events collection.`)) return;
  try {
    await clubsRequest(`/clubs/${encodeURIComponent(id)}`, { method: "DELETE" });
    state.clubs = state.clubs.filter((item) => item.id !== id);
    saveClubPreferences();
    render();
    toast(`${club.name} was deleted.`);
  } catch (error) {
    toast(error.message || "The club could not be deleted.");
  }
}

function makeEventRegistrationButton(event) {
  const id = String(event._id || event.id);
  const isRegistered = registeredEventIds.has(id);
  const isFull = Number(event.registeredCount) >= Number(event.capacity);
  const button = document.createElement("button");
  button.type = "button";
  button.className = `rsvp-btn ${isRegistered ? "done" : ""}`;
  button.dataset.registerEvent = id;
  button.disabled = isRegistered || isFull || registeringEventIds.has(id);
  button.textContent = isRegistered ? "Registered" : isFull ? "Full" : registeringEventIds.has(id) ? "Registering..." : "Register";
  button.title = isRegistered
    ? "This browser has already registered for this event"
    : isFull ? "This event has reached capacity" : "Register for this event";
  return button;
}

function refreshEventRegistrationButtons(eventId) {
  const event = state.events.find((item) => String(item._id || item.id) === String(eventId));
  if (!event) return;
  $$('[data-register-event]').forEach((button) => {
    if (button.dataset.registerEvent === String(eventId)) {
      button.replaceWith(makeEventRegistrationButton(event));
    }
  });
}

async function registerForEvent(id) {
  const eventId = String(id);
  if (registeredEventIds.has(eventId) || registeringEventIds.has(eventId)) return;
  const event = state.events.find((item) => String(item._id || item.id) === eventId);
  if (!event) return;
  if (Number(event.registeredCount) >= Number(event.capacity)) {
    toast("This event has reached capacity.");
    return;
  }

  registeringEventIds.add(eventId);
  render();
  try {
    const base = (window.UNIVRSE_API_BASE || "http://localhost:5000/api").replace(/\/+$/, "");
    const response = await fetch(`${base}/events/${encodeURIComponent(eventId)}/register`, {
      method: "PATCH",
      credentials: "include",
      headers: { Accept: "application/json" }
    });
    let payload;
    try { payload = await response.json(); }
    catch { throw new Error("The Events API returned an unreadable response."); }
    if (!response.ok || payload?.success === false) {
      throw new Error(payload?.message || `Event registration failed (${response.status}).`);
    }
    const updatedEvent = payload?.success === true ? payload.data : payload;
    state.events = state.events.map((item) =>
      String(item._id || item.id) === eventId ? updatedEvent : item
    );
    registeredEventIds.add(eventId);
    saveRegisteredEventIds();
    toast(`Registration count updated for ${updatedEvent.title || event.title}.`);
  } catch (error) {
    toast(error.message || "Event registration could not be completed.");
  } finally {
    registeringEventIds.delete(eventId);
    refreshEventRegistrationButtons(eventId);
    render();
  }
}

function renderLiveEventList() {
  const list = $("#eventsList");
  const legacyList = $(".event-list");
  if (list) list.replaceChildren();
  if (legacyList) legacyList.replaceChildren();
  if (!state.eventsLoaded) {
    const item = document.createElement("li");
    item.textContent = "Loading upcoming events from the backend...";
    list?.append(item.cloneNode(true));
    legacyList?.append(item);
    return;
  }
  if (state.eventsError) {
    const item = document.createElement("li");
    item.textContent = `Upcoming events are unavailable: ${state.eventsError}`;
    list?.append(item.cloneNode(true));
    legacyList?.append(item);
    return;
  }
  if (!state.events.length) {
    const item = document.createElement("li");
    item.textContent = "No upcoming events are currently listed.";
    list?.append(item.cloneNode(true));
    legacyList?.append(item);
    return;
  }
  state.events.slice(0, 8).forEach((event) => {
    const item = document.createElement("li");
    const date = new Date(event.date);
    const badge = document.createElement("div");
    badge.className = "day-badge";
    const day = document.createElement("b");
    const month = document.createElement("small");
    if (Number.isNaN(date.getTime())) {
      day.textContent = "--";
      month.textContent = "DATE";
    } else {
      day.textContent = String(date.getDate());
      month.textContent = date.toLocaleDateString([], { month: "short" }).toUpperCase();
    }
    badge.append(day, month);
    const details = document.createElement("div");
    details.className = "event-info";
    const title = document.createElement("strong");
    title.textContent = event.title || "Campus event";
    const meta = document.createElement("span");
    meta.textContent = [event.time, event.venue, event.club].filter(Boolean).join(" ? ") || event.category || "Event details not listed";
    details.append(title, meta);
    const registration = document.createElement("div");
    registration.className = "event-registration";
    registration.append(makeEventRegistrationButton(event));
    item.append(badge, details, registration);
    list?.append(item);
    if (legacyList) {
      const legacyItem = document.createElement("li");
      legacyItem.className = "event-item";
      const legacyDate = document.createElement("time");
      legacyDate.className = "event-date";
      legacyDate.textContent = Number.isNaN(date.getTime()) ? "--" : date.toLocaleDateString([], { day: "numeric", month: "short" });
      const legacyDetails = document.createElement("div");
      legacyDetails.className = "event-details";
      const legacyTitle = document.createElement("strong");
      legacyTitle.textContent = event.title || "Campus event";
      const legacyMeta = document.createElement("span");
      legacyMeta.textContent = [event.time, event.venue, event.club].filter(Boolean).join(" · ") || event.category || "Event details not listed";
      legacyDetails.append(legacyTitle, legacyMeta);
      legacyItem.append(legacyDate, legacyDetails);
      legacyList.append(legacyItem);
    }
  });
}

function render() {
  const query = ($("#searchInput").value || "").trim().toLowerCase();

  let list = state.clubs.filter((club) => {
    const matchesJoined = !state.membershipsOnly || club.joined;
    const matchesFav = !state.favouritesOnly || club.favorite;
    const matchesCat = state.filter === "All" || club.category === state.filter;
    const searchableText = `${club.name} ${club.category} ${club.description} ${club.nextEvent} ${club.venue || ""} ${club.lead || ""}`.toLowerCase();
    const matchesSearch = !query || searchableText.includes(query);

    return matchesJoined && matchesFav && matchesCat && matchesSearch;
  });

  const sortBy = $("#sortSelect").value;
  if (sortBy === "name") {
    list = [...list].sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === "members") {
    list = [...list].sort((a, b) => b.members - a.members);
  }

  const joinedTotal = state.clubs.filter((c) => c.joined).length;
  const favTotal = state.clubs.filter((c) => c.favorite).length;
  const rsvpTotal = registeredEventIds.size;

  $("#totalClubs").textContent = state.clubs.length;
  $("#totalMembers").textContent = state.clubs.reduce((sum, c) => sum + c.members, 0);
  $("#totalEvents").textContent = state.eventsLoaded ? state.events.length : "--";
  const eventCountBox = $("#totalEvents").closest(".stat-box");
  const eventPanelNote = $("#eventsList")?.closest(".events-panel")?.querySelector(".panel-heading p");
  if (eventPanelNote && state.eventsLoaded) eventPanelNote.textContent = "Live upcoming event records";
  if (eventCountBox) {
    eventCountBox.title = "Upcoming events returned by the Events API";
    const label = eventCountBox.querySelector("span");
    if (label) label.textContent = "Upcoming Events";
  }
  $("#joinedCountStat").textContent = joinedTotal;
  $("#clubScore").textContent = `${calculateScore()} points`;

  $("#membershipButton").textContent = state.membershipsOnly
    ? `Showing joined (${joinedTotal})`
    : `My memberships (${joinedTotal})`;
  $("#favouritesButton").textContent = `♥ Favourites (${favTotal})`;

  $("#resultText").textContent = `${list.length} of ${state.clubs.length} clubs shown · November 2026`;

  $("#clubsList").innerHTML = list.length
    ? list
        .map(
          (club) => `
      <article class="club-card ${state.expandedAll ? "expanded" : ""}">
        <div class="club-top">
          <div class="club-icon ${escapeHtml(club.iconClass || "purple")}">${escapeHtml(club.icon || "✦")}</div>
          <div class="club-meta">
            <p class="club-cat">${escapeHtml(club.category)}</p>
            <h3>${escapeHtml(club.name)}</h3>
            <p class="club-members">${Number(club.members) || 0} members · ${escapeHtml(club.venue || "Campus")}</p>
          </div>
          <div class="card-actions">
            <button
              type="button"
              class="heart-btn ${club.favorite ? "saved" : ""}"
              data-heart="${club.id}"
              title="${club.favorite ? "Remove from favourites" : "Save to favourites"}"
            >
              ${club.favorite ? "♥" : "♡"}
            </button>
            <button
              type="button"
              class="join-btn ${club.joined ? "joined" : ""}"
              data-join="${club.id}"
              title="${club.joined ? "Leave this club" : "Join this club"}"
            >
              ${club.joined ? "✓ Joined" : "+ Join"}
            </button>
          </div>
        </div>

        <p class="club-desc">${escapeHtml(club.description)}</p>

        <div class="club-extra-box">
          <span><strong>Club Lead:</strong> ${escapeHtml(club.lead || "Student Council")}</span>
          <span><strong>Events:</strong> See the upcoming Events panel</span>
        </div>

        <footer class="club-footer">
          <span>◷ ${escapeHtml(nextEventText(club))}</span>
          <button
            type="button"
            class="details-btn"
            data-details="${club.id}"
            title="Open full club details"
          >
            View details →
          </button>
          <div class="club-admin-actions">
            <button type="button" class="club-edit-btn" data-edit-club="${escapeHtml(club.id)}" aria-label="Edit ${escapeHtml(club.name)}">Edit</button>
            <button type="button" class="club-delete-btn" data-delete-club="${escapeHtml(club.id)}" aria-label="Delete ${escapeHtml(club.name)}">Delete</button>
          </div>
        </footer>
      </article>
    `
        )
        .join("")
    : `
      <div class="empty-box">
        <strong>No matching clubs found.</strong>
        <p>Try another keyword, category, or click "Clear filters".</p>
      </div>
    `;

  renderLiveEventList();

  $$("[data-join]").forEach((btn) => {
    btn.onclick = () => updateClub(btn.dataset.join, "joined");
  });
  $$("[data-heart]").forEach((btn) => {
    btn.onclick = () => updateClub(btn.dataset.heart, "favorite");
  });
  $$("[data-details]").forEach((btn) => {
    btn.onclick = () => openClubModal(btn.dataset.details);
  });

  updateAchievements(joinedTotal, rsvpTotal, favTotal);
}

function updateAchievements(joinedCount, rsvpCount, favCount) {
  const checks = [
    { id: "#achExplorer", unlocked: joinedCount >= 1 },
    { id: "#achRegular", unlocked: rsvpCount >= 2 },
    { id: "#achCollector", unlocked: favCount >= 2 },
    { id: "#achStar", unlocked: joinedCount >= 3 }
  ];

  let unlockedTotal = 0;
  checks.forEach((item) => {
    const el = $(item.id);
    if (!el) return;
    el.classList.toggle("unlocked", item.unlocked);
    if (item.unlocked) unlockedTotal += 1;
  });

  $("#achievementCount").textContent = `${unlockedTotal} / ${checks.length}`;
}

function updateClub(id, field) {
  const club = state.clubs.find((c) => String(c.id) === String(id));
  if (!club || !["joined", "favorite"].includes(field)) return;

  club[field] = !club[field];
  saveClubPreferences();

  if (field === "joined") {
    toast(club.joined ? `Joined ${club.name}! (+50 pts)` : `Left ${club.name}.`);
  } else if (field === "favorite") {
    toast(club.favorite ? `Added ${club.name} to Favourites! (+20 pts)` : `Removed ${club.name} from Favourites.`);
  }

  render();
}

function openClubModal(id) {
  const club = state.clubs.find((item) => String(item.id) === String(id));
  if (!club) return;
  const content = $("#modalContent");
  content.replaceChildren();
  const category = document.createElement("p");
  category.className = "club-cat";
  category.textContent = club.category;
  const title = document.createElement("h2");
  title.textContent = `${club.icon || "?"} ${club.name}`;
  const description = document.createElement("p");
  description.textContent = club.description || "No description provided.";
  content.append(category, title, description, document.createElement("hr"));
  [["Lead", club.lead || "Not listed"], ["Venue", club.venue || "Not listed"], ["Members", club.members],
    ["Next event", nextEventText(club)], ["Membership", club.joined ? "Joined" : "Not joined"],
    ["Favourite", club.favorite ? "Saved" : "Not saved"]].forEach(([label, value]) => {
    const line = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = `${label}: `;
    line.append(strong, document.createTextNode(String(value)));
    content.append(line);
  });
  $("#modal").showModal();
}

function openAllEventsModal() {
  const content = $("#modalContent");
  content.replaceChildren();
  const heading = document.createElement("h2");
  heading.textContent = "Upcoming campus events";
  content.append(heading);
  if (!state.eventsLoaded) {
    const message = document.createElement("p");
    message.textContent = "Loading events from the backend...";
    content.append(message);
  } else if (state.eventsError) {
    const message = document.createElement("p");
    message.textContent = `Events are unavailable: ${state.eventsError}`;
    content.append(message);
  } else if (!state.events.length) {
    const message = document.createElement("p");
    message.textContent = "No upcoming events are currently listed.";
    content.append(message);
  } else {
    state.events.forEach((event) => {
      const row = document.createElement("div");
      row.className = "modal-event-item";
      const details = document.createElement("div");
      const title = document.createElement("strong");
      const date = new Date(event.date);
      const dateText = Number.isNaN(date.getTime()) ? "Date not listed" : date.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
      title.textContent = `${dateText} ? ${event.title || "Campus event"}`;
      const meta = document.createElement("small");
      meta.textContent = [event.time, event.venue, event.club].filter(Boolean).join(" ? ");
      details.append(title, document.createElement("br"), meta);
      row.append(details);
      row.append(makeEventRegistrationButton(event));
      content.append(row);
    });
  }
  $("#modal").showModal();
}

let toastTimer;
function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}
