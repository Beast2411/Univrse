(() => {
    const timetableUrl = new URL("data/timetable.json", document.baseURI);
    const today = new Date();
    const dayName = new Intl.DateTimeFormat("en", { weekday: "long" }).format(today);
    const classes = document.querySelector(".schedule-card");
    const set = (selector, value) => {
        const node = document.querySelector(selector);
        if (node) node.textContent = value;
    };
    const formatTime = (value) => new Date(`2000-01-01T${value}:00`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

    const greeting = today.getHours() < 12 ? "Good morning" : today.getHours() < 18 ? "Good afternoon" : "Good evening";
    set(".greeting h1", `${greeting}, Aarush 👋`);
    set(".date strong", today.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" }));
    set(".date span", "Your timetable");
    set(".schedule-card .section-title p", `${dayName} · Loading classes…`);

    async function fetchTimetable() {
        const response = await fetch(timetableUrl);
        if (!response.ok) throw new Error(`Timetable request failed (${response.status})`);
        return response.json();
    }

    fetchTimetable()
        .then((timetable) => {
            const dayClasses = timetable[dayName] || [];
            const now = today.getHours() * 60 + today.getMinutes();
            const upcoming = dayClasses.find((item) => {
                const [hour, minute] = item.start.split(":").map(Number);
                return hour * 60 + minute > now;
            });
            const current = dayClasses.find((item) => {
                const [startHour, startMinute] = item.start.split(":").map(Number);
                const [endHour, endMinute] = item.end.split(":").map(Number);
                return now >= startHour * 60 + startMinute && now < endHour * 60 + endMinute;
            });
            const next = current || upcoming;
            set(".greeting p", dayClasses.length ? `You have ${dayClasses.length} ${dayClasses.length === 1 ? "class" : "classes"} today. Here’s what’s on your timetable.` : "You have no classes scheduled today. Enjoy the extra time.");
            set(".ai-card > p", dayClasses.length ? `You have ${dayClasses.length} ${dayClasses.length === 1 ? "class" : "classes"} on your timetable today.` : "There are no classes on your timetable today.");
            set(".next-class strong", next ? next.name : "No upcoming classes");
            set(".next-class span", next ? `${formatTime(next.start)} · ${next.room}` : "Enjoy the rest of your day");
            set(".stats .card:last-child h2", next ? formatTime(next.start) : "—");
            set(".stats .card:last-child p", next ? next.name : "No upcoming classes");
            set(".schedule-card .section-title p", `${dayName} · ${dayClasses.length} ${dayClasses.length === 1 ? "class" : "classes"}`);

            if (!classes) return;
            classes.querySelectorAll(":scope > .schedule-item").forEach((item) => item.remove());
            if (!dayClasses.length) {
                const empty = document.createElement("p");
                empty.className = "schedule-empty";
                empty.textContent = "No classes scheduled for today.";
                classes.append(empty);
                return;
            }
            dayClasses.forEach((item) => {
                const [startHour, startMinute] = item.start.split(":").map(Number);
                const [endHour, endMinute] = item.end.split(":").map(Number);
                const isCurrent = current === item;
                const isDone = now >= endHour * 60 + endMinute;
                const row = document.createElement("div");
                row.className = `schedule-item${isCurrent ? " current" : ""}`;
                const time = document.createElement("span");
                time.className = "time";
                time.textContent = item.start;
                const detail = document.createElement("div");
                const title = document.createElement("h3");
                title.textContent = item.name;
                const subtitle = document.createElement("p");
                subtitle.textContent = [item.instructor, item.room].filter(Boolean).join(" · ");
                detail.append(title, subtitle);
                const status = document.createElement("span");
                status.className = `status ${isCurrent ? "now" : isDone ? "done" : ""}`;
                status.textContent = isCurrent ? "In progress" : isDone ? "Completed" : formatTime(item.end);
                row.append(time, detail, status);
                classes.append(row);
            });
        })
        .catch((error) => {
            console.error("Unable to load timetable:", error);
            set(".greeting p", "Your timetable could not be loaded. Please try again later.");
            set(".ai-card > p", "Timetable unavailable.");
            set(".schedule-card .section-title p", `${dayName} · Schedule unavailable`);
            set(".next-class strong", "Schedule unavailable");
            set(".next-class span", "Please try again later");
            const card = document.querySelector(".schedule-card");
            if (card) {
                card.querySelectorAll(":scope > .schedule-item").forEach((item) => item.remove());
                const errorState = document.createElement("p");
                errorState.className = "schedule-error";
                errorState.textContent = "We couldn't load today's schedule.";
                card.append(errorState);
            }
        });
})();
