document.addEventListener("DOMContentLoaded", async () => {
    try {
        const response = await fetch('data/clubs.json');
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const clubsData = await response.json();
        console.log("Clubs data loaded successfully:", clubsData);
        
    } catch (error) {
        console.error("Failed to load clubs data:", error);
    }

    const joinButtons = document.querySelectorAll('.btn-join');

    joinButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const card = event.target.closest('.club-card');
            const clubName = card.querySelector('h3').textContent;

            if (button.textContent.trim() === '+ Join') {
                button.textContent = 'Joined';
                button.style.backgroundColor = '#EEECFE';
                button.style.color = '#5B52E1';
                button.classList.remove('btn-join');
                button.classList.add('badge', 'active-badge');
                alert(`You have successfully joined ${clubName}!`);
                updateMembershipLabel();
            }
        });
    });

    const clubsSection = document.querySelector('.grid-left');
    const clubs = [...document.querySelectorAll('.club-card')];
    const membershipsButton = document.querySelector('.banner-actions .btn-secondary');
    let showingMemberships = false;

    document.querySelector('.banner-actions .btn-primary')?.addEventListener('click', () => {
        showingMemberships = false;
        clubs.forEach(card => card.hidden = false);
        if (membershipsButton) membershipsButton.textContent = `My Memberships (${countMemberships()})`;
        clubsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    membershipsButton?.addEventListener('click', () => {
        showingMemberships = !showingMemberships;
        clubs.forEach(card => {
            const joined = Boolean(card.querySelector('.active-badge'));
            card.hidden = showingMemberships && !joined;
        });
        membershipsButton.textContent = showingMemberships
            ? 'Show All Clubs'
            : `My Memberships (${countMemberships()})`;
        clubsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    document.querySelectorAll('.club-card .btn-outline').forEach(button => {
        button.addEventListener('click', () => {
            const card = button.closest('.club-card');
            const name = card.querySelector('h3')?.textContent || 'Club';
            const description = card.querySelector('.club-desc')?.textContent || '';
            const nextEvent = card.querySelector('.next-event')?.textContent || '';
            alert(`${name}\n\n${description}\n\n${nextEvent}`);
        });
    });

    document.querySelector('.view-all')?.addEventListener('click', event => {
        event.preventDefault();
        document.querySelector('.event-list')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    updateMembershipLabel();

    function countMemberships() {
        return document.querySelectorAll('.club-card .active-badge').length;
    }

    function updateMembershipLabel() {
        if (membershipsButton && !showingMemberships) {
            membershipsButton.textContent = `My Memberships (${countMemberships()})`;
        }
    }
});
