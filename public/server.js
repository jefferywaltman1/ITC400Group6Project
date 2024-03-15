// Required modules and setup
const express = require('express');
const session = require('express-session');
const socketIo = require('socket.io');
const http = require('http');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const SQLiteStore = require('connect-sqlite3')(session); // For storing session info in SQLite
const sqlite3 = require('sqlite3').verbose(); // For database operations



// Setting EJS as the template engine and specifying the views directory
app.set('view engine', 'ejs');
const path = require('path');
app.set('views', path.join(__dirname));

// Server port configuration
const PORT = process.env.PORT || 3000;

// Serving static files from the 'public' directory

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
app.use(session({
    store: new SQLiteStore({
        db: 'mydatabase.db',
        dir: './'
    }),
    secret: '642e745b83d3b9807cfabbf7352b0d6b08dee2dd8d10327e26ab566c8c918d5417953f869227200a38c91a6cc40194cc4c2d1a35d7ff879b25c9755dd74917f9',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: 'auto' }
}));

// Starting the server
//app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

// Database connection setup
const db = new sqlite3.Database('./mydatabase.db', sqlite3.OPEN_READWRITE, (err) => {
  if (err) return console.error(err.message);
  console.log('Connected to the SQLite database.');
});

// Navigation routes
// Each renders a page and passes session data for dynamic content based on login status
app.get('/login', (req, res) => {
  res.render('LoginScreen', { loggedIn: req.session.userId ? true : false, username: req.session.username || '' });
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

app.get('/Lobby', (req, res) => {
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

app.get('/CreateALobby', (req, res) => {
  res.render('CreateALobby', { loggedIn: req.session.userId ? true : false, username: req.session.username || '' });
});

app.get('/GameRoom', (req, res) => {
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
  const sql = 'SELECT * FROM users WHERE username = ? AND password = ?';

  db.get(sql, [username, password], (err, row) => {
      if (err) {
          res.status(500).send('Error accessing the database');
      } else if (row) {
          req.session.userId = row.id;
          req.session.username = row.username;
          res.redirect('/LandingPage');
      } else {
          res.send('Invalid username or password');
      }
  });
});

// User creation functionality
// Checks if the user already exists, inserts new user if not, and logs them in by setting session data
app.post('/create-user', (req, res) => {
  const { username, password } = req.body;
  
  // Check for existing user
  const sqlCheck = 'SELECT * FROM users WHERE username = ?';
  db.get(sqlCheck, [username], function(err, row) {
    if (err) {
      console.error(err.message);
      res.status(500).send('Error accessing the database.');
    } else if (row) {
      res.send('User already exists. Please choose a different username.');
    } else {
      // Insert new user
      const sqlInsert = 'INSERT INTO users (username, password) VALUES (?, ?)';
      
      db.run(sqlInsert, [username, password], function(err) {
        if (err) {
          console.error(err.message);
          res.status(500).send('Error creating new user.');
        } else {
          console.log(`A new user has been created with ID: ${this.lastID}`);
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

      // Redirect to the GameRoom with the newly created lobby's ID
      res.redirect(`/GameRoom?lobbyId=${this.lastID}`);
    }
  });
});

app.get('/Lobby', (req, res) => {
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
// Socket.IO connection handler
  io.on('connection', (socket) => {
    socket.on('joinLobby', ({ lobbyId }) => {
      if (!lobbyCounts[lobbyId]) {
          lobbyCounts[lobbyId] = 0;
      }
      lobbyCounts[lobbyId]++;
      socket.join(lobbyId);
      socket.lobbyId = lobbyId;

      // Update the player count in the database based on lobbyCounts
      updatePlayerCountInDb(lobbyId);

      // Emit the updated count to the lobby
      io.to(lobbyId).emit('updatePlayerCount', { count: lobbyCounts[lobbyId], lobbyId: lobbyId });
  });

  socket.on('disconnect', () => {
      const lobbyId = socket.lobbyId;
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
                  console.log(`Deleted empty lobby ${lobbyId}`);
              }
          });
      }
  });
}

// socketsIO
// Listen on the new server, not the app
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));