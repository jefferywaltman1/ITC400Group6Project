const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const sqlite3 = require('sqlite3').verbose();

const app = express();

app.set('view engine', 'ejs');

const PORT = process.env.PORT || 3000;
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});
app.use(express.static('.'));


// Middlewares
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(express.json()); // for parsing application/json

// Session setup
app.use(session({
    store: new SQLiteStore({
        db: 'mydatabase.db',
        dir: './' // Directory where mydatabase.db is located
    }),
    secret: 'your secret key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: 'auto' }
}));

app.get('/loginS', (req, res) => {
  // Assuming 'LoginScreen.ejs' is in the 'views' directory and you want to pass any necessary data to it
  res.render('LoginScreen', { /* any data you want to pass to the template */ });
});


// Serve your static files
//app.use(express.static('/index.html, /index.js, /style.css, /LoginScreen.html, /HowToPlay.html, /Gallery.html, /DLCardMetadata.csv'));

// Your routes go here

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

const db = new sqlite3.Database('./mydatabase.db', sqlite3.OPEN_READWRITE, (err) => {
  if (err) return console.error(err.message);
  console.log('Connected to the SQLite database.');
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const sql = 'SELECT * FROM users WHERE username = ? AND password = ?';

  db.get(sql, [username, password], (err, row) => {
      if (err) {
          res.status(500).send('Error accessing the database');
      } else if (row) {
          req.session.userId = row.id; // Set user id in session
          req.session.username = row.username; // Set username in session
          res.redirect('/'); // Redirect to home page or dashboard
      } else {
          res.send('Invalid username or password');
      }
  });
});
app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/LoginScreen.html');
});

app.post('/create-user', (req, res) => {
  const { username, password } = req.body;
  // Ideally, you'll want to hash the password before storing it
  // For simplicity, this example does not include hashing
  const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';

  db.run(sql, [username, password], function(err) {
    if (err) {
      console.error(err.message);
      res.status(500).send('Error creating new user');
    } else {
      // "this.lastID" contains the id of the newly inserted user
      console.log(`A new user has been created with ID: ${this.lastID}`);
      // Redirect or respond as needed
      res.redirect('/login'); // Redirect to login page or wherever appropriate
    }
  });
});

//LogOut
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
      if (err) {
          return console.log(err);
      }
      res.redirect('/');
  });
});


