document.addEventListener('DOMContentLoaded', function() {
    // Initialize socket connection
    const socket = io(); // This should be at the top level, ensuring 'socket' is accessible
    const urlParams = new URLSearchParams(window.location.search);
    const lobbyId = urlParams.get('lobbyId');
    const selectedCards = [];
    const submitFlipBtn = document.querySelector('.SubmitFlip');
    const noticeText = document.getElementById('NoticeText');
    let selectionEnabled = true;
    document.getElementById('WaitFlipText').style.display = 'none';


    // Ensure we only try to join a lobby if we're actually in a GameRoom with a lobbyId
    if (lobbyId) {
        socket.emit('joinLobby', { lobbyId: lobbyId }); // Corrected from 'requestJoinLobby' based on your server code
    }

    socket.on('updatePlayerCount', ({ count, lobbyId: receivedLobbyId }) => {
        if (lobbyId === receivedLobbyId) {
            // Update the displayed player count for this lobby
            document.getElementById('playerCount').textContent = `Connected Players: ${count}`;
            
        }
    });

    // Listener for color change button
    document.getElementById('colorChangeButton')?.addEventListener('click', function() {
        const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16);
        socket.emit('colorChange', { color: randomColor, lobbyId: lobbyId });
    });

    // Listening for color update events from the server
    socket.on('updateColor', ({ color }) => {
        const button = document.getElementById('colorChangeButton');
        if (button) {
            button.style.backgroundColor = color;
        }
    });

    document.getElementById('dealCardButton').addEventListener('click', function() {
        socket.emit('requestDealCard'); // Request a card from the server
    });
    
    socket.on('dealCard', function(data) {
        // Assuming `data.card` is the path to the card image
        const hand = document.querySelector('.hand');
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        cardDiv.style.backgroundImage = `url(${data.card})`;

        // Add hover event listeners to show a larger preview
        cardDiv.addEventListener('mouseenter', function() {
            showCardPreview(data.card);
        });

        cardDiv.addEventListener('mouseleave', function() {
            clearCardPreview();
        });

        cardDiv.addEventListener('click', function() {
            toggleCardSelection(cardDiv, data.card); // Pass card image as argument
        });

        hand.appendChild(cardDiv);
    });

    function applySelectedCardStyles() {
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
            if (selectedCards.includes(card.style.backgroundImage)) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
    }
        // Function to toggle card selection
        function toggleCardSelection(cardDiv, cardImage) {
            // The backgroundImage includes `url("...")` wrapper, we need to extract the URL.
            const backgroundImageUrl = cardDiv.style.backgroundImage.slice(5, -2);
        
            if (selectedCards.includes(backgroundImageUrl)) {
                // Deselect card
                const index = selectedCards.indexOf(backgroundImageUrl);
                selectedCards.splice(index, 1);
                cardDiv.classList.remove('selected');
            } else {
                // Select card
                if (selectedCards.length < 4) {
                    selectedCards.push(backgroundImageUrl);
                    cardDiv.classList.add('selected');
                } else {
                    console.log("You can only select a maximum of 4 cards.");
                }
            }
            console.log(`Player selected ${selectedCards.length} card(s) out of 4.`);
        }        

    // Function to display the card preview
    function showCardPreview(cardImage) {
        const previewArea = document.querySelector('.CardPreviewArea');
        // Clear current preview
        previewArea.innerHTML = '<h1 class="CardPreviewText">Card Preview</h1>';
        const img = document.createElement('img');
        img.src = cardImage;
        img.style.width = '80%'; // Set width to 80% of its container
        img.style.margin = '0 10%'; // Set margin to 10% on both sides
        previewArea.appendChild(img);
    }    

    // Function to clear the card preview
    function clearCardPreview() {
        const previewArea = document.querySelector('.CardPreviewArea');
        previewArea.innerHTML = '<h1 class="CardPreviewText">Card Preview</h1>';
    }

    socket.on('lobbyInfo', ({ users }) => {
        const opponentUsername = users.find(u => u !== currentUserUsername); // currentUserUsername should be dynamically set to the logged-in user's username
        if (opponentUsername) {
            document.querySelector('.OpposingPlayerText').textContent = opponentUsername;
        } else {
            document.querySelector('.OpposingPlayerText').textContent = "Waiting on Another Player";
        }
    });

    socket.on('showStartPopup', function() {
        // Display the start popup when the event is received
        console.log('ShowStartPopup trigger');
        document.querySelector('.StartPopup').style.display = 'inline-flex';
      });
    
      // Handle the start button click event
      document.querySelector('.Startbutton').addEventListener('click', function() {
        // Hide the popup and possibly notify the server to start the game
        document.querySelector('.StartPopup').style.display = 'none';
        socket.emit('startGame', { lobbyId: lobbyId }); // You might want to implement this event on the server
      });

      socket.on('startPickingPhase', function() {
        document.querySelector('.PickFourText').style.display = 'block'; // Assuming default is 'none'
        document.querySelector('.SubmitHand').style.display = 'flex'; // Assuming default is 'none'
    });

    document.querySelector('.SubmitHand').addEventListener('click', function() {
        if (selectedCards.length === 4) {
            socket.emit('submitSelectedCards', { lobbyId: lobbyId, selectedCards: selectedCards });
        } else {
            alert('You must select 4 cards.');
        }
    });

    socket.on('updateGameField', ({ player, cards }) => {
        // Assuming you have a way to distinguish if the current user is the one who submitted
        if (currentUserUsername !== player) {
            // This means the opponent submitted their cards
            // Update the UI to reflect these changes, such as removing grayscale
            document.querySelectorAll('.opponent').forEach((card, index) => {
                if (index < cards.length) {
                    card.style.filter = 'none'; // Remove grayscale
                }
            });
        }
        // Remove the submitted cards from the player's hand
        if (currentUserUsername === player) {
            // Hide the "Select 4 Cards" and "Submit Hand" UI elements.
            document.querySelector('.PickFourText').style.display = 'none';
            document.querySelector('.SubmitHand').style.display = 'none';
            document.querySelector('.hand').style.display = 'none'; // Hide the player's hand.
    
            // Find all selected cards and remove them.
            document.querySelectorAll('.card.selected').forEach(card => {
                card.remove(); // Remove the card element from the DOM.
            });
            selectedCards = []; // Reset the selectedCards array.
        }
    });

    socket.on('submissionError', (message) => {
        alert(message); // Display error message to the user
    });
    
    socket.on('displaySubmittedCards', ({ username, cards }) => {
        // Only act if the current user is the one who submitted the cards
        if (currentUserUsername === username) {
            // Find the container where to append the cards (assuming the first 4 card slots are for the player)
            const cardSlots = document.querySelectorAll('.game-field .card-slot'); // Ensure your HTML has these containers
    
            // Iterate over each submitted card path and each card slot
            cards.forEach((cardPath, index) => {
                if (cardSlots[index]) { // Check if the card slot exists
                    const overlayCard = document.createElement('div');
                    overlayCard.className = 'fieldCard';
    
                    const cardInner = document.createElement('div');
                    cardInner.className = 'fieldCard-inner';
    
                    const cardFront = document.createElement('div');
                    cardFront.className = 'fieldCard-front';
                    cardFront.style.backgroundImage = `url(${cardPath})`;
    
                    const cardBack = document.createElement('div');
                    cardBack.className = 'fieldCard-back';
                    cardBack.style.backgroundImage = "url('/images/Cardback.png')";
    
                    cardInner.appendChild(cardFront);
                    cardInner.appendChild(cardBack);
                    overlayCard.appendChild(cardInner);
    
                    // Clear previous cards if needed
                    while (cardSlots[index].firstChild) {
                        cardSlots[index].removeChild(cardSlots[index].firstChild);
                    }
    
                    // Append the overlayCard to the specific card slot
                    cardSlots[index].appendChild(overlayCard);
                }
            });
        }
    });

    // Dynamically added field cards event delegation for showing card previews
    document.addEventListener('mouseenter', function(e) {
        if (e.target.classList.contains('fieldCard-front')) {
            // Assuming e.target.style.backgroundImage has the card image URL
            showCardPreview(e.target.style.backgroundImage.slice(5, -2)); // Remove `url("")` wrapper
        }
    }, true); // Use capture phase to ensure the event is captured before it bubbles down

    document.addEventListener('mouseleave', function(e) {
        if (e.target.classList.contains('fieldCard-front')) {
            clearCardPreview();
        }
    }, true);

    socket.on('bothPlayersSubmitted', function() {
        // Show SubmitFlip button and NoticeText when both players have submitted
        noticeText.style.display = 'block';
        document.querySelectorAll('.fieldCard').forEach(card => {
            card.addEventListener('click', selectToFlip);
        });

        bothPlayersSubmitted;
    });

    function selectToFlip(event) {
        if (!selectionEnabled) {
            console.log("Selection is disabled.");
            return; // Exit the function if selection is disabled
        }
        // Deselect any previously selected cards
        const previouslySelected = document.querySelector('.fieldCard.selected');
        if (previouslySelected) {
            previouslySelected.classList.remove('selected');
        }
    
        // Select the current card
        const selectedCard = event.currentTarget;
        selectedCard.classList.add('selected');
        
        // Find the front of the card to get the image URL
        const cardFront = selectedCard.querySelector('.fieldCard-front');
        if (cardFront) {
            const cardImageURL = cardFront.style.backgroundImage.slice(5, -2); // Extract URL
            
            // Set up the Flip Card button action
            submitFlipBtn.onclick = () => flipCard(cardImageURL);
            submitFlipBtn.style.display = 'block';
        }
    }  

    function flipCard(cardImageURL) {
        socket.emit('flipCard', { lobbyId, cardImage: cardImageURL });
        submitFlipBtn.style.display = 'none'; // Optionally hide the button again
        selectionEnabled = false; // Disable further card selection
    
        // Hide "Pick A Card To Flip" and show "Waiting For Opponent..."
        document.getElementById('NoticeText').style.display = 'none';
        document.getElementById('WaitFlipText').style.display = 'block';
    }

    socket.on('cardFlipped', ({ username, cardImage }) => {
        const selectedCard = document.querySelector('.fieldCard.selected');
        if (username !== currentUserUsername){
        }    else {
        if (selectedCard) {
        const flippedCardDiv = document.createElement('div');
        flippedCardDiv.className = 'flippedCard';
        flippedCardDiv.style.backgroundImage = `url(${cardImage})`;

        // If there's a specific container or positioning element around .fieldCard, ensure .flippedCard is inserted correctly within that structure
        const cardSlot = selectedCard.closest('.card-slot');
        if (cardSlot) {
            cardSlot.insertBefore(flippedCardDiv, selectedCard.nextSibling);
            selectedCard.remove(); // Remove or hide the original card
        }

        // Optionally, you can adjust styles or classes of the cardSlot to reflect the flipped state
        }}
    });
    
    socket.on('enableSelection', function() {
        // Re-enable card selection
        selectionEnabled = true;
        
        // Switch back to showing "Pick A Card To Flip" for the next action
        document.getElementById('NoticeText').style.display = 'block';
        document.getElementById('WaitFlipText').style.display = 'none';
    });
             
    // Assuming the 'socket' variable is your connected Socket.IO client instance
});