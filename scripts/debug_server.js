const db = require('../config/db');

async function debugDashboard() {
    console.log('\n--- DEBUG DASHBOARD ---');
    try {
        const userId = 8; // empty@example.com (or whatever ID it is now)

        // 1. Fetch DNA
        console.log('Fetching DNA...');
        const [dnaRows] = await db.query('SELECT * FROM business_dna WHERE user_id = ? LIMIT 1', [userId]);
        console.log('DNA Found:', dnaRows.length > 0);

        // 2. Fetch Campaigns
        console.log('Fetching Campaigns...');
        const [campaigns] = await db.query('SELECT * FROM campaigns WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        console.log('Campaigns Found:', campaigns.length);
        console.log('Campaign Data:', JSON.stringify(campaigns, null, 2));

    } catch (err) {
        console.error('DASHBOARD ERROR:', err);
    }
}

async function debugCreateCampaign() {
    console.log('\n--- DEBUG CREATE CAMPAIGN ---');
    try {
        const userId = 8;
        const title = "Debug Campaign";
        const platform = "Instagram";
        const goal = "Sales";

        // 1. Fetch DNA ID
        const [businesses] = await db.query('SELECT id FROM business_dna WHERE user_id = ? ORDER BY id DESC LIMIT 1', [userId]);
        if (businesses.length === 0) {
            console.log('No DNA found for user!');
            return;
        }
        const dnaId = businesses[0].id;
        console.log('DNA ID:', dnaId);

        // 2. Insert Campaign
        console.log('Inserting Campaign...');
        const [result] = await db.query(
            `INSERT INTO campaigns (user_id, business_dna_id, title, primary_platforms, goal, status, created_at) VALUES (?, ?, ?, ?, ?, 'Draft', NOW())`,
            [userId, dnaId, title, platform, goal]
        );
        console.log('Insert Success:', result.insertId);

    } catch (err) {
        console.error('CREATE CAMPAIGN ERROR:', err);
    }
}

(async () => {
    // Get user ID first
    const [users] = await db.query('SELECT id FROM users WHERE email = ?', ['empty@example.com']);
    if (users.length === 0) {
        console.log('Test user not found!');
        process.exit(1);
    }
    console.log('Test User ID:', users[0].id);

    await debugDashboard();
    await debugCreateCampaign();
    process.exit();
})();
