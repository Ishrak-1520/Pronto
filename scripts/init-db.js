const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function initDb() {
    try {
        // Create connection without database to create it
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || ''
        });

        console.log('Connected to MySQL server.');

        const dbName = process.env.DB_NAME || 'pronto_db';
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        console.log(`Database '${dbName}' created or already exists.`);

        await connection.end();

        // Now connect to the database using the shared config or new connection
        // We need to require db.js inside here or create a new pool to ensure it picks up the DB check if it was missing? 
        // Actually db.js creates the pool on load. If we require it now, it should work fine if the DB exists.

        const db = require('../config/db');

        const schemaPath = path.join(__dirname, '../models/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Split queries by semicolon, filtering out empty ones
        const queries = schema.split(';').filter(q => q.trim().length > 0);

        console.log('Initializing database schema...');

        for (const query of queries) {
            if (query.trim()) {
                await db.query(query);
            }
        }

        console.log('Database initialization completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    }
}

initDb();
