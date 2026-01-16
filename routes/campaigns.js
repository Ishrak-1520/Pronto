const express = require('express');
const router = express.Router();
const geminiService = require('../services/gemini');
const socialMediaService = require('../services/socialMedia');
const imageGeneratorService = require('../services/imageGenerator');
// const pollinationsService = require('../services/pollinations'); // Replaced by imageGenerator
const db = require('../config/db');



// GET / - Show Campaign Generator
// GET / - Show Campaign Generator
router.get('/', async (req, res) => {
    try {
        // 1. Fetch ALL businesses for dropdown
        const [businesses] = await db.query('SELECT id, business_name FROM business_dna WHERE user_id = ? ORDER BY id DESC', [req.session.user.id]);

        if (businesses.length === 0) {
            return res.redirect('/dna');
        }

        // 2. Determine active DNA (from query or default to latest)
        let dnaId = req.query.dna_id;
        if (!dnaId) {
            dnaId = businesses[0].id;
        }

        // 3. Fetch full DNA details
        const [rows] = await db.query('SELECT * FROM business_dna WHERE id = ? AND user_id = ?', [dnaId, req.session.user.id]);

        if (rows.length === 0) {
            // Fallback if ID invalid
            return res.redirect('/campaign');
        }

        const dna = rows[0];
        // Parse JSON fields if they come as strings from DB (handling potential double parsing)
        if (typeof dna.primary_colors === 'string') dna.primary_colors = JSON.parse(dna.primary_colors);
        if (typeof dna.tone_tags === 'string') dna.tone_tags = JSON.parse(dna.tone_tags);
        if (typeof dna.keywords_bn === 'string') dna.keywords_bn = JSON.parse(dna.keywords_bn);

        res.render('campaign', {
            dna,
            businesses,
            title: 'Campaign Studio | Pronto'
        });
    } catch (error) {
        console.error('Error loading campaign page:', error);
        res.status(500).send('Internal Server Error');
    }
});

// POST /generate - Generate Concepts using AI
// POST /generate - Generate Concepts using AI
router.post('/generate', async (req, res) => {
    const { goal, event, dna_id } = req.body;

    if (!goal || !dna_id) {
        return res.status(400).json({ success: false, error: 'Goal and Business Context (dna_id) are required' });
    }

    try {
        // 1. Fetch DNA
        const [rows] = await db.query('SELECT * FROM business_dna WHERE id = ? AND user_id = ?', [dna_id, req.session.user.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Business DNA not found or access denied' });
        }
        const dna = rows[0];

        // Parse fields for the service (crucial for accurate prompting)
        // Ensure parsing only if string, as db driver might auto-parse JSON columns sometimes? 
        // Safer to check type.
        if (typeof dna.tone_tags === 'string') dna.tone_tags = JSON.parse(dna.tone_tags);
        if (typeof dna.keywords_bn === 'string') dna.keywords_bn = JSON.parse(dna.keywords_bn);
        if (typeof dna.primary_colors === 'string') dna.primary_colors = JSON.parse(dna.primary_colors);


        // 2. Generate Concepts
        const concepts = await geminiService.generateCampaignConcepts(dna, goal, event);

        // 3. Return Results
        res.json({ success: true, concepts });

    } catch (error) {
        console.error('Campaign Generation Error:', error);
        res.status(500).json({ success: false, error: 'Failed to generate concepts. Please try again.' });
    }
});

// POST /create - Create a new campaign (Manual)
router.post('/create', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    const { title, platform, goal } = req.body; // 'goal' from form maps to objective/goal

    if (!title || !platform || !goal) {
        // Simple validation redirect or error (for MVP just redirect with error query? or render)
        // For simplicity as requested:
        return res.redirect('/campaign');
    }

    try {
        // Fetch the user's latest Business DNA to link (Required by DB)
        const [businesses] = await db.query('SELECT id FROM business_dna WHERE user_id = ? ORDER BY id DESC LIMIT 1', [req.session.user.id]);

        if (businesses.length === 0) {
            // Should not happen if middleware works, but handle it
            return res.redirect('/dna');
        }

        const dnaId = businesses[0].id;

        await db.query(
            `INSERT INTO campaigns (user_id, business_dna_id, title, primary_platforms, goal, status, created_at) VALUES (?, ?, ?, ?, ?, 'Draft', NOW())`,
            [req.session.user.id, dnaId, title, JSON.stringify([platform]), goal]
        );
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Create Campaign Error:', error);
        res.status(500).send('database error');
    }
});

// GET /delete/:id - Delete a campaign
router.get('/delete/:id', async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    const campaignId = req.params.id;
    try {
        await db.query('DELETE FROM campaigns WHERE id = ? AND user_id = ?', [campaignId, req.session.user.id]);
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Delete Error:', error);
        res.redirect('/dashboard');
    }
});

// POST /save - Save a selected concept (from AI) - Keeping this for AI flow if needed later
router.post('/save', async (req, res) => {
    const { goal, concept_data, dna_id } = req.body;

    if (!goal || !concept_data || !dna_id) {
        return res.status(400).json({ success: false, error: 'Missing data' });
    }

    try {
        await db.query(
            `INSERT INTO campaigns (user_id, business_dna_id, title, goal, concept_data, status, created_at) VALUES (?, ?, ?, ?, ?, 'draft', NOW())`,
            [req.session.user.id, dna_id, goal, goal, concept_data]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Save Campaign Error:', error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// POST /:id/generate-image
router.post('/:id/generate-image', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ success: false, error: 'Prompt is required' });
    }
    try {
        const imageUrl = await imageGeneratorService.generate(prompt);
        res.json({ success: true, imageUrl });
    } catch (error) {
        console.error('Image Generation Error:', error);
        res.status(500).json({ success: false, error: 'Failed to generate image' });
    }
});

// POST /:id/save-asset - Save generated asset to project
router.post('/:id/save-asset', async (req, res) => {
    const campaignId = req.params.id;
    const { type, file_path, caption } = req.body;

    if (!type || !file_path) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    try {
        await db.query(
            `INSERT INTO assets (user_id, campaign_id, type, file_path, caption, is_favorite) VALUES (?, ?, ?, ?, ?, 0)`,
            [req.session.user.id, campaignId, type, file_path, caption || '']
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Save Asset Error:', error);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

// GET /:id - Campaign Editor (Must be last)
router.get('/:id', async (req, res) => {
    const campaignId = req.params.id;

    try {
        // Fetch campaign and associated business DNA
        // Fetch campaign and associated business DNA
        const [rows] = await db.query(`
            SELECT c.*, b.business_name, b.industry, b.tone_tags, b.keywords_bn
            FROM campaigns c 
            LEFT JOIN business_dna b ON c.business_dna_id = b.id 
            WHERE c.id = ? AND c.user_id = ?
        `, [campaignId, req.session.user.id]);

        if (rows.length === 0) {
            return res.status(404).send('Campaign not found');
        }

        const campaign = rows[0];

        // Parse JSON concept data if needed
        if (typeof campaign.concept_data === 'string') {
            campaign.concept_data = JSON.parse(campaign.concept_data);
        }

        // Parse DNA fields
        if (typeof campaign.tone_tags === 'string') campaign.tone_tags = JSON.parse(campaign.tone_tags);
        if (typeof campaign.keywords_bn === 'string') campaign.keywords_bn = JSON.parse(campaign.keywords_bn);

        // Fetch assets for this campaign
        const [assets] = await db.query(
            `SELECT * FROM assets WHERE campaign_id = ? ORDER BY id DESC`,
            [campaignId]
        );

        res.render('editor', {
            campaign,
            assets,
            dna: {
                business_name: campaign.business_name,
                industry: campaign.industry,
                tone_tags: campaign.tone_tags,
                keywords_bn: campaign.keywords_bn
            },
            title: 'Editor | Pronto'
        });
    } catch (error) {
        console.error('Error loading editor:', error);
        res.status(500).send('Internal Server Error');
    }
});

// POST /:id/chat - The Copywriter Chat
router.post('/:id/chat', async (req, res) => {
    const campaignId = req.params.id;
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ success: false, error: 'Message is required' });
    }

    try {
        // Fetch Campaign + DNA
        const [rows] = await db.query(`
            SELECT c.*, b.business_name, b.industry, b.tone_tags, b.keywords_bn 
            FROM campaigns c 
            JOIN business_dna b ON c.business_dna_id = b.id 
            WHERE c.id = ? AND c.user_id = ?
        `, [campaignId, req.session.user.id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Campaign not found' });
        }

        const campaign = rows[0];
        const tone = JSON.stringify(campaign.tone_tags);
        const keywords = JSON.stringify(campaign.keywords_bn);

        // Construct System Persona
        const systemPrompt = `
        You are the Chief Marketing Officer (CMO) for "${campaign.business_name}", a business in the "${campaign.industry}" industry.
        
        YOUR BRAND DNA:
        - Tone: ${tone}
        - Keywords: ${keywords}
        
        CURRENT CAMPAIGN CONTEXT:
        - Title: ${campaign.title}
        - Goal: ${campaign.goal}
        - Concept Angle: ${campaign.concept_data?.angle || 'General Promotion'}
        
        USER REQUEST:
        "${message}"
        
        INSTRUCTIONS:
        - Answer as the CMO.
        - Strictly maintain the brand voice (e.g. if playful, be playful).
        - If asked for copy, provide options (English & Bengali if appropriate).
        - Keep responses concise, professional, and helpful.
        `;

        const reply = await geminiService.chatWithBrand(systemPrompt, message);

        res.json({ success: true, reply });

    } catch (error) {
        console.error('Chat Error:', error);
        res.status(500).json({ success: false, error: 'AI Chat failed' });
    }
});

// POST /:id/generate-text - Generate Headline/Caption/Strategy
router.post('/:id/generate-text', async (req, res) => {
    const campaignId = req.params.id;

    try {
        // 1. Fetch Campaign + DNA (Expanded Selection for Brand Alignment)
        const [rows] = await db.query(`
            SELECT c.*, b.business_name, b.industry, b.tone_tags, b.keywords_bn, b.imagery_style, b.primary_colors 
            FROM campaigns c 
            JOIN business_dna b ON c.business_dna_id = b.id 
            WHERE c.id = ? AND c.user_id = ?
        `, [campaignId, req.session.user.id]);

        if (rows.length === 0) {
            return res.status(404).send('Campaign not found');
        }

        const campaign = rows[0];

        // Parse JSON fields if they are strings
        if (typeof campaign.tone_tags === 'string') campaign.tone_tags = JSON.parse(campaign.tone_tags);
        if (typeof campaign.keywords_bn === 'string') campaign.keywords_bn = JSON.parse(campaign.keywords_bn);
        if (typeof campaign.primary_colors === 'string') campaign.primary_colors = JSON.parse(campaign.primary_colors);
        let platform = campaign.primary_platforms;
        if (typeof platform === 'string') {
            try {
                // It might be a JSON string of an array ["Instagram"] or just a string "Instagram"
                // The DB logic stores it as JSON.stringify([platform])
                const parsed = JSON.parse(platform);
                platform = Array.isArray(parsed) ? parsed.join(', ') : parsed;
            } catch (e) {
                // If parse fails, assume it's a plain string
            }
        }

        // 2. Call AI Service - STRICT BRAND ALIGNMENT
        const dna = {
            business_name: campaign.business_name,
            industry: campaign.industry,
            tone_tags: campaign.tone_tags,
            keywords_bn: campaign.keywords_bn,
            imagery_style: campaign.imagery_style || '', // Added imagery style
            primary_colors: campaign.primary_colors // Added palette if available in query (need to ensure SELECT fetches it)
        };

        const context = {
            title: campaign.title,
            platform: platform,
            goal: campaign.goal
        };

        const generatedData = await geminiService.generateCampaignCopy(dna, context);

        // 3. Update DB
        // We map the AI output to our schema. 
        // Note: Our DB stores 'concept_data' which has { headline_en, caption_bn, reasoning, ... }
        // The AI returns { headline_en, caption_bn, strategy_note }
        // We will map strategy_note -> reasoning

        // First, get existing concept_data to preserve visual_prompt if it exists
        let existingData = {};
        if (campaign.concept_data) {
            existingData = typeof campaign.concept_data === 'string' ? JSON.parse(campaign.concept_data) : campaign.concept_data;
        }

        const newConceptData = {
            ...existingData,
            headline_en: generatedData.headline_en,
            caption_bn: generatedData.caption_bn,
            reasoning: generatedData.strategy_note // Map strategy_note to reasoning
        };

        await db.query(`UPDATE campaigns SET concept_data = ? WHERE id = ?`, [JSON.stringify(newConceptData), campaignId]);

        // 4. Redirect
        res.redirect(`/campaign/${campaignId}`);

    } catch (error) {
        console.error('Generate Text Error:', error);
        res.status(500).send('Failed to generate text');
    }
});

// POST /:id/generate-visual-prompt - Refine Visual Prompt with Brand DNA
router.post('/:id/generate-visual-prompt', async (req, res) => {
    const campaignId = req.params.id;
    try {
        const [rows] = await db.query(`
            SELECT c.*, b.business_name, b.industry, b.tone_tags, b.imagery_style, b.primary_colors 
            FROM campaigns c 
            JOIN business_dna b ON c.business_dna_id = b.id 
            WHERE c.id = ? AND c.user_id = ?
        `, [campaignId, req.session.user.id]);

        if (rows.length === 0) return res.status(404).json({ success: false, error: 'Campaign not found' });

        const campaign = rows[0];

        // Parsing
        if (typeof campaign.tone_tags === 'string') campaign.tone_tags = JSON.parse(campaign.tone_tags);
        if (typeof campaign.primary_colors === 'string') campaign.primary_colors = JSON.parse(campaign.primary_colors);
        if (typeof campaign.concept_data === 'string') campaign.concept_data = JSON.parse(campaign.concept_data);

        const dna = {
            business_name: campaign.business_name,
            industry: campaign.industry,
            tone_tags: campaign.tone_tags,
            imagery_style: campaign.imagery_style,
            primary_colors: campaign.primary_colors
        };

        const context = {
            title: campaign.title,
            platform: campaign.primary_platforms, // Simplified
            concept: campaign.concept_data?.reasoning || campaign.title
        };

        const newPrompt = await geminiService.generateVisualPrompt(dna, context);

        // Update DB
        let conceptData = campaign.concept_data || {};
        conceptData.visual_prompt = newPrompt;

        await db.query(`UPDATE campaigns SET concept_data = ? WHERE id = ?`, [JSON.stringify(conceptData), campaignId]);

        res.json({ success: true, prompt: newPrompt });

    } catch (error) {
        console.error('Visual Prompt Gen Error:', error);
        res.status(500).json({ success: false, error: 'Failed to generate visual prompt' });
    }
});

const path = require('path');
const multer = require('multer');

// Configure Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, 'campaign-' + req.params.id + '-' + uniqueSuffix + path.extname(file.originalname))
    }
});

const upload = multer({ storage: storage });

// POST /:id/publish - Publish campaign
router.post('/:id/publish', async (req, res) => {
    const campaignId = req.params.id;
    try {
        // 1. Fetch Campaign
        const [rows] = await db.query('SELECT * FROM campaigns WHERE id = ? AND user_id = ?', [campaignId, req.session.user.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, error: 'Campaign not found' });

        const campaign = rows[0];

        // 2. Call Service
        const result = await socialMediaService.publish(campaign);

        // 3. Update DB
        if (result.success) {
            await db.query(`UPDATE campaigns SET status = 'Published', published_at = NOW() WHERE id = ?`, [campaignId]);
            res.json({ success: true, newStatus: 'Published' });
        } else {
            res.status(500).json({ success: false, error: 'Publishing failed' });
        }

    } catch (error) {
        console.error('Publish Error:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

module.exports = router;

// POST /:id/analyze-image - Analyze uploaded image and generate copy
router.post('/:id/analyze-image', upload.single('image'), async (req, res) => {
    const campaignId = req.params.id;
    const file = req.file;

    if (!file) {
        return res.redirect(`/campaign/${campaignId}`);
    }

    try {
        // 1. Update DB with Reference Image Path
        const imagePath = '/uploads/' + file.filename;
        await db.query('UPDATE campaigns SET reference_image = ? WHERE id = ?', [imagePath, campaignId]);

        // 2. Fetch Campaign + DNA
        const [rows] = await db.query(`
            SELECT c.*, b.business_name, b.industry, b.tone_tags, b.keywords_bn, b.imagery_style, b.primary_colors 
            FROM campaigns c 
            JOIN business_dna b ON c.business_dna_id = b.id 
            WHERE c.id = ? AND c.user_id = ?
        `, [campaignId, req.session.user.id]);

        if (rows.length === 0) {
            return res.status(404).send('Campaign not found');
        }

        const campaign = rows[0];

        // Parse JSON fields
        if (typeof campaign.tone_tags === 'string') campaign.tone_tags = JSON.parse(campaign.tone_tags);
        if (typeof campaign.keywords_bn === 'string') campaign.keywords_bn = JSON.parse(campaign.keywords_bn);
        if (typeof campaign.primary_colors === 'string') campaign.primary_colors = JSON.parse(campaign.primary_colors);

        // Handle platform parsing
        let platform = campaign.primary_platforms;
        if (typeof platform === 'string') {
            try {
                const parsed = JSON.parse(platform);
                platform = Array.isArray(parsed) ? parsed.join(', ') : parsed;
            } catch (e) { }
        }

        // 3. Prepare Data for AI
        const dna = {
            business_name: campaign.business_name,
            industry: campaign.industry,
            tone_tags: campaign.tone_tags,
            keywords_bn: campaign.keywords_bn,
            imagery_style: campaign.imagery_style || '',
            primary_colors: campaign.primary_colors
        };

        const context = {
            title: campaign.title,
            platform: platform,
            goal: campaign.goal
        };

        // 4. Call AI Service (Pass full file path for reading)
        const fullPath = path.join(__dirname, '..', 'public', 'uploads', file.filename);
        const generatedData = await geminiService.generateCampaignCopy(dna, context, fullPath);

        // 5. Update DB with Generated Content
        let existingData = {};
        if (campaign.concept_data) {
            existingData = typeof campaign.concept_data === 'string' ? JSON.parse(campaign.concept_data) : campaign.concept_data;
        }

        const newConceptData = {
            ...existingData,
            headline_en: generatedData.headline_en,
            caption_bn: generatedData.caption_bn,
            reasoning: generatedData.strategy_note
        };

        await db.query(`UPDATE campaigns SET concept_data = ? WHERE id = ?`, [JSON.stringify(newConceptData), campaignId]);

        // 6. Redirect
        res.redirect(`/campaign/${campaignId}`);

    } catch (error) {
        console.error('Image Analysis Error:', error);
        res.status(500).send('Failed to analyze image');
    }
});

