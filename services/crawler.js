const cheerio = require('cheerio');
const axios = require('axios');

class CrawlerService {
    async scanWebsite(url) {
        try {
            console.log(`Crawling URL with Axios: ${url}`);

            // Fetch HTML using lightweight HTTP request (Vercel-compatible)
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                },
                timeout: 15000,
                maxRedirects: 5,
            });

            const html = response.data;
            const $ = cheerio.load(html);

            // Extract meaningful text
            $('script, style, nav, footer, noscript, header, svg').remove();

            // Get text and clean it
            let textContent = $('body').text()
                .replace(/\s+/g, ' ')
                .trim();

            // Truncate to avoid token limits later
            textContent = textContent.substring(0, 8000);

            // Extract images
            const images = [];
            $('img').each((i, el) => {
                const src = $(el).attr('src');
                if (src && !src.startsWith('data:')) {
                    try {
                        // Resolve relative URLs using the page URL
                        const absoluteUrl = new URL(src, url).href;
                        images.push(absoluteUrl);
                    } catch (e) {
                        // ignore invalid urls
                    }
                }
            });

            const title = $('title').text().trim() || 'Untitled';

            return {
                url,
                textContent,
                images: [...new Set(images)].slice(0, 15), // Unique images, limit to 15
                title
            };

        } catch (error) {
            console.error('Crawler Error:', error.message);
            throw new Error(`Failed to crawl website: ${error.message}`);
        }
    }
}

module.exports = new CrawlerService();
