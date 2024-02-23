const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const app = express();
const port = 3000;

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Session middleware setup
app.use(session({
  secret: 'your secret key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true in production with HTTPS
}));

// Serve static files from a specified directory
app.use(express.static('public')); // Change 'public' to your static files directory path

// Database initialization
let db = new sqlite3.Database('./mydatabase.db', sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error(err.message);
    return;
  }
  console.log('Connected to the SQLite database.');
});

// Login handler
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const query = `SELECT * FROM users WHERE username = ?`;

  db.get(query, [username], async (err, row) => {
    if (err) {
      res.status(500).send('Error accessing the database');
      return;
    }
    if (row && await bcrypt.compare(password, row.password)) {
      req.session.userId = row.id; // Assuming your user table has an 'id' column
      res.redirect('/dashboard'); // Redirect to a logged-in page
    } else {
      res.status(401).send('Invalid credentials');
    }
  });
});

// Dashboard access
app.get('/dashboard', (req, res) => {
  if (req.session.userId) {
    res.sendFile(__dirname + '/path_to_dashboard.html'); // Update with the correct path
  } else {
    res.redirect('/login');
  }
});

// Create user handler
app.post('/create-user', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10); // Hash the password

  const query = `INSERT INTO users (username, password) VALUES (?, ?)`;
  db.run(query, [username, hashedPassword], function(err) {
    if (err) {
      console.error(err.message);
      res.send("Failed to create user.");
    } else {
      console.log(`A new row has been inserted with rowid ${this.lastID}`);
      res.send("User created successfully.");
    }
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// Ensure database connection is closed on server close
process.on('exit', () => {
  db.close();
});