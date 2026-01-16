const db = require('../config/db');

async function seedUser() {
    try {
        console.log('Seeding default user...');

        // Check if user 1 exists
        const [rows] = await db.query('SELECT id FROM users WHERE id = 1');

        if (rows.length === 0) {
            console.log('User 1 not found. Creating default user...');
            await db.query(`
                INSERT INTO users (id, email, full_name, business_name, role) 
                VALUES (1, 'demo@example.com', 'Demo User', 'My Business', 'ROLE_USER')
            `);
            console.log('User 1 created successfully.');
        } else {
            console.log('User 1 already exists.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seedUser();
