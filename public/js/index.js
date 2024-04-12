document.addEventListener('DOMContentLoaded', function() {
    // Initialize socket connection
    const socket = io(); // This should be at the top level, ensuring 'socket' is accessible
    const urlParams = new URLSearchParams(window.location.search);
    const lobbyId = urlParams.get('lobbyId');
    let selectedCards = [];
    const submitFlipBtn = document.querySelector('.SubmitFlip');
    const noticeText = document.getElementById('NoticeText');
    const gameField = document.querySelector('.game-field');
    let selectionEnabled = true;
    let currentUserRole;
    let currentHand = [];
    document.getElementById('WaitFlipText').style.display = 'none';


    // Ensure we only try to join a lobby if we're actually in a GameRoom with a lobbyId
    if (lobbyId) {
        socket.emit('joinLobby', { lobbyId: lobbyId }); // Corrected from 'requestJoinLobby' based on your server code
    }

    socket.on('playerRole', function(data) {
        currentUserRole = data.role;
        console.log(`Current user role: ${currentUserRole}`); // Just for debugging
    });

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
        updateCurrentHandFromDOM();
        const username = currentUserUsername;
        console.log('current hand:', currentHand, 'username:', username);
        socket.emit('updateHand', { lobbyId: lobbyId, username: username, hand: currentHand });
    });

    function updateCurrentHandFromDOM() {
        currentHand = [];
        const cards = document.querySelectorAll('.hand .card');
        cards.forEach(card => {
            currentHand.push(card.style.backgroundImage.slice(5, -2)); // Remove `url("...")`
        });
    }

    gameField.addEventListener('mouseenter', function(event) {
        // Check if the event target (or any of its parents) has the class 'card' or 'flippedCard'
        let target = event.target;
        while (target && !target.classList.contains('card') && !target.classList.contains('flippedCard')) {
            target = target.parentElement;
        }

        // If a card was the source of the event and does not have the card back image, show its preview
        if (target && (target.classList.contains('card') || target.classList.contains('flippedCard'))) {
            const cardImageURL = target.style.backgroundImage.slice(5, -2); // Extract URL from `url("...")`
            
            // Exclude card back from preview
            if (cardImageURL !== '/images/Cardback.png') {
                showCardPreview(cardImageURL);
            }
        }
    }, true);

    gameField.addEventListener('mouseleave', function(event) {
        // Similar logic to determine if the event originated from a card
        let target = event.target;
        while (target && !target.classList.contains('card') && !target.classList.contains('flippedCard')) {
            target = target.parentElement;
        }

        // If a card was the source of the event, clear the preview
        if (target && (target.classList.contains('card') || target.classList.contains('flippedCard'))) {
            clearCardPreview();
        }
    }, true);

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
        socket.emit('startGame', { lobbyId: lobbyId });
      });

      socket.on('startPickingPhase', function() {
        console.log(selectedCards);
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
        console.log('Cards from displaySubmitted: ', cards)
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

        // Find the position of the card
        const position = selectedCard.closest('.card-slot').getAttribute('data-position');
        
        // Find the front of the card to get the image URL
        const cardFront = selectedCard.querySelector('.fieldCard-front');
        if (cardFront) {
            const cardImageURL = cardFront.style.backgroundImage.slice(5, -2); // Extract URL
            
            // Set up the Flip Card button action
            submitFlipBtn.onclick = () => flipCard(cardImageURL, position);
            submitFlipBtn.style.display = 'block';
        }
    }  

    function flipCard(cardImageURL, position) {
        socket.emit('flipCard', { lobbyId, cardImage: cardImageURL, position });
        
        submitFlipBtn.style.display = 'none'; // Hide the submit button after flipping
        selectionEnabled = false; // Disable selection after flipping a card
    
        // Update UI elements to indicate waiting state
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

    socket.on('opponentCardFlipped', ({ cardImage, position }) => {
        // Find the opponent's card slot based on the received position
        const opponentCardSlots = document.querySelectorAll('.opponent');
        const slotToReplace = opponentCardSlots[position]; // Find the correct slot
      
        if (slotToReplace) {
          // Replace the slot's background image with the flipped card image
          slotToReplace.style.backgroundImage = `url(${cardImage})`;
        }
      });

      socket.on('bothPlayersFlipped', function() {
        // Show the ScoreDiv by changing its display property
        document.querySelector('.ScoreDiv').style.display = 'inline-flex';
    });

    socket.on('updateScores', function({ player1Score, player2Score }) {
        // Assuming you know the client's role (player1 or player2), update the scores accordingly
        // For demonstration, let's assume currentUserRole is a variable you've set to 'player1' or 'player2'
        if (currentUserRole === 'player1') {
            document.querySelector('.PlayerScoreValue').textContent = player1Score;
            document.querySelector('.OpponentScoreValue').textContent = player2Score;
        } else {
            document.querySelector('.PlayerScoreValue').textContent = player2Score;
            document.querySelector('.OpponentScoreValue').textContent = player1Score;
        }
        console.log('UpdateScore Trigger');
    });
    
    socket.on('roundWinner', ({ winner }) => {
        // Handle 'Tie' situation
        let winnerText = winner === 'Tie' ? 'The round is a tie!' : `${winner} Wins the Round`;
    
        // Update the RoundWinPopup text with the winner
        document.querySelector('.RoundWinPopup .HeaderText').textContent = winnerText;
    
        // Display the RoundWinPopup
        document.querySelector('.RoundWinPopup').style.display = 'inline-flex';
    });
    
    socket.on('returnCardsToHand', function(data) {
        for (const [username, card] of Object.entries(data)) {
            if (username === currentUserUsername) {  // assuming currentUserUsername is the logged-in user's username
                const hand = document.querySelector('.hand');
                const cardDiv = document.createElement('div');
                cardDiv.className = 'card';
                cardDiv.style.backgroundImage = `url(${card})`;
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
            }
        }
    });

    socket.on('resetGameField', function() {
        console.log('Reset Game Field event received');
        
        // Resetting all cards to their back images and reapplying grayscale
        const allCards = document.querySelectorAll('.game-field .card');
        allCards.forEach(card => {
            card.style.backgroundImage = "url('/images/Cardback.png')";
            card.style.filter = 'grayscale(100%)'; // Reapply grayscale to make them look inactive
            card.classList.remove('selected', 'flippedCard'); // Remove selected or flipped classes if any
        });
    
        // Clear any dynamically added cards in the game field
        const cardSlots = document.querySelectorAll('.game-field .card-slot');
        cardSlots.forEach(slot => {
            while (slot.firstChild) {
                slot.removeChild(slot.firstChild); // Remove all child elements
            }
    
            // Optionally, re-add a default card back to each slot if that's the initial state
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card';
            cardDiv.style.backgroundImage = "url('/images/Cardback.png')";
            slot.appendChild(cardDiv);
        });
    
        // Reset scores displayed on the client side
        document.querySelector('.PlayerScoreValue').textContent = '0';
        document.querySelector('.OpponentScoreValue').textContent = '0';
    
        // Hide any gameplay specific notices or buttons that shouldn't be visible at the start
        document.getElementById('NoticeText').style.display = 'none';
        document.getElementById('WaitFlipText').style.display = 'none'; // Explicitly hide the WaitFlipText
        document.querySelector('.SubmitHand').style.display = 'none';
        document.querySelector('.PickFourText').style.display = 'block';
        document.querySelector('.SubmitFlip').style.display = 'none'; // Ensure flip card button is also hidden
        selectedCards = [];
        document.querySelectorAll('.card').forEach(card => {
            card.classList.remove('selected');
        });
    
        // Additional UI elements that might need resetting
        resetAdditionalUI();
    });
    
    function resetAdditionalUI() {
        // Reset any other UI elements as needed, e.g., clearing text fields, hiding modals, etc.
        document.querySelectorAll('.StartPopup').forEach(popup => {
            popup.style.display = 'none'; // Hide any popups
        });
    }

    socket.on('showHand', function() {
        // Assuming '.hand' is the class for the container of the hand cards
        document.querySelector('.hand').style.display = 'flex';  // Change 'flex' to your preferred display style
    });   
    
    const nextRoundButton = document.querySelector('.NextRoundButton');
    if (nextRoundButton) {
        nextRoundButton.addEventListener('click', function() {
            const roundWinPopup = document.querySelector('.RoundWinPopup');
            if (roundWinPopup) {
                roundWinPopup.style.display = 'none';  // Hide the popup
            }
        });
    }

    socket.on('gameOver', function(data) {
        const gameWinPopup = document.querySelector('.GameWinPopup');
        const headerText = gameWinPopup.querySelector('.HeaderText');
        if (data.winner === 'Tie') {
            headerText.textContent = `The Game is a Tie!`;
        } else {
            headerText.textContent = `${data.winner} Wins the Game!`;
        }
        gameWinPopup.style.display = 'inline-flex';
        
        // Optionally disable game interactions or setup a redirect
        // For example, disable buttons or hide elements
        document.querySelector('.SubmitHand').style.display = 'none';
        document.querySelector('.SubmitFlip').style.display = 'none';
    });    
    const exitGameButton = document.querySelector('.ExitGameButton');
    if (exitGameButton) {
        exitGameButton.addEventListener('click', function() {
            // Redirect to the lobby page
            window.location.href = '/Lobby';
        });
    }
    // Assuming the 'socket' variable is your connected Socket.IO client instance
});