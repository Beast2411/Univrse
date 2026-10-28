(() => {
    const today = new Date();
    const dayName = new Intl.DateTimeFormat("en", { weekday: "long" }).format(today);
    const scheduleCard = document.querySelector(".schedule-card");
    const assistantResponse = document.querySelector("#assistant-response");
    const setText = (selector, value) => {
        const node = document.querySelector(selector);
        if (node) node.textContent = value;
    };
    const formatTime = (value) => {
        const [hour, minute] = value.split(":").map(Number);
        return new Date(2000, 0, 1, hour, minute).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    };
    const timetablePromise = fetch(new URL("data/timetable.json", document.baseURI)).then((response) => {
        if (!response.ok) throw new Error(`Timetable request failed (${response.status})`);
        return response.json();
    });
    const assignmentsPromise = fetch(new URL("data/assignments.json", document.baseURI)).then((response) => {
        if (!response.ok) throw new Error(`Assignments request failed (${response.status})`);
        return response.json();
    });
    const attendancePromise = fetch(new URL("data/Attendance.json", document.baseURI)).then((response) => {
        if (!response.ok) throw new Error(`Attendance request failed (${response.status})`);
        return response.json();
    });

    const greeting = today.getHours() < 12 ? "Good morning" : today.getHours() < 18 ? "Good afternoon" : "Good evening";
    setText(".greeting h1", `${greeting}, Aarush 👋`);
    setText(".date strong", today.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" }));
    setText(".date span", "Your timetable");
    setText(".schedule-card .section-title p", `${dayName} · Loading classes…`);

    function renderSchedule(timetable) {
        if (!timetable || typeof timetable !== "object" || Array.isArray(timetable)) throw new Error("Timetable JSON must contain weekday arrays.");
        const dayClasses = Array.isArray(timetable[dayName]) ? timetable[dayName] : [];
        const now = today.getHours() * 60 + today.getMinutes();
        const current = dayClasses.find((item) => {
            if (!item || typeof item.start !== "string" || typeof item.end !== "string") return false;
            const [sh, sm] = item.start.split(":").map(Number);
            const [eh, em] = item.end.split(":").map(Number);
            return now >= sh * 60 + sm && now < eh * 60 + em;
        });
        const upcoming = dayClasses.find((item) => {
            if (!item || typeof item.start !== "string") return false;
            const [hour, minute] = item.start.split(":").map(Number);
            return hour * 60 + minute > now;
        });
        const next = current || upcoming;
        setText(".greeting p", dayClasses.length ? `You have ${dayClasses.length} ${dayClasses.length === 1 ? "class" : "classes"} today. Here’s what’s on your timetable.` : "You have no classes scheduled today. Enjoy the extra time.");
        setText(".ai-card > p", dayClasses.length ? `You have ${dayClasses.length} ${dayClasses.length === 1 ? "class" : "classes"} on your timetable today.` : "There are no classes on your timetable today.");
        setText(".next-class strong", next ? next.name || "Class" : "No upcoming classes");
        setText(".next-class span", next ? `${formatTime(next.start)} · ${next.room || "Room not listed"}` : "Enjoy the rest of your day");
        setText(".stats .card:last-child h2", next ? formatTime(next.start) : "—");
        setText(".stats .card:last-child p", next ? next.name || "Class" : "No upcoming classes");
        setText(".schedule-card .section-title p", `${dayName} · ${dayClasses.length} ${dayClasses.length === 1 ? "class" : "classes"}`);
        scheduleCard.querySelectorAll(":scope > .schedule-item, :scope > .schedule-empty, :scope > .schedule-error").forEach((node) => node.remove());
        if (!dayClasses.length) {
            const empty = document.createElement("p");
            empty.className = "schedule-empty";
            empty.textContent = "No classes scheduled for today.";
            scheduleCard.append(empty);
            return;
        }
        dayClasses.forEach((item) => {
            if (!item || typeof item.start !== "string" || typeof item.end !== "string") return;
            const [eh, em] = item.end.split(":").map(Number);
            const isCurrent = current === item;
            const row = document.createElement("div");
            row.className = `schedule-item${isCurrent ? " current" : ""}`;
            const time = document.createElement("span");
            time.className = "time";
            time.textContent = formatTime(item.start);
            const detail = document.createElement("div");
            const title = document.createElement("h3");
            title.textContent = item.name || "Class";
            const subtitle = document.createElement("p");
            subtitle.textContent = [item.instructor, item.room].filter(Boolean).join(" · ") || "Details not listed";
            detail.append(title, subtitle);
            const status = document.createElement("span");
            const done = now >= eh * 60 + em;
            status.className = `status ${isCurrent ? "now" : done ? "done" : ""}`;
            status.textContent = isCurrent ? "In progress" : done ? "Completed" : formatTime(item.end);
            row.append(time, detail, status);
            scheduleCard.append(row);
        });
    }

    timetablePromise.then(renderSchedule).catch((error) => {
        console.error("Unable to load timetable:", error);
        setText(".greeting p", "Your timetable could not be loaded. Please try again later.");
        setText(".ai-card > p", "Timetable unavailable.");
        setText(".schedule-card .section-title p", `${dayName} · Schedule unavailable`);
        if (scheduleCard) {
            scheduleCard.querySelectorAll(":scope > .schedule-item").forEach((node) => node.remove());
            const message = document.createElement("p");
            message.className = "schedule-error";
            message.textContent = "We couldn't load today's schedule.";
            scheduleCard.append(message);
        }
    });

    function parseDateOnly(value) {
        if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
        const [year, month, day] = value.split("-").map(Number);
        const date = new Date(year, month - 1, day);
        if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
        return date;
    }

    function formatDate(value) {
        return value.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
    }

    async function getAssignmentsAnswer() {
        const assignments = await assignmentsPromise;
        if (!Array.isArray(assignments)) throw new Error("Assignments JSON must contain an array.");

        const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const lastDate = new Date(startDate);
        lastDate.setDate(lastDate.getDate() + 7);
        const dueSoon = assignments
            .filter((item) => item && typeof item === "object")
            .map((item) => ({ item, dueDate: parseDateOnly(item.dueDate) }))
            .filter(({ item, dueDate }) => {
                const status = String(item.status || "pending").toLowerCase();
                if (!dueDate || status === "submitted" || status === "completed") return false;
                return dueDate <= lastDate;
            })
            .sort((a, b) => a.dueDate - b.dueDate);

        if (!dueSoon.length) return "Nothing is due in the next seven days, and there are no overdue open assignments.";

        const lines = dueSoon.map(({ item, dueDate }) => {
            const title = item.title || item.name || item.subject || "Untitled assignment";
            const status = String(item.status || "pending");
            const overdue = status.toLowerCase() === "overdue" || dueDate < startDate;
            const daysUntilDue = Math.round((dueDate - startDate) / 86400000);
            const urgent = !overdue && (String(item.priority || "").toLowerCase() === "high" || daysUntilDue <= 1);
            const flag = overdue ? "OVERDUE · " : urgent ? "URGENT · " : "";
            const dueLabel = overdue ? "overdue" : daysUntilDue === 0 ? "due today" : daysUntilDue === 1 ? "due tomorrow" : `due ${formatDate(dueDate)}`;
            const details = [dueLabel, status, item.priority ? `${item.priority} priority` : ""].filter(Boolean).join(" · ");
            return `${flag}${title} — ${details}`;
        });
        return `Open assignments due this week (sorted by deadline):\n${lines.join("\n")}`;
    }

    async function getAttendanceAnswer() {
        const attendance = await attendancePromise;
        if (!attendance || typeof attendance !== "object" || !Array.isArray(attendance.subjects)) {
            throw new Error("Attendance JSON must contain a subjects array.");
        }
        const threshold = Number.isFinite(Number(attendance.minimumAttendance))
            ? Number(attendance.minimumAttendance)
            : 75;
        const validSubjects = attendance.subjects.filter((subject) => subject
            && typeof subject.name === "string"
            && Number.isFinite(subject.attended)
            && Number.isFinite(subject.total)
            && subject.total > 0
            && subject.attended >= 0
            && subject.attended <= subject.total);

        if (!validSubjects.length) return "Attendance details are unavailable because the file has no valid subject attendance counts.";

        const attended = validSubjects.reduce((sum, subject) => sum + subject.attended, 0);
        const total = validSubjects.reduce((sum, subject) => sum + subject.total, 0);
        const overall = attended / total * 100;
        const lines = validSubjects.map((subject) => {
            const percentage = subject.attended / subject.total * 100;
            const warning = percentage < threshold
                ? ` — below ${threshold}% (attend ${Math.ceil(Math.max(0, (threshold / 100 * subject.total - subject.attended) / (1 - threshold / 100)))} more classes to reach ${threshold}%)`
                : "";
            return `${subject.name}: ${percentage.toFixed(1)}% (${subject.attended}/${subject.total})${warning}`;
        });
        const overallNote = overall < threshold
            ? `Overall is below the ${threshold}% minimum.`
            : `Overall is above the ${threshold}% minimum.`;
        return `Overall attendance: ${overall.toFixed(1)}% (${attended}/${total}). ${overallNote}\nSubject-wise attendance:\n${lines.join("\n")}`;
    }

    // Assistant actions share one response area and reuse cached JSON requests.
    document.querySelectorAll("[data-assistant]").forEach((button) => {
        button.addEventListener("click", async () => {
            document.querySelectorAll("[data-assistant]").forEach((item) => { item.disabled = true; });
            assistantResponse.hidden = false;
            assistantResponse.textContent = "Loading…";
            try {
                const kind = button.dataset.assistant;
                let message;
                if (kind === "today") {
                    const timetable = await timetablePromise;
                    const classes = Array.isArray(timetable[dayName]) ? timetable[dayName] : [];
                    message = classes.length ? classes.map((item) => `${item.name || "Class"}: ${item.start || "Time not listed"}–${item.end || "Time not listed"}${item.room ? ` · ${item.room}` : ""}`).join("\n") : "No classes are scheduled today.";
                    message += "";
                } else if (kind === "assignments") {
                    message = await getAssignmentsAnswer();
                } else {
                    message = await getAttendanceAnswer();
                }
                assistantResponse.textContent = message;
            } catch (error) {
                console.error("Unable to load assistant data:", error);
                assistantResponse.textContent = "Sorry, the requested data could not be loaded. Check the JSON file and try again.";
            } finally {
                document.querySelectorAll("[data-assistant]").forEach((item) => { item.disabled = false; });
            }
        });
    });

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

    // Goals are intentionally kept in memory for this page session only.
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
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
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
