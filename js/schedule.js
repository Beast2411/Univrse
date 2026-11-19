(() => {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const selected = new Date();
    selected.setHours(0, 0, 0, 0);
    const daysContainer = document.querySelector(".days");
    const classesContainer = document.querySelector("#schedule-classes");
    const form = document.querySelector("#class-form");
    const feedback = document.querySelector("#schedule-feedback");
    const saveFeedback = document.querySelector("#save-feedback");
    const formatDate = (date, options) => date.toLocaleDateString([], options);
    const parseMinutes = (value) => {
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value || "")) return null;
        const [hour, minute] = value.split(":").map(Number);
        return hour * 60 + minute;
    };
    const formatTime = (value) => {
        const minutes = parseMinutes(value);
        if (minutes === null) return "Time unavailable";
        return new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    };
    let timetable = null;
    let saving = false;
    let dirty = false;

    function weekStart(date) {
        const monday = new Date(date);
        monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
        return monday;
    }

    function setMessage(node, message, isError = false) {
        node.textContent = message;
        node.classList.toggle("is-error", isError);
    }

    function render() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDay = dayNames[selected.getDay()];
        const isToday = selected.getTime() === today.getTime();
        const classes = timetable?.[selectedDay] || [];
        const monday = weekStart(selected);
        const sunday = new Date(monday);
        sunday.setDate(sunday.getDate() + 6);
        document.querySelector("#week-label").textContent = `${formatDate(monday, { day: "numeric", month: "short" })} – ${formatDate(sunday, { day: "numeric", month: "long", year: "numeric" })}`;
        document.querySelector("#selected-day-title").textContent = formatDate(selected, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        document.querySelector("#selected-day-count").textContent = timetable ? `${classes.length} ${classes.length === 1 ? "class" : "classes"} ${isToday ? "today" : "scheduled"}` : "Loading classes...";
        const todayLabel = document.querySelector("#today-label");
        todayLabel.hidden = !isToday;
        todayLabel.textContent = "Today";

        daysContainer.replaceChildren();
        for (let offset = 0; offset < 7; offset += 1) {
            const date = new Date(monday);
            date.setDate(date.getDate() + offset);
            const button = document.createElement("button");
            button.type = "button";
            button.className = `day-option${date.getTime() === today.getTime() ? " today" : ""}`;
            button.setAttribute("aria-pressed", String(date.getTime() === selected.getTime()));
            button.setAttribute("aria-label", formatDate(date, { weekday: "long", day: "numeric", month: "long" }));
            const weekday = document.createElement("span");
            weekday.textContent = formatDate(date, { weekday: "short" }).toUpperCase();
            const day = document.createElement("strong");
            day.textContent = String(date.getDate());
            button.append(weekday, document.createElement("br"), day);
            button.addEventListener("click", () => { selected.setTime(date.getTime()); resetEditor(); render(); });
            daysContainer.append(button);
        }
        renderClasses(classes, isToday);
        renderUpcoming();
    }

    function renderClasses(classes, isToday) {
        classesContainer.replaceChildren();
        if (!timetable) {
            const message = document.createElement("p");
            message.className = "schedule-empty";
            message.textContent = "Loading timetable from the backend...";
            classesContainer.append(message);
            return;
        }
        if (!classes.length) {
            const message = document.createElement("p");
            message.className = "schedule-empty";
            message.textContent = "No classes scheduled for this day.";
            classesContainer.append(message);
            return;
        }
        const now = new Date();
        const minutesNow = now.getHours() * 60 + now.getMinutes();
        classes.forEach((item, index) => {
            const start = parseMinutes(item.start);
            const end = parseMinutes(item.end);
            const active = isToday && start !== null && end !== null && minutesNow >= start && minutesNow < end;
            const row = document.createElement("article");
            row.className = `class${active ? " current" : ""}`;
            const time = document.createElement("div");
            time.className = "time";
            const startText = document.createElement("strong");
            startText.textContent = item.start;
            const endText = document.createElement("span");
            endText.textContent = formatTime(item.end);
            time.append(startText, endText);
            const info = document.createElement("div");
            info.className = "class-info";
            const name = document.createElement("h3");
            name.textContent = item.name;
            const details = document.createElement("p");
            details.textContent = [item.room, item.instructor].filter(Boolean).join(" · ");
            info.append(name, details);
            row.append(time, info);
            if (active) {
                const live = document.createElement("span");
                live.className = "live";
                live.textContent = "● Live";
                row.append(live);
            }
            const actions = document.createElement("div");
            actions.className = "class-actions";
            const edit = document.createElement("button");
            edit.type = "button";
            edit.textContent = "Edit";
            edit.addEventListener("click", () => beginEdit(index, item));
            const remove = document.createElement("button");
            remove.type = "button";
            remove.textContent = "Remove";
            remove.addEventListener("click", () => {
                if (!window.confirm(`Remove ${item.name} from ${dayNames[selected.getDay()]}? Save the timetable to publish this change.`)) return;
                timetable[dayNames[selected.getDay()]].splice(index, 1);
                dirty = true;
                setMessage(saveFeedback, "Class removed locally. Save the timetable to publish the change.");
                render();
            });
            actions.append(edit, remove);
            row.append(actions);
            classesContainer.append(row);
        });
    }

    function renderUpcoming() {
        const container = document.querySelector(".upcoming");
        container.replaceChildren();
        const title = document.createElement("h2");
        title.textContent = "Coming up";
        const description = document.createElement("p");
        description.className = "upcoming-description";
        description.textContent = "A quick look at the next two days. Select a day to view its timetable.";
        container.append(title, description);
        if (!timetable) return;
        const list = document.createElement("div");
        list.className = "upcoming-days";
        for (let offset = 1; offset <= 2; offset += 1) {
            const date = new Date(selected);
            date.setDate(date.getDate() + offset);
            const classes = timetable[dayNames[date.getDay()]] || [];
            const button = document.createElement("button");
            button.type = "button";
            button.className = "upcoming-day";
            button.textContent = `${formatDate(date, { weekday: "long", day: "numeric", month: "short" })} · ${classes.length} ${classes.length === 1 ? "class" : "classes"}${classes[0] ? ` · ${formatTime(classes[0].start)} ${classes[0].name}` : " · No classes planned"}`;
            button.addEventListener("click", () => { selected.setTime(date.getTime()); resetEditor(); render(); document.querySelector(".schedule-card").scrollIntoView({ behavior: "smooth", block: "start" }); });
            list.append(button);
        }
        container.append(list);
    }

    function beginEdit(index, item) {
        form.hidden = false;
        document.querySelector("#class-index").value = String(index);
        document.querySelector("#class-name").value = item.name;
        document.querySelector("#class-start").value = item.start;
        document.querySelector("#class-end").value = item.end;
        document.querySelector("#class-instructor").value = item.instructor;
        document.querySelector("#class-room").value = item.room;
        document.querySelector("#save-class").textContent = "Update class";
        document.querySelector("#class-name").focus();
    }

    function resetEditor() {
        form.reset();
        form.hidden = true;
        document.querySelector("#class-index").value = "";
        document.querySelector("#save-class").textContent = "Apply class";
        setMessage(document.querySelector("#class-form-feedback"), "");
    }

    function validateTimetable(value) {
        const names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        return value && Object.keys(value).length === 7 && names.every((day) => Array.isArray(value[day]) && value[day].every((item) => {
            const start = parseMinutes(item.start);
            const end = parseMinutes(item.end);
            return start !== null && end !== null && end > start && [item.name, item.instructor, item.room].every((field) => typeof field === "string") && item.name.trim();
        }));
    }

    async function loadTimetable(message = "Timetable loaded from the backend.") {
        setMessage(feedback, "Loading timetable from the backend...");
        try {
            const data = await window.UNIVRSE_API.request("/timetable");
            if (!validateTimetable(data)) throw new Error("The backend returned timetable data in an unexpected format.");
            timetable = data;
            dirty = false;
            document.querySelector("#add-class").disabled = false;
            document.querySelector("#save-timetable").disabled = false;
            render();
            setMessage(feedback, message);
        } catch (error) {
            timetable = null;
            document.querySelector("#add-class").disabled = true;
            document.querySelector("#save-timetable").disabled = true;
            render();
            setMessage(feedback, `${error.message} Check that the backend is running.`, true);
            console.error("Unable to load timetable:", error);
        }
    }

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const day = dayNames[selected.getDay()];
        const entry = {
            start: document.querySelector("#class-start").value,
            end: document.querySelector("#class-end").value,
            name: document.querySelector("#class-name").value.trim(),
            instructor: document.querySelector("#class-instructor").value.trim(),
            room: document.querySelector("#class-room").value.trim()
        };
        if (!entry.name || parseMinutes(entry.start) === null || parseMinutes(entry.end) === null || parseMinutes(entry.end) <= parseMinutes(entry.start)) {
            setMessage(document.querySelector("#class-form-feedback"), "Enter a class name and a valid start and end time. End time must be later than start time.", true);
            return;
        }
        const index = document.querySelector("#class-index").value;
        const classes = timetable[day];
        if (index === "") classes.push(entry);
        else classes[Number(index)] = entry;
        classes.sort((a, b) => parseMinutes(a.start) - parseMinutes(b.start));
        dirty = true;
        resetEditor();
        setMessage(saveFeedback, "Class changes are pending. Save the timetable to publish them.");
        render();
    });

    document.querySelector("#add-class").addEventListener("click", () => { if (!timetable) return; resetEditor(); form.hidden = false; document.querySelector("#class-name").focus(); });
    document.querySelector("#cancel-class").addEventListener("click", resetEditor);
    document.querySelector("#previous-week").addEventListener("click", () => { selected.setDate(selected.getDate() - 7); resetEditor(); render(); });
    document.querySelector("#next-week").addEventListener("click", () => { selected.setDate(selected.getDate() + 7); resetEditor(); render(); });
    document.querySelector("#reload-timetable").addEventListener("click", () => {
        if (saving || (dirty && !window.confirm("Discard unsaved timetable changes and reload from the backend?"))) return;
        void loadTimetable("Reloaded the latest timetable from the backend.");
    });
    document.querySelector("#save-timetable").addEventListener("click", async () => {
        if (saving || !timetable) return;
        saving = true;
        const button = document.querySelector("#save-timetable");
        button.disabled = true;
        setMessage(saveFeedback, "Saving timetable...");
        try {
            await window.UNIVRSE_API.request("/timetable", { method: "PUT", body: JSON.stringify(timetable) });
            dirty = false;
            await loadTimetable("Timetable saved and reloaded from the backend.");
        } catch (error) {
            setMessage(saveFeedback, `Save failed: ${error.message}`, true);
            console.error("Unable to save timetable:", error);
        } finally {
            saving = false;
            button.disabled = false;
        }
    });

    document.querySelector("#add-class").disabled = true;
    document.querySelector("#save-timetable").disabled = true;
    render();
    void loadTimetable();
})();
