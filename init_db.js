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
            password text, 
            )`,
      (err) => {
        if (err) {
            // Table already created
            console.log("Table already exists.");
        } else {
        }
      });  
  }
});

// Close the database connection
db.close();
