const express = require('express');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// Middleware to parse request bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Initialize SQLite database
const db = new sqlite3.Database('./mydatabase.db', (err) => {
  if (err) {
    console.error('Could not connect to database', err);
  } else {
    console.log('Connected to database');
    // Ensure the users table exists
    db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT)");
  }
});

// Route to handle user creation
app.post('/create-user', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], function(err) {
    if (err) {
      console.error('Error inserting user into database', err);
      res.status(500).send('Could not create user');
    } else {
      console.log(`A new user has been inserted with rowid: ${this.lastID}`);
      res.status(200).send('User created successfully');
    }
  });
});

// Route to handle login attempts
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      console.error('Database error', err);
      res.status(500).send('Error logging in');
      return;
    }
    if (user) {
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (passwordMatch) {
        console.log('Login successful');
        res.status(200).send('Login successful');
      } else {
        console.log('Password incorrect');
        res.status(401).send('Password incorrect');
      }
    } else {
      console.log('User not found');
      res.status(404).send('User not found');
    }
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
