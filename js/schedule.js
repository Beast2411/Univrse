(() => {
    const dateAtMidnight = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const selected = dateAtMidnight(new Date());
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const formatDate = (date, options) => date.toLocaleDateString([], options);
    const formatTime = (value) => new Date(`2000-01-01T${value}:00`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const daysContainer = document.querySelector(".days");
    const card = document.querySelector(".schedule-card");
    const title = document.querySelector(".card-title h2");
    const count = document.querySelector(".card-title p");
    const todayLabel = document.querySelector(".today-label");
    const dateLabel = document.querySelector(".week strong");
    const classesContainer = document.createElement("div");
    const timetableUrl = new URL("data/timetable.json", document.baseURI);
    let timetable = null;

    if (card) {
        card.querySelectorAll(":scope > .class").forEach((item) => item.remove());
        classesContainer.id = "schedule-classes";
        classesContainer.setAttribute("aria-live", "polite");
        const loading = document.createElement("p");
        loading.textContent = "Loading timetable…";
        classesContainer.append(loading);
        card.append(classesContainer);
    }

    const getWeekStart = (date) => {
        const monday = dateAtMidnight(date);
        monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
        return monday;
    };

    function render() {
        const dayName = dayNames[selected.getDay()];
        const isToday = dateAtMidnight(new Date()).getTime() === selected.getTime();
        const items = timetable ? (timetable[dayName] || []) : [];
        const rangeStart = getWeekStart(selected);
        const rangeEnd = new Date(rangeStart);
        rangeEnd.setDate(rangeEnd.getDate() + 6);
        if (dateLabel) dateLabel.textContent = `${formatDate(rangeStart, { day: "numeric", month: "short" })} – ${formatDate(rangeEnd, { day: "numeric", month: "long", year: "numeric" })}`;
        if (title) title.textContent = formatDate(selected, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        if (count) count.textContent = timetable ? `${items.length} ${items.length === 1 ? "class" : "classes"} ${isToday ? "today" : "scheduled"}` : "Loading classes…";
        if (todayLabel) {
            todayLabel.hidden = !isToday;
            if (!isToday) todayLabel.textContent = "Selected day";
        }

        if (daysContainer) {
            daysContainer.replaceChildren();
            for (let offset = 0; offset < 7; offset += 1) {
                const date = new Date(rangeStart);
                date.setDate(date.getDate() + offset);
                const button = document.createElement("button");
                button.type = "button";
                button.className = `day-option${date.getTime() === selected.getTime() ? " today" : ""}`;
                button.setAttribute("aria-pressed", String(date.getTime() === selected.getTime()));
                button.setAttribute("aria-label", formatDate(date, { weekday: "long", day: "numeric", month: "long" }));
                const weekday = document.createElement("span");
                weekday.textContent = formatDate(date, { weekday: "short" }).toUpperCase();
                const day = document.createElement("strong");
                day.textContent = String(date.getDate());
                button.append(weekday, document.createElement("br"), day);
                button.addEventListener("click", () => {
                    selected.setTime(date.getTime());
                    render();
                });
                daysContainer.append(button);
            }
        }

        if (!classesContainer) return;
        classesContainer.replaceChildren();
        if (!timetable) {
            const loading = document.createElement("p");
            loading.textContent = "Loading timetable…";
            classesContainer.append(loading);
            return;
        }
        if (!items.length) {
            const empty = document.createElement("p");
            empty.className = "schedule-empty";
            empty.textContent = "No classes scheduled for this day.";
            classesContainer.append(empty);
            return;
        }
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        items.forEach((item) => {
            const [startHour, startMinute] = item.start.split(":").map(Number);
            const [endHour, endMinute] = item.end.split(":").map(Number);
            const start = startHour * 60 + startMinute;
            const end = endHour * 60 + endMinute;
            const active = isToday && currentMinutes >= start && currentMinutes < end;
            const row = document.createElement("div");
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
            const location = document.createElement("p");
            location.textContent = [item.room, item.instructor].filter(Boolean).join(" · ");
            info.append(name, location);
            row.append(time, info);
            if (active) {
                const live = document.createElement("span");
                live.className = "live";
                live.textContent = "● Live";
                row.append(live);
            }
            classesContainer.append(row);
        });
        renderUpcoming();
    }

    document.querySelector(".week button:first-child")?.addEventListener("click", () => {
        selected.setDate(selected.getDate() - 1);
        render();
    });
    document.querySelector(".week button:last-child")?.addEventListener("click", () => {
        selected.setDate(selected.getDate() + 1);
        render();
    });

    render();
    async function fetchTimetable() {
        const response = await fetch(timetableUrl);
        if (!response.ok) throw new Error(`Timetable request failed (${response.status})`);
        return response.json();
    }

    fetchTimetable()
        .then((data) => {
            timetable = data;
            render();
            renderUpcoming();
        })
        .catch((error) => {
            console.error("Unable to load timetable:", error);
            if (count) count.textContent = "Schedule unavailable";
            if (classesContainer) {
                classesContainer.replaceChildren();
                const message = document.createElement("p");
                message.className = "schedule-error";
                message.textContent = "We couldn't load the timetable. Please try again later.";
                classesContainer.append(message);
            }
            const upcoming = document.querySelector(".upcoming");
            if (upcoming) upcoming.innerHTML = "<h2>Upcoming</h2><p>Upcoming schedule unavailable.</p>";
        });

    function renderUpcoming() {
        const upcoming = document.querySelector(".upcoming");
        if (!upcoming || !timetable) return;
        const upcomingList = document.createElement("div");
        upcomingList.className = "upcoming-days";
        for (let offset = 1; offset <= 2; offset += 1) {
            const date = new Date(selected);
            date.setDate(date.getDate() + offset);
            const line = document.createElement("div");
            const label = document.createElement("strong");
            label.textContent = formatDate(date, { weekday: "long" });
            const quantity = document.createElement("span");
            const amount = (timetable[dayNames[date.getDay()]] || []).length;
            quantity.textContent = `${amount} ${amount === 1 ? "class" : "classes"}`;
            line.append(label, quantity);
            upcomingList.append(line);
        }
        upcoming.replaceChildren(Object.assign(document.createElement("h2"), { textContent: "Upcoming" }), upcomingList);
    }
})();
