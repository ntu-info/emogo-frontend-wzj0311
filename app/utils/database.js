import * as SQLite from 'expo-sqlite';

let db;

export const initDatabase = async () => {
  if (db) return; // Already initialized
  try {
    db = await SQLite.openDatabaseAsync('emogo.db');
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        videoUri TEXT NOT NULL,
        assetId TEXT,
        sentiment INTEGER NOT NULL,
        latitude REAL,
        longitude REAL,
        timestamp TEXT NOT NULL
      );
    `);
    
    // Attempt to add assetId column if it doesn't exist (for migration)
    try {
      await db.execAsync('ALTER TABLE records ADD COLUMN assetId TEXT;');
    } catch (e) {
      // Column likely already exists
    }

    console.log('Database initialized');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error; // Re-throw to handle in caller
  }
};

export const insertRecord = async (videoUri, assetId, sentiment, latitude, longitude) => {
  try {
    if (!db) await initDatabase();
    const timestamp = new Date().toISOString();
    const result = await db.runAsync(
      'INSERT INTO records (videoUri, assetId, sentiment, latitude, longitude, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
      [videoUri, assetId, sentiment, latitude, longitude, timestamp]
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Error inserting record:', error);
    throw error;
  }
};

export const fetchRecords = async () => {
  try {
    if (!db) await initDatabase();
    const allRows = await db.getAllAsync('SELECT * FROM records ORDER BY timestamp DESC');
    return allRows;
  } catch (error) {
    console.error('Error fetching records:', error);
    return [];
  }
};
