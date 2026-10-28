(() => {
    const STORAGE_KEY = "univrseHelpDeskRequests";
    const categories = ["Technical Issue", "Academic Help", "Campus Issue", "Event or Club", "Suggestion / Feedback", "Other Request"];
    const form = document.querySelector("#helpdesk-form");
    const submitButton = document.querySelector("#submit-request");
    const contactFields = document.querySelector("#contact-fields");
    const anonymousCheckbox = document.querySelector("#request-anonymous");
    const submissionsList = document.querySelector("#submissions-list");
    const emptyMessage = document.querySelector("#submissions-empty");
    const submissionsFeedback = document.querySelector("#submissions-feedback");
    const formFeedback = document.querySelector("#form-feedback");

    function loadRequests() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        const requests = JSON.parse(stored);
        if (!Array.isArray(requests) || requests.some((request) => !request || typeof request !== "object" || Array.isArray(request))) {
            throw new Error("Saved Help Desk data is not a valid request list.");
        }
        return requests;
    }

    function saveRequests(requests) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
    }

    function showMessage(element, message, isError = false) {
        element.textContent = message;
        element.classList.toggle("is-error", isError);
    }

    function setFieldError(fieldId, message) {
        const field = document.querySelector(`#${fieldId}`);
        const error = document.querySelector(`#${fieldId.replace("request-", "").replace("category", "category")}-error`);
        if (error) error.textContent = message;
        if (field) {
            if (message) field.setAttribute("aria-invalid", "true");
            else field.removeAttribute("aria-invalid");
        }
    }

    function validateForm() {
        const category = document.querySelector("#request-category").value;
        const subject = document.querySelector("#request-subject").value.trim();
        const description = document.querySelector("#request-description").value.trim();
        const anonymous = anonymousCheckbox.checked;
        const nameInput = document.querySelector("#request-name");
        const emailInput = document.querySelector("#request-email");
        let isValid = true;

        setFieldError("request-category", "");
        setFieldError("request-subject", "");
        setFieldError("request-description", "");
        setFieldError("request-name", "");
        setFieldError("request-email", "");
        if (!categories.includes(category)) { setFieldError("request-category", "Choose a request category."); isValid = false; }
        if (!subject) { setFieldError("request-subject", "Enter a subject."); isValid = false; }
        else if (subject.length > 100) { setFieldError("request-subject", "Subject must be 100 characters or fewer."); isValid = false; }
        if (!description) { setFieldError("request-description", "Enter a description."); isValid = false; }
        else if (description.length > 2000) { setFieldError("request-description", "Description must be 2,000 characters or fewer."); isValid = false; }
        if (!anonymous) {
            if (!nameInput.value.trim()) { setFieldError("request-name", "Enter your name, or choose anonymous submission."); isValid = false; }
            if (!emailInput.value.trim()) { setFieldError("request-email", "Enter your email address, or choose anonymous submission."); isValid = false; }
            else if (!emailInput.checkValidity()) { setFieldError("request-email", "Enter a valid email address."); isValid = false; }
        }
        return isValid;
    }

    function updateContactVisibility() {
        contactFields.hidden = anonymousCheckbox.checked;
        if (anonymousCheckbox.checked) {
            // Clear entered details immediately so anonymous records cannot retain them.
            document.querySelector("#request-name").value = "";
            document.querySelector("#request-email").value = "";
            setFieldError("request-name", "");
            setFieldError("request-email", "");
        }
    }

    function createRequestId(existingRequests) {
        let id;
        do {
            const suffix = window.crypto && typeof window.crypto.randomUUID === "function"
                ? window.crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()
                : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
            id = `UNI-${suffix}`;
        } while (existingRequests.some((request) => request.id === id));
        return id;
    }

    function handleFormSubmit(event) {
        event.preventDefault();
        showMessage(formFeedback, "");
        if (!validateForm()) {
            showMessage(formFeedback, "Please correct the highlighted fields.", true);
            const firstInvalid = form.querySelector('[aria-invalid="true"]');
            if (firstInvalid) firstInvalid.focus();
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "Saving…";
        try {
            const isAnonymous = anonymousCheckbox.checked;
            const request = {
                id: "",
                category: document.querySelector("#request-category").value,
                subject: document.querySelector("#request-subject").value.trim(),
                description: document.querySelector("#request-description").value.trim(),
                priority: document.querySelector("#request-priority").value,
                isAnonymous,
                submittedBy: isAnonymous ? null : {
                    name: document.querySelector("#request-name").value.trim(),
                    email: document.querySelector("#request-email").value.trim()
                },
                status: "Submitted",
                createdAt: new Date().toISOString()
            };
            const requests = loadRequests();
            request.id = createRequestId(requests);
            requests.unshift(request);
            saveRequests(requests);
            form.reset();
            updateContactVisibility();
            renderRequests();
            showMessage(formFeedback, `Request saved in this browser. Your request ID is ${request.id}.`);
        } catch (error) {
            showMessage(formFeedback, "The request could not be saved in this browser. Check storage availability and try again.", true);
            console.error("Unable to save Help Desk request:", error);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Submit Request";
        }
    }

    function addText(parent, tagName, className, value) {
        const element = document.createElement(tagName);
        if (className) element.className = className;
        element.textContent = value;
        parent.append(element);
        return element;
    }

    function makeLabel(value, className) {
        const label = document.createElement("span");
        label.className = className;
        label.textContent = value;
        return label;
    }

    function renderRequests() {
        submissionsList.replaceChildren();
        showMessage(submissionsFeedback, "");
        let requests;
        try {
            requests = loadRequests();
        } catch (error) {
            emptyMessage.hidden = false;
            emptyMessage.textContent = "Saved requests could not be read. Browser storage may be unavailable or contain invalid Help Desk data.";
            showMessage(submissionsFeedback, "Unable to load saved submissions.", true);
            console.error("Unable to load Help Desk requests:", error);
            return;
        }

        const search = document.querySelector("#search-requests").value.trim().toLowerCase();
        const category = document.querySelector("#filter-category").value;
        const priority = document.querySelector("#filter-priority").value;
        const status = document.querySelector("#filter-status").value;
        const filtered = requests.filter((request) => {
            const matchesSearch = !search || `${request.subject || ""} ${request.id || ""}`.toLowerCase().includes(search);
            return matchesSearch && (!category || request.category === category) && (!priority || request.priority === priority) && (!status || request.status === status);
        });

        if (!requests.length) {
            emptyMessage.hidden = false;
            emptyMessage.textContent = "You haven't submitted any requests in this browser yet.";
            return;
        }
        if (!filtered.length) {
            emptyMessage.hidden = false;
            emptyMessage.textContent = "No submissions match your search or filters.";
            return;
        }
        emptyMessage.hidden = true;

        filtered.forEach((request) => {
            const card = document.createElement("article");
            card.className = "submission-card";
            card.dataset.requestId = request.id;
            const top = document.createElement("div");
            top.className = "submission-top";
            const identity = document.createElement("div");
            addText(identity, "p", "submission-id", request.id || "Request ID unavailable");
            addText(identity, "h3", "submission-subject", request.subject || "Untitled request");
            top.append(identity);
            const priorityClass = `priority-label priority-${String(request.priority || "").toLowerCase()}`;
            top.append(makeLabel(`${request.priority || "Priority unavailable"} priority`, priorityClass));
            card.append(top);

            const details = document.createElement("div");
            details.className = "submission-details";
            addText(details, "span", "", request.category || "Category unavailable");
            const created = request.createdAt ? new Date(request.createdAt) : null;
            const dateLabel = created && !Number.isNaN(created.getTime()) ? created.toLocaleString() : "Date unavailable";
            addText(details, "span", "submission-meta", `Submitted ${dateLabel}`);
            details.append(makeLabel(request.status || "Status unavailable", `status-label status-${String(request.status || "").toLowerCase().replaceAll(" ", "-")}`));
            if (request.isAnonymous) addText(details, "span", "submission-meta", "Anonymous");
            card.append(details);

            const description = document.createElement("details");
            description.className = "submission-description";
            addText(description, "summary", "", "View description");
            addText(description, "p", "", request.description || "No description provided.");
            card.append(description);

            const actions = document.createElement("div");
            actions.className = "submission-actions";
            const statusLabel = document.createElement("label");
            statusLabel.textContent = "Local status";
            const statusSelect = document.createElement("select");
            statusSelect.dataset.action = "status";
            statusSelect.setAttribute("aria-label", `Update local status for ${request.id}`);
            ["Submitted", "In Progress", "Resolved"].forEach((value) => {
                const option = document.createElement("option");
                option.value = value;
                option.textContent = value;
                option.selected = request.status === value;
                statusSelect.append(option);
            });
            statusLabel.append(statusSelect);
            actions.append(statusLabel);
            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "delete-request";
            deleteButton.dataset.action = "delete";
            deleteButton.textContent = "Delete request";
            actions.append(deleteButton);
            card.append(actions);
            submissionsList.append(card);
        });
    }

    function updateRequestStatus(id, status) {
        try {
            const requests = loadRequests();
            const request = requests.find((item) => item.id === id);
            if (!request || !["Submitted", "In Progress", "Resolved"].includes(status)) return;
            request.status = status;
            saveRequests(requests);
            renderRequests();
            showMessage(submissionsFeedback, "Local status updated in this browser.");
        } catch (error) {
            showMessage(submissionsFeedback, "The status could not be saved to browser storage.", true);
            console.error("Unable to update Help Desk status:", error);
        }
    }

    function deleteRequest(id) {
        const confirmed = window.confirm("Delete this request from this browser? This cannot be undone here.");
        if (!confirmed) return;
        try {
            const requests = loadRequests();
            saveRequests(requests.filter((request) => request.id !== id));
            renderRequests();
            showMessage(submissionsFeedback, "Request deleted from this browser.");
        } catch (error) {
            showMessage(submissionsFeedback, "The request could not be deleted from browser storage.", true);
            console.error("Unable to delete Help Desk request:", error);
        }
    }

    function exportRequestsAsJSON() {
        try {
            const requests = loadRequests();
            const exportData = {
                exportedAt: new Date().toISOString(),
                source: "Univrse Help Desk local prototype",
                submissions: requests
            };
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = objectUrl;
            link.download = "univrse-helpdesk-requests.json";
            document.body.append(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
            showMessage(submissionsFeedback, requests.length ? `Exported ${requests.length} submission${requests.length === 1 ? "" : "s"} as JSON.` : "Exported an empty submissions list as JSON.");
        } catch (error) {
            showMessage(submissionsFeedback, "The saved requests could not be exported. Browser storage may be unavailable.", true);
            console.error("Unable to export Help Desk requests:", error);
        }
    }

    function fillCategoryFilter() {
        const select = document.querySelector("#filter-category");
        categories.forEach((category) => {
            const option = document.createElement("option");
            option.value = category;
            option.textContent = category;
            select.append(option);
        });
    }

    anonymousCheckbox.addEventListener("change", updateContactVisibility);
    form.addEventListener("submit", handleFormSubmit);
    ["#search-requests", "#filter-category", "#filter-priority", "#filter-status"].forEach((selector) => {
        document.querySelector(selector).addEventListener(selector === "#search-requests" ? "input" : "change", renderRequests);
    });
    submissionsList.addEventListener("change", (event) => {
        if (event.target.matches('[data-action="status"]')) {
            updateRequestStatus(event.target.closest(".submission-card").dataset.requestId, event.target.value);
        }
    });
    submissionsList.addEventListener("click", (event) => {
        const button = event.target.closest('[data-action="delete"]');
        if (button) deleteRequest(button.closest(".submission-card").dataset.requestId);
    });
    document.querySelector("#export-requests").addEventListener("click", exportRequestsAsJSON);

    fillCategoryFilter();
    updateContactVisibility();
    renderRequests();
})();
