const express = require('express');
const router = express.Router();
const db = require('../config/db');



// GET / - Show Dashboard
router.get('/', async (req, res) => {
    // 1. Auth Check - Passport uses req.user
    if (!req.user) {
        return res.redirect('/auth/login');
    }

    const userId = req.user.id;
    let campaigns = [];
    let dna = null;

    try {
        // Fetch Business DNA with specific fallback
        try {
            const [dnaRows] = await db.query('SELECT * FROM business_dna WHERE user_id = ? LIMIT 1', [userId]);
            dna = dnaRows[0] || null;

            if (dna) {
                if (typeof dna.tone_tags === 'string') dna.tone_tags = JSON.parse(dna.tone_tags);
                if (typeof dna.primary_colors === 'string') dna.primary_colors = JSON.parse(dna.primary_colors);
            }
        } catch (dnaErr) {
            console.error('Dashboard DNA Query Error:', dnaErr);
            // dna remains null, which is handled by the view
        }

        // Fetch all campaigns with specific fallback
        try {
            const query = `
                SELECT c.*, b.business_name,
                (SELECT file_path FROM assets WHERE campaign_id = c.id AND type = 'image' ORDER BY id DESC LIMIT 1) as thumbnail_url 
                FROM campaigns c 
                LEFT JOIN business_dna b ON c.business_dna_id = b.id 
                WHERE c.user_id = ?
                ORDER BY c.created_at DESC
            `;
            const [rows] = await db.query(query, [userId]);
            campaigns = rows || [];
        } catch (campErr) {
            console.error('Dashboard Campaigns Query Error:', campErr);
            campaigns = []; // Fallback to empty array
        }

        // Render with whatever data we successfully got
        res.render('dashboard', {
            user: req.user,
            campaigns: campaigns,
            dna: dna,
            title: 'Dashboard | Pronto',
            error: null
        });

    } catch (error) {
        console.error('Fatal Dashboard Error:', error);
        // Emergency fallback rendering to prevent 500
        res.render('dashboard', {
            user: req.user,
            campaigns: [],
            dna: null,
            title: 'Dashboard | Pronto',
            error: "We encountered a problem loading your dashboard data. Please try again later."
        });
    }
});

module.exports = router;
