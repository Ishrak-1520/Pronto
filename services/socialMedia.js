class SocialMediaService {
    /**
     * Simulates publishing a campaign to social media platforms.
     * @param {Object} campaign - The campaign object to publish
     * @returns {Promise<Object>} - Result of the operation
     */
    async publish(campaign) {
        console.log(`[Mock API] Preparing to publish campaign: "${campaign.title}"...`);

        // Simulate network latency (1-2 seconds)
        const delay = Math.floor(Math.random() * 1000) + 1000;

        return new Promise((resolve) => {
            setTimeout(() => {
                console.log(`[Mock API] Successfully published to ${campaign.primary_platforms || 'Social Media'}.`);
                console.log(`[Mock API] Response: { status: 'posted', id: 'mock_${Date.now()}' }`);

                resolve({
                    success: true,
                    platformId: `mock_${Date.now()}`,
                    timestamp: new Date().toISOString()
                });
            }, delay);
        });
    }
}

module.exports = new SocialMediaService();
