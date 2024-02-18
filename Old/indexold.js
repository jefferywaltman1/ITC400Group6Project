// Array representing the deck of cards
let deck = [];
for (let i = 1; i <= 45; i++) {
    deck.push(`${i}_dl.png`); // Adjust naming as necessary
}

let selectedCount = 0;

// Shuffle the deck
function shuffleDeck() {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

// Drawing a card from the deck
function drawCard() {
    if (deck.length > 0) {
        return deck.pop();
    } else {
        alert("No more cards in the deck!");
        return null;
    }
}

// Displaying the hand
function displayHand() {
    const handContainer = document.querySelector('.card-container');
    handContainer.innerHTML = ''; // Clear current hand

    for (let i = 0; i < 7; i++) {
        let cardImage = drawCard();
        if (cardImage) {
            const cardElement = document.createElement('div');
            cardElement.className = 'card';
            cardElement.innerHTML = `
                <div class="card-inner">
                    <div class="card-front">
                        <img src="/images/${cardImage}" alt="" class="card-img">
                    </div>
                    <div class="card-back">
                        <img src="/images/Cardback.png" alt="" class="card-img">
                    </div>
                </div>
            `;
            handContainer.appendChild(cardElement);
        }
    }
    enableCardSelection();
}

function setupPlayArea() {
    const playArea = document.querySelector('.play-area');
    playArea.innerHTML = ''; // Clear play area
    for (let i = 0; i < 8; i++) {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.style.filter = 'grayscale(100%)'; // Start with grayscale
        cardElement.innerHTML = `
            <div class="card-inner">
                <div class="card-front">
                    <img src="/images/Cardback.png" alt="" class="card-img">
                </div>
            </div>
        `;
        playArea.appendChild(cardElement);
    }
}

function enableCardSelection() {
    const cards = document.querySelectorAll('.card-container .card');
    cards.forEach(card => {
        card.addEventListener('click', function() {
            // Toggle the selection if the card is already selected
            if (this.classList.contains('selected')) {
                this.classList.remove('selected');
                this.style.marginTop = ""; // Reset style changes
                this.style.border = ""; // Reset style changes
                selectedCount--;
                revertPlayAreaCardColor(); // Function to revert the last changed play area card
            }
            // Otherwise, select the card if less than 4 are selected
            else if (selectedCount < 4) {
                this.classList.add('selected');
                this.style.marginTop = "-10px"; // Makes card hover
                this.style.border = "8px solid green"; // Adds green border
                this.style.backgroundColor = "green";
                this.style.borderRadius = "10px";
                selectedCount++;
                updatePlayArea();
            }
            // Show or hide the ready button based on the selection count
            if (selectedCount === 4) {
                showReadyButton();
            } else {
                hideReadyButton();
            }
        });
    });
}

function revertPlayAreaCardColor() {
    // Assuming there's a way to track the order in which play area cards have been changed
    // This example simply finds the last card that is not in grayscale and reverts it
    const playAreaCards = Array.from(document.querySelectorAll('.play-area .card')).filter(card => card.style.filter !== 'grayscale(100%)');
    const lastChangedCard = playAreaCards[playAreaCards.length - 1]; // Get the last changed card
    if (lastChangedCard) {
        lastChangedCard.style.filter = 'grayscale(100%)'; // Revert to grayscale
    }
}

function hideReadyButton() {
    const readyButton = document.getElementById('readyButton');
    if (readyButton && selectedCount < 4) {
        readyButton.remove(); // Or readyButton.style.display = 'none'; to hide instead of remove
    }
}

function updatePlayArea() {
    const playAreaCards = Array.from(document.querySelectorAll('.play-area .card'));
    // Correctly identifying the bottom row cards assuming the first 4 are top row and the last 4 are bottom row
    const bottomRowCards = playAreaCards.slice(4); // Gets the bottom row cards
    const firstGrayCardBottomRow = bottomRowCards.find(card => card.style.filter === 'grayscale(100%)');

    if (firstGrayCardBottomRow) {
        firstGrayCardBottomRow.style.filter = 'none'; // Changes the first grayscale card in the bottom row
    } else {
        // If all bottom row cards are already colored, start changing the top row from left to right
        const topRowCards = playAreaCards.slice(0, 4); // Gets the top row cards
        const firstGrayCardTopRow = topRowCards.find(card => card.style.filter === 'grayscale(100%)');
        if (firstGrayCardTopRow) {
            firstGrayCardTopRow.style.filter = 'none';
        }
    }
}

function showReadyButton() {
    let readyButton = document.getElementById('readyButton');
    if (!readyButton) {
        readyButton = document.createElement('button');
        readyButton.textContent = 'Ready';
        readyButton.id = 'readyButton';
        document.body.appendChild(readyButton); // Append directly to body to avoid layout issues
        readyButton.addEventListener('click', () => {
            console.log('Ready button clicked');
            // Implement the action for the Ready button here
        });
    }
    readyButton.style.display = 'block'; // Ensure it's visible
}

document.addEventListener('DOMContentLoaded', () => {
    shuffleDeck();
    displayHand();
    setupPlayArea(); // Setup play area
});

document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.card-container .card');

    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            const cardImageSrc = this.querySelector('.card-img').src;
            const cardDetailsDiv = document.getElementById('cardDetails');
            cardDetailsDiv.innerHTML = `<img src="${cardImageSrc}" alt="Card Image" style="width: 90%; position: relative; top: 10px; background-color: #2C2F33;">`;
        });
    
        card.addEventListener('mouseleave', function() {
            const cardDetailsDiv = document.getElementById('cardDetails');
            cardDetailsDiv.innerHTML = ''; // Clear the dynamically added content
        });
    });    
});
