document.addEventListener('DOMContentLoaded', function() {
    // Initialize socket connection
    const socket = io(); // This should be at the top level, ensuring 'socket' is accessible
    const urlParams = new URLSearchParams(window.location.search);
    const lobbyId = urlParams.get('lobbyId');

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

        hand.appendChild(cardDiv);
    });
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
    // Assuming the 'socket' variable is your connected Socket.IO client instance
});