import express from 'express';
import { 
    generateFeaturesWithGemini, 
    generateDescriptionWithGemini, 
    generateImagesWithGemini, 
    isGeminiAvailable 
} from '../utils/geminiService.js';

const router = express.Router();

// @desc    Generate product features using Gemini AI
// @route   POST /api/ai/generate-features
router.post('/generate-features', async (req, res) => {
    try {
        const { title } = req.body;
        console.log(`[AI Route] Requesting features for: "${title}"`);
        
        if (!title) {
            return res.status(400).json({ error: 'Title required' });
        }

        if (!isGeminiAvailable()) {
            console.warn('[AI Route] Gemini API key missing');
            return res.json({ success: false, features: [] });
        }

        const features = await generateFeaturesWithGemini(title);
        console.log(`[AI Route] Features generated: ${features.length}`);
        res.json({ success: true, features });
    } catch (error) {
        console.error('[AI Route] Features Error:', error);
        res.status(500).json({ error: 'Failed to generate features' });
    }
});

// @desc    Generate product description using Gemini AI
// @route   POST /api/ai/generate-description
router.post('/generate-description', async (req, res) => {
    try {
        const { title, features } = req.body;
        console.log(`[AI Route] Requesting description for: "${title}"`);
        
        if (!title) {
            return res.status(400).json({ error: 'Title required' });
        }

        if (!isGeminiAvailable()) {
            console.warn('[AI Route] Gemini API key missing');
            return res.json({ success: false, description: '' });
        }

        const description = await generateDescriptionWithGemini(title, features);
        console.log(`[AI Route] Description generated (${description.length} chars)`);
        res.json({ success: true, description });
    } catch (error) {
        console.error('[AI Route] Description Error:', error);
        res.status(500).json({ error: 'Failed to generate description' });
    }
});

// @desc    Retrieve product image URLs from the internet using Gemini AI
// @route   POST /api/ai/generate-images
router.post('/generate-images', async (req, res) => {
    try {
        const { title } = req.body;
        console.log(`[AI Route] Requesting images via Gemini for: "${title}"`);
        
        if (!title) {
            return res.status(400).json({ error: 'Title required' });
        }

        if (!isGeminiAvailable()) {
            return res.status(503).json({ error: 'AI service is not configured on the server.' });
        }

        // Use the Gemini-based image retrieval function
        const images = await generateImagesWithGemini(title);
        
        console.log(`[AI Route] Images found via Gemini: ${images.length}`);
        res.json({ success: true, images });

    } catch (error) {
        console.error('[AI Route] Gemini Image Error:', error);
        res.status(500).json({ error: 'Failed to find images using AI', images: [] });
    }
});

export default router;