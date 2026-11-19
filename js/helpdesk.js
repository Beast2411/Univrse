(() => {
    const categories = ["Technical Issue", "Academic Help", "Campus Issue", "Event or Club", "Suggestion / Feedback", "Other Request"];
    const form = document.querySelector("#helpdesk-form");
    const submitButton = document.querySelector("#submit-request");
    const anonymousCheckbox = document.querySelector("#request-anonymous");
    const contactFields = document.querySelector("#contact-fields");
    const submissionsList = document.querySelector("#submissions-list");
    const emptyMessage = document.querySelector("#submissions-empty");
    const submissionsFeedback = document.querySelector("#submissions-feedback");
    const formFeedback = document.querySelector("#form-feedback");
    const cancelEdit = document.querySelector("#cancel-edit");
    let requests = [];
    let editingId = null;
    let loadSequence = 0;
    let searchTimer = null;

    const escape = (value) => encodeURIComponent(value);
    function showMessage(element, message, isError = false) {
        element.textContent = message;
        element.classList.toggle("is-error", isError);
    }
    function setFieldError(fieldId, message) {
        const field = document.querySelector(`#${fieldId}`);
        const errorId = fieldId.replace("request-", "").replace("category", "category") + "-error";
        const error = document.querySelector(`#${errorId}`);
        if (error) error.textContent = message;
        if (field) {
            if (message) field.setAttribute("aria-invalid", "true");
            else field.removeAttribute("aria-invalid");
        }
    }
    function validateForm() {
        let valid = true;
        const category = document.querySelector("#request-category").value;
        const subject = document.querySelector("#request-subject").value.trim();
        const description = document.querySelector("#request-description").value.trim();
        ["request-category", "request-subject", "request-description", "request-name", "request-email"].forEach((id) => setFieldError(id, ""));
        if (!category.trim()) { setFieldError("request-category", "Choose a request category."); valid = false; }
        if (!subject) { setFieldError("request-subject", "Enter a subject."); valid = false; }
        if (!description) { setFieldError("request-description", "Enter a description."); valid = false; }
        if (!anonymousCheckbox.checked) {
            const name = document.querySelector("#request-name");
            const email = document.querySelector("#request-email");
            if (!name.value.trim()) { setFieldError("request-name", "Enter your name, or choose anonymous submission."); valid = false; }
            if (!email.value.trim()) { setFieldError("request-email", "Enter your email address, or choose anonymous submission."); valid = false; }
            else if (!email.checkValidity()) { setFieldError("request-email", "Enter a valid email address."); valid = false; }
        }
        return valid;
    }
    function updateContactVisibility() {
        contactFields.hidden = anonymousCheckbox.checked;
        document.querySelector("#request-name").required = !anonymousCheckbox.checked;
        document.querySelector("#request-email").required = !anonymousCheckbox.checked;
        if (anonymousCheckbox.checked) {
            document.querySelector("#request-name").value = "";
            document.querySelector("#request-email").value = "";
            setFieldError("request-name", "");
            setFieldError("request-email", "");
        }
    }
    function resetForm() {
        form.reset();
        editingId = null;
        document.querySelector("#request-form-title").textContent = "Submit a request";
        submitButton.textContent = "Submit Request";
        cancelEdit.hidden = true;
        updateContactVisibility();
        showMessage(formFeedback, "");
    }
    function queryString() {
        const params = new URLSearchParams();
        const values = {
            search: document.querySelector("#search-requests").value.trim(),
            category: document.querySelector("#filter-category").value,
            priority: document.querySelector("#filter-priority").value,
            status: document.querySelector("#filter-status").value
        };
        Object.entries(values).forEach(([key, value]) => { if (value) params.set(key, value); });
        const query = params.toString();
        return query ? `?${query}` : "";
    }
    async function loadRequests() {
        const sequence = ++loadSequence;
        showMessage(submissionsFeedback, "Loading requests from the backend...");
        emptyMessage.hidden = true;
        try {
            const data = await window.UNIVRSE_API.request(`/helpdesk${queryString()}`);
            if (!Array.isArray(data)) throw new Error("The Help Desk API returned an unexpected response.");
            if (sequence !== loadSequence) return;
            requests = data;
            renderRequests();
            showMessage(submissionsFeedback, `${requests.length} request${requests.length === 1 ? "" : "s"} loaded from the database.`);
        } catch (error) {
            if (sequence !== loadSequence) return;
            requests = [];
            submissionsList.replaceChildren();
            emptyMessage.hidden = true;
            showMessage(submissionsFeedback, `Could not load Help Desk requests: ${error.message}`, true);
            console.error("Unable to load Help Desk requests:", error);
        }
    }
    function addText(parent, tag, className, value) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        element.textContent = value;
        parent.append(element);
        return element;
    }
    function renderRequests() {
        submissionsList.replaceChildren();
        refreshCategoryFilter();
        if (!requests.length) {
            emptyMessage.hidden = false;
            const hasFilters = Boolean(queryString());
            emptyMessage.textContent = hasFilters ? "No requests match these filters." : "No requests have been submitted yet.";
            return;
        }
        emptyMessage.hidden = true;
        requests.forEach((request) => {
            const id = request._id;
            const card = document.createElement("article");
            card.className = "submission-card";
            card.dataset.requestId = id;
            const top = document.createElement("div");
            top.className = "submission-top";
            const identity = document.createElement("div");
            addText(identity, "p", "submission-id", `Request ${id}`);
            addText(identity, "h3", "submission-subject", request.subject || "Untitled request");
            top.append(identity);
            const priority = document.createElement("span");
            priority.className = `priority-label priority-${String(request.priority || "").toLowerCase()}`;
            priority.textContent = `${request.priority || "Priority unavailable"} priority`;
            top.append(priority);
            card.append(top);

            const details = document.createElement("div");
            details.className = "submission-details";
            addText(details, "span", "", request.category || "Category unavailable");
            const date = request.createdAt ? new Date(request.createdAt) : null;
            addText(details, "span", "submission-meta", `Submitted ${date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : "date unavailable"}`);
            const status = document.createElement("span");
            status.className = `status-label status-${String(request.status || "").toLowerCase().replaceAll(" ", "-")}`;
            status.textContent = request.status || "Status unavailable";
            details.append(status);
            if (request.isAnonymous) addText(details, "span", "submission-meta", "Anonymous");
            card.append(details);

            const description = document.createElement("details");
            description.className = "submission-description";
            addText(description, "summary", "", "View request details");
            const detailBody = document.createElement("p");
            detailBody.textContent = "Loading request details...";
            description.append(detailBody);
            description.addEventListener("toggle", async () => {
                if (!description.open || description.dataset.loaded === "true") return;
                try {
                    const record = await window.UNIVRSE_API.request(`/helpdesk/${escape(id)}`);
                    detailBody.textContent = record.description || "No description provided.";
                    description.dataset.loaded = "true";
                } catch (error) {
                    detailBody.textContent = `Request details are unavailable: ${error.message}`;
                    console.error("Unable to load request details:", error);
                }
            });
            card.append(description);

            const actions = document.createElement("div");
            actions.className = "submission-actions";
            const edit = document.createElement("button");
            edit.type = "button";
            edit.dataset.action = "edit";
            edit.textContent = "Edit request";
            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "delete-request";
            remove.dataset.action = "delete";
            remove.textContent = "Delete request";
            actions.append(edit, remove);
            card.append(actions);
            submissionsList.append(card);
        });
    }
    async function submitRequest(event) {
        event.preventDefault();
        showMessage(formFeedback, "");
        if (!validateForm()) {
            showMessage(formFeedback, "Please correct the highlighted fields.", true);
            form.querySelector('[aria-invalid="true"]')?.focus();
            return;
        }
        submitButton.disabled = true;
        const oldText = submitButton.textContent;
        submitButton.textContent = editingId ? "Saving changes..." : "Submitting...";
        const isAnonymous = anonymousCheckbox.checked;
        const body = {
            category: document.querySelector("#request-category").value,
            subject: document.querySelector("#request-subject").value.trim(),
            description: document.querySelector("#request-description").value.trim(),
            priority: document.querySelector("#request-priority").value,
            isAnonymous,
            submittedBy: isAnonymous ? null : {
                name: document.querySelector("#request-name").value.trim(),
                email: document.querySelector("#request-email").value.trim()
            }
        };
        try {
            const wasEditing = Boolean(editingId);
            const saved = await window.UNIVRSE_API.request(wasEditing ? `/helpdesk/${escape(editingId)}` : "/helpdesk", {
                method: wasEditing ? "PUT" : "POST", body: JSON.stringify(body)
            });
            resetForm();
            await loadRequests();
            showMessage(formFeedback, `${wasEditing ? "Request updated" : "Request submitted"}. Reference: ${saved._id}`);
        } catch (error) {
            showMessage(formFeedback, `The request could not be saved: ${error.message}`, true);
            console.error("Unable to save Help Desk request:", error);
        } finally {
            submitButton.disabled = false;
            if (editingId) submitButton.textContent = "Save changes";
            else if (oldText === "Saving changes..." || oldText === "Submitting...") submitButton.textContent = "Submit Request";
        }
    }
    async function editRequest(id) {
        showMessage(submissionsFeedback, "Loading request for editing...");
        try {
            const request = await window.UNIVRSE_API.request(`/helpdesk/${escape(id)}`);
            editingId = request._id;
            document.querySelector("#request-form-title").textContent = "Edit request";
            ensureCategoryOption(document.querySelector("#request-category"), request.category);
            document.querySelector("#request-category").value = request.category;
            document.querySelector("#request-subject").value = request.subject;
            document.querySelector("#request-description").value = request.description;
            document.querySelector("#request-priority").value = request.priority;
            anonymousCheckbox.checked = Boolean(request.isAnonymous);
            updateContactVisibility();
            if (!request.isAnonymous && request.submittedBy) {
                document.querySelector("#request-name").value = request.submittedBy.name || "";
                document.querySelector("#request-email").value = request.submittedBy.email || "";
            }
            submitButton.textContent = "Save changes";
            cancelEdit.hidden = false;
            form.scrollIntoView({ behavior: "smooth", block: "start" });
            document.querySelector("#request-subject").focus();
            showMessage(formFeedback, `Editing request ${request._id}.`);
            showMessage(submissionsFeedback, "Request loaded. Update the fields and save your changes.");
        } catch (error) {
            showMessage(submissionsFeedback, `Could not open this request: ${error.message}`, true);
            console.error("Unable to open Help Desk request:", error);
        }
    }
    async function deleteRequest(id) {
        if (!window.confirm("Delete this Help Desk request from the database? This cannot be undone.")) return;
        try {
            await window.UNIVRSE_API.request(`/helpdesk/${escape(id)}`, { method: "DELETE" });
            await loadRequests();
            showMessage(submissionsFeedback, "Request deleted from the database.");
        } catch (error) {
            showMessage(submissionsFeedback, `Request could not be deleted: ${error.message}`, true);
            console.error("Unable to delete Help Desk request:", error);
        }
    }
    async function exportRequests() {
        try {
            const data = await window.UNIVRSE_API.request("/helpdesk");
            const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), source: "Univrse Help Desk API", submissions: data }, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "univrse-helpdesk-requests.json";
            document.body.append(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
            showMessage(submissionsFeedback, `Exported ${data.length} database request${data.length === 1 ? "" : "s"} as JSON.`);
        } catch (error) {
            showMessage(submissionsFeedback, `Requests could not be exported: ${error.message}`, true);
        }
    }

    function ensureCategoryOption(select, category) {
        if (!category || [...select.options].some((option) => option.value === category)) return;
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        option.dataset.apiCategory = "true";
        select.append(option);
    }
    function refreshCategoryFilter() {
        const select = document.querySelector("#filter-category");
        const selected = select.value;
        select.querySelectorAll("option[data-api-category]").forEach((option) => option.remove());
        [...new Set([...categories, ...requests.map((request) => request.category).filter(Boolean)])]
            .forEach((category) => ensureCategoryOption(select, category));
        if ([...select.options].some((option) => option.value === selected)) select.value = selected;
    }
    categories.forEach((category) => ensureCategoryOption(document.querySelector("#filter-category"), category));
    anonymousCheckbox.addEventListener("change", updateContactVisibility);
    form.addEventListener("submit", submitRequest);
    cancelEdit.addEventListener("click", resetForm);
    document.querySelector("#export-requests").addEventListener("click", exportRequests);
    ["#search-requests", "#filter-category", "#filter-priority", "#filter-status"].forEach((selector) => {
        const control = document.querySelector(selector);
        control.addEventListener(selector === "#search-requests" ? "input" : "change", () => {
            window.clearTimeout(searchTimer);
            searchTimer = window.setTimeout(() => void loadRequests(), selector === "#search-requests" ? 250 : 0);
        });
    });
    submissionsList.addEventListener("click", (event) => {
        const button = event.target.closest("[data-action]");
        if (!button) return;
        const id = button.closest(".submission-card").dataset.requestId;
        if (button.dataset.action === "edit") void editRequest(id);
        if (button.dataset.action === "delete") void deleteRequest(id);
    });
    updateContactVisibility();
    void loadRequests();
})();
