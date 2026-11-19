const state = {
  clubs: [],
  filter: "All",
  membershipsOnly: false,
  favouritesOnly: false,
  goingOnly: false,
  expandedAll: false
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch("/api/clubs");
    if (!response.ok) {
      throw new Error("API fetch failed");
    }
    state.clubs = await response.json();
  } catch {
    const response = await fetch("data/clubs.json");
    state.clubs = await response.json();
  }

  setupHoverHints();
  setupButtons();
  render();
});

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

  $("#themeButton").addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    $("#themeButton").innerHTML = isDark
      ? "☀ <span>Light mode</span>"
      : "☾ <span>Dark mode</span>";
    toast(isDark ? "Dark mode enabled." : "Light mode enabled.");
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

  $("#rsvpOnlyButton").addEventListener("click", () => {
    state.goingOnly = !state.goingOnly;
    $("#rsvpOnlyButton").classList.toggle("active-toggle", state.goingOnly);
    render();
    toast(state.goingOnly ? "Showing clubs where you RSVP'd." : "Exited Going filter.");
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
      <p>Event RSVPs: <strong>${state.clubs.filter((c) => c.rsvp).length}</strong> × 30 pts</p>
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
  state.goingOnly = false;
  $("#searchInput").value = "";
  $("#sortSelect").value = "popular";

  $$("[data-filter]").forEach((btn) => btn.classList.remove("selected"));
  const allBtn = $('[data-filter="All"]');
  if (allBtn) allBtn.classList.add("selected");

  $("#favouritesButton").classList.remove("active-toggle");
  $("#rsvpOnlyButton").classList.remove("active-toggle");
  $("#membershipButton").classList.remove("active-toggle");

  render();
}

function calculateScore() {
  const joinedCount = state.clubs.filter((c) => c.joined).length;
  const rsvpCount = state.clubs.filter((c) => c.rsvp).length;
  const favCount = state.clubs.filter((c) => c.favorite).length;
  return joinedCount * 50 + rsvpCount * 30 + favCount * 20;
}

function render() {
  const query = ($("#searchInput").value || "").trim().toLowerCase();

  let list = state.clubs.filter((club) => {
    const matchesJoined = !state.membershipsOnly || club.joined;
    const matchesFav = !state.favouritesOnly || club.favorite;
    const matchesGoing = !state.goingOnly || club.rsvp;
    const matchesCat = state.filter === "All" || club.category === state.filter;
    const searchableText = `${club.name} ${club.category} ${club.description} ${club.nextEvent} ${club.venue || ""} ${club.lead || ""}`.toLowerCase();
    const matchesSearch = !query || searchableText.includes(query);

    return matchesJoined && matchesFav && matchesGoing && matchesCat && matchesSearch;
  });

  const sortBy = $("#sortSelect").value;
  if (sortBy === "name") {
    list = [...list].sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === "members") {
    list = [...list].sort((a, b) => b.members - a.members);
  }

  const joinedTotal = state.clubs.filter((c) => c.joined).length;
  const favTotal = state.clubs.filter((c) => c.favorite).length;
  const rsvpTotal = state.clubs.filter((c) => c.rsvp).length;

  $("#totalClubs").textContent = state.clubs.length;
  $("#totalMembers").textContent = state.clubs.reduce((sum, c) => sum + c.members, 0);
  $("#totalEvents").textContent = state.clubs.length;
  $("#joinedCountStat").textContent = joinedTotal;
  $("#clubScore").textContent = `${calculateScore()} points`;

  $("#membershipButton").textContent = state.membershipsOnly
    ? `Showing joined (${joinedTotal})`
    : `My memberships (${joinedTotal})`;
  $("#favouritesButton").textContent = `♥ Favourites (${favTotal})`;
  $("#rsvpOnlyButton").textContent = `✓ Going (${rsvpTotal})`;

  $("#resultText").textContent = `${list.length} of ${state.clubs.length} clubs shown · November 2026`;

  $("#clubsList").innerHTML = list.length
    ? list
        .map(
          (club) => `
      <article class="club-card ${state.expandedAll ? "expanded" : ""}">
        <div class="club-top">
          <div class="club-icon ${club.iconClass || "purple"}">${club.icon}</div>
          <div class="club-meta">
            <p class="club-cat">${club.category}</p>
            <h3>${club.name}</h3>
            <p class="club-members">${club.members} members · ${club.venue || "Campus"}</p>
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

        <p class="club-desc">${club.description}</p>

        <div class="club-extra-box">
          <span><strong>Club Lead:</strong> ${club.lead || "Student Council"}</span>
          <span><strong>Schedule:</strong> ${club.event.schedule}</span>
        </div>

        <footer class="club-footer">
          <span>◷ ${club.nextEvent}</span>
          <button
            type="button"
            class="details-btn"
            data-details="${club.id}"
            title="Open full club details"
          >
            View details →
          </button>
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

  $("#eventsList").innerHTML = state.clubs
    .slice(0, 6)
    .map(
      (club) => `
    <li>
      <div class="day-badge">
        <b>${club.event.day}</b>
        <small>${club.event.month}</small>
      </div>
      <div class="event-info">
        <strong>${club.event.name}</strong>
        <span>${club.event.schedule}</span>
      </div>
      <button
        type="button"
        class="rsvp-btn ${club.rsvp ? "done" : ""}"
        data-rsvp="${club.id}"
        title="${club.rsvp ? "Cancel your RSVP for this event" : "RSVP to attend this November event"}"
      >
        ${club.rsvp ? "Going ✓" : "RSVP"}
      </button>
    </li>
  `
    )
    .join("");

  $$("[data-join]").forEach((btn) => {
    btn.onclick = () => updateClub(btn.dataset.join, "joined");
  });
  $$("[data-heart]").forEach((btn) => {
    btn.onclick = () => updateClub(btn.dataset.heart, "favorite");
  });
  $$("[data-rsvp]").forEach((btn) => {
    btn.onclick = () => updateClub(btn.dataset.rsvp, "rsvp");
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

async function updateClub(id, field) {
  const club = state.clubs.find((c) => String(c.id) === String(id));
  if (!club) return;

  club[field] = !club[field];

  try {
    await fetch(`/api/clubs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: club[field] })
    });
  } catch {
    try {
      await fetch(`/api/clubs/${id}/membership`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: club[field] })
      });
    } catch {}
  }

  if (field === "joined") {
    toast(club.joined ? `Joined ${club.name}! (+50 pts)` : `Left ${club.name}.`);
  } else if (field === "rsvp") {
    toast(club.rsvp ? `RSVP confirmed for ${club.event.name}! (+30 pts)` : `RSVP removed for ${club.event.name}.`);
  } else if (field === "favorite") {
    toast(club.favorite ? `Added ${club.name} to Favourites! (+20 pts)` : `Removed ${club.name} from Favourites.`);
  }

  render();
}

function openClubModal(id) {
  const c = state.clubs.find((club) => String(club.id) === String(id));
  if (!c) return;

  $("#modalContent").innerHTML = `
    <p class="club-cat">${c.category} · NOVEMBER 2026</p>
    <h2>${c.icon} ${c.name}</h2>
    <p>${c.description}</p>
    <hr>
    <p><strong>Lead:</strong> ${c.lead || "Student Committee"}</p>
    <p><strong>Venue:</strong> ${c.venue || "Campus"}</p>
    <p><strong>Members:</strong> ${c.members}</p>
    <p><strong>Next Session:</strong> ${c.nextEvent}</p>
    <p><strong>Status:</strong> ${c.joined ? "Joined ✓" : "Not joined yet"} · ${c.favorite ? "Favourited ♥" : "Not in favourites"}</p>
  `;
  $("#modal").showModal();
}

function openAllEventsModal() {
  const rows = state.clubs
    .map(
      (club) => `
      <div class="modal-event-item">
        <div>
          <strong>${club.event.day} ${club.event.month} 2026 — ${club.event.name}</strong><br>
          <small>${club.name} · ${club.event.schedule}</small>
        </div>
        <button
          type="button"
          class="rsvp-btn ${club.rsvp ? "done" : ""}"
          data-modal-rsvp="${club.id}"
          title="Toggle RSVP for ${club.event.name}"
        >
          ${club.rsvp ? "Going ✓" : "RSVP"}
        </button>
      </div>
    `
    )
    .join("");

  $("#modalContent").innerHTML = `
    <p class="club-cat">ALL NOVEMBER 2026 EVENTS (${state.clubs.length})</p>
    <h2>📅 Complete November Club Calendar</h2>
    ${rows}
  `;

  $$("[data-modal-rsvp]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await updateClub(btn.dataset.modalRsvp, "rsvp");
      openAllEventsModal();
    });
  });

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
