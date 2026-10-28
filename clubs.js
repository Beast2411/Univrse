document.addEventListener("DOMContentLoaded", async () => {
    try {
        const response = await fetch('clubs.json');
        
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
                alert(`You have successfully joined ${clubName}!`);
            }
        });
    });
});
