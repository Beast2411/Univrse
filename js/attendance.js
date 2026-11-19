const API = "http://localhost:5000/api";
const TARGET_KEY = "univrse.minimumAttendance";
const DEFAULT_TARGET = 85;
const COLORS = ["#6657e8", "#2f9e77", "#e19736", "#4b8fd1", "#d45d79", "#8b68c7", "#2caaa8", "#bd7848"];

const $ = id => document.getElementById(id);
const ids = [
    "overallAttendance","overallStatus","classesAttended","classesAttendedTotal","classesMissed",
    "classesMissedPercentage","atRiskSubjects","weeklyClasses","weeklyTotal","subjectList",
    "subjectSearch","attendanceSearchForm","attendanceSearchResults","noSearchResults",
    "attendanceApiStatus",
    "addSubjectForm","newSubjectName","newSubjectCode","newSubjectAttended","newSubjectTotal",
    "addSubjectStatus","calculatorSubject","calculatorResult","minimumAttendanceInput",
    "resetAttendanceTarget","attendanceTargetStatus","insightHeading","insightMessage",
    "subjectAttendancePie","subjectAttendanceLegend","minimumRequirement","attendanceBuffer",
    "recentAttendance","attendanceSubjectFilter","attendanceStatusFilter"
];
const el = Object.fromEntries(ids.map(id => [id, $(id)]));

let subjects = [];
let target = DEFAULT_TARGET;
let online = false;
let weeklyRecords = [];
let recentRecords = [];

const integer = (value, positive = false) =>
    Number.isInteger(value) && (positive ? value > 0 : value >= 0);
const percent = value => `${Number.isFinite(value) ? value.toFixed(1) : "0.0"}%`;

function message(container, text, className = "") {
    container.replaceChildren();
    const p = document.createElement("p");
    p.textContent = text;
    if (className) p.className = className;
    container.appendChild(p);
}

async function api(path, options = {}) {
    let response;
    try {
        response = await fetch(API + path, {
            ...options,
            headers: {
                Accept: "application/json",
                ...(options.body ? {"Content-Type": "application/json"} : {}),
                ...(options.headers || {})
            }
        });
    } catch {
        throw new Error("Cannot connect to the attendance API at http://localhost:5000/api.");
    }

    const text = await response.text();
    let data = null;
    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            throw new Error("The attendance API returned a non-JSON response.");
        }
    }
    if (!response.ok) {
        throw new Error(data?.message || data?.error || `Attendance API request failed (HTTP ${response.status}).`);
    }
    return data;
}

function normalize(payload, allowOffline = false) {
    const records = Array.isArray(payload)
        ? payload
        : payload?.subjects || payload?.attendance || payload?.records || payload?.data;
    if (!Array.isArray(records)) throw new Error("The attendance API did not return a valid subjects list.");

    return records.map(record => {
        const name = record.subject ?? record.name;
        const attended = record.attendedClasses ?? record.attended;
        const total = record.totalClasses ?? record.total;
        const id = record._id ?? record.id;
        if ((!allowOffline && !id) || typeof name !== "string" || !name.trim()
            || !integer(attended) || !integer(total, true) || attended > total) {
            throw new Error("The attendance API returned an invalid subject record.");
        }

        const components = [];
        if (record.theory && integer(record.theory.attended) && integer(record.theory.total, true)) {
            components.push({name: "Theory", ...record.theory});
        }
        if ((record.practical || record.lab) &&
            integer((record.practical || record.lab).attended) &&
            integer((record.practical || record.lab).total, true)) {
            components.push({name: "Practical / Lab", ...(record.practical || record.lab)});
        }

        if (!components.length) {
            const theoryPerWeek = integer(record.theoryPerWeek) ? record.theoryPerWeek : 0;
            const practicalPerWeek = integer(record.practicalPerWeek) ? record.practicalPerWeek : 0;
            const weekly = theoryPerWeek + practicalPerWeek;
            if (weekly > 0) {
                const theoryTotal = practicalPerWeek ? Math.round(total * theoryPerWeek / weekly) : total;
                const theoryAttended = practicalPerWeek ? Math.min(theoryTotal, Math.round(attended * theoryPerWeek / weekly)) : attended;
                if (theoryTotal > 0) components.push({name: "Theory", attended: theoryAttended, total: theoryTotal});
                const practicalTotal = total - theoryTotal;
                if (practicalPerWeek > 0 && practicalTotal > 0) {
                    components.push({name: "Practical / Lab", attended: attended - theoryAttended, total: practicalTotal});
                }
            }
        }

        return {
            id: id ? String(id) : null,
            name: name.trim(),
            code: String(record.subjectCode ?? record.code ?? ""),
            attended,
            total,
            theoryPerWeek: integer(record.theoryPerWeek) ? record.theoryPerWeek : 0,
            practicalPerWeek: integer(record.practicalPerWeek) ? record.practicalPerWeek : components.length > 1 ? 1 : 0,
            components,
            image: typeof record.image === "string" ? record.image : ""
        };
    });
}

function renderSummary() {
    const attended = subjects.reduce((sum, item) => sum + item.attended, 0);
    const total = subjects.reduce((sum, item) => sum + item.total, 0);
    const missed = total - attended;
    const overall = total ? attended / total * 100 : 0;
    const buffer = overall - target;

    el.overallAttendance.textContent = total ? percent(overall) : "Unavailable";
    el.overallStatus.textContent = `${buffer > 0 ? "Above" : buffer < 0 ? "Below" : "At"} ${percent(target)} minimum`;
    el.classesAttended.textContent = attended;
    el.classesAttendedTotal.textContent = `Out of ${total} classes`;
    el.classesMissed.textContent = missed;
    el.classesMissedPercentage.textContent = `${percent(total ? missed / total * 100 : 0)} of total classes`;

    el.atRiskSubjects.replaceChildren();
    const risk = subjects.filter(item => item.attended / item.total * 100 < target);
    if (!subjects.length) message(el.atRiskSubjects, "No subjects available.");
    else if (!risk.length) message(el.atRiskSubjects, "All subjects meet the minimum requirement.");
    else risk.forEach(item => {
        const p = document.createElement("p");
        p.className = "red";
        p.textContent = `${item.name} · ${percent(item.attended / item.total * 100)}`;
        el.atRiskSubjects.appendChild(p);
    });

    renderChart();
    el.insightHeading.textContent = buffer > 0
        ? "Your attendance is on track."
        : buffer < 0 ? "Your attendance is below the minimum." : "Your attendance meets the minimum.";
    el.insightMessage.textContent = `Your overall attendance is ${Math.abs(buffer).toFixed(1)} percentage points ${buffer >= 0 ? "above" : "below"} the minimum.`;
    el.minimumRequirement.textContent = `Minimum attendance required: ${percent(target)}`;
    el.attendanceBuffer.textContent = `${buffer > 0 ? "Buffer above minimum" : buffer < 0 ? "Buffer below minimum" : "Buffer at minimum"}: ${buffer === 0 ? "" : buffer > 0 ? "+" : "-"}${Math.abs(buffer).toFixed(1)} percentage points`;
}

function renderChart() {
    const attended = subjects.reduce((sum, item) => sum + item.attended, 0);
    let start = 0;
    const segments = subjects.map((item, index) => {
        const end = start + (attended ? item.attended / attended * 100 : 0);
        const segment = `${COLORS[index % COLORS.length]} ${start.toFixed(3)}% ${end.toFixed(3)}%`;
        start = end;
        return {item, segment, color: COLORS[index % COLORS.length]};
    });

    el.subjectAttendancePie.style.background = attended
        ? `conic-gradient(${segments.map(item => item.segment).join(", ")})`
        : "#e7e8ed";
    el.subjectAttendancePie.setAttribute("aria-label", subjects.map(item =>
        `${item.name}: ${percent(item.attended / item.total * 100)} attendance`
    ).join(". "));
    el.subjectAttendanceLegend.replaceChildren();

    segments.forEach(({item, color}) => {
        const li = document.createElement("li");
        const swatch = document.createElement("span");
        swatch.className = "subject-attendance-swatch";
        swatch.style.backgroundColor = color;
        const name = document.createElement("span");
        name.className = "subject-attendance-label";
        name.textContent = item.name;
        const value = document.createElement("b");
        value.textContent = percent(item.attended / item.total * 100);
        li.append(swatch, name, value);
        el.subjectAttendanceLegend.appendChild(li);
    });
}

function action(text, className, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = text;
    button.onclick = handler;
    return button;
}

function renderSubjects() {
    el.subjectList.replaceChildren();
    subjects.forEach(item => {
        const value = item.attended / item.total * 100;
        const risk = value < target;
        const entry = document.createElement("div");
        entry.className = "subject-entry";
        entry.dataset.name = item.name;
        entry.dataset.code = item.code;
        entry.appendChild(document.createElement("hr"));

        const box = document.createElement("div");
        box.className = risk ? "subject-box below-minimum" : "subject-box";
        if (item.image) {
            const image = document.createElement("img");
            image.src = item.image;
            image.alt = item.name;
            image.className = "subject-image";
            image.loading = "lazy";
            box.appendChild(image);
        }
        const name = document.createElement("h3");
        name.textContent = item.name;
        box.appendChild(name);
        if (item.code) {
            const code = document.createElement("p");
            code.textContent = item.code;
            box.appendChild(code);
        }
        item.components.forEach(component => {
            const p = document.createElement("p");
            p.textContent = `${component.name}: ${component.attended} attended · ${component.total} total`;
            box.appendChild(p);
        });
        const counts = document.createElement("p");
        counts.textContent = `${item.attended} attended · ${item.total} total classes`;
        box.appendChild(counts);
        const valueLabel = document.createElement("b");
        valueLabel.textContent = percent(value);
        box.appendChild(valueLabel);
        if (risk) {
            const warning = document.createElement("p");
            warning.className = "attendance-status";
            warning.textContent = `Below ${percent(target)} minimum`;
            box.appendChild(warning);
        }
        const progress = document.createElement("div");
        progress.className = "progress";
        progress.setAttribute("role", "progressbar");
        progress.setAttribute("aria-valuemin", "0");
        progress.setAttribute("aria-valuemax", "100");
        progress.setAttribute("aria-valuenow", value.toFixed(1));
        const bar = document.createElement("div");
        bar.className = risk ? "bar below-minimum" : "bar";
        bar.style.width = `${value}%`;
        progress.appendChild(bar);
        box.appendChild(progress);

        const actions = document.createElement("div");
        actions.className = "subject-actions";
        actions.append(
            action("Present", "mark-attendance-button", () => mark(item, "Present")),
            action("Absent", "mark-attendance-button", () => mark(item, "Absent")),
            action("Edit", "edit-subject-button", () => edit(item)),
            action("Remove", "remove-subject-button", () => removeSubject(item))
        );
        if (!online) actions.querySelectorAll("button").forEach(button => button.disabled = true);
        box.appendChild(actions);
        entry.appendChild(box);
        el.subjectList.appendChild(entry);
    });
    if (!subjects.length) message(el.subjectList, "No subject attendance records are available.");
}

async function mark(item, status) {
    if (!online) {
        el.addSubjectStatus.textContent = "MongoDB is unavailable. Start the common backend on port 5000 before marking attendance.";
        return;
    }
    el.addSubjectStatus.textContent = `Marking ${item.name} ${status.toLowerCase()}...`;
    try {
        await api(`/attendance/${encodeURIComponent(item.id)}/mark`, {
            method: "PATCH",
            body: JSON.stringify({status})
        });
        await load();
        el.addSubjectStatus.textContent = `${item.name} marked ${status}.`;
    } catch (error) {
        el.addSubjectStatus.textContent = error.message;
    }
}

async function edit(item) {
    if (!online) {
        el.addSubjectStatus.textContent = "MongoDB is unavailable. Start the common backend on port 5000 before editing.";
        return;
    }
    const name = prompt("Subject name:", item.name);
    if (name === null) return;
    const attendedText = prompt("Attended classes:", String(item.attended));
    if (attendedText === null) return;
    const totalText = prompt("Total classes:", String(item.total));
    if (totalText === null) return;
    const attended = Number(attendedText);
    const total = Number(totalText);
    if (!name.trim() || !integer(attended) || !integer(total, true) || attended > total) {
        el.addSubjectStatus.textContent = "Update failed: enter a name and valid class counts.";
        return;
    }
    try {
        await api(`/attendance/${encodeURIComponent(item.id)}`, {
            method: "PUT",
            body: JSON.stringify({
                subject: name.trim(),
                subjectCode: item.code,
                totalClasses: total,
                attendedClasses: attended
            })
        });
        await load();
        el.addSubjectStatus.textContent = `${name.trim()} was updated.`;
    } catch (error) {
        el.addSubjectStatus.textContent = error.message;
    }
}

async function removeSubject(item) {
    if (!online) {
        el.addSubjectStatus.textContent = "MongoDB is unavailable. Start the common backend on port 5000 before deleting.";
        return;
    }
    if (!confirm(`Delete ${item.name}?`)) return;
    try {
        await api(`/attendance/${encodeURIComponent(item.id)}`, {method: "DELETE"});
        await load();
        el.addSubjectStatus.textContent = `${item.name} was deleted.`;
    } catch (error) {
        el.addSubjectStatus.textContent = error.message;
    }
}

async function addSubject(event) {
    event.preventDefault();
    if (!online) {
        el.addSubjectStatus.textContent = "MongoDB is unavailable. Start the common backend on port 5000 before adding a subject.";
        return;
    }
    const name = el.newSubjectName.value.trim();
    const code = el.newSubjectCode.value.trim();
    const attended = Number(el.newSubjectAttended.value);
    const total = Number(el.newSubjectTotal.value);
    if (!name || !integer(attended) || !integer(total, true) || attended > total) {
        el.addSubjectStatus.textContent = "Enter a subject name and valid class counts.";
        return;
    }
    if (subjects.some(item => item.name.toLowerCase() === name.toLowerCase())) {
        el.addSubjectStatus.textContent = "A subject with that name already exists.";
        el.newSubjectName.focus();
        return;
    }
    try {
        await api("/attendance", {
            method: "POST",
            body: JSON.stringify({
                subject: name,
                subjectCode: code,
                totalClasses: total,
                attendedClasses: attended
            })
        });
        el.addSubjectForm.reset();
        await load();
        el.addSubjectStatus.textContent = `${name} was added.`;
    } catch (error) {
        el.addSubjectStatus.textContent = error.message;
    }
}

function renderCalculator() {
    el.calculatorSubject.replaceChildren();
    const options = [];
    subjects.forEach(item => {
        options.push({
            label: item.practicalPerWeek ? `${item.name} — Overall` : item.name,
            attended: item.attended,
            total: item.total
        });
        item.components.forEach(component => options.push({
            label: `${item.name} — ${component.name}`,
            attended: component.attended,
            total: component.total
        }));
    });
    options.forEach((option, index) => {
        const element = document.createElement("option");
        element.value = String(index);
        element.textContent = option.label;
        el.calculatorSubject.appendChild(element);
    });
    el.calculatorSubject.disabled = !options.length;
    el.calculatorSubject._options = options;
    updateCalculator();
}

function updateCalculator() {
    const options = el.calculatorSubject._options || [];
    const option = options[Number(el.calculatorSubject.value)];
    if (!option) {
        el.calculatorResult.textContent = "Select a subject to calculate attendance.";
        return;
    }
    if (!option.total) {
        el.calculatorResult.textContent = "There are no recorded classes for this class type yet.";
        return;
    }

    const minimum = target / 100;
    const current = option.attended / option.total;
    if (current >= minimum) {
        if (!minimum) {
            el.calculatorResult.textContent = `Your attendance is ${percent(current * 100)}. There is no minimum requirement.`;
            return;
        }
        const miss = Math.floor((option.attended - minimum * option.total) / minimum + 1e-10);
        el.calculatorResult.textContent = miss
            ? `Your attendance is ${percent(current * 100)}. You can miss ${miss} consecutive ${miss === 1 ? "class" : "classes"} and stay at or above ${percent(target)}.`
            : `Your attendance is ${percent(current * 100)}. You cannot miss another class and stay at or above ${percent(target)}.`;
        return;
    }
    if (minimum === 1) {
        el.calculatorResult.textContent = `Your attendance is ${percent(current * 100)}. Attending future classes alone cannot bring it to ${percent(target)}.`;
        return;
    }
    const required = Math.ceil((minimum * option.total - option.attended) / (1 - minimum) - 1e-10);
    el.calculatorResult.textContent = `Your attendance is ${percent(current * 100)}. Attend ${required} consecutive ${required === 1 ? "class" : "classes"} to reach at least ${percent(target)}.`;
}

function refresh() {
    renderSummary();
    renderSubjects();
    renderCalculator();
    renderRecent();
    filterSubjects();
}

function setupTarget() {
    let saved = DEFAULT_TARGET;
    try {
        const value = Number(localStorage.getItem(TARGET_KEY));
        if (Number.isFinite(value) && value >= 0 && value <= 100) saved = value;
    } catch {}
    target = saved;
    el.minimumAttendanceInput.value = String(target);
    el.minimumAttendanceInput.disabled = false;
    el.resetAttendanceTarget.disabled = false;
    el.attendanceTargetStatus.textContent = `Using ${percent(target)} target.`;
    el.minimumAttendanceInput.oninput = () => {
        const value = Number(el.minimumAttendanceInput.value);
        const valid = el.minimumAttendanceInput.value !== "" && Number.isFinite(value) && value >= 0 && value <= 100;
        el.minimumAttendanceInput.setAttribute("aria-invalid", String(!valid));
        if (!valid) {
            el.attendanceTargetStatus.textContent = "Enter a target between 0% and 100%.";
            return;
        }
        target = value;
        localStorage.setItem(TARGET_KEY, String(value));
        el.attendanceTargetStatus.textContent = `Using ${percent(value)} target.`;
        refresh();
    };
    el.resetAttendanceTarget.onclick = () => {
        target = DEFAULT_TARGET;
        el.minimumAttendanceInput.value = String(target);
        el.minimumAttendanceInput.setAttribute("aria-invalid", "false");
        localStorage.setItem(TARGET_KEY, String(target));
        el.attendanceTargetStatus.textContent = `Using the default ${percent(DEFAULT_TARGET)} target.`;
        refresh();
    };
    el.calculatorSubject.onchange = updateCalculator;
}

function renderWeekly() {
    el.weeklyClasses.replaceChildren();
    if (weeklyRecords.length) {
        let total = 0;
        weeklyRecords.forEach(item => {
            const row = document.createElement("p");
            row.textContent = item.day;
            const count = document.createElement("span");
            count.textContent = `${item.classes} ${item.classes === 1 ? "class" : "classes"}`;
            row.appendChild(count);
            el.weeklyClasses.appendChild(row);
            total += item.classes;
        });
        el.weeklyTotal.textContent = `${total} classes`;
        return;
    }
    message(el.weeklyClasses, "Weekly class counts are not available from the attendance API.");
    el.weeklyTotal.textContent = "Unavailable";
}

function renderRecent() {
    el.recentAttendance.replaceChildren();
    el.attendanceSubjectFilter.replaceChildren();
    const all = document.createElement("option");
    all.value = "";
    all.textContent = "All subjects";
    el.attendanceSubjectFilter.appendChild(all);
    subjects.forEach(item => {
        const option = document.createElement("option");
        option.value = item.name;
        option.textContent = item.name;
        el.attendanceSubjectFilter.appendChild(option);
    });
    el.attendanceStatusFilter.disabled = false;
    if (!recentRecords.length) {
        message(el.recentAttendance, "Date-wise attendance history is unavailable. The subject-level API does not provide recent attendance records.");
        return;
    }

    const table = document.createElement("table");
    table.className = "recent-attendance-table";
    table.innerHTML = "<thead><tr><th>Subject / class</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>";
    const body = document.createElement("tbody");
    recentRecords.forEach(record => {
        const row = document.createElement("tr");
        [record.subject, record.date, record.time].forEach(value => {
            const cell = document.createElement(row.parentElement ? "td" : "td");
            cell.textContent = value;
            row.appendChild(cell);
        });
        const statusCell = document.createElement("td");
        const status = document.createElement("span");
        status.className = `attendance-record-status ${record.status.toLowerCase()}`;
        status.textContent = record.status;
        statusCell.appendChild(status);
        row.appendChild(statusCell);
        body.appendChild(row);
    });
    table.appendChild(body);
    el.recentAttendance.appendChild(table);
}

function filterSubjects() {
    const query = el.subjectSearch.value.trim().toLowerCase();
    const absent = /\b(absent|absence|absences|missed|missing)\b/.test(query);
    const present = /\b(present|attended|attend|appeared)\b/.test(query);
    const practical = /\b(practical|lab|labs)\b/.test(query);
    let matches = 0;

    el.subjectList.querySelectorAll(".subject-entry").forEach(entry => {
        const item = subjects.find(subject => subject.name === entry.dataset.name);
        const found = !query
            || entry.dataset.name.toLowerCase().includes(query)
            || entry.dataset.code.toLowerCase().includes(query)
            || absent
            || present
            || (practical && item?.practicalPerWeek > 0);
        entry.hidden = !found;
        if (found) matches++;
    });
    el.noSearchResults.hidden = !query || absent || present || practical || matches > 0;
}

function renderError(text) {
    el.overallAttendance.textContent = "Unavailable";
    el.overallStatus.textContent = text;
    el.classesAttended.textContent = "—";
    el.classesAttendedTotal.textContent = "Class totals unavailable";
    el.classesMissed.textContent = "—";
    el.classesMissedPercentage.textContent = "Class totals unavailable";
    message(el.atRiskSubjects, "Subject status is unavailable.");
    message(el.weeklyClasses, "Weekly class counts are unavailable.");
    el.weeklyTotal.textContent = "Unavailable";
    message(el.subjectList, text, "red");
    el.insightHeading.textContent = "Attendance insight unavailable.";
    el.insightMessage.textContent = text;
    el.subjectAttendancePie.style.background = "";
    el.subjectAttendanceLegend.replaceChildren();
    el.minimumRequirement.textContent = "Minimum attendance requirement unavailable.";
    el.attendanceBuffer.textContent = "Attendance buffer unavailable.";
    message(el.recentAttendance, "Recent attendance records are unavailable.");
    el.calculatorSubject.disabled = true;
    el.calculatorResult.textContent = "Attendance calculator is unavailable.";
}

async function load() {
    try {
        const payload = await api("/attendance");
        subjects = normalize(payload);
        weeklyRecords = Array.isArray(payload?.weeklyClasses) ? payload.weeklyClasses : [];
        recentRecords = Array.isArray(payload?.recentAttendance) ? payload.recentAttendance : [];
        online = true;
        el.attendanceApiStatus.textContent = "Attendance API connected.";
        el.attendanceApiStatus.className = "attendance-api-status";
        refresh();
    } catch (error) {
        online = false;
        try {
            const response = await fetch("./data/Attendance.json");
            if (!response.ok) throw new Error(`Offline data could not be loaded (HTTP ${response.status}).`);
            const snapshot = await response.json();
            subjects = normalize(snapshot, true);
            target = Number(snapshot.minimumAttendance) === 85 ? 85 : DEFAULT_TARGET;
            weeklyRecords = Array.isArray(snapshot.weeklyClasses) ? snapshot.weeklyClasses : [];
            recentRecords = Array.isArray(snapshot.recentAttendance) ? snapshot.recentAttendance : [];
            el.attendanceApiStatus.textContent = "Offline mode: showing saved Attendance.json data. MongoDB operations are unavailable.";
            el.attendanceApiStatus.className = "attendance-api-status offline";
            refresh();
        } catch (offlineError) {
            subjects = [];
            weeklyRecords = [];
            recentRecords = [];
            el.attendanceApiStatus.textContent = "Attendance API unavailable.";
            el.attendanceApiStatus.className = "attendance-api-status error";
            console.error("Attendance error:", error);
            renderError(error instanceof Error ? error.message : "Attendance data could not be loaded.");
        }
    }
}

function initialize() {
    setupTarget();
    renderWeekly();
    el.addSubjectForm.addEventListener("submit", addSubject);
    el.subjectSearch.addEventListener("input", filterSubjects);
    el.attendanceSearchForm.addEventListener("submit", event => {
        event.preventDefault();
        filterSubjects();
        el.subjectList.parentElement.scrollIntoView({
            behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
            block: "start"
        });
    });
    load();
}

initialize();
