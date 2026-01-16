const express = require('express');
const router = express.Router();
const db = require('../config/db');



// GET / - Show Dashboard
router.get('/', async (req, res) => {
    // 1. Auth Check
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }


    try {
        // Fetch Business DNA
        const [dnaRows] = await db.query('SELECT * FROM business_dna WHERE user_id = ? LIMIT 1', [req.session.user.id]);
        const dna = dnaRows[0] || null;

        if (dna) {
            if (typeof dna.tone_tags === 'string') dna.tone_tags = JSON.parse(dna.tone_tags);
            if (typeof dna.primary_colors === 'string') dna.primary_colors = JSON.parse(dna.primary_colors);
        }

        // Fetch all campaigns with business details
        // Note: We join with business_dna to get the business name, and a subquery for the thumbnail
        const query = `
            SELECT c.*, b.business_name,
            (SELECT file_path FROM assets WHERE campaign_id = c.id AND type = 'image' ORDER BY id DESC LIMIT 1) as thumbnail_url 
            FROM campaigns c 
            LEFT JOIN business_dna b ON c.business_dna_id = b.id 
            WHERE c.user_id = ?
            ORDER BY c.created_at DESC
        `;

        const [campaigns] = await db.query(query, [req.session.user.id]);

        res.render('dashboard', {
            user: req.session.user,
            campaigns,
            dna,
            title: 'Dashboard | Pronto'
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;
