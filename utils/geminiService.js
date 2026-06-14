// utils/geminiService.js

// Use the stable 1.5-flash model
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

const getGeminiApiKey = () => process.env.GEMINI_API_KEY;

// Log status on first access
let hasLoggedWarning = false;
const checkGeminiKey = () => {
  if (!hasLoggedWarning && !getGeminiApiKey()) {
    console.warn('Warning: GEMINI_API_KEY is not set. Real-time generation will fail.');
    hasLoggedWarning = true;
  }
};

/**
 * Generate product features using Gemini API
 * @param {string} productTitle - The product title/name
 * @returns {Promise<Array>} Array of feature strings
 */
export const generateFeaturesWithGemini = async (productTitle) => {
  checkGeminiKey();
  const apiKey = getGeminiApiKey();
  
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not configured');
    return []; // Return empty array gracefully
  }

  try {
    const prompt = `You are a product specifications expert. Based on the product title "${productTitle}", generate a list of 5-6 realistic and accurate product features.

Format your response as a JSON object with a single key "features" containing an array of strings. Each feature should be:
- Accurate to the actual product
- Concise (1-2 sentences max)
- Specific and relevant
- Listed as bullet point style text

Example format:
{
  "features": [
    "Feature 1 description",
    "Feature 2 description",
    "Feature 3 description"
  ]
}

Product Title: ${productTitle}

Generate realistic features based on current market products with this title.`;

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 500
      }
    };

    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response structure from Gemini API');
    }

    const responseText = data.candidates[0].content.parts[0].text;
    
    // ROBUST JSON EXTRACTION: Find the first '{' and the last '}'
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      console.warn('Could not extract JSON from Gemini response. Raw text:', responseText);
      return [];
    }

    const parsedResponse = JSON.parse(jsonMatch[0]);
    
    if (!Array.isArray(parsedResponse.features)) {
      console.warn('Features is not an array in Gemini response:', parsedResponse);
      return [];
    }

    return parsedResponse.features;

  } catch (error) {
    console.error('Error generating features with Gemini:', error.message);
    return []; // Return empty array on failure so app doesn't crash
  }
};

/**
 * Generate product description using Gemini API
 * @param {string} productTitle - The product title/name
 * @param {Array} features - Array of feature strings
 * @returns {Promise<string>} Generated description
 */
export const generateDescriptionWithGemini = async (productTitle, features = []) => {
  checkGeminiKey();
  const apiKey = getGeminiApiKey();
  
  if (!apiKey) {
    return ''; // Return empty string gracefully
  }

  try {
    const featuresText = features.length > 0 
      ? `Key features context:\n${features.map(f => `- ${f}`).join('\n')}\n\n`
      : '';

    const prompt = `You are a professional product copywriter for a premium electronics store called NAMIX. 
    
Product Title: "${productTitle}"

${featuresText}

Task: Write a UNIQUE, DISTINCT, and COMPELLING marketing description for this specific product (2-3 sentences). 

Requirements:
1. Do NOT use generic templates. 
2. Focus specifically on the unique identity and key selling points of "${productTitle}".
3. Make it distinct from other similar product descriptions.
4. Use a professional, engaging tone.
5. If it's a "Renewed Premium" or "Second-hand" item, mention the value and quality assurance.

Return ONLY the description text, no JSON, no formatting, just the paragraph.`;

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 300
      }
    };

    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response structure from Gemini API');
    }

    return data.candidates[0].content.parts[0].text.trim();

  } catch (error) {
    console.error('Error generating description with Gemini:', error.message);
    return '';
  }
};

/**
 * Generate product image URLs using Gemini AI
 * @param {string} productTitle - The product title/name
 * @returns {Promise<Array<string>>} Array of image URLs
 */
export const generateImagesWithGemini = async (productTitle) => {
  checkGeminiKey();
  const apiKey = getGeminiApiKey();
  
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not configured');
    return [];
  }

  try {
    const prompt = `You are an expert image search assistant. Your task is to find high-quality, publicly accessible image URLs for a product.

Product Title: "${productTitle}"

Find 5 realistic, high-resolution product images for this item. 
CRITICAL: Use ONLY direct image links (ending in .jpg, .jpeg, .png, or .webp) from:
1. Official manufacturer websites (e.g., apple.com, samsung.com, dell.com, sony.com).
2. Reputable tech review sites (e.g., cnet.com, theverge.com).
3. Major, stable e-commerce CDNs (e.g., m.media-amazon.com, images-na.ssl-images-amazon.com).
4. Reliable stock photo sites if specific product shots are unavailable (e.g., unsplash.com).

AVOID:
- Temporary or dynamic links that expire (e.g., from search result caches).
- Low-resolution thumbnails.
- Watermarked images.

Format your response as a single, valid JSON object with one key, "images", which contains an array of 5 string URLs.

Example:
{
  "images": [
    "https://m.media-amazon.com/images/I/71p-tHQ0u1L._AC_SL1500_.jpg",
    "https://images.samsung.com/is/image/samsung/p6pim/p6/sm-s918/gallery/sm-s918-front-phantomblack-534863458.jpg",
    "https://support.apple.com/library/content/dam/edam/applecare/images/en_US/iphone/iphone14pro/iphone-14-pro-colors.png"
  ]
}`;

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1, // Low temperature for factual, less creative results
        maxOutputTokens: 1024
      }
    };

    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API error for images: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error('Invalid response structure from Gemini API for images');
    }

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('Could not extract JSON from Gemini image response. Raw text:', responseText);
      return [];
    }

    const parsedResponse = JSON.parse(jsonMatch[0]);
    if (Array.isArray(parsedResponse.images)) {
      return parsedResponse.images.filter(url => typeof url === 'string' && url.startsWith('http'));
    }

    return [];

  } catch (error) {
    console.error('Error generating images with Gemini:', error.message);
    return []; // Return empty on failure
  }
};

export const isGeminiAvailable = () => !!getGeminiApiKey();