const express = require('express');
const session = require('express-session');
const socketIo = require('socket.io');
const http = require('http');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const SQLiteStore = require('connect-sqlite3')(session); // For storing session info in SQLite
const sqlite3 = require('sqlite3').verbose(); // For database operations
const crypto = require('crypto');
const sharedsession = require("express-socket.io-session");
const fs = require('fs');
const csv = require('csv-parser');
const cardMetadata = {}

fs.createReadStream('public/DLCardMetadata.csv')
  .pipe(csv())
  .on('data', (row) => {
    const key = row['Internal ID (String)'].match(/\d+/)[0]; // Extracts number from string like '/images/23_dl.png'
    cardMetadata[key] = {
      Type: row['Type (String)'],
      Faction: row['Faction (String)'],
      Ability: row['Ability (Boolean)'] == 1, // Note the use of double equals
      Might: row['Might (Boolean)'] == 1,
      Mind: row['Mind (Boolean)'] == 1,
      Value: parseInt(row['Value (Int)'], 10),
      Priority: parseInt(row['Priority (int)'], 10),
    };
  })
  .on('end', () => {
    console.log('CSV file successfully processed');
    //console.log(cardMetadata);
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  });


// Setting EJS as the template engine and specifying the views directory
app.set('view engine', 'ejs');
const path = require('path');
app.set('views', path.join(__dirname));

// Default route for the landing page, showing different content based on login status
app.get('/', (req, res) => {
  res.render('LandingPage', {
    loggedIn: req.session && req.session.userId ? true : false,
    username: req.session && req.session.username ? req.session.username : ''
  });
});

app.use(express.static('public'));

// Middleware for parsing request bodies and session handling
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const sessionMiddleware = session({
  store: new SQLiteStore({
      db: 'mydatabase.db',
      dir: './'
  }),
  secret: '642e745b83d3b9807cfabbf7352b0d6b08dee2dd8d10327e26ab566c8c918d5417953f869227200a38c91a6cc40194cc4c2d1a35d7ff879b25c9755dd74917f9',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: 'auto' }
});

app.use(sessionMiddleware)

io.use(sharedsession(sessionMiddleware, {
  autoSave: true
}));

// Starting the server
//app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

// Database connection setup
const db = new sqlite3.Database('./mydatabase.db', sqlite3.OPEN_READWRITE, (err) => {
  if (err) return console.error(err.message);
  console.log('Connected to the SQLite database.');
});

//middleware authentication
function auth(req, res, next) {
  if (req.session.userId){
    next();
  } else {
    res.redirect('/login');
  }
}

// Navigation routes
// Each renders a page and passes session data for dynamic content based on login status
app.get('/login', (req, res) => {
  const errorMessage = req.query.error === 'invalid' ? 'Invalid username or password. Please try again.' : '';
  const existingUserError = req.query.existingUserError === 'invalidUser' ? 'User already exist. Please Try again.' : '';
  // Corrected logic here: Show error message when PassReqError equals 'passwordValidationFailed'
  const PassReqError = req.query.PassReqError === 'passwordValidationFailed' ? 'Your password did not meet the required criteria: Length: Must be between 8 and 64 characters long. Case Sensitivity: Must include at least one uppercase letter (A-Z) and one lowercase letter (a-z). Numbers: Must include at least one digit (0-9). Special Characters: May include special characters (!@#$%^&()-_=+{};:,.<>?/|[\\]`~).' : '';
  res.render('LoginScreen', {
    loggedIn: req.session.userId ? true : false,
    username: req.session.username || '',
    errorMessage: errorMessage,
    existingUserError: existingUserError,
    PassReqError: PassReqError // Correctly set the error message now
  });
});

app.get('/LandingPage', (req, res) => {
  res.render('LandingPage', { loggedIn: req.session.userId ? true : false, username: req.session.username || '' });
});

app.get('/HowToPlay', (req, res) => {
  res.render('HowToPlay', { loggedIn: req.session.userId ? true : false, username: req.session.username || '' });
});

app.get('/Gallery', (req, res) => {
  res.render('Gallery', { loggedIn: req.session.userId ? true : false, username: req.session.username || '' });
});

app.get('/Lobby', auth, (req, res) => {
  const sqlSelect = `SELECT * FROM lobbies WHERE playerCount < 2`; // Adjust this query as needed
  
  // Fetch lobby data from the database
  db.all(sqlSelect, [], (err, lobbies) => {
      if (err) {
          console.error(err.message);
          res.status(500).send('Error accessing the database.');
      } else {
          // Render the Lobby page with both login status and lobby data
          res.render('Lobby', {
              loggedIn: req.session.userId ? true : false,
              username: req.session.username || '',
              lobbies: lobbies // Pass the fetched lobby data
          });
      }
  });
});

app.get('/CreateALobby', auth, (req, res) => {
  res.render('CreateALobby', { loggedIn: req.session.userId ? true : false, username: req.session.username || '' });
});

//handle lobby searching
app.get('search-lobby')


app.get('/GameRoom', auth, (req, res) => {
  // Extract lobbyId from query parameters
  const lobbyId = req.query.lobbyId;

  // Here you would fetch lobby details from the database using lobbyId if needed
  // For simplicity, we'll assume the fetched details are directly rendered

  res.render('GameRoom', { 
    loggedIn: req.session.userId ? true : false, 
    username: req.session.username || '',
    lobbyId: lobbyId // Pass the lobbyId to your template
  });
});

// Login functionality
// Verifies user credentials against the database, sets session data, and redirects on success
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const sql = 'SELECT * FROM users WHERE username = ?';

  db.get(sql, [username], (err, row) => {
      if (err) {
          res.status(500).send('Error accessing the database');
      } else if (row) {
          // Hash the provided password with the stored salt
          const hash = crypto.pbkdf2Sync(password, row.salt, 1000, 64, `sha512`).toString(`hex`);
          // Compare the hashed password with the stored hash
          if (hash === row.hashed_password) {
              req.session.userId = row.id;
              req.session.username = row.username;
              res.redirect('/LandingPage');
          } else {
              res.redirect('/login?error=invalid');
          }
      } else {
        res.redirect('/login?error=invalid');
      }
  });
});

// User creation functionality
// Checks if the user already exists, inserts new user if not, and logs them in by setting session data
app.post('/create-user', (req, res) => {
  const { username, password } = req.body;

  // Check for existing user first
  const sqlCheck = 'SELECT * FROM users WHERE username = ?';
  db.get(sqlCheck, [username], function(err, row) {
    if (err) {
      console.error(err.message);
      return res.status(500).send('Error accessing the database.');
    } else if (row) {
      // If user exists, redirect with error
      return res.redirect('/login?existingUserError=invalidUser');
    } else {
      // Define the password regex pattern
      const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d!@#$%^&()-_=+{};:,.<>?\/|\[\]\\]{8,64}$/;

      // Proceed to check if the password matches the regex
      if (!passwordPattern.test(password)) {
        // If the password does not match, redirect or send an error message
        return res.redirect('/login?PassReqError=passwordValidationFailed');
      }

      // Password meets the requirements, generate a unique salt
      const salt = crypto.randomBytes(16).toString('hex');

      // Hash the password with the salt
      const hashedPassword = crypto.pbkdf2Sync(password, salt, 1000, 64, `sha512`).toString(`hex`);

      // Insert new user with hashed password and salt
      const sqlInsert = 'INSERT INTO users (username, hashed_password, salt) VALUES (?, ?, ?)';
      
      db.run(sqlInsert, [username, hashedPassword, salt], function(err) {
        if (err) {
          console.error(err.message);
          return res.status(500).send('Error creating new user.');
        } else {
          console.log(`A new user has been created with ID: ${this.lastID}`);
          // Assuming req.session is set up correctly
          req.session.userId = this.lastID;
          req.session.username = username;
          res.redirect('/LandingPage');
        }
      });
    }
  });
});

// Logout functionality
// Destroys the session and redirects to the login page
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
      if (err) {
          return console.log(err);
      }
      res.redirect('/login');
  });
});

// Add this function to initialize and shuffle a deck of 45 cards
// Initialize a map to hold a deck for each lobby
let lobbyDecks = {};

// Function to create and shuffle a deck
function initializeDeck() {
    let deck = Array.from({length: 45}, (_, i) => i + 1);
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

// Create a new deck for a lobby
function createDeckForLobby(lobbyId) {
    lobbyDecks[lobbyId] = initializeDeck();
}

// Assuming io, deck, and other relevant variables are already defined as in your initial setup

function dealCardToAllInLobby(lobbyId) {
  const deck = lobbyDecks[lobbyId];
  if (!deck || deck.length === 0) {
      console.log("Deck is empty or not initialized.");
      // Optionally, emit an event to inform clients the deck is empty or reset it
      return;
  }

  const socketIds = io.sockets.adapter.rooms.get(lobbyId);
  if (socketIds) {
      socketIds.forEach(socketId => {
          const socket = io.sockets.sockets.get(socketId);
          const card = deck.pop(); // Remove the last card from the deck
          socket.emit('dealCard', { card: `/images/${card}_dl.png` }); // Send the card to the individual socket
      });
  }
}
// lobbies
// Assuming 'db' is your SQLite connection and 'io' is your Socket.IO instance
app.post('/create-lobby', (req, res) => {
  const { LobbyName, password, toggle } = req.body;
  const isLocked = toggle ? 1 : 0;
  const hostUsername = req.session.username;

  // Initialize playerCount to 1 to include the host
  const playerCount = 1;

  const sqlInsert = `INSERT INTO lobbies (lobbyName, hostUsername, password, isLocked, playerCount) VALUES (?, ?, ?, ?, ?)`;

  db.run(sqlInsert, [LobbyName, hostUsername, password, isLocked, playerCount], function(err) {
    if (err) {
      console.error(err.message);
      res.status(500).send('Error creating lobby.');
    } else {
      console.log(`A new lobby has been created with ID: ${this.lastID}`);
      
      // After successfully creating a lobby, initialize a deck for this lobby
      createDeckForLobby(this.lastID); // Initialize the deck for the new lobby

      // Redirect to the GameRoom with the newly created lobby's ID
      res.redirect(`/GameRoom?lobbyId=${this.lastID}`);
    }
  });
});


app.get('/Lobby', auth, (req, res) => {
  const sqlSelect = `SELECT * FROM lobbies WHERE playerCount < 2`; // Select lobbies that are not full
  
  db.all(sqlSelect, [], (err, rows) => {
      if (err) {
          console.error(err.message);
          res.status(500).send('Error accessing the database.');
      } else {
          res.render('Lobby', {
              loggedIn: req.session.userId ? true : false,
              username: req.session.username || '',
              lobbies: rows // Pass the lobby data to the template
          });
      }
  });
});


//search lobbies
app.get('/search-lobby', (req, res) => {
  const searchQuery = req.query.SearchLobbyq;
  const sqlSelect = `SELECT * 
  FROM (
      -- Results of the fuzzy search
      SELECT *, 1 AS order_rank
      FROM lobbies 
      WHERE lobbyName LIKE '%${searchQuery}%' AND playercount < 2
      
      UNION ALL
      
      -- Results other than the fuzzy search
      SELECT *, 2 AS order_rank
      FROM lobbies 
      WHERE lobbyName NOT LIKE '%${searchQuery}%' AND playercount < 2
  ) AS combined_results
  ORDER BY order_rank, playercount;`;

  db.all(sqlSelect, [], (err, rows) => {
      if (err) {
          res.status(500).send('Error accessing the database.');
      } else {
          res.render('Lobby', {
              loggedIn: req.session.userId ? true : false,
              username: req.session.username || '',
              lobbies: rows // Pass the filtered lobby data to the template
          });
      }
  });
});

app.post('/join-lobby/:id', (req, res) => {
  const lobbyId = req.params.id;
  const maxPlayers = 2; // Define the maximum number of players allowed

  // Query to check if the lobby is full
  const sqlCheck = `SELECT playerCount FROM lobbies WHERE id = ?`;

  db.get(sqlCheck, [lobbyId], (err, row) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('Error accessing the database.');
    } else if (row && row.playerCount < maxPlayers) {
      // If the lobby is not full, update the playerCount
      
      const sqlUpdate = `UPDATE lobbies SET playerCount = playerCount + 1 WHERE id = ?`;

      db.run(sqlUpdate, [lobbyId], function(err) {
        if (err) {
          console.error(err.message);
          res.status(500).send('Error joining lobby.');
        } else {
          // Redirect to the GameRoom with the lobbyId as a query parameter
          res.redirect(`/GameRoom?lobbyId=${lobbyId}`);
        }
      });
    } else {
      // If the lobby is full, send an appropriate response
      res.send('Lobby is full.');
    }
  });
});

let lobbyCounts = {};
let lobbiesInfo = {};
// Socket.IO connection handler
  io.on('connection', (socket) => {
    const session = socket.handshake.session;
    
    socket.on('joinLobby', ({ lobbyId }) => {
      if (!lobbyCounts[lobbyId]) {
        lobbyCounts[lobbyId] = 0;
      }
      if (!lobbiesInfo[lobbyId]) {
        lobbiesInfo[lobbyId] = {
            users: [],
            player1Wins: 0,
            player2Wins: 0,
            readyPlayers: [],
            flippedCardsThisRound: [],
            RoundPlayed: 0,
            Discard: [],
            PlayedCards: {
              player1: [
                  { Type: "", Faction: "", Ability: false, Might: false, Mind: false, Value: false, Priority: 0, InternalID: "", State: 0 },
                  { Type: "", Faction: "", Ability: false, Might: false, Mind: false, Value: false, Priority: 0, InternalID: "", State: 0 },
                  { Type: "", Faction: "", Ability: false, Might: false, Mind: false, Value: false, Priority: 0, InternalID: "", State: 0 }
              ],
              player2: [
                  { Type: "", Faction: "", Ability: false, Might: false, Mind: false, Value: false, Priority: 0, InternalID: "", State: 0 },
                  { Type: "", Faction: "", Ability: false, Might: false, Mind: false, Value: false, Priority: 0, InternalID: "", State: 0 },
                  { Type: "", Faction: "", Ability: false, Might: false, Mind: false, Value: false, Priority: 0, InternalID: "", State: 0 }
              ]
            }
        };
      }
      const username = session.username;
      if (!lobbiesInfo[lobbyId].users.includes(username)) { // Corrected to target 'users' array
        lobbiesInfo[lobbyId].users.push(username);
      }

      lobbyCounts[lobbyId]++;
      socket.join(lobbyId);
      socket.lobbyId = lobbyId;

      io.in(lobbyId).emit('lobbyInfo', { users: lobbiesInfo[lobbyId].users });

      // Update the player count in the database based on lobbyCounts
      updatePlayerCountInDb(lobbyId);

      // Emit the updated count to the lobby
      io.to(lobbyId).emit('updatePlayerCount', { count: lobbyCounts[lobbyId], lobbyId: lobbyId });

      if (lobbyCounts[lobbyId] === 2) {
        io.to(lobbyId).emit('showStartPopup');
      }
      
      socket.on('requestDealCard', () => {
        const lobbyId = socket.lobbyId; // Make sure this is correctly assigned when a socket joins a lobby
        if (lobbyId) {
          dealCardToAllInLobby(lobbyId);
        }
      });      
  });

  socket.on('startGame', ({ lobbyId }) => {
    const username = socket.handshake.session.username;

    if (!lobbiesInfo[lobbyId].player1) {
      // This is the first player starting the game
      lobbiesInfo[lobbyId].player1 = username;
      console.log('Player 1 set to', lobbiesInfo[lobbyId].player1);
  } else if (!lobbiesInfo[lobbyId].player2 && lobbiesInfo[lobbyId].player1 !== username) {
      // This is the second distinct player starting the game
      lobbiesInfo[lobbyId].player2 = username;
      console.log('Player 2 set to', lobbiesInfo[lobbyId].player2);
  }

    if (username === lobbiesInfo[lobbyId].player1) {
      socket.emit('playerRole', { role: 'player1' });
  } else if (username === lobbiesInfo[lobbyId].player2) {
      socket.emit('playerRole', { role: 'player2' });
  }

    if (!lobbiesInfo[lobbyId].readyPlayers.includes(username)) {
      lobbiesInfo[lobbyId].readyPlayers.push(username);
    }

    // If both players are ready, start the game
    if (lobbiesInfo[lobbyId].readyPlayers.length === 2) {
      // Reset win counts for a new game
      lobbiesInfo[lobbyId].player1Wins = 0;
      lobbiesInfo[lobbyId].player2Wins = 0;

      // Deal 7 cards to each player
      for (let i = 0; i < 7; i++) {
        dealCardToAllInLobby(lobbyId);
      }

      // Notify players that the game has started
      io.to(lobbyId).emit('gameStarted');
      io.to(lobbyId).emit('startPickingPhase');
    }
  });

  socket.on('disconnect', () => {
      const lobbyId = socket.lobbyId;
      const username = socket.handshake.session.username;

      if (lobbyId && lobbiesInfo[lobbyId]) {
        // Use the correct property .users to access the array and find the index
        const index = lobbiesInfo[lobbyId].users.indexOf(username);
        if (index !== -1) {
          lobbiesInfo[lobbyId].users.splice(index, 1); // Remove username from users array
        }
        io.in(lobbyId).emit('lobbyInfo', { users: lobbiesInfo[lobbyId].users });
      }

      if (lobbyId && lobbyCounts[lobbyId]) {
          lobbyCounts[lobbyId]--;

          // Update the database with the new count
          updatePlayerCountInDb(lobbyId);

          if (lobbyCounts[lobbyId] === 0) {
              delete lobbyCounts[lobbyId];
              // Optionally, delete the lobby if it's empty
              deleteLobbyIfEmpty(lobbyId);
          }
      }
  });
  
  socket.on('colorChange', ({ color, lobbyId }) => {
    // Broadcast to all in the room, including the sender
    io.in(lobbyId).emit('updateColor', { color });
  });

socket.on('submitSelectedCards', ({ lobbyId, selectedCards }) => {
    const username = socket.handshake.session.username;

    if (selectedCards.length === 4) {
        if (!lobbiesInfo[lobbyId]) {
            lobbiesInfo[lobbyId] = { submittedCards: {}, player1: null, player2: null };
        }

        if (!lobbiesInfo[lobbyId].submittedCards) {
            lobbiesInfo[lobbyId].submittedCards = {};
        }

        // Store the submitted cards for the user
        lobbiesInfo[lobbyId].submittedCards[username] = selectedCards;

        // Notify the opponent immediately that this player has submitted their cards
        const opponentUsername = Object.keys(lobbiesInfo[lobbyId].users).find(u => u !== username);
        if (opponentUsername) {
            io.in(lobbyId).emit('updateGameField', {
                player: username, // Emitting 'username' indicates who the submission is from
                cards: selectedCards // This could be replaced with a placeholder if actual cards should not be revealed
            });
        }
    } else {
        socket.emit('error', { message: 'You must select exactly 4 cards.' });
    }

    io.in(lobbyId).emit('displaySubmittedCards', {
      username: username,
      cards: lobbiesInfo[lobbyId].submittedCards[username]
    });

    if (Object.keys(lobbiesInfo[lobbyId].submittedCards).length === 2) { // Assuming 2 players per lobby
      io.in(lobbyId).emit('bothPlayersSubmitted');
  }
});

socket.on('flipCard', ({ lobbyId, cardImage, position}) => {
  const username = socket.handshake.session.username;
  let playerRole = username === lobbiesInfo[lobbyId].player1 ? 'player1' : 'player2';
  const cardId = cardImage.split('/')[2].split('_')[0];;
  const cardData = cardMetadata[cardId];

  if (username === lobbiesInfo[lobbyId].player1) {
    playerRole = 'player1';
  } else if (username === lobbiesInfo[lobbyId].player2) {
    playerRole = 'player2';
  }

  const opponentPosition = 3 - position; // Assuming 0-indexed positions and a total of 4 slots

  if (playerRole) {
    // Assuming you want to update the first available slot for the player
    const playedCards = lobbiesInfo[lobbyId].PlayedCards[playerRole];
    const firstAvailableSlot = playedCards.find(card => !card.InternalID);

    if (firstAvailableSlot) {
      firstAvailableSlot.InternalID = cardImage;
      firstAvailableSlot.Type = cardData.Type;
      firstAvailableSlot.Faction = cardData.Faction;
      firstAvailableSlot.Ability = cardData.Ability == 1;
      firstAvailableSlot.Might = cardData.Might == 1;
      firstAvailableSlot.Mind = cardData.Mind == 1;
      firstAvailableSlot.Value = parseInt(cardData.Value, 10);
      firstAvailableSlot.Priority = parseInt(cardData.Priority, 10); // Update with the card image as the InternalID
    } else {
      console.log(`No available slot to assign the flipped card for ${username}.`);
    }

    // Broadcast the flipped card info
    io.in(lobbyId).emit('cardFlipped', { username, cardImage });

    // Here, you can add logic to handle what happens after the card is flipped, such as checking for matches or updating scores.
  } else {
    console.log(`Could not determine player role for username: ${username}`);
  }

  if (lobbiesInfo[lobbyId] && username) {
      if (!lobbiesInfo[lobbyId].flippedCardsThisRound.includes(username)) {
          lobbiesInfo[lobbyId].flippedCardsThisRound.push(username);
      }

      // Broadcast the flipped card info
      io.in(lobbyId).emit('cardFlipped', { username, cardImage });

      if (lobbiesInfo[lobbyId].flippedCardsThisRound.length === 1) {
        lobbiesInfo[lobbyId].firstFlipInfo = {
          username: username,
          cardImage: cardImage,
          position: position,
          socketId: socket.id  // Store the socket ID of the first player
      };
        lobbiesInfo[lobbyId].flippedCardsThisRound.push(username);
      } else if (lobbiesInfo[lobbyId].flippedCardsThisRound.length === 0) {
        // Just record the username of the player who flipped the card if it's the first flip
        lobbiesInfo[lobbyId].flippedCardsThisRound.push(username);
      } else if (lobbiesInfo[lobbyId].flippedCardsThisRound.length >= 2) {
          const firstPlayerFlip = lobbiesInfo[lobbyId].firstFlipInfo;
          if (firstPlayerFlip.username !== username) {
            // Send the first player's flip to the second player
            socket.emit('opponentCardFlipped', firstPlayerFlip);
      
          if (lobbiesInfo[lobbyId].firstFlipInfo && lobbiesInfo[lobbyId].firstFlipInfo.socketId) {
            const firstPlayerSocketId = lobbiesInfo[lobbyId].firstFlipInfo.socketId;
            io.to(firstPlayerSocketId).emit('opponentCardFlipped', { username, cardImage, position });
          }
          }
          const player1Score = lobbiesInfo[lobbyId].PlayedCards.player1.reduce((acc, card) => acc + card.Value, 0);
          const player2Score = lobbiesInfo[lobbyId].PlayedCards.player2.reduce((acc, card) => acc + card.Value, 0);

          // Emit an event with the scores to both players in the lobby
          io.to(lobbyId).emit('updateScores', { player1Score, player2Score });
          io.to(lobbyId).emit('bothPlayersFlipped');
          lobbiesInfo[lobbyId].flippedCardsThisRound = [];
          delete lobbiesInfo[lobbyId].firstFlipInfo;

          const allCardsFilled = (playedCards) => {
            return playedCards.every(card => card.InternalID !== "");
        };

          if (allCardsFilled(lobbiesInfo[lobbyId].PlayedCards.player1) && allCardsFilled(lobbiesInfo[lobbyId].PlayedCards.player2)) {
            // Determine round winner based on scores
            let winner;
            if (player1Score > player2Score) {
                winner = lobbiesInfo[lobbyId].player1;
                lobbiesInfo[lobbyId].player1Wins++;
            } else if (player2Score > player1Score) {
                winner = lobbiesInfo[lobbyId].player2;
                lobbiesInfo[lobbyId].player2Wins++;
            } else {
                lobbiesInfo[lobbyId].player1Wins++;
                lobbiesInfo[lobbyId].player2Wins++;
                winner = 'Tie'; // Handle a tie situation
            }
            lobbiesInfo[lobbyId].RoundPlayed++;

            console.log('-P1 Score: ',player1Score, ' -P2 Score:' ,player2Score,' -Winner: ', winner, 'P1Wins:', lobbiesInfo[lobbyId].player1Wins,'P2Wins:', lobbiesInfo[lobbyId].player2Wins )

            const playerReturnCards = returnUnplayedCardToHand(lobbyId);
            //console.log('playerReturnCards:', playerReturnCards)
            io.to(lobbyId).emit('returnCardsToHand', playerReturnCards);
            moveToDiscard(lobbyId);
            // Emit round winner event after 3 seconds
            setTimeout(() => {
                io.to(lobbyId).emit('roundWinner', { winner });
            }, 3000);
            resetGameField(lobbyId);
            if (lobbiesInfo[lobbyId].RoundPlayed !== 2) {
              // Emit an event to all clients in the lobby to show the hand
              io.to(lobbyId).emit('showHand');
              dealCardToAllInLobby(lobbyId);
              
          }else{
            dealCardToAllInLobby(lobbyId);
          }
        }
        else{
           // Emit an event to re-enable selection
           io.in(lobbyId).emit('enableSelection');
        }
      }
  }
  //console.log(`Played cards by Player 1 (${lobbiesInfo[lobbyId].player1}):`, lobbiesInfo[lobbyId].PlayedCards.player1);
  //console.log(`Played cards by Player 2 (${lobbiesInfo[lobbyId].player2}):`, lobbiesInfo[lobbyId].PlayedCards.player2);
});
});

function updatePlayerCountInDb(lobbyId) {
  // Use the current count from lobbyCounts for the specified lobbyId
  const currentCount = lobbyCounts[lobbyId] || 0;
  const sqlUpdate = `UPDATE lobbies SET playerCount = ? WHERE id = ?`;

  db.run(sqlUpdate, [currentCount, lobbyId], (err) => {
      if (err) {
          console.error(`Error updating player count in the database for lobby ${lobbyId}: ${err.message}`);
      } else {
          console.log(`Set player count for lobby ${lobbyId} to ${currentCount}.`);
      }
  });
}

function deleteLobbyIfEmpty(lobbyId) {
  db.get(`SELECT playerCount FROM lobbies WHERE id = ?`, [lobbyId], (err, row) => {
      if (err || !row) {
          console.error(err?.message || "Lobby not found.");
          return;
      }
      if (row.playerCount <= 0) {
          db.run(`DELETE FROM lobbies WHERE id = ?`, [lobbyId], (err) => {
              if (err) {
                  console.error(`Error deleting empty lobby: ${err.message}`);
              } else {
                  removeDeckForLobby(lobbyId); // Clean up the deck for the deleted lobby
                  console.log(`Deleted empty lobby ${lobbyId}`);
              }
          });
      }
  });
}
//remove deck function to manage memory
function removeDeckForLobby(lobbyId) {
  if (lobbyDecks[lobbyId]) {
      delete lobbyDecks[lobbyId]; // Remove the deck from the map
      console.log(`Deck for lobby ${lobbyId} removed.`);
  }
}

function moveToDiscard(lobbyId) {
  const player1Cards = lobbiesInfo[lobbyId].PlayedCards.player1;
  const player2Cards = lobbiesInfo[lobbyId].PlayedCards.player2;

  player1Cards.forEach(card => {
      if (card.InternalID) {
          lobbiesInfo[lobbyId].Discard.push(card.InternalID);
          card.InternalID = ""; // Optionally clear the InternalID if you're resetting the card
      }
  });

  player2Cards.forEach(card => {
      if (card.InternalID) {
          lobbiesInfo[lobbyId].Discard.push(card.InternalID);
          card.InternalID = ""; // Optionally clear the InternalID if you're resetting the card
      }
  });

  // Emit an update to clients if needed
  io.to(lobbyId).emit('discardUpdated', { discard: lobbiesInfo[lobbyId].Discard });
}

function returnUnplayedCardToHand(lobbyId) {
  const players = ['player1', 'player2'];
  const playerReturnCards = {};

  players.forEach(player => {
    let submittedCardPaths; // Declare variable outside of if/else to increase scope

    if (player === 'player1') {
      submittedCardPaths = lobbiesInfo[lobbyId].submittedCards[lobbiesInfo[lobbyId].player1];
    } else {
      submittedCardPaths = lobbiesInfo[lobbyId].submittedCards[lobbiesInfo[lobbyId].player2];
    }
    
    const playedCardIDs = lobbiesInfo[lobbyId].PlayedCards[player].map(card => card.InternalID.split('/')[2].split('_')[0]);

        // Find unplayed card paths
        const unplayedCardPaths = submittedCardPaths.filter(path => {
            const cardId = path.split('/')[2].split('_')[0];
            return !playedCardIDs.includes(cardId);
        });

        console.log('unplayedCardPaths:', unplayedCardPaths);
        if (player === 'player1') {
          playerReturnCards[lobbiesInfo[lobbyId].player1] = unplayedCardPaths[0]; // Just taking the first unplayed card for this example
      }else{
          playerReturnCards[lobbiesInfo[lobbyId].player2] = unplayedCardPaths[0];
      }
    });
    return playerReturnCards;
}

function resetGameField(lobbyId) {
  // Reset Played Cards
  console.log('reset Called');
  const players = ['player1', 'player2'];
  players.forEach(player => {
      lobbiesInfo[lobbyId].PlayedCards[player].forEach(card => {
          card.Type = "";
          card.Faction = "";
          card.Ability = false;
          card.Might = false;
          card.Mind = false;
          card.Value = false;
          card.Priority = 0;
          card.InternalID = "";
          card.State = 0;
      });
  });

  // Optionally reset scores or other game state elements here
  lobbiesInfo[lobbyId].flippedCardsThisRound = [];

  // Notify all clients in the lobby to reset their game fields
  io.to(lobbyId).emit('resetGameField');
}
