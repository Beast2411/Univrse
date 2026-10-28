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
    const upcomingCard = document.querySelector(".upcoming");

    if (upcomingCard) {
        const heading = document.createElement("h2");
        heading.textContent = "Coming up";
        const loading = document.createElement("p");
        loading.className = "upcoming-description";
        loading.textContent = "Loading the next few days\u2026";
        upcomingCard.replaceChildren(heading, loading);
    }

    if (card) {
        card.querySelectorAll(":scope > .class").forEach((item) => item.remove());
        classesContainer.id = "schedule-classes";
        classesContainer.setAttribute("aria-live", "polite");
        const loading = document.createElement("p");
            loading.textContent = "Loading timetable\u2026";
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
        if (dateLabel) dateLabel.textContent = `${formatDate(rangeStart, { day: "numeric", month: "short" })} \u2013 ${formatDate(rangeEnd, { day: "numeric", month: "long", year: "numeric" })}`;
        if (title) title.textContent = formatDate(selected, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        if (count) count.textContent = timetable ? `${items.length} ${items.length === 1 ? "class" : "classes"} ${isToday ? "today" : "scheduled"}` : "Loading classes\u2026";
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

        renderUpcoming();
        if (!classesContainer) return;
        classesContainer.replaceChildren();
        if (!timetable) {
            const loading = document.createElement("p");
            loading.textContent = "Loading timetable\u2026";
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
    async function loadTimetable() {
        try {
            const response = await fetch(timetableUrl);
            if (!response.ok) throw new Error(`Timetable request failed (${response.status})`);
            timetable = await response.json();
            render();
        } catch (error) {
            console.error("Unable to load timetable:", error);
            if (count) count.textContent = "Schedule unavailable";
            if (classesContainer) {
                classesContainer.replaceChildren();
                const message = document.createElement("p");
                message.className = "schedule-error";
                message.textContent = "We couldn't load the timetable. Please try again later.";
                classesContainer.append(message);
            }
            if (upcomingCard) {
                const heading = document.createElement("h2");
                heading.textContent = "Coming up";
                const message = document.createElement("p");
                message.className = "upcoming-description";
                message.textContent = "Upcoming schedule unavailable. Please try again later.";
                upcomingCard.replaceChildren(heading, message);
            }
        }
    }
    loadTimetable();

    function renderUpcoming() {
        const upcoming = upcomingCard;
        if (!upcoming || !timetable) return;
        const upcomingList = document.createElement("div");
        upcomingList.className = "upcoming-days";
        upcomingList.setAttribute("aria-label", "Upcoming days");
        for (let offset = 1; offset <= 2; offset += 1) {
            const date = new Date(selected);
            date.setDate(date.getDate() + offset);
            const dayClasses = timetable[dayNames[date.getDay()]] || [];
            const button = document.createElement("button");
            button.type = "button";
            button.className = "upcoming-day";
            button.setAttribute("aria-label", `${formatDate(date, { weekday: "long", day: "numeric", month: "long" })}, ${dayClasses.length} ${dayClasses.length === 1 ? "class" : "classes"}. Select this day.`);

            const heading = document.createElement("span");
            heading.className = "upcoming-day-heading";
            const label = document.createElement("strong");
            label.textContent = formatDate(date, { weekday: "long" });
            const dateText = document.createElement("span");
            dateText.className = "upcoming-date";
            dateText.textContent = formatDate(date, { day: "numeric", month: "short" });
            const quantity = document.createElement("span");
            quantity.className = "upcoming-count";
            quantity.textContent = `${dayClasses.length} ${dayClasses.length === 1 ? "class" : "classes"}`;
            heading.append(label, dateText, quantity);
            button.append(heading);

            if (dayClasses.length) {
                const nextClass = document.createElement("span");
                nextClass.className = "upcoming-next-class";
                nextClass.textContent = `${formatTime(dayClasses[0].start)} \u00B7 ${dayClasses[0].name}`;
                button.append(nextClass);
            } else {
                const noClasses = document.createElement("span");
                noClasses.className = "upcoming-next-class muted";
                noClasses.textContent = "No classes planned";
                button.append(noClasses);
            }

            button.addEventListener("click", () => {
                selected.setTime(date.getTime());
                render();
                document.querySelector(".schedule-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
            });
            upcomingList.append(button);
        }
        const heading = document.createElement("h2");
        heading.textContent = "Coming up";
        const description = document.createElement("p");
        description.className = "upcoming-description";
        description.textContent = "A quick look at the next two days. Select a day to view its timetable.";
        upcoming.replaceChildren(heading, description, upcomingList);
    }
})();