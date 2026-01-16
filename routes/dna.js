const express = require('express');
const router = express.Router();
const crawlerService = require('../services/crawler');
const geminiService = require('../services/gemini');
const db = require('../config/db');

// GET /dna
router.get('/', (req, res) => {
    res.render('dna', {
        title: 'Business DNA Setup - Pronto',
        dna: null,
        error: null,
        url: ''
    });
});

// POST /analyze
router.post('/analyze', async (req, res) => {
    if (!req.user) return res.redirect('/auth/login');
    const { website_url } = req.body;

    if (!website_url) {
        return res.render('dna', {
            title: 'Business DNA Setup - Pronto',
            error: 'Website URL is required',
            dna: null,
            url: website_url
        });
    }

    try {
        // 1. Crawl URL
        const crawlResult = await crawlerService.scanWebsite(website_url);

        // 2. Analyze with Gemini
        const analysis = await geminiService.analyzeBusinessDNA(crawlResult.textContent, { images: crawlResult.images });

        // Ensure some fields exist
        analysis.website_url = website_url;
        analysis.extracted_images = crawlResult.images;

        // Helper to ensure array
        const ensureArray = (val) => {
            if (Array.isArray(val)) return val;
            if (typeof val === 'string') {
                try {
                    const parsed = JSON.parse(val);
                    if (Array.isArray(parsed)) return parsed;
                } catch (e) {
                    return [val]; // Return as single item array if string but not json array
                }
            }
            return [];
        };

        // Sanitize arrays from Gemini
        analysis.primary_colors = ensureArray(analysis.primary_colors);
        analysis.fonts = ensureArray(analysis.fonts);
        analysis.tone_tags = ensureArray(analysis.tone_tags);
        analysis.keywords_bn = ensureArray(analysis.keywords_bn);
        analysis.keywords_en = ensureArray(analysis.keywords_en);

        // Log to debug what we got
        console.log('Sanitized DNA:', JSON.stringify(analysis, null, 2));

        res.render('dna', {
            title: 'Business DNA Setup - Pronto',
            dna: analysis,
            error: null,
            url: website_url
        });

    } catch (error) {
        console.error('Analysis failed:', error);
        res.render('dna', {
            title: 'Business DNA Setup - Pronto',
            error: 'Failed to analyze website. Please check the URL/backend logs and try again.',
            dna: null,
            url: website_url
        });
    }
});

// POST /save
router.post('/save', async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const { dna_data } = req.body;
    // Save to DB implementation
    try {
        const [result] = await db.query(
            `INSERT INTO business_dna 
            (user_id, website_url, business_name, industry, primary_colors, fonts, tone_tags, keywords_bn, keywords_en, imagery_style, confidence_score) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.id,
                dna_data.website_url,
                dna_data.business_name,
                dna_data.industry,
                JSON.stringify(dna_data.primary_colors),
                JSON.stringify(dna_data.fonts),
                JSON.stringify(dna_data.tone_tags),
                JSON.stringify(dna_data.keywords_bn),
                JSON.stringify(dna_data.keywords_en),
                dna_data.imagery_style,
                dna_data.confidence_score
            ]
        );
        res.json({ success: true, id: result.insertId });
    } catch (error) {
        console.error('Save failed:', error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

module.exports = router;
