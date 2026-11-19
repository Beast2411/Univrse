(() => {
    const today = new Date();
    const dayName = new Intl.DateTimeFormat("en", { weekday: "long" }).format(today);
    const resourcePromises = new Map();
    const assistantResponse = document.querySelector("#assistant-response");

    const setText = (selector, value) => {
        const node = document.querySelector(selector);
        if (node) node.textContent = value;
    };

    async function getApiData(path) {
        return window.UNIVRSE_API.request(path);
    }

    function loadResource(key, path) {
        if (!resourcePromises.has(key)) {
            const request = getApiData(path).catch((error) => {
                resourcePromises.delete(key);
                throw error;
            });
            resourcePromises.set(key, request);
        }
        return resourcePromises.get(key);
    }

    function asArray(value, label) {
        if (!Array.isArray(value)) throw new Error(`${label} response did not contain a list.`);
        return value;
    }

    function parseClock(value) {
        if (typeof value !== "string" || !/^\d{2}:\d{2}$/.test(value)) return null;
        const [hour, minute] = value.split(":").map(Number);
        if (hour > 23 || minute > 59) return null;
        return hour * 60 + minute;
    }

    function formatTime(value) {
        const minutes = parseClock(value);
        if (minutes === null) return "Time not listed";
        const date = new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60);
        return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }

    function parseDateOnly(value) {
        if (typeof value !== "string") return null;
        const match = value.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return null;
        const [, yearText, monthText, dayText] = match;
        const year = Number(yearText);
        const month = Number(monthText);
        const day = Number(dayText);
        const date = new Date(year, month - 1, day);
        return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
    }

    function startOfDay(value) {
        const date = new Date(value);
        date.setHours(0, 0, 0, 0);
        return date;
    }

    function formatDate(value, options = { month: "short", day: "numeric" }) {
        const date = value instanceof Date ? value : parseDateOnly(value);
        return date ? date.toLocaleDateString([], options) : "Date not listed";
    }

    function formatDateTime(value) {
        const date = new Date(value);
        return Number.isNaN(date.getTime())
            ? "Update time unavailable"
            : date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    }

    function displayGreeting() {
        const hour = today.getHours();
        const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
        setText("#dashboard-greeting", `${greeting}, Aarush`);
        setText("#today-date", today.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" }));
        setText("#today-context", "Your live campus overview");
    }

    function showListMessage(container, message, className = "list-state") {
        container.replaceChildren();
        const state = document.createElement("p");
        state.className = className;
        state.textContent = message;
        container.append(state);
    }

    async function renderStats() {
        try {
            const stats = await loadResource("stats", "/dashboard/stats");
            const numericFields = ["totalAssignments", "pendingAssignments", "completedAssignments", "averageAttendance", "upcomingEvents"];
            if (!stats || numericFields.some((field) => typeof stats[field] !== "number" || !Number.isFinite(stats[field]))) {
                throw new Error("Dashboard statistics were incomplete.");
            }
            setText("#stat-pending-assignments", String(stats.pendingAssignments));
            setText("#assignment-stat-note", `${stats.completedAssignments} completed of ${stats.totalAssignments} total`);
            setText("#dashboard-summary", `${stats.totalAssignments} assignments recorded (${stats.pendingAssignments} pending, ${stats.completedAssignments} completed) | ${stats.upcomingEvents} upcoming events.`);
            setText("#stat-average-attendance", `${Number(stats.averageAttendance).toFixed(1)}%`);

        } catch (error) {
            console.error("Unable to load dashboard statistics:", error);
            ["#stat-pending-assignments", "#stat-average-attendance"].forEach((selector) => setText(selector, "—"));
            setText("#attendance-stat-note", "Statistics unavailable");
            setText("#assignment-stat-note", "Statistics unavailable");
            setText("#dashboard-summary", "Dashboard statistics are unavailable right now.");
            return;
        }

        try {
            const attendanceRecords = asArray(await loadResource("attendance", "/attendance"), "Attendance");
            const recordedClasses = attendanceRecords.reduce((sum, record) => sum + (Number(record.totalClasses) || 0), 0);
            setText("#attendance-stat-note", recordedClasses > 0
                ? `Weighted across ${attendanceRecords.length} subject record${attendanceRecords.length === 1 ? "" : "s"}`
                : "No class attendance recorded yet");
        } catch (error) {
            console.error("Unable to load attendance detail:", error);
            setText("#attendance-stat-note", "Class record count unavailable");
        }
    }

    function renderSchedule(timetable) {
        const scheduleContainer = document.querySelector("#today-classes");
        const scheduleSummary = document.querySelector("#schedule-summary");
        const nextName = document.querySelector("#next-class-title");
        const nextMeta = document.querySelector("#next-class-meta");
        if (!timetable || typeof timetable !== "object" || Array.isArray(timetable)) throw new Error("Timetable data is invalid.");

        const classes = Array.isArray(timetable[dayName]) ? timetable[dayName] : [];
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const currentClass = classes.find((item) => {
            const start = parseClock(item?.start);
            const end = parseClock(item?.end);
            return start !== null && end !== null && currentMinutes >= start && currentMinutes < end;
        });
        const next = currentClass || classes.find((item) => {
            const start = parseClock(item?.start);
            return start !== null && start > currentMinutes;
        });

        scheduleSummary.textContent = `${dayName} · ${classes.length} scheduled class${classes.length === 1 ? "" : "es"}`;
        setText("#dashboard-intro", classes.length
            ? `You have ${classes.length} class${classes.length === 1 ? "" : "es"} scheduled today${next ? `, including ${currentClass ? "your current class" : "your next class"} ${next.name || ""}.` : "."}`
            : `You have no classes scheduled for ${dayName}.`);
        nextName.textContent = next ? (next.name || "Class") : "No more classes today";
        nextMeta.textContent = next
            ? `${currentClass ? "In progress" : formatTime(next.start)}${next.room ? ` · ${next.room}` : ""}`
            : "Your timetable has no later class today";

        scheduleContainer.replaceChildren();
        if (!classes.length) {
            showListMessage(scheduleContainer, "No classes are scheduled for today.");
            return;
        }

        classes.forEach((item) => {
            const start = parseClock(item?.start);
            const end = parseClock(item?.end);
            if (start === null || end === null) return;
            const row = document.createElement("article");
            const isCurrent = item === currentClass;
            const isComplete = currentMinutes >= end;
            row.className = `schedule-item${isCurrent ? " current" : ""}`;

            const time = document.createElement("span");
            time.className = "time";
            time.textContent = formatTime(item.start);
            const details = document.createElement("div");
            const title = document.createElement("h3");
            title.textContent = item.name || "Class";
            const instructorRoom = document.createElement("p");
            instructorRoom.textContent = [item.instructor, item.room].filter(Boolean).join(" · ") || "Class details not listed";
            details.append(title, instructorRoom);

            const status = document.createElement("span");
            status.className = `status ${isCurrent ? "now" : isComplete ? "done" : ""}`;
            status.textContent = isCurrent ? "In progress" : isComplete ? "Completed" : `Ends ${formatTime(item.end)}`;
            row.append(time, details, status);
            scheduleContainer.append(row);
        });
    }

    async function loadSchedule() {
        const container = document.querySelector("#today-classes");
        setText("#schedule-summary", `${dayName} · Loading timetable…`);
        try {
            renderSchedule(await loadResource("timetable", "/timetable"));
        } catch (error) {
            console.error("Unable to load timetable:", error);
            setText("#schedule-summary", `${dayName} · Timetable unavailable`);
            setText("#dashboard-intro", "Your timetable is unavailable right now.");
            setText("#next-class-title", "Timetable unavailable");
            setText("#next-class-meta", "Check the Schedule page or try again later");
            setText("#stat-next-class-time", "?");
            setText("#stat-next-class-title", "Timetable unavailable");
            setText("#progress-count", "? / ?");
            setText("#progress-text", "Class progress is unavailable");
            showListMessage(container, "We couldn't load today's schedule.");
        }
    }

    function dueLabel(date) {
        const todayStart = startOfDay(new Date());
        const dueStart = startOfDay(date);
        const days = Math.round((dueStart - todayStart) / 86400000);
        if (days < 0) return "Overdue";
        if (days === 0) return "Due today";
        if (days === 1) return "Due tomorrow";
        return `Due ${formatDate(date)}`;
    }

    async function renderDueSoon() {
        const container = document.querySelector("#due-soon-list");
        try {
            const records = asArray(await loadResource("assignments", "/assignments?status=Pending"), "Assignments");
            const todayStart = startOfDay(new Date());
            const lastDay = new Date(todayStart);
            lastDay.setDate(lastDay.getDate() + 7);
            const dueSoon = records
                .filter((item) => item && item.status === "Pending")
                .map((item) => ({ item, date: parseDateOnly(item.dueDate) }))
                .filter(({ date }) => date && startOfDay(date) <= lastDay)
                .sort((a, b) => a.date - b.date)
                .slice(0, 3);

            if (!dueSoon.length) {
                showListMessage(container, "No pending assignments are due in the next seven days.");
                return;
            }
            container.replaceChildren();
            dueSoon.forEach(({ item, date }) => {
                const row = document.createElement("article");
                row.className = "task";
                const title = document.createElement("h3");
                title.textContent = item.title || "Untitled assignment";
                const subject = document.createElement("p");
                subject.textContent = item.subject || "Subject not listed";
                const due = document.createElement("span");
                const isUrgent = startOfDay(date) <= new Date(todayStart.getTime() + 86400000);
                due.className = isUrgent ? "danger" : "";
                due.textContent = dueLabel(date);
                row.append(title, subject, due);
                container.append(row);
            });
        } catch (error) {
            console.error("Unable to load assignments:", error);
            showListMessage(container, "Assignments are unavailable right now.", "list-state unavailable-state");
        }
    }

    async function renderUpcomingEvents() {
        const container = document.querySelector("#upcoming-events-list");
        try {
            const events = asArray(await loadResource("events", "/events?period=upcoming"), "Events");
            if (!events.length) {
                showListMessage(container, "There are no upcoming events in the event records.");
                return;
            }
            container.replaceChildren();
            events.slice(0, 3).forEach((event) => {
                const row = document.createElement("article");
                row.className = "event";
                const date = parseDateOnly(event.date);
                const day = document.createElement("time");
                day.className = "event-date";
                if (date) day.dateTime = date.toISOString().slice(0, 10);
                day.textContent = date ? date.toLocaleDateString([], { month: "short", day: "numeric" }) : "—";
                const details = document.createElement("div");
                const title = document.createElement("h3");
                title.textContent = event.title || "Campus event";
                const meta = document.createElement("p");
                meta.textContent = [event.time, event.venue, event.club].filter(Boolean).join(" · ") || "Event details not listed";
                details.append(title, meta);
                row.append(day, details);
                container.append(row);
            });
        } catch (error) {
            console.error("Unable to load upcoming events:", error);
            showListMessage(container, "Upcoming events are unavailable right now.", "list-state unavailable-state");
        }
    }

    const activityLabels = {
        assignment: "Assignment",
        event: "Event",
        helpdesk: "Help Desk",
        marketplace: "Marketplace"
    };

    async function renderRecentActivity() {
        const container = document.querySelector("#recent-activity-list");
        try {
            const records = asArray(await loadResource("activity", "/dashboard/recent-activity"), "Recent activity");
            if (!records.length) {
                showListMessage(container, "No recently updated records are available.");
                return;
            }
            container.replaceChildren();
            records.slice(0, 6).forEach((record) => {
                const row = document.createElement("article");
                row.className = "activity-item";
                const type = document.createElement("span");
                type.className = "activity-type";
                type.textContent = activityLabels[record.type] || "Portal";
                const details = document.createElement("div");
                details.className = "activity-copy";
                const title = document.createElement("strong");
                title.textContent = record.title || "Untitled record";
                const updated = document.createElement("span");
                const statusDetail = record.details && record.details !== "Event record updated" ? `${record.details} · ` : "";
                updated.textContent = `${statusDetail}Updated ${formatDateTime(record.date)}`;
                details.append(title, updated);
                row.append(type, details);
                container.append(row);
            });
        } catch (error) {
            console.error("Unable to load recent activity:", error);
            showListMessage(container, "Recently updated records are unavailable right now.");
        }
    }

    async function renderWeather() {
        const status = document.querySelector("#weather-status");
        const values = document.querySelector("#weather-values");
        try {
            const weather = await loadResource("weather", "/weather");
            if (!weather || typeof weather.temperature !== "number" || typeof weather.condition !== "string") {
                throw new Error("Weather information is incomplete.");
            }
            setText("#weather-temperature", `${weather.temperature.toFixed(1)}°C`);
            setText("#weather-condition", weather.condition);
            const details = [];
            if (typeof weather.apparentTemperature === "number") details.push(`Feels like ${weather.apparentTemperature.toFixed(1)}°C`);
            if (typeof weather.windSpeed === "number") details.push(`Wind ${weather.windSpeed} km/h`);
            if (typeof weather.relativeHumidity === "number") details.push(`${weather.relativeHumidity}% humidity`);
            setText("#weather-details", details.join(" · "));
            values.hidden = false;
            status.textContent = weather.observedAt ? `Current conditions · observed ${formatDateTime(weather.observedAt)}` : "Current conditions";
        } catch (error) {
            console.warn("Weather is unavailable:", error.message);
            values.hidden = true;
            status.textContent = error.message || "Weather is unavailable right now.";
        }
    }

    async function getAssignmentsAnswer() {
        const assignments = asArray(await loadResource("assignments", "/assignments?status=Pending"), "Assignments");
        const todayStart = startOfDay(new Date());
        const lastDay = new Date(todayStart);
        lastDay.setDate(lastDay.getDate() + 7);
        const dueSoon = assignments
            .filter((item) => item && item.status === "Pending")
            .map((item) => ({ item, date: parseDateOnly(item.dueDate) }))
            .filter(({ date }) => date && startOfDay(date) <= lastDay)
            .sort((a, b) => a.date - b.date);
        if (!dueSoon.length) return "No pending assignments are due in the next seven days.";
        return dueSoon.slice(0, 5).map(({ item, date }) => `${item.title || "Untitled assignment"} · ${item.subject || "Subject not listed"} · ${dueLabel(date)}`).join("\n");
    }

    async function getAttendanceAnswer() {
        const records = asArray(await loadResource("attendance", "/attendance"), "Attendance");
        const valid = records.filter((record) => record
            && typeof record.subject === "string"
            && Number.isFinite(Number(record.attendedClasses))
            && Number.isFinite(Number(record.totalClasses))
            && Number(record.totalClasses) >= 0
            && Number(record.attendedClasses) >= 0
            && Number(record.attendedClasses) <= Number(record.totalClasses));
        const attended = valid.reduce((sum, record) => sum + Number(record.attendedClasses), 0);
        const total = valid.reduce((sum, record) => sum + Number(record.totalClasses), 0);
        if (!valid.length || total === 0) return "No class attendance has been recorded yet.";
        const overall = (attended / total) * 100;
        const subjects = valid.slice(0, 6).map((record) => {
            const percent = record.totalClasses === 0 ? 0 : Number(record.attendedClasses) / Number(record.totalClasses) * 100;
            return `${record.subject}: ${percent.toFixed(1)}% (${record.attendedClasses}/${record.totalClasses})`;
        });
        return `Weighted attendance: ${overall.toFixed(1)}% (${attended}/${total} classes).\n${subjects.join("\n")}`;
    }

    async function getTodayAnswer() {
        const timetable = await loadResource("timetable", "/timetable");
        const classes = Array.isArray(timetable?.[dayName]) ? timetable[dayName] : [];
        if (!classes.length) return `No classes are scheduled for ${dayName}.`;
        return classes.map((item) => `${item.name || "Class"}: ${formatTime(item.start)}–${formatTime(item.end)}${item.room ? ` · ${item.room}` : ""}`).join("\n");
    }

    document.querySelectorAll("[data-assistant]").forEach((button) => {
        button.addEventListener("click", async () => {
            const buttons = [...document.querySelectorAll("[data-assistant]")];
            buttons.forEach((item) => { item.disabled = true; });
            assistantResponse.hidden = false;
            assistantResponse.textContent = "Loading live information…";
            try {
                const answer = button.dataset.assistant === "today"
                    ? await getTodayAnswer()
                    : button.dataset.assistant === "assignments"
                        ? await getAssignmentsAnswer()
                        : await getAttendanceAnswer();
                assistantResponse.textContent = answer;
            } catch (error) {
                console.error("Unable to load assistant data:", error);
                assistantResponse.textContent = "That information is unavailable right now. Check that the backend is running and try again.";
            } finally {
                buttons.forEach((item) => { item.disabled = false; });
            }
        });
    });

    displayGreeting();
    void renderStats();
    void loadSchedule();
    void renderDueSoon();
    void renderUpcomingEvents();
    void renderRecentActivity();
    void renderWeather();

    // Pomodoro countdown uses an end time so delayed timer ticks do not drift.
    const countdown = document.querySelector("#focus-countdown");
    const focusState = document.querySelector("#focus-state");
    const startButton = document.querySelector("#focus-start");
    const pauseButton = document.querySelector("#focus-pause");
    const resetButton = document.querySelector("#focus-reset");
    const breakButton = document.querySelector("#focus-break");
    let timerId = null;
    let secondsLeft = 25 * 60;
    let endTime = null;
    function displayTime() {
        countdown.textContent = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;
    }
    function stopTimer() {
        if (timerId !== null) clearInterval(timerId);
        timerId = null;
        endTime = null;
    }
    function tick() {
        secondsLeft = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        displayTime();
        if (secondsLeft === 0) {
            stopTimer();
            focusState.textContent = "Focus session complete — time for a short break!";
            breakButton.hidden = false;
        }
    }
    startButton.addEventListener("click", () => {
        if (timerId !== null || secondsLeft === 0) return;
        focusState.textContent = "Focusing";
        breakButton.hidden = true;
        endTime = Date.now() + secondsLeft * 1000;
        timerId = setInterval(tick, 250);
        tick();
    });
    pauseButton.addEventListener("click", () => {
        if (timerId === null) return;
        secondsLeft = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        stopTimer();
        displayTime();
        focusState.textContent = "Paused";
    });
    resetButton.addEventListener("click", () => {
        stopTimer();
        secondsLeft = 25 * 60;
        displayTime();
        focusState.textContent = "Ready to focus";
        breakButton.hidden = true;
    });
    breakButton.addEventListener("click", () => {
        secondsLeft = 25 * 60;
        displayTime();
        focusState.textContent = "Ready for your next focus session";
        breakButton.hidden = true;
        startButton.click();
    });

    // Goals remain in memory for the current page session, as before.
    const goalForm = document.querySelector("#goal-form");
    const goalList = document.querySelector("#goal-list");
    const goals = [];
    function renderGoals() {
        goalList.replaceChildren();
        document.querySelector("#goal-empty").hidden = goals.length > 0;
        const completed = goals.filter((goal) => goal.completed).length;
        setText("#goal-progress", `${completed} of ${goals.length} goals completed (${goals.length ? Math.round(completed / goals.length * 100) : 0}%)`);
        goals.forEach((goal, index) => {
            const row = document.createElement("li");
            row.className = goal.completed ? "goal-item is-complete" : "goal-item";
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = goal.completed;
            checkbox.setAttribute("aria-label", `Mark ${goal.title} completed`);
            checkbox.addEventListener("change", () => { goal.completed = checkbox.checked; renderGoals(); });
            const description = document.createElement("span");
            description.textContent = `${goal.title} · Due ${goal.deadline} · ${goal.priority} priority`;
            const remove = document.createElement("button");
            remove.type = "button";
            remove.textContent = "Remove";
            remove.addEventListener("click", () => {
                if (window.confirm(`Remove “${goal.title}” from your goals?`)) { goals.splice(index, 1); renderGoals(); }
            });
            row.append(checkbox, description, remove);
            goalList.append(row);
        });
    }
    goalForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const title = document.querySelector("#goal-title").value.trim();
        const deadline = document.querySelector("#goal-deadline").value;
        const feedback = document.querySelector("#goal-feedback");
        const selectedDate = deadline ? new Date(`${deadline}T00:00:00`) : null;
        const todayStart = startOfDay(new Date());
        if (!title) { feedback.textContent = "Enter a goal title."; return; }
        if (!selectedDate || Number.isNaN(selectedDate.getTime())) { feedback.textContent = "Choose a valid deadline."; return; }
        if (selectedDate < todayStart) { feedback.textContent = "Choose today or a future date for the deadline."; return; }
        goals.push({ title, deadline, priority: document.querySelector("#goal-priority").value, completed: false });
        renderGoals();
        goalForm.reset();
        feedback.textContent = "Goal added.";
    });
    renderGoals();
})();
