const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sqlite3 = require('sqlite3').verbose();

// Open the database
let db = new sqlite3.Database('./mydatabase.db', (err) => {
  if (err) {
    console.error(err.message);
    throw err;
  } else {
    console.log('Connected to the SQLite database.');
    db.run(`CREATE TABLE user (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name text, 
            email text UNIQUE, 
            password text, 
            CONSTRAINT email_unique UNIQUE (email)
            )`,
      (err) => {
        if (err) {
            // Table already created
            console.log("Table already exists.");
        } else {
            // Table just created, creating some rows
            var insert = 'INSERT INTO user (name, email, password) VALUES (?,?,?)';
            db.run(insert, ["admin","admin@example.com","plaintextpassword"]);
            db.run(insert, ["user","user@example.com","mypassword"]);
        }
      });  
  }
});

// Close the database connection
db.close();

// Session middleware setup
app.use(session({
  secret: 'your secret key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Use `true` for HTTPS. `false` is okay for HTTP
}));

// Static files middleware (to serve CSS, JS, images etc.)
app.use(express.static('path_to_your_static_files'));

// Database initialization
let db = new sqlite3.Database('./your_database_name.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the SQLite database.');
});

// Close the database connection when the application closes
process.on('exit', () => {
  db.close();
});


// Example POST route for handling login
app.post('/login', (req, res) => {
    const { username, password } = req.body; // In a real app, ensure you hash and salt passwords
    const query = `SELECT * FROM users WHERE username = ? AND password = ?`;
  
    db.get(query, [username, password], (err, row) => {
      if (err) {
        res.status(500).send('Error accessing the database');
      } else if (row) {
        req.session.userId = row.id; // Assuming your user table has an 'id' column
        res.redirect('/dashboard'); // Redirect to a logged-in page
      } else {
        res.status(401).send('Invalid credentials');
      }
    });
  });

  app.get('/dashboard', (req, res) => {
    if (req.session.userId) {
      res.sendFile('path_to_dashboard.html');
    } else {
      res.redirect('/login');
    }
  });

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
  
  
  