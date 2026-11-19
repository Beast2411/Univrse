const TARGET_KEY = "univrse.minimumAttendance.v2";
const DEFAULT_TARGET = 75;
const COLORS = ["#6657e8", "#2f9e77", "#e19736", "#4b8fd1", "#d45d79", "#8b68c7", "#2caaa8", "#bd7848"];

const $ = id => document.getElementById(id);
const ids = [
    "overallAttendance","overallStatus","classesAttended","classesAttendedTotal","classesMissed",
    "classesMissedPercentage","atRiskSubjects","weeklyClasses","weeklyTotal","subjectList",
    "subjectSearch","attendanceSearchForm","attendanceSearchResults","noSearchResults",
    "attendanceApiStatus","attendanceActionStatus",
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
const attendanceRate = item => item.total ? item.attended / item.total * 100 : 0;

function message(container, text, className = "") {
    container.replaceChildren();
    const p = document.createElement("p");
    p.textContent = text;
    if (className) p.className = className;
    container.appendChild(p);
}

function normalize(payload) {
    const records = Array.isArray(payload)
        ? payload
        : payload?.subjects || payload?.attendance || payload?.records || payload?.data;
    if (!Array.isArray(records)) throw new Error("The attendance API did not return a valid subjects list.");

    return records.map(record => {
        const name = record.subject ?? record.name;
        const attended = record.attendedClasses ?? record.attended;
        const total = record.totalClasses ?? record.total;
        const id = record._id ?? record.id;
        if (!id || typeof name !== "string" || !name.trim()
            || !integer(attended) || !integer(total) || attended > total) {
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
    el.overallStatus.textContent = total
        ? `${buffer > 0 ? "Above" : buffer < 0 ? "Below" : "At"} ${percent(target)} minimum`
        : "No attendance classes recorded yet.";
    el.classesAttended.textContent = attended;
    el.classesAttendedTotal.textContent = `Out of ${total} classes`;
    el.classesMissed.textContent = missed;
    el.classesMissedPercentage.textContent = `${percent(total ? missed / total * 100 : 0)} of total classes`;

    el.atRiskSubjects.replaceChildren();
    const recordedSubjects = subjects.filter(item => item.total > 0);
    const risk = recordedSubjects.filter(item => attendanceRate(item) < target);
    if (!subjects.length) message(el.atRiskSubjects, "No subjects available.");
    else if (!recordedSubjects.length) message(el.atRiskSubjects, "No attendance classes recorded yet.");
    else if (!risk.length) message(el.atRiskSubjects, "All subjects with recorded classes meet the minimum requirement.");
    else risk.forEach(item => {
        const p = document.createElement("p");
        p.className = "red";
        p.textContent = `${item.name} · ${percent(attendanceRate(item))}`;
        el.atRiskSubjects.appendChild(p);
    });

    renderChart();
    el.insightHeading.textContent = total
        ? buffer > 0
            ? "Your attendance is on track."
            : buffer < 0 ? "Your attendance is below the minimum." : "Your attendance meets the minimum."
        : "No attendance recorded yet.";
    el.insightMessage.textContent = total
        ? `Your overall attendance is ${Math.abs(buffer).toFixed(1)} percentage points ${buffer >= 0 ? "above" : "below"} the minimum.`
        : "Record attendance for a class to see your attendance insight.";
    el.minimumRequirement.textContent = `Minimum attendance required: ${percent(target)}`;
    el.attendanceBuffer.textContent = total
        ? `${buffer > 0 ? "Buffer above minimum" : buffer < 0 ? "Buffer below minimum" : "Buffer at minimum"}: ${buffer === 0 ? "" : buffer > 0 ? "+" : "-"}${Math.abs(buffer).toFixed(1)} percentage points`
        : "Attendance buffer unavailable until classes are recorded.";
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
        `${item.name}: ${percent(attendanceRate(item))} attendance`
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
        value.textContent = percent(attendanceRate(item));
        li.append(swatch, name, value);
        el.subjectAttendanceLegend.appendChild(li);
    });
}

function action(text, className, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = text;
    button.onclick = async () => {
        button.disabled = true;
        try {
            await handler();
        } finally {
            if (button.isConnected) button.disabled = !online;
        }
    };
    return button;
}

function renderSubjects() {
    el.subjectList.replaceChildren();
    subjects.forEach(item => {
        const value = attendanceRate(item);
        const risk = item.total > 0 && value < target;
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
        el.attendanceActionStatus.textContent = "The attendance API is unavailable. Reconnect before marking attendance.";
        return;
    }
    el.attendanceActionStatus.textContent = `Marking ${item.name} ${status.toLowerCase()}...`;
    try {
        await window.attendanceApi.mark(item.id, status === "Present");
        const refreshed = await load();
        el.attendanceActionStatus.textContent = refreshed
            ? `${item.name} marked ${status}.`
            : `${item.name} was marked, but the updated attendance could not be reloaded.`;
    } catch (error) {
        el.attendanceActionStatus.textContent = error.message;
    }
}

async function edit(item) {
    if (!online) {
        el.attendanceActionStatus.textContent = "The attendance API is unavailable. Reconnect before editing.";
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
        el.attendanceActionStatus.textContent = "Update failed: enter a name and valid class counts.";
        return;
    }
    try {
        await window.attendanceApi.update(item.id, {
            subject: name.trim(),
            subjectCode: item.code,
            totalClasses: total,
            attendedClasses: attended
        });
        const refreshed = await load();
        el.attendanceActionStatus.textContent = refreshed
            ? `${name.trim()} was updated.`
            : `${name.trim()} was updated, but the latest data could not be reloaded.`;
    } catch (error) {
        el.attendanceActionStatus.textContent = error.message;
    }
}

async function removeSubject(item) {
    if (!online) {
        el.attendanceActionStatus.textContent = "The attendance API is unavailable. Reconnect before deleting.";
        return;
    }
    if (!confirm(`Delete ${item.name}?`)) return;
    try {
        await window.attendanceApi.remove(item.id);
        const refreshed = await load();
        el.attendanceActionStatus.textContent = refreshed
            ? `${item.name} was deleted.`
            : `${item.name} was deleted, but the latest data could not be reloaded.`;
    } catch (error) {
        el.attendanceActionStatus.textContent = error.message;
    }
}

async function addSubject(event) {
    event.preventDefault();
    if (!online) {
        el.addSubjectStatus.textContent = "The attendance API is unavailable. Reconnect before adding a subject.";
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
        await window.attendanceApi.create({
            subject: name,
            subjectCode: code,
            totalClasses: total,
            attendedClasses: attended
        });
        el.addSubjectForm.reset();
        const refreshed = await load();
        el.addSubjectStatus.textContent = refreshed
            ? `${name} was added.`
            : `${name} was added, but the latest data could not be reloaded.`;
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
    renderWeekly();
    renderRecent();
    filterSubjects();
}

function setupTarget() {
    let saved = DEFAULT_TARGET;
    try {
        let stored = localStorage.getItem(TARGET_KEY);
        if (stored === null) {
            const previous = localStorage.getItem("univrse.minimumAttendance");
            if (previous !== null && Number(previous) > 0) stored = previous;
        }
        const value = stored === null ? DEFAULT_TARGET : Number(stored);
        if (Number.isFinite(value) && value >= 0 && value <= 100) saved = value;
    } catch (error) {
        console.warn("Could not read the saved attendance target:", error);
    }
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
        el.attendanceTargetStatus.textContent = saveTarget(value)
            ? `Using ${percent(value)} target.`
            : `Using ${percent(value)} target for this session; it could not be saved.`;
        refresh();
    };
    el.resetAttendanceTarget.onclick = () => {
        target = DEFAULT_TARGET;
        el.minimumAttendanceInput.value = String(target);
        el.minimumAttendanceInput.setAttribute("aria-invalid", "false");
        el.attendanceTargetStatus.textContent = saveTarget(target)
            ? `Using the default ${percent(DEFAULT_TARGET)} target.`
            : `Using the default ${percent(DEFAULT_TARGET)} target for this session; it could not be saved.`;
        refresh();
    };
    el.calculatorSubject.onchange = updateCalculator;
}

function saveTarget(value) {
    try {
        localStorage.setItem(TARGET_KEY, String(value));
        return true;
    } catch (error) {
        console.warn("Could not save the attendance target:", error);
        return false;
    }
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
    const selectedSubject = el.attendanceSubjectFilter.value;
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
    el.attendanceSubjectFilter.value = selectedSubject;
    el.attendanceSubjectFilter.onchange = renderRecent;
    el.attendanceStatusFilter.onchange = renderRecent;
    const rows = recentRecords.filter(record =>
        (!el.attendanceSubjectFilter.value || record.subject === el.attendanceSubjectFilter.value)
        && (!el.attendanceStatusFilter.value || record.status === el.attendanceStatusFilter.value)
    );
    if (!recentRecords.length) {
        message(el.recentAttendance, "Date-wise attendance history is unavailable. The subject-level API does not provide recent attendance records.");
        return;
    }
    if (!rows.length) {
        message(el.recentAttendance, "No attendance records match these filters.");
        return;
    }

    const table = document.createElement("table");
    table.className = "recent-attendance-table";
    const head = document.createElement("thead");
    const header = document.createElement("tr");
    ["Subject / class", "Date", "Time", "Status"].forEach(label => {
        const cell = document.createElement("th");
        cell.scope = "col";
        cell.textContent = label;
        header.appendChild(cell);
    });
    head.appendChild(header);
    const body = document.createElement("tbody");
    rows.forEach(record => {
        const row = document.createElement("tr");
        [record.subject, record.date, record.time].forEach((value, index) => {
            const cell = document.createElement(index === 0 ? "th" : "td");
            if (index === 0) cell.scope = "row";
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
    table.append(head, body);
    el.recentAttendance.appendChild(table);
}

function filterSubjects() {
    const query = el.subjectSearch.value.trim().toLowerCase();
    const absent = /\b(absent|absence|absences|missed|missing)\b/.test(query);
    const present = /\b(present|attended|attend|appeared)\b/.test(query);
    const practical = /\b(practical|lab|labs)\b/.test(query);
    const theory = /\b(theory|lecture|lectures)\b/.test(query);
    let matches = 0;

    el.subjectList.querySelectorAll(".subject-entry").forEach(entry => {
        const item = subjects.find(subject => subject.name === entry.dataset.name);
        const found = !query
            || entry.dataset.name.toLowerCase().includes(query)
            || entry.dataset.code.toLowerCase().includes(query)
            || absent
            || present
            || (practical && item?.components.some(component => component.name === "Practical / Lab"))
            || (theory && item?.components.some(component => component.name === "Theory"));
        entry.hidden = !found;
        if (found) matches++;
    });
    const categorical = absent || present;
    el.noSearchResults.hidden = !query || categorical || matches > 0;
    el.attendanceSearchResults.replaceChildren();
    el.attendanceSearchResults.hidden = true;
    if (categorical) {
        const ranked = [...subjects].sort((a, b) => {
            const first = absent ? a.total - a.attended : a.attended;
            const second = absent ? b.total - b.attended : b.attended;
            return second - first;
        }).slice(0, 3);
        const heading = document.createElement("h3");
        heading.textContent = absent ? "Subjects with the most absences" : "Subjects with the most classes attended";
        const list = document.createElement("ol");
        ranked.forEach(item => {
            const li = document.createElement("li");
            li.textContent = absent
                ? `${item.name} — ${item.total - item.attended} missed out of ${item.total}`
                : `${item.name} — ${item.attended} attended out of ${item.total}`;
            list.appendChild(li);
        });
        el.attendanceSearchResults.append(heading, list);
        el.attendanceSearchResults.hidden = false;
    }
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
        const payload = await window.attendanceApi.list();
        subjects = normalize(payload);
        weeklyRecords = Array.isArray(payload?.weeklyClasses) ? payload.weeklyClasses : [];
        recentRecords = Array.isArray(payload?.recentAttendance) ? payload.recentAttendance : [];
        online = true;
        el.attendanceApiStatus.textContent = "Attendance API connected. Records are loaded from the configured backend.";
        el.attendanceApiStatus.className = "attendance-api-status";
        refresh();
        return true;
    } catch (error) {
        online = false;
        subjects = [];
        weeklyRecords = [];
        recentRecords = [];
        el.attendanceApiStatus.textContent = "Attendance API unavailable.";
        el.attendanceApiStatus.className = "attendance-api-status error";
        console.error("Attendance API error:", error);
        renderError(error instanceof Error ? error.message : "Attendance data could not be loaded.");
        return false;
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
