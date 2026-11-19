document.addEventListener("DOMContentLoaded", async () => {
    const clubsList = document.querySelector(".club-cards-list");
    const eventsList = document.querySelector(".event-list");
    const membershipsButton = document.querySelector("#membershipCount");
    const clubsSection = document.querySelector(".grid-left");
    const exploreButton = document.querySelector(".banner-actions .btn-primary");
    let showingMemberships = false;

    function updateMembershipCount(clubs) {
        const count = clubs.filter((club) => club.joined).length;
        membershipsButton.textContent = `My Memberships (${count})`;
    }

    function renderClub(club, clubs) {
        const card = document.createElement("article");
        card.className = "club-card";

        const header = document.createElement("header");
        header.className = "club-header";
        const icon = document.createElement("div");
        icon.className = `club-icon ${club.iconClass || ""}`;
        icon.textContent = club.icon || "★";

        const clubInfo = document.createElement("div");
        const name = document.createElement("h3");
        name.textContent = club.name || "Student organization";
        const members = document.createElement("span");
        members.className = "member-count";
        members.textContent = [club.members, club.category].filter(Boolean).join(" · ");
        clubInfo.append(name, members);

        const membership = document.createElement(club.joined ? "span" : "button");
        if (club.joined) {
            membership.className = "badge active-badge";
            membership.textContent = "Joined";
        } else {
            membership.type = "button";
            membership.className = "btn-join";
            membership.textContent = "+ Join";
            membership.addEventListener("click", () => {
                club.joined = true;
                const badge = document.createElement("span");
                badge.className = "badge active-badge";
                badge.textContent = "Joined";
                membership.replaceWith(badge);
                updateMembershipCount(clubs);
                card.hidden = showingMemberships ? false : card.hidden;
                window.alert(`You have successfully joined ${club.name}!`);
            });
        }
        header.append(icon, clubInfo, membership);

        const description = document.createElement("p");
        description.className = "club-desc";
        description.textContent = club.description || "";

        const footer = document.createElement("footer");
        footer.className = "club-footer";
        const nextEvent = document.createElement("span");
        nextEvent.className = "next-event";
        nextEvent.textContent = club.nextEvent || "No upcoming club event listed";
        const viewPage = document.createElement("button");
        viewPage.type = "button";
        viewPage.className = "btn-outline";
        viewPage.textContent = "View Page";
        viewPage.addEventListener("click", () => {
            window.alert(`${club.name}\n\n${club.description || ""}\n\n${club.nextEvent || "No upcoming event listed"}`);
        });
        footer.append(nextEvent, viewPage);
        card.append(header, description, footer);
        clubsList.append(card);
    }

    function renderEvent(event) {
        const item = document.createElement("li");
        item.className = "event-item";
        const day = document.createElement("time");
        day.className = "event-date";
        day.textContent = event.day || "—";
        const details = document.createElement("div");
        details.className = "event-details";
        const eventName = document.createElement("strong");
        eventName.textContent = event.name || "Club event";
        const schedule = document.createElement("span");
        schedule.textContent = event.schedule || "Schedule not listed";
        details.append(eventName, schedule);
        item.append(day, details);
        eventsList.append(item);
    }

    try {
        const response = await fetch("data/clubs.json");
        if (!response.ok) throw new Error(`Could not load clubs: ${response.status}`);
        const clubs = await response.json();
        if (!Array.isArray(clubs)) throw new Error("Club data must be an array.");

        clubs.forEach((club) => {
            renderClub(club, clubs);
            if (club.event) renderEvent(club.event);
        });
        updateMembershipCount(clubs);

        exploreButton?.addEventListener("click", () => {
            showingMemberships = false;
            clubsList.querySelectorAll(".club-card").forEach((card) => { card.hidden = false; });
            membershipsButton.textContent = `My Memberships (${clubs.filter((club) => club.joined).length})`;
            clubsSection.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        membershipsButton?.addEventListener("click", () => {
            showingMemberships = !showingMemberships;
            clubsList.querySelectorAll(".club-card").forEach((card) => {
                card.hidden = showingMemberships && !card.querySelector(".active-badge");
            });
            membershipsButton.textContent = showingMemberships
                ? "Show All Clubs"
                : `My Memberships (${clubs.filter((club) => club.joined).length})`;
            clubsSection.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        document.querySelector(".view-all")?.addEventListener("click", (event) => {
            event.preventDefault();
            eventsList.scrollIntoView({ behavior: "smooth", block: "center" });
        });
    } catch (error) {
        console.error("Failed to load clubs data:", error);
        clubsList.textContent = "Unable to load clubs right now.";
        eventsList.textContent = "Unable to load events right now.";
    }
});
