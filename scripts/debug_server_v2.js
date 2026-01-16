const db = require('../config/db');

async function debugCreateCampaignJSON() {
    console.log('\n--- DEBUG CREATE CAMPAIGN JSON ---');
    try {
        const userId = 8;
        const title = "JSON Test Campaign";
        const platform = "Instagram"; // We will stringify this
        const goal = "Sales";

        const [businesses] = await db.query('SELECT id FROM business_dna WHERE user_id = ? ORDER BY id DESC LIMIT 1', [userId]);
        const dnaId = businesses[0].id;

        console.log('Inserting Campaign with JSON platform...');
        const [result] = await db.query(
            `INSERT INTO campaigns (user_id, business_dna_id, title, primary_platforms, goal, status, created_at) VALUES (?, ?, ?, ?, ?, 'Draft', NOW())`,
            [userId, dnaId, title, JSON.stringify([platform]), goal]
        );
        console.log('Insert Success:', result.insertId);

    } catch (err) {
        console.error('CREATE CAMPAIGN ERROR:', err);
    } finally {
        process.exit();
    }
}

debugCreateCampaignJSON();
