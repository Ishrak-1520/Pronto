const db = require('../config/db');

async function debug() {
    try {
        const [users] = await db.query('SELECT id, name, email FROM users');
        console.log('--- USERS ---');
        console.log(JSON.stringify(users, null, 2));

        const [campaigns] = await db.query('SELECT id, user_id, title FROM campaigns');
        console.log('\n--- CAMPAIGNS ---');
        console.log(JSON.stringify(campaigns, null, 2));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debug();
