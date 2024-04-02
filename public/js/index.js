document.addEventListener('DOMContentLoaded', function() {
    // Initialize socket connection
    const socket = io(); // This should be at the top level, ensuring 'socket' is accessible
    const urlParams = new URLSearchParams(window.location.search);
    const lobbyId = urlParams.get('lobbyId');
    const selectedCards = [];

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
            selectedCards.forEach(card => {
                document.querySelector(`[data-card='${card}']`).remove(); // You'll need to adjust how you identify cards
            });
            selectedCards = []; // Reset the selected cards
        }
    });

    socket.on('submissionError', (message) => {
        alert(message); // Display error message to the user
    });    
    
    // Assuming the 'socket' variable is your connected Socket.IO client instance
});