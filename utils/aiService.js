// Minimal AI service wrapper that talks to OpenAI Chat Completions.
// Requires OPENAI_API_KEY in environment. Returns parsed JSON results.

const OPENAI_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
const OPENAI_KEY = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;

if (!OPENAI_KEY) {
  console.warn('Warning: OPENAI_API_KEY (or AI_API_KEY) is not set. AI features will fail at runtime.');
}

// Helper to let callers check availability without relying on exceptions
export const isAIAvailable = () => !!OPENAI_KEY;

const callChat = async (messages, model = 'gpt-3.5-turbo') => {
  if (!OPENAI_KEY) throw new Error('Missing OPENAI_API_KEY');
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_KEY}`
    },
    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 1200 }) // Increased temperature for uniqueness
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`AI provider error: ${res.status} ${txt}`);
  }
  const json = await res.json();
  const reply = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
  return reply;
};

// Web search function using multiple strategies
const searchProductSpecifications = async (productTitle) => {
  try {
    // Try using DuckDuckGo instant answer API (free, no key required)
    const searchQuery = encodeURIComponent(productTitle.replace(/Renewed|Premium/gi, '').trim());
    const duckUrl = `https://api.duckduckgo.com/?q=${searchQuery}+specifications+features&format=json&t=namix`;
    
    const searchResponse = await Promise.race([
      fetch(duckUrl).catch(() => null),
      new Promise(resolve => setTimeout(() => resolve(null), 3000)) // 3 second timeout
    ]);

    if (searchResponse && searchResponse.ok) {
      const data = await searchResponse.json();
      // Extract any available information
      if (data.AbstractText) {
        return data.AbstractText;
      }
      if (data.RelatedTopics && data.RelatedTopics.length > 0) {
        const specs = data.RelatedTopics.filter(topic => topic.Text)
          .map(topic => topic.Text)
          .join(' ');
        if (specs) return specs;
      }
    }
    
    // Fallback: Use Google search (basic)
    const googleUrl = `https://www.google.com/search?q=${searchQuery}+specifications`;
    console.log('Web search query for product specs:', searchQuery);
    
  } catch (error) {
    console.warn('Web search failed, will rely on AI knowledge base:', error.message);
  }
  
  return null;
};

// Attempt to parse JSON from model response
const extractJSON = (text) => {
  if (!text) return null;
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    const sub = text.slice(first, last + 1);
    try {
      return JSON.parse(sub);
    } catch (e) {
      // fallback: try to find arrays/values
    }
  }
  return null;
};

export const verifyProduct = async (product) => {
  // If AI not available, don't block creation — assume verified but mark reason
  if (!isAIAvailable()) return { verified: true, reason: 'AI unavailable - auto-verified' };

  const messages = [
    { role: 'system', content: 'You are a strict product listing verifier. Return only JSON with keys {verified: boolean, reason: string}.' },
    { role: 'user', content: `Product JSON:\n${JSON.stringify(product, null, 2)}\n\nCheck whether this product is appropriate for listing on an online marketplace in Namibia. Consider safety, legality, and obvious policy violations (weapons, illicit drugs, stolen goods, adult-only items, counterfeit). If it is appropriate, respond with {"verified": true, "reason": "OK"}. If not, respond with {"verified": false, "reason": "explanation"}.` }
  ];
  const reply = await callChat(messages);
  const parsed = extractJSON(reply);
  if (parsed && typeof parsed.verified === 'boolean') return parsed;
  // If model didn't return strict JSON, conservatively fail with explanation
  return { verified: false, reason: 'AI response malformed or inconclusive' };
};

export const generateDescriptionAndFeatures = async (product) => {
  // If AI is not available, return sensible defaults immediately
  if (!isAIAvailable()) {
    return {
      description: product.description || product.title || 'No description available.',
      features: Array.isArray(product.features) && product.features.length > 0 ? product.features.slice(0, 6) : []
    };
  }

  // Check if product category requires AI generation (phones, tablets, laptops, computers, gaming)
  const category = (product.category || '').toLowerCase();
  const aiGenerationCategories = [
    'phones', 'iphones', 'samsung-phones', 'android',
    'tablets', 'ipads', 'android-tablets',
    'laptops', 'macbooks', 'dell-laptops', 'hp-laptops', 'lenovo-laptops',
    'computers', 'desktops', 'hp-aio', 'gaming-pcs',
    'gaming', 'playstation', 'xbox', 'nintendo', 'gaming-laptops'
  ];

  const shouldGenerateAI = aiGenerationCategories.some(cat => category.includes(cat));

  // Search for real product specifications from the web
  let webSearchResults = '';
  if (shouldGenerateAI) {
    try {
      console.log('🔍 Searching web for accurate product specifications using title:', product.title);
      webSearchResults = await searchProductSpecifications(product.title);
      if (webSearchResults) {
        console.log('✓ Web search successfully found product information');
      } else {
        console.log('⚠ Web search returned no results, will use AI knowledge base');
      }
    } catch (error) {
      console.warn('⚠ Web search failed, will use AI knowledge base:', error.message);
    }
  } else {
    console.log('ℹ Product category does not require web search, using AI knowledge base');
  }

  // Generate category-specific prompts for better results
  let systemPrompt = 'You are a professional product copywriter. Write a UNIQUE, distinct, and compelling marketing description (2-3 sentences) specifically for this product. Do not use generic templates. Also provide 4-6 concise technical features. Return only JSON with keys {description: string, features: string[] }.';
  
  let userPrompt = `Product JSON:\n${JSON.stringify(product, null, 2)}\n\nGenerate a UNIQUE, factual product description and 4-6 concise features suitable for the product detail page. The description must be distinct and specific to this exact model. Avoid generic phrases like "Experience the best". Focus on what makes this specific item special. Return JSON.`;

  if (shouldGenerateAI) {
    // Add web search context if available
    const webContext = webSearchResults ? `\n\nWeb Research Context:\n${webSearchResults}` : '';
    
    // Category-specific prompts for tech products
    if (category.includes('phone') || category.includes('iphone') || category.includes('samsung')) {
      systemPrompt = 'You are a smartphone expert. Write a UNIQUE and DISTINCT description for this specific phone model. Do not repeat generic marketing fluff. Focus on its specific identity. Produce 4-6 precise technical features (display, processor, camera, battery). Return JSON {description: string, features: string[] }.';
      userPrompt = `Smartphone Product:\n${JSON.stringify(product, null, 2)}${webContext}\n\nGenerate a UNIQUE description and ACCURATE technical specs for this smartphone. \n\nDescription requirements:\n- Must be unique to the ${product.title}\n- Mention specific standout capabilities\n- Do NOT use a generic opening like "Experience the best"\n\nFeatures requirements:\n- Exact display size/tech\n- Processor model\n- Camera specs\n- Battery/Charging\n\nReturn JSON.`;
    } else if (category.includes('tablet') || category.includes('ipad')) {
      systemPrompt = 'You are a tablet specialist. Write a UNIQUE description specific to this tablet model. Avoid generic templates. Produce 4-6 precise ACTUAL technical features. Return JSON {description: string, features: string[] }.';
      userPrompt = `Tablet Product:\n${JSON.stringify(product, null, 2)}${webContext}\n\nGenerate a UNIQUE description and ACCURATE specs for this tablet. \n\nDescription:\n- Specific to this model's use case (creative, pro, consumption)\n- Unique selling point\n\nFeatures:\n- Display specs\n- Chipset\n- Storage/RAM\n- Camera/Battery\n\nReturn JSON.`;
    } else if (category.includes('laptop') || category.includes('macbook') || category.includes('dell') || category.includes('hp-laptop') || category.includes('lenovo')) {
      systemPrompt = 'You are a laptop expert. Write a UNIQUE and specific description for this laptop. Do not use generic text. Produce 4-6 EXACT technical features. Return JSON {description: string, features: string[] }.';
      userPrompt = `Laptop Product:\n${JSON.stringify(product, null, 2)}${webContext}\n\nGenerate a UNIQUE description and ACCURATE specs for this laptop. \n\nDescription:\n- Highlight specific performance capabilities of the ${product.title}\n- Target audience (gamer, pro, student)\n\nFeatures:\n- CPU model\n- RAM/Storage\n- Display specs\n- Graphics card\n- Ports/Battery\n\nReturn JSON.`;
    } else if (category.includes('gaming') || category.includes('playstation') || category.includes('xbox') || category.includes('nintendo')) {
      systemPrompt = 'You are a gaming expert. Write a UNIQUE description for this gaming product. Avoid generic phrases. Produce 4-6 FACTUAL gaming features. Return JSON {description: string, features: string[] }.';
      userPrompt = `Gaming Product:\n${JSON.stringify(product, null, 2)}${webContext}\n\nGenerate a UNIQUE description and ACCURATE specs.\n\nDescription:\n- Focus on the specific gaming experience of this item\n- Mention exclusive titles or features\n\nFeatures:\n- Graphics/Performance\n- Storage/Load times\n- Controller/Input specs\n- Services/Compatibility\n\nReturn JSON.`;
    }
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  try {
    const reply = await callChat(messages);
    const parsed = extractJSON(reply);
    if (parsed && typeof parsed.description === 'string' && Array.isArray(parsed.features)) {
      console.log('✓ AI generated unique product description and features');
      return parsed;
    }
  } catch (error) {
    console.warn('AI generation error, falling back to defaults:', error.message);
  }

  // Fallback: create minimal values
  return {
    description: product.title || 'No description available.',
    features: Array.isArray(product.features) && product.features.length > 0 ? product.features.slice(0, 6) : []
  };
};

export default { verifyProduct, generateDescriptionAndFeatures };
