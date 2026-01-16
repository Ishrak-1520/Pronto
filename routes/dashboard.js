const express = require('express');
const router = express.Router();
const db = require('../config/db');



// GET / - Show Dashboard
router.get('/', async (req, res) => {
    // 1. Auth Check - Passport uses req.user
    if (!req.user) {
        return res.redirect('/auth/login');
    }

    try {
        const userId = req.user.id;

        // Fetch Business DNA
        const [dnaRows] = await db.query('SELECT * FROM business_dna WHERE user_id = ? LIMIT 1', [userId]);
        const dna = dnaRows[0] || null;

        if (dna) {
            if (typeof dna.tone_tags === 'string') dna.tone_tags = JSON.parse(dna.tone_tags);
            if (typeof dna.primary_colors === 'string') dna.primary_colors = JSON.parse(dna.primary_colors);
        }

        // Fetch all campaigns with business details
        let query = `
            SELECT c.*, b.business_name,
            (SELECT file_path FROM assets WHERE campaign_id = c.id AND type = 'image' ORDER BY id DESC LIMIT 1) as thumbnail_url 
            FROM campaigns c 
            LEFT JOIN business_dna b ON c.business_dna_id = b.id 
            WHERE c.user_id = ?
            ORDER BY c.created_at DESC
        `;

        let [campaigns] = await db.query(query, [userId]);

        // Debug fallback: If no campaigns for this user, fetch ALL to verify UI
        if (campaigns.length === 0) {
            console.log("No campaigns for user, fetching all for debug UI...");
            const [allCampaigns] = await db.query(`
                SELECT c.*, b.business_name,
                (SELECT file_path FROM assets WHERE campaign_id = c.id AND type = 'image' ORDER BY id DESC LIMIT 1) as thumbnail_url 
                FROM campaigns c 
                LEFT JOIN business_dna b ON c.business_dna_id = b.id 
                ORDER BY c.created_at DESC LIMIT 5
            `);
            // Only use allCampaigns if specifically requested or if we want to show SOMETHING in UI
            // However, it's safer to stick to empty state if that's the intention
            // campaigns = allCampaigns; 
        }

        res.render('dashboard', {
            user: req.user,
            campaigns: campaigns || [],
            dna,
            title: 'Dashboard | Pronto'
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;
