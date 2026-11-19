const API_BASE_URL = "http://localhost:5000/api";
const MINIMUM_ATTENDANCE_STORAGE_KEY = "univrse.minimumAttendance";
const DEFAULT_MINIMUM_ATTENDANCE = 85;
const CHART_COLORS = ["#6657e8", "#2f9e77", "#e19736", "#4b8fd1", "#d45d79", "#8b68c7", "#2caaa8", "#bd7848"];

const elements = Object.fromEntries([
    "overallAttendance","overallStatus","classesAttended","classesAttendedTotal","classesMissed",
    "classesMissedPercentage","atRiskSubjects","weeklyClasses","weeklyTotal","subjectList",
    "subjectSearch","attendanceSearchForm","attendanceSearchResults","noSearchResults",
    "addSubjectForm","newSubjectName","newSubjectCode","newSubjectAttended","newSubjectTotal",
    "newSubjectTheoryPerWeek","newSubjectPracticalPerWeek","addSubjectStatus","calculatorSubject",
    "calculatorResult","minimumAttendanceInput","resetAttendanceTarget","attendanceTargetStatus",
    "insightHeading","insightMessage","subjectAttendancePie","subjectAttendanceLegend",
    "minimumRequirement","attendanceBuffer","recentAttendance","attendanceSubjectFilter",
    "attendanceStatusFilter"
].map(id => [id, document.getElementById(id)]));

let attendanceSubjects = [];
let attendanceRecords = [];
let minimumAttendance = DEFAULT_MINIMUM_ATTENDANCE;
let calculatorOptions = [];

function isInteger(value, allowZero = true) {
    return Number.isInteger(value) && (allowZero ? value >= 0 : value > 0);
}

function formatPercentage(value) {
    return `${Number.isFinite(value) ? value.toFixed(1) : "0.0"}%`;
}

function showMessage(container, message, className) {
    container.replaceChildren();
    const paragraph = document.createElement("p");
    paragraph.textContent = message;
    if (className) paragraph.className = className;
    container.appendChild(paragraph);
}

async function apiRequest(path, options = {}) {
    let response;
    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers: {
                "Accept": "application/json",
                ...(options.body ? {"Content-Type": "application/json"} : {}),
                ...(options.headers || {})
            }
        });
    } catch (error) {
        throw new Error("Cannot connect to the attendance API at http://localhost:5000/api.");
    }

    let data = null;
    const text = await response.text();
    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            throw new Error("The attendance API returned a non-JSON response.");
        }
    }
    if (!response.ok) {
        const message = data?.message || data?.error;
        throw new Error(message || `Attendance API request failed (HTTP ${response.status}).`);
    }
    return data;
}

function normalizeSubjects(payload) {
    const records = Array.isArray(payload) ? payload : payload?.subjects || payload?.data;
    if (!Array.isArray(records)) {
        throw new Error("The attendance API did not return a valid subjects list.");
    }

    return records.map(record => {
        const name = record.subject ?? record.name;
        const total = record.totalClasses ?? record.total;
        const attended = record.attendedClasses ?? record.attended;
        const subjectCode = record.subjectCode ?? record.code ?? "";
        const id = record._id ?? record.id;

        if (!id
            || typeof name !== "string"
            || name.trim() === ""
            || !isInteger(attended)
            || !isInteger(total, false)
            || attended > total) {
            throw new Error("The attendance API returned an invalid subject record.");
        }

        const theoryPerWeek = isInteger(record.theoryPerWeek) ? record.theoryPerWeek : 0;
        const practicalPerWeek = isInteger(record.practicalPerWeek) ? record.practicalPerWeek : 0;
        const theory = record.theory || null;
        const practical = record.practical || record.lab || null;
        const components = [];

        if (theory && isInteger(theory.attended) && isInteger(theory.total, false)) {
            components.push({name: "Theory", attended: theory.attended, total: theory.total});
        } else if (theoryPerWeek > 0) {
            const theoryTotal = practicalPerWeek === 0 ? total : Math.round(total * theoryPerWeek / (theoryPerWeek + practicalPerWeek));
            components.push({
                name: "Theory",
                attended: practicalPerWeek === 0 ? attended : Math.min(theoryTotal, Math.round(attended * theoryPerWeek / (theoryPerWeek + practicalPerWeek))),
                total: theoryTotal
            });
        }

        if (practical && isInteger(practical.attended) && isInteger(practical.total, false)) {
            components.push({name: "Practical / Lab", attended: practical.attended, total: practical.total});
        } else if (practicalPerWeek > 0) {
            const theoryTotal = components.find(item => item.name === "Theory")?.total || 0;
            components.push({name: "Practical / Lab", attended: attended - (components[0]?.attended || 0), total: total - theoryTotal});
        }

        const existingImages = {
            "D.A Using Python": "https://admin.wac.co/uploads/Features_Of_Python_1_f4ccd6d9f7.jpg",
            "OOPS Using Java": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSzlXfgcjTIqK_fS6mqGSvxBAAE1Tm5_PlojbciBOaoA&s=10",
            "Web Programming": "https://c8.alamy.com/comp/H117MD/seo-web-design-concept-web-programming-on-digital-background-H117MD.jpg",
            "Algebra": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQHwoisoAh0HBPUC0Pbjo70OIOWJZ9JFh0nGx9ZP1",
            "Quantum Computing": "https://etimg.etb2bimg.com/thumb/msid-112019104,imgsize-64232,width-1200,height=627,overlay-etgovernment,resizemode-75/blog/quantum-computing-ushering-india-into-a-new-age-of-technological-innovation-growth.jpg",
            "Data Structures and Algorithms": "https://www.blazingminds.in/static/images/courses/4by3/dsa_in_c.png",
            "Innovation and Entrepreneurship": "https://media.licdn.com/dms/image/v2/C4E12AQH4KPu9xwYxVQ/article-cover_image-shrink_720_1280/article-cover_image-shrink_720_1280/0/2147483647",
            "Digital Logic Design": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRYImzmnzjrfwBXtmn0MrkBCekRLbtpngdt2Z4mNPus"
        };

        return {
            id: String(id),
            name: name.trim(),
            subjectCode: typeof subjectCode === "string" ? subjectCode : "",
            attended,
            total,
            theoryPerWeek,
            practicalPerWeek,
            components,
            image: typeof record.image === "string" && record.image.trim()
                ? record.image
                : existingImages[name.trim()] || ""
        };
    });
}

function getSavedMinimumAttendance() {
    try {
        const saved = Number(localStorage.getItem(MINIMUM_ATTENDANCE_STORAGE_KEY));
        if (Number.isFinite(saved) && saved >= 0 && saved <= 100) return saved;
    } catch (error) {
        console.warn("Could not read the attendance target:", error);
    }
    return DEFAULT_MINIMUM_ATTENDANCE;
}

function saveMinimumAttendance(value) {
    try {
        localStorage.setItem(MINIMUM_ATTENDANCE_STORAGE_KEY, String(value));
    } catch (error) {
        console.warn("Could not save the attendance target:", error);
    }
}

function refreshViews() {
    renderSummary();
    renderSubjects();
    renderCalculator();
    renderRecentAttendance();
    filterSubjects();
}

function renderSummary() {
    const attended = attendanceSubjects.reduce((sum, subject) => sum + subject.attended, 0);
    const total = attendanceSubjects.reduce((sum, subject) => sum + subject.total, 0);
    const missed = total - attended;
    const overall = total === 0 ? 0 : attended / total * 100;
    const missedPercentage = total === 0 ? 0 : missed / total * 100;
    const buffer = overall - minimumAttendance;

    elements.overallAttendance.textContent = total === 0 ? "Unavailable" : formatPercentage(overall);
    elements.overallStatus.textContent = `${buffer > 0 ? "Above" : buffer < 0 ? "Below" : "At"} ${formatPercentage(minimumAttendance)} minimum`;
    elements.classesAttended.textContent = attended;
    elements.classesAttendedTotal.textContent = `Out of ${total} classes`;
    elements.classesMissed.textContent = missed;
    elements.classesMissedPercentage.textContent = `${formatPercentage(missedPercentage)} of total classes`;

    const atRisk = attendanceSubjects.filter(subject => subject.attended / subject.total * 100 < minimumAttendance);
    elements.atRiskSubjects.replaceChildren();
    if (attendanceSubjects.length === 0) {
        showMessage(elements.atRiskSubjects, "No subjects available.");
    } else if (atRisk.length === 0) {
        showMessage(elements.atRiskSubjects, "All subjects meet the minimum requirement.");
    } else {
        atRisk.forEach(subject => {
            const warning = document.createElement("p");
            warning.className = "red";
            warning.textContent = `${subject.name} · ${formatPercentage(subject.attended / subject.total * 100)}`;
            elements.atRiskSubjects.appendChild(warning);
        });
    }

    renderChart();
    elements.insightHeading.textContent = buffer > 0
        ? "Your attendance is on track."
        : buffer < 0
            ? "Your attendance is below the minimum."
            : "Your attendance meets the minimum.";
    elements.insightMessage.textContent = `Your overall attendance is ${Math.abs(buffer).toFixed(1)} percentage points ${buffer >= 0 ? "above" : "below"} the minimum.`;
    elements.minimumRequirement.textContent = `Minimum attendance required: ${formatPercentage(minimumAttendance)}`;
    elements.attendanceBuffer.textContent = `${buffer > 0 ? "Buffer above minimum" : buffer < 0 ? "Buffer below minimum" : "Buffer at minimum"}: ${buffer === 0 ? "" : buffer > 0 ? "+" : "-"}${Math.abs(buffer).toFixed(1)} percentage points`;
}

function renderChart() {
    const attendedTotal = attendanceSubjects.reduce((sum, subject) => sum + subject.attended, 0);
    let accumulated = 0;
    const segments = attendanceSubjects.map((subject, index) => {
        const start = accumulated;
        accumulated += attendedTotal === 0 ? 0 : subject.attended / attendedTotal * 100;
        return {subject, color: CHART_COLORS[index % CHART_COLORS.length], segment: `${CHART_COLORS[index % CHART_COLORS.length]} ${start.toFixed(3)}% ${accumulated.toFixed(3)}%`};
    });

    elements.subjectAttendancePie.style.background = attendedTotal === 0
        ? "#e7e8ed"
        : `conic-gradient(${segments.map(item => item.segment).join(", ")})`;
    elements.subjectAttendancePie.setAttribute("aria-label", attendanceSubjects.map(subject =>
        `${subject.name}: ${formatPercentage(subject.attended / subject.total * 100)} attendance`
    ).join(". "));
    elements.subjectAttendanceLegend.replaceChildren();

    segments.forEach(({subject, color}) => {
        const item = document.createElement("li");
        const swatch = document.createElement("span");
        swatch.className = "subject-attendance-swatch";
        swatch.style.backgroundColor = color;
        swatch.setAttribute("aria-hidden", "true");
        const label = document.createElement("span");
        label.className = "subject-attendance-label";
        label.textContent = subject.name;
        const percentage = document.createElement("b");
        percentage.textContent = formatPercentage(subject.attended / subject.total * 100);
        item.append(swatch, label, percentage);
        elements.subjectAttendanceLegend.appendChild(item);
    });
}

function renderSubjects() {
    elements.subjectList.replaceChildren();

    attendanceSubjects.forEach(subject => {
        const percentage = subject.attended / subject.total * 100;
        const belowMinimum = percentage < minimumAttendance;
        const entry = document.createElement("div");
        entry.className = "subject-entry";
        entry.dataset.subjectName = subject.name;
        entry.dataset.subjectCode = subject.subjectCode;
        entry.appendChild(document.createElement("hr"));

        const box = document.createElement("div");
        box.className = belowMinimum ? "subject-box below-minimum" : "subject-box";
        if (subject.image) {
            const image = document.createElement("img");
            image.src = subject.image;
            image.alt = subject.name;
            image.className = "subject-image";
            image.loading = "lazy";
            box.appendChild(image);
        }

        const name = document.createElement("h3");
        name.textContent = subject.name;
        box.appendChild(name);
        if (subject.subjectCode) {
            const code = document.createElement("p");
            code.textContent = subject.subjectCode;
            box.appendChild(code);
        }

        const breakdown = document.createElement("div");
        breakdown.className = "attendance-breakdown";
        subject.components.forEach(component => {
            const detail = document.createElement("p");
            detail.textContent = `${component.name}: ${component.attended} attended · ${component.total} total`;
            breakdown.appendChild(detail);
        });
        box.appendChild(breakdown);

        const counts = document.createElement("p");
        counts.textContent = `${subject.attended} attended · ${subject.total} total classes`;
        box.appendChild(counts);
        const percentageLabel = document.createElement("b");
        percentageLabel.textContent = formatPercentage(percentage);
        box.appendChild(percentageLabel);

        if (belowMinimum) {
            const warning = document.createElement("p");
            warning.className = "attendance-status";
            warning.textContent = `Below ${formatPercentage(minimumAttendance)} minimum`;
            box.appendChild(warning);
        }

        const progress = document.createElement("div");
        progress.className = "progress";
        progress.setAttribute("role", "progressbar");
        progress.setAttribute("aria-valuemin", "0");
        progress.setAttribute("aria-valuemax", "100");
        progress.setAttribute("aria-valuenow", percentage.toFixed(1));
        const bar = document.createElement("div");
        bar.className = belowMinimum ? "bar below-minimum" : "bar";
        bar.style.width = `${percentage}%`;
        progress.appendChild(bar);
        box.appendChild(progress);

        const actions = document.createElement("div");
        actions.className = "subject-actions";
        actions.append(
            createActionButton("Present", "mark-attendance-button", () => markAttendance(subject, "Present")),
            createActionButton("Absent", "mark-attendance-button", () => markAttendance(subject, "Absent")),
            createActionButton("Edit", "edit-subject-button", () => editSubject(subject)),
            createActionButton("Remove", "remove-subject-button", () => deleteSubject(subject))
        );
        box.appendChild(actions);
        entry.appendChild(box);
        elements.subjectList.appendChild(entry);
    });

    if (attendanceSubjects.length === 0) {
        showMessage(elements.subjectList, "No subject attendance records are available.");
    }
}

function createActionButton(text, className, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = text;
    button.addEventListener("click", handler);
    return button;
}

async function markAttendance(subject, status) {
    elements.addSubjectStatus.textContent = `Marking ${subject.name} ${status.toLowerCase()}...`;
    try {
        await apiRequest(`/attendance/${encodeURIComponent(subject.id)}/mark`, {
            method: "PATCH",
            body: JSON.stringify({status})
        });
        await loadAttendance();
        elements.addSubjectStatus.textContent = `${subject.name} marked ${status}.`;
    } catch (error) {
        elements.addSubjectStatus.textContent = error.message;
    }
}

async function editSubject(subject) {
    const name = window.prompt("Subject name:", subject.name);
    if (name === null) return;
    const attendedText = window.prompt("Attended classes:", String(subject.attended));
    if (attendedText === null) return;
    const totalText = window.prompt("Total classes:", String(subject.total));
    if (totalText === null) return;
    const attended = Number(attendedText);
    const total = Number(totalText);
    if (name.trim() === ""
        || !isInteger(attended)
        || !isInteger(total, false)
        || attended > total) {
        elements.addSubjectStatus.textContent = "Update failed: enter a name and valid, non-negative class counts.";
        return;
    }

    elements.addSubjectStatus.textContent = `Updating ${subject.name}...`;
    try {
        await apiRequest(`/attendance/${encodeURIComponent(subject.id)}`, {
            method: "PUT",
            body: JSON.stringify({
                subject: name.trim(),
                subjectCode: subject.subjectCode,
                totalClasses: total,
                attendedClasses: attended
            })
        });
        await loadAttendance();
        elements.addSubjectStatus.textContent = `${name.trim()} was updated.`;
    } catch (error) {
        elements.addSubjectStatus.textContent = error.message;
    }
}

async function deleteSubject(subject) {
    if (!window.confirm(`Delete ${subject.name}?`)) return;
    elements.addSubjectStatus.textContent = `Deleting ${subject.name}...`;
    try {
        await apiRequest(`/attendance/${encodeURIComponent(subject.id)}`, {method: "DELETE"});
        await loadAttendance();
        elements.addSubjectStatus.textContent = `${subject.name} was deleted.`;
    } catch (error) {
        elements.addSubjectStatus.textContent = error.message;
    }
}

async function addSubject(event) {
    event.preventDefault();
    const name = elements.newSubjectName.value.trim();
    const subjectCode = elements.newSubjectCode.value.trim();
    const attended = Number(elements.newSubjectAttended.value);
    const total = Number(elements.newSubjectTotal.value);
    if (name === ""
        || !isInteger(attended)
        || !isInteger(total, false)
        || attended > total) {
        elements.addSubjectStatus.textContent = "Enter a subject name and valid class counts.";
        return;
    }
    if (attendanceSubjects.some(subject => subject.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
        elements.addSubjectStatus.textContent = "A subject with that name already exists.";
        elements.newSubjectName.focus();
        return;
    }

    elements.addSubjectStatus.textContent = `Saving ${name}...`;
    try {
        await apiRequest("/attendance", {
            method: "POST",
            body: JSON.stringify({
                subject: name,
                subjectCode,
                totalClasses: total,
                attendedClasses: attended
            })
        });
        elements.addSubjectForm.reset();
        await loadAttendance();
        elements.addSubjectStatus.textContent = `${name} was added.`;
    } catch (error) {
        elements.addSubjectStatus.textContent = error.message;
    }
}

function renderCalculator() {
    elements.calculatorSubject.replaceChildren();
    calculatorOptions = [];
    attendanceSubjects.forEach(subject => {
        calculatorOptions.push({
            label: subject.practicalPerWeek > 0 ? `${subject.name} — Overall` : subject.name,
            attended: subject.attended,
            total: subject.total
        });
        subject.components.forEach(component => {
            calculatorOptions.push({
                label: `${subject.name} — ${component.name}`,
                attended: component.attended,
                total: component.total
            });
        });
    });

    calculatorOptions.forEach((option, index) => {
        const element = document.createElement("option");
        element.value = String(index);
        element.textContent = option.label;
        elements.calculatorSubject.appendChild(element);
    });
    elements.calculatorSubject.disabled = calculatorOptions.length === 0;
    updateCalculator();
}

function updateCalculator() {
    const option = calculatorOptions[Number(elements.calculatorSubject.value)];
    if (!option) {
        elements.calculatorResult.textContent = "Select a subject to calculate attendance.";
        return;
    }
    if (option.total === 0) {
        elements.calculatorResult.textContent = "There are no recorded classes for this class type yet.";
        return;
    }

    const target = minimumAttendance / 100;
    const current = option.attended / option.total;
    if (current >= target) {
        if (target === 0) {
            elements.calculatorResult.textContent = `Your attendance is ${formatPercentage(current * 100)}. There is no minimum requirement.`;
            return;
        }
        const canMiss = Math.floor((option.attended - target * option.total) / target + 1e-10);
        elements.calculatorResult.textContent = canMiss === 0
            ? `Your attendance is ${formatPercentage(current * 100)}. You cannot miss another class and stay at or above ${formatPercentage(minimumAttendance)}.`
            : `Your attendance is ${formatPercentage(current * 100)}. You can miss ${canMiss} consecutive ${canMiss === 1 ? "class" : "classes"} and stay at or above ${formatPercentage(minimumAttendance)}.`;
        return;
    }

    if (target === 1) {
        elements.calculatorResult.textContent = `Your attendance is ${formatPercentage(current * 100)}. Attending future classes alone cannot bring it to ${formatPercentage(minimumAttendance)}.`;
        return;
    }
    const required = Math.ceil((target * option.total - option.attended) / (1 - target) - 1e-10);
    elements.calculatorResult.textContent = `Your attendance is ${formatPercentage(current * 100)}. Attend ${required} consecutive ${required === 1 ? "class" : "classes"} to reach at least ${formatPercentage(minimumAttendance)}.`;
}

function setupMinimumAttendance() {
    minimumAttendance = getSavedMinimumAttendance();
    elements.minimumAttendanceInput.value = String(minimumAttendance);
    elements.minimumAttendanceInput.disabled = false;
    elements.resetAttendanceTarget.disabled = false;
    elements.attendanceTargetStatus.textContent = minimumAttendance === DEFAULT_MINIMUM_ATTENDANCE
        ? `Using the default ${formatPercentage(DEFAULT_MINIMUM_ATTENDANCE)} target.`
        : `Using your saved ${formatPercentage(minimumAttendance)} target.`;

    elements.minimumAttendanceInput.oninput = () => {
        const value = Number(elements.minimumAttendanceInput.value);
        const valid = elements.minimumAttendanceInput.value !== ""
            && Number.isFinite(value)
            && value >= 0
            && value <= 100;
        elements.minimumAttendanceInput.setAttribute("aria-invalid", String(!valid));
        if (!valid) {
            elements.attendanceTargetStatus.textContent = "Enter a target between 0% and 100%.";
            return;
        }
        minimumAttendance = value;
        saveMinimumAttendance(value);
        elements.attendanceTargetStatus.textContent = `Using ${formatPercentage(value)} target.`;
        refreshViews();
    };

    elements.resetAttendanceTarget.onclick = () => {
        minimumAttendance = DEFAULT_MINIMUM_ATTENDANCE;
        elements.minimumAttendanceInput.value = String(minimumAttendance);
        elements.minimumAttendanceInput.setAttribute("aria-invalid", "false");
        saveMinimumAttendance(minimumAttendance);
        elements.attendanceTargetStatus.textContent = `Using the default ${formatPercentage(DEFAULT_MINIMUM_ATTENDANCE)} target.`;
        refreshViews();
    };
    elements.calculatorSubject.onchange = updateCalculator;
}

function renderWeeklyClasses() {
    showMessage(elements.weeklyClasses, "Weekly class counts are not available from the attendance API.");
    elements.weeklyTotal.textContent = "Unavailable";
}

function renderRecentAttendance() {
    elements.recentAttendance.replaceChildren();
    elements.attendanceSubjectFilter.replaceChildren();
    const allSubjects = document.createElement("option");
    allSubjects.value = "";
    allSubjects.textContent = "All subjects";
    elements.attendanceSubjectFilter.appendChild(allSubjects);
    attendanceSubjects.forEach(subject => {
        const option = document.createElement("option");
        option.value = subject.name;
        option.textContent = subject.name;
        elements.attendanceSubjectFilter.appendChild(option);
    });
    showMessage(elements.recentAttendance, "Date-wise attendance history is unavailable. The agreed subject-level API does not provide recent attendance records.");
    elements.attendanceSubjectFilter.onchange = () => {
        showMessage(elements.recentAttendance, "Date-wise attendance history is unavailable. The agreed subject-level API does not provide recent attendance records.");
    };
    elements.attendanceStatusFilter.onchange = () => {
        showMessage(elements.recentAttendance, "Date-wise attendance history is unavailable. The agreed subject-level API does not provide recent attendance records.");
    };
}

function filterSubjects() {
    const query = elements.subjectSearch.value.trim().toLocaleLowerCase();
    const wantsAbsent = /\b(absent|absence|absences|missed|missing)\b/.test(query);
    const wantsPresent = /\b(present|attended|attend|appear|appeared)\b/.test(query);
    const wantsPractical = /\b(practical|lab|labs)\b/.test(query);
    const entries = elements.subjectList.querySelectorAll(".subject-entry");
    let matchCount = 0;

    entries.forEach(entry => {
        const name = entry.dataset.subjectName.toLocaleLowerCase();
        const code = entry.dataset.subjectCode.toLocaleLowerCase();
        const subject = attendanceSubjects.find(item => item.name.toLocaleLowerCase() === name);
        const matches = !query
            || name.includes(query)
            || code.includes(query)
            || wantsAbsent
            || wantsPresent
            || (wantsPractical && subject?.practicalPerWeek > 0);
        entry.hidden = !matches;
        if (matches) matchCount += 1;
    });
    elements.noSearchResults.hidden = query.length === 0 || wantsAbsent || wantsPresent || wantsPractical || matchCount > 0;
}

function renderError(message) {
    elements.overallAttendance.textContent = "Unavailable";
    elements.overallStatus.textContent = message;
    elements.classesAttended.textContent = "—";
    elements.classesAttendedTotal.textContent = "Class totals unavailable";
    elements.classesMissed.textContent = "—";
    elements.classesMissedPercentage.textContent = "Class totals unavailable";
    showMessage(elements.atRiskSubjects, "Subject status is unavailable.");
    showMessage(elements.weeklyClasses, "Weekly class counts are unavailable.");
    elements.weeklyTotal.textContent = "Unavailable";
    showMessage(elements.subjectList, message, "red");
    elements.insightHeading.textContent = "Attendance insight unavailable.";
    elements.insightMessage.textContent = message;
    elements.subjectAttendancePie.style.background = "";
    elements.subjectAttendancePie.setAttribute("aria-label", "Subject attendance chart is unavailable.");
    elements.subjectAttendanceLegend.replaceChildren();
    elements.minimumRequirement.textContent = "Minimum attendance requirement unavailable.";
    elements.attendanceBuffer.textContent = "Attendance buffer unavailable.";
    showMessage(elements.recentAttendance, "Recent attendance records are unavailable.");
    elements.calculatorSubject.disabled = true;
    elements.calculatorResult.textContent = "Attendance calculator is unavailable.";
}

async function loadAttendance() {
    try {
        const payload = await apiRequest("/attendance");
        attendanceSubjects = normalizeSubjects(payload);
        attendanceRecords = [];
        refreshViews();
    } catch (error) {
        attendanceSubjects = [];
        console.error("Attendance error:", error);
        renderError(error instanceof Error ? error.message : "Attendance data could not be loaded.");
    }
}

function initialize() {
    setupMinimumAttendance();
    elements.addSubjectForm.addEventListener("submit", addSubject);
    elements.subjectSearch.addEventListener("input", filterSubjects);
    elements.attendanceSearchForm.addEventListener("submit", event => {
        event.preventDefault();
        filterSubjects();
        elements.subjectList.parentElement.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
            block: "start"
        });
    });
    loadAttendance();
}

initialize();
