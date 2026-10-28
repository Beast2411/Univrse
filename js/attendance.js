
const elements = {
    overallAttendance: document.getElementById("overallAttendance"),
    overallStatus: document.getElementById("overallStatus"),
    classesAttended: document.getElementById("classesAttended"),
    classesAttendedTotal: document.getElementById("classesAttendedTotal"),
    classesMissed: document.getElementById("classesMissed"),
    classesMissedPercentage: document.getElementById("classesMissedPercentage"),
    atRiskSubjects: document.getElementById("atRiskSubjects"),
    weeklyClasses: document.getElementById("weeklyClasses"),
    weeklyTotal: document.getElementById("weeklyTotal"),
    subjectList: document.getElementById("subjectList"),
    subjectSearch: document.getElementById("subjectSearch"),
    attendanceSearchForm: document.getElementById("attendanceSearchForm"),
    attendanceSearchResults: document.getElementById("attendanceSearchResults"),
    noSearchResults: document.getElementById("noSearchResults"),
    themeToggle: document.getElementById("themeToggle"),
    themeToggleLabel: document.getElementById("themeToggleLabel"),
    calculatorSubject: document.getElementById("calculatorSubject"),
    calculatorResult: document.getElementById("calculatorResult"),
    minimumAttendanceInput: document.getElementById("minimumAttendanceInput"),
    resetAttendanceTarget: document.getElementById("resetAttendanceTarget"),
    attendanceTargetStatus: document.getElementById("attendanceTargetStatus"),
    insightHeading: document.getElementById("insightHeading"),
    insightMessage: document.getElementById("insightMessage"),
    subjectAttendancePie: document.getElementById("subjectAttendancePie"),
    subjectAttendanceLegend: document.getElementById("subjectAttendanceLegend"),
    minimumRequirement: document.getElementById("minimumRequirement"),
    attendanceBuffer: document.getElementById("attendanceBuffer"),
    recentAttendance: document.getElementById("recentAttendance"),
    attendanceSubjectFilter: document.getElementById("attendanceSubjectFilter"),
    attendanceStatusFilter: document.getElementById("attendanceStatusFilter")
};

const MINIMUM_ATTENDANCE_STORAGE_KEY = "univrse.minimumAttendance";
const THEME_STORAGE_KEY = "univrse.theme";
const SUBJECT_CHART_COLORS = ["#6657e8", "#2f9e77", "#e19736", "#4b8fd1", "#d45d79", "#8b68c7", "#2caaa8", "#bd7848"];
let attendanceSubjects = [];
let attendanceCalculatorOptions = [];
let defaultMinimumAttendance = 75;
let minimumAttendance = defaultMinimumAttendance;

function updateThemeToggle() {
    const isDark = document.documentElement.dataset.theme === "dark";
    elements.themeToggleLabel.textContent = isDark ? "Light mode" : "Dark mode";
    elements.themeToggle.setAttribute("aria-pressed", String(isDark));
}

elements.themeToggle.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    updateThemeToggle();

    try {
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch (error) {
        console.warn("The selected theme could not be saved:", error);
    }
});
updateThemeToggle();

function isNonNegativeInteger(value) {
    return Number.isInteger(value) && value >= 0;
}

function formatPercentage(value) {
    return `${value.toFixed(1)}%`;
}

function showMessage(container, message, className) {
    container.replaceChildren();
    const paragraph = document.createElement("p");
    paragraph.textContent = message;
    if (className) {
        paragraph.className = className;
    }
    container.appendChild(paragraph);
}

function validateSubjects(data) {
    if (!Array.isArray(data.subjects)) {
        throw new Error("Attendance data does not contain a valid subjects list.");
    }

    return data.subjects.filter(subject => {
        const valid = subject
            && typeof subject.name === "string"
            && subject.name.trim().length > 0
            && isNonNegativeInteger(subject.attended)
            && Number.isInteger(subject.total)
            && subject.total > 0
            && subject.attended <= subject.total
            && isNonNegativeInteger(subject.theoryPerWeek)
            && isNonNegativeInteger(subject.practicalPerWeek)
            && subject.theoryPerWeek + subject.practicalPerWeek > 0;

        if (!valid) {
            console.warn("Skipping an invalid attendance subject record:", subject);
        }
        return valid;
    }).map(subject => {
        const totalWeeklyClasses = subject.theoryPerWeek + subject.practicalPerWeek;
        const theoryShare = subject.theoryPerWeek / totalWeeklyClasses;
        const theoryTotal = subject.practicalPerWeek === 0
            ? subject.total
            : Math.round(subject.total * theoryShare);
        const practicalTotal = subject.total - theoryTotal;
        const theoryAttended = subject.practicalPerWeek === 0
            ? subject.attended
            : Math.min(theoryTotal, Math.round(subject.attended * theoryShare));
        const practicalAttended = subject.attended - theoryAttended;

        subject.components = [{
            name: "Theory",
            attended: theoryAttended,
            total: theoryTotal
        }];
        if (subject.practicalPerWeek > 0) {
            subject.components.push({
                name: "Practical / Lab",
                attended: practicalAttended,
                total: practicalTotal
            });
        }
        return subject;
    });
}

function renderSummary(subjects, minimumAttendance) {
    const attended = subjects.reduce((sum, subject) => sum + subject.attended, 0);
    const total = subjects.reduce((sum, subject) => sum + subject.total, 0);
    const missed = total - attended;
    const overallPercentage = (attended / total) * 100;
    const missedPercentage = (missed / total) * 100;
    const buffer = overallPercentage - minimumAttendance;

    renderSubjectAttendanceChart(subjects);
    elements.overallAttendance.textContent = formatPercentage(overallPercentage);
    elements.overallStatus.textContent = `${buffer > 0 ? "Above" : buffer < 0 ? "Below" : "At"} ${formatPercentage(minimumAttendance)} minimum`;
    elements.classesAttended.textContent = attended;
    elements.classesAttendedTotal.textContent = `Out of ${total} classes`;
    elements.classesMissed.textContent = missed;
    elements.classesMissedPercentage.textContent = `${formatPercentage(missedPercentage)} of total classes`;

    const atRiskSubjects = subjects.filter(subject => {
        return (subject.attended / subject.total) * 100 < minimumAttendance;
    });
    elements.atRiskSubjects.replaceChildren();
    if (atRiskSubjects.length === 0) {
        showMessage(elements.atRiskSubjects, "All subjects meet the minimum requirement.");
    } else {
        atRiskSubjects.forEach(subject => {
            const warning = document.createElement("p");
            warning.className = "red";
            warning.textContent = `${subject.name} · ${formatPercentage((subject.attended / subject.total) * 100)}`;
            elements.atRiskSubjects.appendChild(warning);
        });
    }

    elements.insightHeading.textContent = buffer > 0
        ? "Your attendance is on track."
        : buffer < 0
            ? "Your attendance is below the minimum."
            : "Your attendance meets the minimum.";
    elements.insightMessage.textContent = buffer > 0
        ? `Your overall attendance is ${buffer.toFixed(1)} percentage points above the minimum. Keep attending your classes.`
        : buffer < 0
            ? `Your overall attendance is ${Math.abs(buffer).toFixed(1)} percentage points below the minimum. Attend upcoming classes to improve your attendance.`
            : "Your overall attendance is exactly at the minimum requirement.";
    elements.minimumRequirement.textContent = `Minimum attendance required: ${formatPercentage(minimumAttendance)}`;
    elements.attendanceBuffer.textContent = `${buffer > 0 ? "Buffer above minimum" : buffer < 0 ? "Buffer below minimum" : "Buffer at minimum"}: ${buffer === 0 ? "" : buffer > 0 ? "+" : "-"}${Math.abs(buffer).toFixed(1)} percentage points`;
}

function renderSubjectAttendanceChart(subjects) {
    const attendedTotal = subjects.reduce((sum, subject) => sum + subject.attended, 0);
    let accumulatedPercentage = 0;
    const segments = subjects.map((subject, index) => {
        const start = accumulatedPercentage;
        accumulatedPercentage += attendedTotal === 0 ? 0 : (subject.attended / attendedTotal) * 100;
        const color = SUBJECT_CHART_COLORS[index % SUBJECT_CHART_COLORS.length];
        return {
            subject,
            color,
            segment: `${color} ${start.toFixed(3)}% ${accumulatedPercentage.toFixed(3)}%`
        };
    });

    elements.subjectAttendancePie.style.background = attendedTotal === 0
        ? "#e7e8ed"
        : `conic-gradient(${segments.map(item => item.segment).join(", ")})`;
    elements.subjectAttendancePie.setAttribute(
        "aria-label",
        `Pie chart of attended classes by subject. ${subjects.map(subject =>
            `${subject.name}: ${formatPercentage((subject.attended / subject.total) * 100)} attendance`
        ).join(". ")}.`
    );
    elements.subjectAttendanceLegend.replaceChildren();

    segments.forEach(({ subject, color }) => {
        const item = document.createElement("li");
        const swatch = document.createElement("span");
        swatch.className = "subject-attendance-swatch";
        swatch.style.backgroundColor = color;
        swatch.setAttribute("aria-hidden", "true");

        const label = document.createElement("span");
        label.className = "subject-attendance-label";
        label.textContent = subject.name;

        const percentage = document.createElement("b");
        percentage.textContent = formatPercentage((subject.attended / subject.total) * 100);

        item.append(swatch, label, percentage);
        elements.subjectAttendanceLegend.appendChild(item);
    });
}

function renderSubjects(subjects, minimumAttendance) {
    elements.subjectList.replaceChildren();

    subjects.forEach(subject => {
        const percentage = (subject.attended / subject.total) * 100;
        const belowMinimum = percentage < minimumAttendance;
        const entry = document.createElement("div");
        entry.className = "subject-entry";

        const divider = document.createElement("hr");
        const box = document.createElement("div");
        box.className = belowMinimum ? "subject-box below-minimum" : "subject-box";

        if (typeof subject.image === "string" && subject.image.trim()) {
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
        progress.setAttribute("aria-label", `${subject.name} attendance`);
        progress.setAttribute("aria-valuemin", "0");
        progress.setAttribute("aria-valuemax", "100");
        progress.setAttribute("aria-valuenow", percentage.toFixed(1));

        const bar = document.createElement("div");
        bar.className = belowMinimum ? "bar below-minimum" : "bar";
        bar.style.width = `${percentage}%`;
        progress.appendChild(bar);
        box.appendChild(progress);

        entry.append(divider, box);
        elements.subjectList.appendChild(entry);
    });

    if (subjects.length === 0) {
        showMessage(elements.subjectList, "No valid subject attendance records are available.");
    }
}

function updateAttendanceCalculator() {
    const subject = attendanceCalculatorOptions[Number(elements.calculatorSubject.value)];
    if (!subject) {
        elements.calculatorResult.textContent = "Select a subject to calculate attendance.";
        return;
    }

    const minimum = minimumAttendance / 100;
    const currentAttendance = subject.attended / subject.total;
    const roundingTolerance = 1e-10;
    if (currentAttendance >= minimum) {
        if (minimum === 0) {
            elements.calculatorResult.textContent = `Your attendance is ${formatPercentage(currentAttendance * 100)}. There is no minimum attendance requirement, so you can miss any number of classes.`;
            return;
        }

        const classesYouCanMiss = Math.floor(
            (subject.attended - minimum * subject.total) / minimum + roundingTolerance
        );
        elements.calculatorResult.textContent = classesYouCanMiss === 0
            ? `Your attendance is ${formatPercentage(currentAttendance * 100)}. You cannot miss another class and stay at or above ${formatPercentage(minimumAttendance)}.`
            : `Your attendance is ${formatPercentage(currentAttendance * 100)}. You can miss ${classesYouCanMiss} consecutive ${classesYouCanMiss === 1 ? "class" : "classes"} and stay at or above ${formatPercentage(minimumAttendance)}.`;
        return;
    }

    if (minimum === 1) {
        elements.calculatorResult.textContent = `Your attendance is ${formatPercentage(currentAttendance * 100)}. Attending future classes alone cannot bring it to ${formatPercentage(minimumAttendance)}.`;
        return;
    }

    const classesToAttend = Math.ceil(
        (minimum * subject.total - subject.attended) / (1 - minimum) - roundingTolerance
    );
    elements.calculatorResult.textContent = `Your attendance is ${formatPercentage(currentAttendance * 100)}. Attend ${classesToAttend} consecutive ${classesToAttend === 1 ? "class" : "classes"} to reach at least ${formatPercentage(minimumAttendance)}.`;
}

function renderAttendanceCalculator(subjects) {
    elements.calculatorSubject.replaceChildren();
    attendanceCalculatorOptions = subjects.flatMap(subject => {
        const options = [{
            ...subject,
            label: subject.practicalPerWeek > 0
                ? `${subject.name} — Overall`
                : subject.name
        }];
        if (subject.practicalPerWeek > 0) {
            subject.components.forEach(component => {
                options.push({
                    ...component,
                    label: `${subject.name} — ${component.name}`
                });
            });
        }
        return options;
    });

    attendanceCalculatorOptions.forEach((subject, index) => {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = subject.label;
        elements.calculatorSubject.appendChild(option);
    });

    elements.calculatorSubject.disabled = attendanceCalculatorOptions.length === 0;
    elements.calculatorSubject.addEventListener("change", () => {
        updateAttendanceCalculator();
    });
    updateAttendanceCalculator();
}

function getSavedMinimumAttendance(defaultValue) {
    try {
        const savedValue = localStorage.getItem(MINIMUM_ATTENDANCE_STORAGE_KEY);
        if (savedValue === null) {
            return defaultValue;
        }

        const parsedValue = Number(savedValue);
        if (Number.isFinite(parsedValue) && parsedValue >= 0 && parsedValue <= 100) {
            return parsedValue;
        }

        console.warn("Ignoring an invalid saved attendance target:", savedValue);
    } catch (error) {
        console.warn("Could not read the saved attendance target:", error);
    }

    return defaultValue;
}

function saveMinimumAttendance(value) {
    try {
        localStorage.setItem(MINIMUM_ATTENDANCE_STORAGE_KEY, String(value));
        elements.attendanceTargetStatus.textContent = "Target saved in this browser.";
    } catch (error) {
        console.warn("Could not save the attendance target:", error);
        elements.attendanceTargetStatus.textContent = "Target updated for this visit, but could not be saved in this browser.";
    }
}

function applyMinimumAttendance(value) {
    minimumAttendance = value;
    renderSummary(attendanceSubjects, minimumAttendance);
    renderSubjects(attendanceSubjects, minimumAttendance);
    filterSubjects();
    updateAttendanceCalculator();
}

function renderAttendanceTarget(subjects, configuredDefault) {
    attendanceSubjects = subjects;
    defaultMinimumAttendance = configuredDefault;
    minimumAttendance = getSavedMinimumAttendance(defaultMinimumAttendance);
    elements.minimumAttendanceInput.value = minimumAttendance;
    elements.minimumAttendanceInput.disabled = false;
    elements.resetAttendanceTarget.disabled = false;
    elements.attendanceTargetStatus.textContent = minimumAttendance === defaultMinimumAttendance
        ? `Using the default ${formatPercentage(defaultMinimumAttendance)} target.`
        : `Using your saved ${formatPercentage(minimumAttendance)} target.`;

    elements.minimumAttendanceInput.addEventListener("input", () => {
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

        applyMinimumAttendance(value);
        saveMinimumAttendance(value);
    });

    elements.resetAttendanceTarget.addEventListener("click", () => {
        elements.minimumAttendanceInput.value = defaultMinimumAttendance;
        elements.minimumAttendanceInput.setAttribute("aria-invalid", "false");
        applyMinimumAttendance(defaultMinimumAttendance);
        saveMinimumAttendance(defaultMinimumAttendance);
    });
}

function renderWeeklyClasses(weeklyClasses) {
    elements.weeklyClasses.replaceChildren();
    if (!Array.isArray(weeklyClasses) || weeklyClasses.length === 0) {
        showMessage(elements.weeklyClasses, "Weekly class counts are not available.");
        elements.weeklyTotal.textContent = "Unavailable";
        return;
    }

    let total = 0;
    let validCount = 0;
    weeklyClasses.forEach(item => {
        const valid = item
            && typeof item.day === "string"
            && item.day.trim().length > 0
            && isNonNegativeInteger(item.classes);

        if (!valid) {
            console.warn("Skipping an invalid weekly class-count record:", item);
            return;
        }

        const row = document.createElement("p");
        row.textContent = item.day.trim();
        const count = document.createElement("span");
        count.textContent = `${item.classes} ${item.classes === 1 ? "class" : "classes"}`;
        row.appendChild(count);
        elements.weeklyClasses.appendChild(row);
        total += item.classes;
        validCount += 1;
    });

    if (validCount === 0) {
        showMessage(elements.weeklyClasses, "Weekly class counts are not available.");
        elements.weeklyTotal.textContent = "Unavailable";
        return;
    }
    elements.weeklyTotal.textContent = `${total} ${total === 1 ? "class" : "classes"}`;
}

function renderRecentAttendance(records, subjects) {
    elements.recentAttendance.replaceChildren();
    elements.attendanceSubjectFilter.replaceChildren();
    const allSubjects = document.createElement("option");
    allSubjects.value = "";
    allSubjects.textContent = "All subjects";
    elements.attendanceSubjectFilter.appendChild(allSubjects);
    subjects.forEach(subject => {
        const option = document.createElement("option");
        option.value = subject.name;
        option.textContent = subject.name;
        elements.attendanceSubjectFilter.appendChild(option);
    });

    if (!Array.isArray(records)) {
        showMessage(elements.recentAttendance, "No recent attendance records are available.");
        return;
    }

    const validRecords = records.filter(record => {
        const valid = record
            && typeof record.subject === "string"
            && subjects.some(subject => subject.name === record.subject)
            && typeof record.date === "string"
            && record.date.trim().length > 0
            && typeof record.time === "string"
            && record.time.trim().length > 0
            && (record.status === "Present" || record.status === "Absent");

        if (!valid) {
            console.warn("Skipping an invalid recent attendance record:", record);
            return false;
        }

        return true;
    });

    function renderFilteredRecords() {
        const selectedSubject = elements.attendanceSubjectFilter.value;
        const selectedStatus = elements.attendanceStatusFilter.value;
        const filteredRecords = validRecords.filter(record =>
            (!selectedSubject || record.subject === selectedSubject)
            && (!selectedStatus || record.status === selectedStatus)
        );

        elements.recentAttendance.replaceChildren();
        if (filteredRecords.length === 0) {
            showMessage(
                elements.recentAttendance,
                validRecords.length === 0
                    ? "No recent attendance records are available."
                    : "No attendance records match these filters."
            );
            return;
        }

        const table = document.createElement("table");
        table.className = "recent-attendance-table";
        const head = document.createElement("thead");
        const headerRow = document.createElement("tr");
        ["Subject / class", "Date", "Time", "Status"].forEach(label => {
            const header = document.createElement("th");
            header.scope = "col";
            header.textContent = label;
            headerRow.appendChild(header);
        });
        head.appendChild(headerRow);

        const body = document.createElement("tbody");
        filteredRecords.forEach(record => {
            const row = document.createElement("tr");
            const subjectCell = document.createElement("th");
            subjectCell.scope = "row";
            subjectCell.textContent = record.subject;
            row.appendChild(subjectCell);

            [record.date, record.time].forEach(value => {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            });

            const statusCell = document.createElement("td");
            const status = document.createElement("span");
            status.className = `attendance-record-status ${record.status.toLocaleLowerCase()}`;
            status.textContent = record.status;
            statusCell.appendChild(status);
            row.appendChild(statusCell);
            body.appendChild(row);
        });

        table.append(head, body);
        elements.recentAttendance.appendChild(table);
    }

    elements.attendanceSubjectFilter.addEventListener("change", renderFilteredRecords);
    elements.attendanceStatusFilter.addEventListener("change", renderFilteredRecords);
    renderFilteredRecords();
}

function filterSubjects() {
    const query = elements.subjectSearch.value.trim().toLocaleLowerCase();
    const wantsAbsent = /\b(absent|absence|absences|missed|missing)\b/.test(query);
    const wantsPresent = /\b(present|attended|attend|appear|appeared)\b/.test(query);
    const wantsPractical = /\b(practical|lab|labs)\b/.test(query);
    const wantsTheory = /\b(theory|lecture|lectures)\b/.test(query);
    const entries = elements.subjectList.querySelectorAll(".subject-entry");
    let matchCount = 0;

    entries.forEach(entry => {
        const name = entry.querySelector("h3").textContent.toLocaleLowerCase();
        const subject = attendanceSubjects.find(item => item.name.toLocaleLowerCase() === name);
        const matches = wantsAbsent
            || wantsPresent
            || (wantsPractical && subject && subject.practicalPerWeek > 0)
            || wantsTheory
            || name.includes(query);
        entry.hidden = !matches;
        if (matches) {
            matchCount += 1;
        }
    });

    elements.noSearchResults.hidden = query.length === 0
        || wantsAbsent
        || wantsPresent
        || wantsPractical
        || wantsTheory
        || matchCount > 0;
    elements.attendanceSearchResults.replaceChildren();
    elements.attendanceSearchResults.hidden = true;

    if (wantsAbsent || wantsPresent) {
        const absentSearch = wantsAbsent;
        const rankedSubjects = [...attendanceSubjects].sort((first, second) => {
            const firstCount = absentSearch ? first.total - first.attended : first.attended;
            const secondCount = absentSearch ? second.total - second.attended : second.attended;
            if (firstCount !== secondCount) {
                return secondCount - firstCount;
            }

            const firstPercentage = first.attended / first.total;
            const secondPercentage = second.attended / second.total;
            return absentSearch
                ? firstPercentage - secondPercentage
                : secondPercentage - firstPercentage;
        });

        const heading = document.createElement("h3");
        heading.textContent = absentSearch
            ? "Classes with the most absences"
            : "Classes you have attended most";
        const description = document.createElement("p");
        description.textContent = "Ranked using your total attendance counts.";
        const results = document.createElement("ol");

        rankedSubjects.slice(0, 3).forEach(subject => {
            const missed = subject.total - subject.attended;
            const item = document.createElement("li");
            item.textContent = absentSearch
                ? `${subject.name} — ${missed} ${missed === 1 ? "absence" : "absences"} out of ${subject.total} classes`
                : `${subject.name} — attended ${subject.attended} out of ${subject.total} classes`;
            results.appendChild(item);
        });

        elements.attendanceSearchResults.append(heading, description, results);
        elements.attendanceSearchResults.hidden = false;
    }
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
    elements.noSearchResults.hidden = true;
    elements.attendanceSearchResults.replaceChildren();
    elements.attendanceSearchResults.hidden = true;
    elements.insightHeading.textContent = "Attendance insight unavailable.";
    elements.insightMessage.textContent = message;
    elements.minimumRequirement.textContent = "Minimum attendance requirement unavailable.";
    elements.attendanceBuffer.textContent = "Attendance buffer unavailable.";
    showMessage(elements.recentAttendance, "Recent attendance records are unavailable.");
    elements.calculatorSubject.disabled = true;
    elements.calculatorResult.textContent = "Attendance calculator is unavailable.";
    elements.minimumAttendanceInput.disabled = true;
    elements.resetAttendanceTarget.disabled = true;
    elements.attendanceTargetStatus.textContent = "Attendance target is unavailable.";
}

async function loadAttendance() {
    try {
        const response = await fetch("./data/attendance.json");
        if (!response.ok) {
            throw new Error(`Attendance data could not be loaded (HTTP ${response.status}).`);
        }

        const data = await response.json();
        if (!data || typeof data !== "object" || Array.isArray(data)) {
            throw new Error("Attendance data has an invalid format.");
        }
        if (typeof data.minimumAttendance !== "number"
            || !Number.isFinite(data.minimumAttendance)
            || data.minimumAttendance < 0
            || data.minimumAttendance > 100) {
            throw new Error("Attendance data is missing a valid minimum attendance requirement.");
        }

        const subjects = validateSubjects(data);
        if (subjects.length === 0) {
            throw new Error("No valid subject attendance records could be found.");
        }

        renderAttendanceTarget(subjects, data.minimumAttendance);
        renderSummary(subjects, minimumAttendance);
        renderSubjects(subjects, minimumAttendance);
        renderAttendanceCalculator(subjects);
        renderWeeklyClasses(data.weeklyClasses);
        renderRecentAttendance(data.recentAttendance, subjects);
        elements.subjectSearch.addEventListener("input", filterSubjects);
        elements.attendanceSearchForm.addEventListener("submit", event => {
            event.preventDefault();
            filterSubjects();
            elements.subjectList.parentElement.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        filterSubjects();
    } catch (error) {
        console.error("Attendance error:", error);
        renderError(error instanceof Error
            ? error.message
            : "Attendance data could not be loaded. Please try again later.");
    }
}

loadAttendance();
