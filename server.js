// Required modules and setup
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session); // For storing session info in SQLite
const sqlite3 = require('sqlite3').verbose(); // For database operations

const app = express();

// Setting EJS as the template engine and specifying the views directory
app.set('view engine', 'ejs');
const path = require('path');
app.set('views', path.join(__dirname));

// Server port configuration
const PORT = process.env.PORT || 3000;

// Serving static files from the 'public' directory
app.use(express.static('public'));

// Default route for the landing page, showing different content based on login status
app.get('/', (req, res) => {
  res.render('LandingPage', {
    loggedIn: req.session && req.session.userId ? true : false,
    username: req.session && req.session.username ? req.session.username : ''
  });
});
app.use(express.static('.'));

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
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

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
