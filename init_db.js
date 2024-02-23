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
