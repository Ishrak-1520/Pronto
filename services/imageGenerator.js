const axios = require('axios');

/**
 * Image Generator Service
 * 
 * Strategy:
 * 1. PRIMARY: Hugging Face Inference API (if API key is set)
 * 2. FALLBACK: Pollinations.ai (free, no API key, always available)
 */

class ImageGeneratorService {

    async generate(prompt) {
        // 1. FREEPIK (Priority per user request)
        if (process.env.FREEPIK_API_KEY) {
            try {
                return await this.generateWithFreepik(prompt);
            } catch (error) {
                console.error('[ImageGen] Freepik failed, trying next provider:', error.message);
            }
        }

        // 2. HUGGING FACE
        if (process.env.HUGGINGFACE_API_KEY) {
            try {
                return await this.generateWithHuggingFace(prompt);
            } catch (error) {
                console.log('[ImageGen] Hugging Face failed, falling back to Pollinations...');
            }
        }

        // 3. POLLINATIONS (Fallback)
        return this.generateWithPollinations(prompt);
    }

    async generateWithFreepik(prompt) {
        console.log('[ImageGen] Using Freepik Flux Pro 1.1...');
        const apiKey = process.env.FREEPIK_API_KEY;
        const url = 'https://api.freepik.com/v1/ai/text-to-image/flux-pro-v1-1';

        // 1. Initiate Task
        console.log('[ImageGen] Sending prompt to Freepik...');
        const initResponse = await axios.post(
            url,
            {
                prompt: prompt,
                aspect_ratio: "square_1_1" // Defaulting to square
            },
            {
                headers: {
                    'x-freepik-api-key': apiKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        const taskId = initResponse.data.data.task_id;
        console.log(`[ImageGen] Task initiated. ID: ${taskId}`);

        // 2. Poll for Completion
        let attempts = 0;
        const maxAttempts = 20; // 40 seconds max
        const delay = 2000;

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, delay));

            console.log(`[ImageGen] Polling status... (${attempts + 1}/${maxAttempts})`);
            const statusResponse = await axios.get(`${url}/${taskId}`, {
                headers: { 'x-freepik-api-key': apiKey }
            });

            const status = statusResponse.data.data.status;

            if (status === 'COMPLETED') {
                const imageUrl = statusResponse.data.data.generated[0];
                console.log('[ImageGen] Freepik generation successful!');
                return imageUrl;
            }

            if (status === 'FAILED') {
                throw new Error('Freepik task status: FAILED');
            }

            attempts++;
        }

        throw new Error('Freepik generation timed out');
    }

    async generateWithHuggingFace(prompt) {
        // Using a reliable model that works with HF Inference
        const modelId = "runwayml/stable-diffusion-v1-5";
        const apiUrl = `https://router.huggingface.co/hf-inference/models/${modelId}`;

        console.log(`[ImageGen] Trying Hugging Face (${modelId})...`);

        const response = await axios.post(
            apiUrl,
            { inputs: prompt },
            {
                headers: {
                    Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                    "Content-Type": "application/json",
                    "Accept": "image/jpeg"
                },
                responseType: 'arraybuffer',
                timeout: 60000
            }
        );

        const base64Image = Buffer.from(response.data, 'binary').toString('base64');
        console.log('[ImageGen] Success via Hugging Face!');
        return `data:image/jpeg;base64,${base64Image}`;
    }

    generateWithPollinations(prompt) {
        console.log('[ImageGen] Using Pollinations.ai (Flux model)...');

        const encodedPrompt = encodeURIComponent(prompt);
        const seed = Math.floor(Math.random() * 100000) + Date.now();

        // Using Pollinations with flux model - reliable and free
        // Updated URL per "We Have Moved" notice (Jan 2026)
        const url = `https://pollinations.ai/p/${encodedPrompt}?width=1024&height=768&seed=${seed}&model=flux&nologo=true`;

        console.log('[ImageGen] Pollinations URL generated:', url);
        return url;
    }
}

module.exports = new ImageGeneratorService();
