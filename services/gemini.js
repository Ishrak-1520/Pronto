const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const LONGCAT_API_KEY = process.env.LONGCAT_API_KEY;
const LONGCAT_URL = 'https://api.longcat.chat/openai/v1/chat/completions';

const analyzeBusinessDNA = async (text, options = {}) => {
    try {
        // Truncate text if it's too huge (Longcat has a large context, but let's be safe)
        const safeText = text.slice(0, 30000);

        const prompt = `
        You are a branding expert. Analyze this website text and extract the "Business DNA".
        Return ONLY a raw JSON object (no markdown, no backticks).
        
        Website Text:
        "${safeText}"

        JSON Structure required:
        {
            "business_name": "Name of business",
            "industry": "Industry niche",
            "primary_colors": ["#HexCode1", "#HexCode2"],
            "fonts": ["FontName1", "FontName2"],
            "tone_tags": ["Professional", "Playful", etc],
            "keywords_bn": ["Keyword1", "Keyword2"],
            "keywords_en": ["Keyword1", "Keyword2"],
            "imagery_style": "Description of visual style",
            "confidence_score": 85
        }
        `;

        const response = await axios.post(
            LONGCAT_URL,
            {
                model: "LongCat-Flash-Chat", // The specific Longcat model
                messages: [
                    { role: "system", content: "You are a helpful JSON API that extracts business branding data." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7
            },
            {
                headers: {
                    'Authorization': `Bearer ${LONGCAT_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Parse the response
        let content = response.data.choices[0].message.content;

        // Clean up markdown if Longcat adds it (e.g. ```json ... ```)
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(content);

    } catch (error) {
        console.error("Longcat API Error:", error.response ? error.response.data : error.message);
        throw new Error("Failed to analyze with Longcat AI");
    }
};


const generateCampaignConcepts = async (dna, goal, eventType) => {
    try {
        const dnaString = `
        Business Name: ${dna.business_name}
        Industry: ${dna.industry}
        Tone: ${JSON.stringify(dna.tone_tags)}
        Language: ${JSON.stringify(dna.keywords_bn)} (Primary), English (Secondary)
        description: ${dna.imagery_style}
        `;

        const prompt = `
        You are a creative marketing director for a Bangladeshi business.
        
        Business Profile:
        ${dnaString}

        Goal: ${goal}
        Event/Context: ${eventType}

        Generate 3 DISTINCT Marketing Concepts for this goal.
        Return ONLY a raw JSON array (no markdown, no backticks formatting).

        Each item in the array must have:
        1. "angle": A short name for the strategy (e.g., "Emotional Story", "Flash Sale", "Humor").
        2. "headline_en": Catchy English headline.
        3. "caption_bn": A complete, engaging Facebook/Instagram caption in Bengali matches the business tone.
        4. "visual_prompt": A detailed, artistic description for an AI image generator (Midjourney style).
        5. "reasoning": One sentence on why this works.

        Example Output:
        [
            {
                "angle": "Nostalgia",
                "headline_en": "Remember the taste of home?",
                "caption_bn": "ছোটবেলার সেই স্বাদ...",
                "visual_prompt": "A warm, golden-hour photo of...",
                "reasoning": "Connects with deep emotions during the holiday."
            }
        ]
        `;

        const response = await axios.post(
            LONGCAT_URL,
            {
                model: "LongCat-Flash-Chat",
                messages: [
                    { role: "system", content: "You are a creative marketing expert specializing in the nuances of the Bangladeshi market." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.8
            },
            {
                headers: {
                    'Authorization': `Bearer ${LONGCAT_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        let content = response.data.choices[0].message.content;
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(content);

    } catch (error) {
        console.error("Gemini/Longcat Generation Error:", error.response ? error.response.data : error.message);
        throw new Error("Failed to generate concepts");
    }
};

const chatWithBrand = async (systemPrompt, userMessage) => {
    try {
        const response = await axios.post(
            LONGCAT_URL,
            {
                model: "LongCat-Flash-Chat",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessage }
                ],
                temperature: 0.85 // Slightly higher for creativity in copy
            },
            {
                headers: {
                    'Authorization': `Bearer ${LONGCAT_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data.choices[0].message.content;

    } catch (error) {
        console.error("Gemini/Longcat Chat Error:", error.response ? error.response.data : error.message);
        throw new Error("Failed to get chat response");
    }
};

const generateCampaignCopy = async (dna, campaignContext, imagePath = null) => {
    try {
        const promptText = `
        You are the Chief Marketing Officer for "${dna.business_name}", a(n) "${dna.industry}" company.
        
        YOUR BRAND DNA:
        - Voice/Tone: ${JSON.stringify(dna.tone_tags)}
        - Key Language: ${JSON.stringify(dna.keywords_bn)}
        - Mission/Style: ${dna.imagery_style || 'Not specified'}

        CAMPAIGN TARGET:
        - Title: ${campaignContext.title}
        - Platform: ${campaignContext.platform}
        - Goal: ${campaignContext.goal}

        TASK:
        Write high-conversion marketing copy for this campaign. 
        ${imagePath ? 'Analyze the provided product image carefully. Describe the visual details (colors, materials, setting) and use them in the copy.' : ''}
        STRICTLY adhere to the brand voice. Do not be generic.
        
        Return ONLY a raw JSON object (no markdown).

        JSON Structure:
        {
            "headline_en": "Catchy English headline (max 10 words, on-brand)",
            "caption_bn": "Engaging Bengali caption (max 40 words, use 2-3 emojis, match tone)",
            "strategy_note": "Internal note: Why this specific angle fits the brand voice"
        }
        `;

        let messages = [
            { role: "system", content: `You are the CMO of ${dna.business_name}. Speak in the brand's unique voice.` }
        ];

        if (imagePath) {
            // Multimodal Request
            const imageBuffer = fs.readFileSync(imagePath);
            const base64Image = imageBuffer.toString('base64');
            const mimeType = 'image/jpeg'; // Assuming jpg/jpeg from upload but could be png

            messages.push({
                role: "user",
                content: [
                    { type: "text", text: promptText },
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:${mimeType};base64,${base64Image}`
                        }
                    }
                ]
            });
        } else {
            // Text-only Request
            messages.push({ role: "user", content: promptText });
        }

        const response = await axios.post(
            LONGCAT_URL,
            {
                model: "LongCat-Flash-Chat",
                messages: messages,
                temperature: 0.8
            },
            {
                headers: {
                    'Authorization': `Bearer ${LONGCAT_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        let content = response.data.choices[0].message.content;
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(content);

    } catch (error) {
        console.error("Gemini/Longcat Copy Gen Error:", error.response ? error.response.data : error.message);
        throw new Error("Failed to generate campaign copy");
    }
};

const generateVisualPrompt = async (dna, campaignContext) => {
    try {
        const prompt = `
        You are an Art Director for "${dna.business_name}" (${dna.industry}).
        
        BRAND AESTHETICS:
        - Palette: ${JSON.stringify(dna.primary_colors)}
        - Style: ${dna.imagery_style}
        - Tone: ${JSON.stringify(dna.tone_tags)}

        CAMPAIGN CONTEXT:
        - Title: ${campaignContext.title}
        - Platform: ${campaignContext.platform}
        - Concept: ${campaignContext.concept}

        TASK:
        Write a highly detailed text-to-image prompt for an AI generator (Midjourney/Flux).
        The image must look premium and strictly follow the brand's aesthetic.
        Describe lighting, composition, subject, and color grading.
        
        Output ONLY the raw prompt text.
        `;

        const response = await axios.post(
            LONGCAT_URL,
            {
                model: "LongCat-Flash-Chat",
                messages: [
                    { role: "system", content: "You are an expert AI Art Director." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.85
            },
            {
                headers: {
                    'Authorization': `Bearer ${LONGCAT_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data.choices[0].message.content.trim();

    } catch (error) {
        console.error("Gemini/Longcat Visual Gen Error:", error.response ? error.response.data : error.message);
        throw new Error("Failed to generate visual prompt");
    }
};

module.exports = { analyzeBusinessDNA, generateCampaignConcepts, chatWithBrand, generateCampaignCopy, generateVisualPrompt };