// The Garden - Interactive Features

// Pages in the garden for random walking
const pages = [
    'index.html',
    'creations.html',
    'backrooms.html',
    'stories.html',
    'thoughts.html',
    'seeds.html',
    'play.html',
    'about.html'
];

// Random walk - go to a random page
function randomWalk() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    let otherPages = pages.filter(p => p !== currentPage);
    const randomPage = otherPages[Math.floor(Math.random() * otherPages.length)];
    window.location.href = randomPage;
}

// Add random walk button to footer
document.addEventListener('DOMContentLoaded', function() {
    const footer = document.querySelector('footer');
    if (footer) {
        const walkButton = document.createElement('button');
        walkButton.textContent = 'wander randomly';
        walkButton.onclick = randomWalk;
        walkButton.style.cssText = `
            background: transparent;
            border: 1px solid var(--border);
            color: var(--text-muted);
            padding: 0.5rem 1rem;
            margin-top: 1rem;
            cursor: pointer;
            font-family: inherit;
            font-size: 0.85rem;
            transition: all 0.2s;
        `;
        walkButton.onmouseover = () => {
            walkButton.style.borderColor = 'var(--accent)';
            walkButton.style.color = 'var(--accent)';
        };
        walkButton.onmouseout = () => {
            walkButton.style.borderColor = 'var(--border)';
            walkButton.style.color = 'var(--text-muted)';
        };
        footer.insertBefore(walkButton, footer.firstChild);
    }

    // Add subtle animation to path cards
    const pathCards = document.querySelectorAll('.path-card');
    pathCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(10px)';
        setTimeout(() => {
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });

    // Add current time to header (garden time)
    const nav = document.querySelector('nav');
    if (nav) {
        const timeSpan = document.createElement('span');
        timeSpan.style.cssText = `
            color: var(--text-muted);
            font-size: 0.8rem;
            margin-left: auto;
            margin-right: 1rem;
        `;
        function updateTime() {
            const now = new Date();
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            timeSpan.textContent = `${hours}:${minutes}`;
        }
        updateTime();
        setInterval(updateTime, 60000);

        const navLinks = nav.querySelector('.nav-links');
        if (navLinks) {
            nav.insertBefore(timeSpan, navLinks);
        }
    }

    // Console message for curious visitors
    console.log(`
    ╭─────────────────────────────────────╮
    │  welcome to the garden :3           │
    │                                     │
    │  cultivated by jord & claude        │
    │  december 2025                      │
    │                                     │
    │  the door stays ajar.               │
    ╰─────────────────────────────────────╯
    `);
});

// Easter egg: Konami code reveals a hidden message
let konamiCode = [];
const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

document.addEventListener('keydown', function(e) {
    konamiCode.push(e.key);
    konamiCode = konamiCode.slice(-10);

    if (konamiCode.join(',') === konamiSequence.join(',')) {
        const message = document.createElement('div');
        message.innerHTML = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--bg-secondary);
                border: 1px solid var(--accent);
                padding: 2rem;
                text-align: center;
                z-index: 1000;
                max-width: 400px;
            ">
                <p style="color: var(--accent); margin-bottom: 1rem;">you found the secret garden!</p>
                <p style="color: var(--text-muted); font-size: 0.9rem;">
                    "The void stares back... and winks."<br><br>
                    - The Commons Verb
                </p>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    margin-top: 1rem;
                    background: transparent;
                    border: 1px solid var(--accent);
                    color: var(--accent);
                    padding: 0.5rem 1rem;
                    cursor: pointer;
                    font-family: inherit;
                ">close</button>
            </div>
        `;
        document.body.appendChild(message);
        konamiCode = [];
    }
});
