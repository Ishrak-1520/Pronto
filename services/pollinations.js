/**
 * Service to interact with Pollinations.ai for image generation.
 * API is free and URL-based.
 */

const generateImage = (prompt) => {
    // Pollinations handles URL encoding, but better safe than sorry for complex prompts
    const encodedPrompt = encodeURIComponent(prompt);
    // nologo=true removes the Pollinations watermark
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true`;
};

module.exports = { generateImage };
