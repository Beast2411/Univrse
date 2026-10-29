document.addEventListener("DOMContentLoaded", async () => {
    const clubsList = document.querySelector(".club-cards-list");
    const eventsList = document.querySelector(".event-list");
    const membershipCount = document.querySelector("#membershipCount");

    try {
        const response = await fetch("data/clubs.json");
        if (!response.ok) {
            throw new Error(`Could not load clubs: ${response.status}`);
        }

        const clubs = await response.json();

        clubs.forEach(club => {
            const card = document.createElement("article");
            card.className = "club-card";

            const header = document.createElement("header");
            header.className = "club-header";
            const icon = document.createElement("div");
            icon.className = `club-icon ${club.iconClass}`;
            icon.innerHTML = club.icon;
            const details = document.createElement("div");
            const name = document.createElement("h3");
            name.textContent = club.name;
            const members = document.createElement("span");
            members.className = "member-count";
            members.textContent = `${club.members} · ${club.category}`;
            details.append(name, members);

            let joinButton;
            if (club.joined) {
                joinButton = document.createElement("span");
                joinButton.className = "badge active-badge";
                joinButton.textContent = "Joined";
            } else {
                joinButton = document.createElement("button");
                joinButton.type = "button";
                joinButton.className = "btn-join";
                joinButton.textContent = "+ Join";
                joinButton.addEventListener("click", () => {
                    club.joined = true;
                    const badge = document.createElement("span");
                    badge.className = "badge active-badge";
                    badge.textContent = "Joined";
                    joinButton.replaceWith(badge);
                    updateMembershipCount(clubs, membershipCount);
                    alert(`You have successfully joined ${club.name}!`);
                });
            }
            header.append(icon, details, joinButton);

            const description = document.createElement("p");
            description.className = "club-desc";
            description.textContent = club.description;
            const footer = document.createElement("footer");
            footer.className = "club-footer";
            const nextEvent = document.createElement("span");
            nextEvent.className = "next-event";
            nextEvent.textContent = club.nextEvent;
            const viewButton = document.createElement("button");
            viewButton.type = "button";
            viewButton.className = "btn-outline";
            viewButton.textContent = "View Page";
            footer.append(nextEvent, viewButton);
            card.append(header, description, footer);
            clubsList.append(card);

            if (club.event) {
                const item = document.createElement("li");
                item.className = "event-item";
                const day = document.createElement("time");
                day.className = "event-date";
                day.textContent = club.event.day;
                const eventDetails = document.createElement("div");
                eventDetails.className = "event-details";
                const eventName = document.createElement("strong");
                eventName.textContent = club.event.name;
                const schedule = document.createElement("span");
                schedule.textContent = club.event.schedule;
                eventDetails.append(eventName, schedule);
                item.append(day, eventDetails);
                eventsList.append(item);
            }
        });

        updateMembershipCount(clubs, membershipCount);
    } catch (error) {
        console.error("Failed to load clubs data:", error);
        clubsList.textContent = "Unable to load clubs right now.";
        eventsList.textContent = "Unable to load events right now.";
    }
});

function updateMembershipCount(clubs, button) {
    const count = clubs.filter(club => club.joined).length;
    button.textContent = `My Memberships (${count})`;
}
