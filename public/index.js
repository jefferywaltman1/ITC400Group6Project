// Navigate to Login Screen
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('LoginBox').addEventListener('click', function() {
        window.location.href = '/login'; // Point to the route, not the EJS file
    });
});
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('PlayNowLogin').addEventListener('click', function() {
        window.location.href = '/login'; // Point to the route, not the EJS file
    });
});
// Navigate to Landing Screen
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('DL_ICON').addEventListener('click', function() {
        window.location.href = '/LandingPage';
    });
});
// Navigate to How To Play Screen
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('LtoP').addEventListener('click', function() {
        window.location.href = '/HowToPlay';
    });
});
//Navigate to Gallery
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('gallery').addEventListener('click', function() {
        window.location.href = '/Gallery';
    });
});
//Navigate to Gallery
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('Lobby').addEventListener('click', function() {
        window.location.href = '/Lobby';
    });
});

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('CreateALobby').addEventListener('click', function() {
        window.location.href = '/CreateALobby';
    });
});

// Gallery Fucntion
fetch('/DLCardMetadata.csv')
.then(response => response.text())
.then(csv => {
    Papa.parse(csv, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            var tableBody = document.getElementById('cardsTable').getElementsByTagName('tbody')[0];
            results.data.forEach(function(row) {
                var tr = document.createElement('tr');
                
                var imgTd = document.createElement('td');
                var img = document.createElement('img');
                img.src = row['Internal ID (String)'];
                imgTd.appendChild(img);
                tr.appendChild(imgTd);
                
                tr.appendChild(createCell(row['Card Name (string)']));
                tr.appendChild(createCell(row['Type (String)']));
                tr.appendChild(createCell(row['Faction (String)']));

                var mightMindCell = createCell('');
                //mightMindCell.className = 'might-mind-cell';
                var mightMindValue = document.createTextNode(row['Value (Int)'] + ' ');
                mightMindCell.appendChild(mightMindValue);
                if (row['Might (Boolean)'] === '1') {
                    var mightIcon = document.createElement('img');
                    mightIcon.src = '/images/OtherAssets/mighticon.png';
                    mightIcon.className = 'might-mind-icon';
                    mightMindCell.appendChild(mightIcon);
                } else if (row['Mind (Boolean)'] === '1') {
                    var mindIcon = document.createElement('img');
                    mindIcon.src = '/images/OtherAssets/mindicon.png';
                    mindIcon.className = 'might-mind-icon';
                    mightMindCell.appendChild(mindIcon);
                }
                tr.appendChild(mightMindCell);

                var effectText = row['Effect (string)'];
                    if (row['Ability (Boolean)'] === '1') {
                        // Remove quotes from effectText if Ability is '0'
                        effectText = effectText.replace(/"/g, '');
                    }

                tr.appendChild(createCell(effectText));

                tableBody.appendChild(tr);
            });

            function createCell(text) {
                var td = document.createElement('td');
                td.textContent = text;
                return td;
            }
        }
    });
});

document.addEventListener('DOMContentLoaded', function() {
    // Reference the toggle switch and password field
    var lockGameToggle = document.getElementById('toggle');
    var passwordField = document.getElementById('lpassword');
    var passwordLabel = document.querySelectorAll('label[for="lname"]')[0];
  
    // Function to show/hide and clear password field
    function togglePasswordField() {
      if (lockGameToggle.checked) {
        passwordField.style.display = '';
        passwordLabel.style.display = '';
      } else {
        passwordField.style.display = 'none';
        passwordLabel.style.display = 'none';
        passwordField.value = ''; // Clear the password field when toggled off
      }
    }
  
    // Initial check in case the checkbox is checked by default
    togglePasswordField();
  
    // Event listener for change on the toggle
    lockGameToggle.addEventListener('change', togglePasswordField);
  });

  //connect to socket.io
  document.addEventListener('DOMContentLoaded', () => {
    const socket = io(); // Connect to the WebSocket server

    // Assume lobbyId is passed to this template somehow, e.g., via a global JS variable
    socket.emit('joinLobby', '<%= lobbyId %>'); // Send a message to join the lobby

    socket.on('playerJoined', (data) => {
      console.log(`A new player has joined lobby ${data.lobbyId}: Player ID ${data.playerId}`);
      // Update the UI accordingly
    });
  });