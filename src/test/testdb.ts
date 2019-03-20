import * as sqlite3 from 'sqlite3';

var db = new sqlite3.Database('./data/db/testdb.db');

db.close();
