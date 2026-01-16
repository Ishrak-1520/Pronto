const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('Running migration...');

        const alterQuery = `
            ALTER TABLE users 
            ADD COLUMN google_id VARCHAR(255) UNIQUE NULL,
            ADD COLUMN avatar_url VARCHAR(255) NULL,
            ADD COLUMN company_name VARCHAR(255) NULL,
            ADD COLUMN job_role VARCHAR(255) NULL;
        `;

        await connection.query(alterQuery);
        console.log('Migration successful: Added google_id, avatar_url, company_name, job_role columns.');
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('Columns already exist. Skipping migration.');
        } else {
            console.error('Migration failed:', error);
        }
    } finally {
        await connection.end();
    }
}

migrate();
