const db = require('../config/db');

async function checkSchema() {
    try {
        const [usersCols] = await db.query('DESCRIBE users');
        console.log('--- USERS TABLE ---');
        usersCols.forEach(c => console.log(c.Field));

        const [dnaCols] = await db.query('DESCRIBE business_dna');
        console.log('\n--- BUSINESS_DNA TABLE ---');
        dnaCols.forEach(c => console.log(c.Field));

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
