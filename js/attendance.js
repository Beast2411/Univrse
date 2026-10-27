
fetch("data/attendance.json")
    .then(response => {
        if (!response.ok) {
            throw new Error("Could not load attendance data");
        }
        return response.json();
    })
    .then(data => {
        let attended = 0;
        let total = 0;

        // Calculate overall attendance
        data.subjects.forEach(subject => {
            attended += subject.attended;
            total += subject.total;
        });

        let missed = total - attended;
        let percentage = (attended / total) * 100;

        // Update summary cards
        document.getElementById("overallAttendance")
            .textContent = percentage.toFixed(1) + "%";

        document.getElementById("classesAttended")
            .textContent = attended;

        document.getElementById("classesMissed")
            .textContent = missed;

        // Display subject-wise attendance
        const subjectList =
            document.getElementById("subjectList");

        data.subjects.forEach(subject => {
            let percent =
                (subject.attended / subject.total) * 100;

            let box = document.createElement("div");
            box.className = "subject-box";

            box.innerHTML = `
                <h3>${subject.name}</h3>

                <p>
                    ${subject.attended} attended ·
                    ${subject.total} total classes
                </p>

                <b>${percent.toFixed(1)}%</b>

                <div class="progress">
                    <div class="bar"
                         style="width:${percent}%">
                    </div>
                </div>
            `;

            subjectList.appendChild(box);
        });
    })
    .catch(error => {
        console.error("Attendance error:", error);
    });
