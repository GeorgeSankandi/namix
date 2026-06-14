// --- START OF FILE graphql/resolvers.js ---

import { GoogleGenerativeAI } from '@google/generative-ai';
import Product from '../models/productModel.js';
import { categoryData } from '../utils/categoryData.js';

const validNavigationTargets = Object.keys(categoryData).map(key => `#category/${key}`);
validNavigationTargets.push('#home', '#about', '#contact', '#cart', '#trade-in', '#login', '#register');

export const resolvers = {
  Query: {
    products: async () => {
      try {
        return await Product.find({});
      } catch (error) {
        console.error("Error fetching products in GraphQL:", error);
        return [];
      }
    },
    
    askChatbot: async (_, { question }) => {
      const genAI = process.env.GEMINI_API_KEY
          ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
          : null;

      if (!genAI) {
        console.error("[SERVER] GEMINI_API_KEY is not set. The chatbot cannot function.");
        return { 
            reply: "The AI assistant is not configured correctly on the server. Please check the API key.",
            navigationTarget: null,
            highlightProductId: null
        };
      }
      
      let rawText = ''; 
      try {
        // CHANGED: Use a standard, stable model name
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

        const allProducts = await Product.find({});
        
        // Safety check if no products exist yet
        const productContext = allProducts.length > 0
            ? allProducts.map(p => {
                const stockInfo = p.stock !== undefined && p.stock !== null ? `${p.stock} left` : 'Not tracked';
                const descriptionInfo = p.description ? p.description.replace(/\n/g, ' ') : 'No description available.';
                const featuresInfo = (p.features && p.features.length > 0) ? `[${p.features.join(', ')}]` : 'No features listed.';
                return `- Product ID: ${p.productId}, Title: ${p.title}, Price: N$${p.currentPrice}, Category: ${p.category}, Stock: ${stockInfo}, Description: "${descriptionInfo}", Features: ${featuresInfo}`;
              }).join('\n')
            : "No products currently available in the database.";

        const prompt = `
          You are a sophisticated AI assistant for an online electronics store called NamKuku. Your task is to provide helpful, conversational replies and determine appropriate actions based on user queries. You must always respond in a valid JSON format.

          The user's input (which may include the Previous Bot Message for context) is: 
          "${question}"

          Based on the user's query and the provided context of our entire product database, perform the following tasks:

          1.  **Analyze Context & Intent:**
              *   If the input shows the Bot previously suggested a product (e.g., "We have the iPhone X, would you like to see it?") and the User says "Yes", "Sure", or "Please", interpret this as a direct request for that suggested product.
              *   Search the "CONTEXT" below for that specific suggested product.

          2.  **Generate a Text Reply:**
              *   Create a friendly, concise, and helpful answer.
              *   If the user confirmed a suggestion, say something like: "Great! Here is the [Product Name]."
              *   **CRITICAL**: When asked about a product, use the provided "Description", "Features", and "Stock" information from the CONTEXT.
              *   If a user asks about stock, state the exact number remaining (e.g., "We have 5 left in stock."). If stock is low (less than 10), add a sense of urgency (e.g., "We only have 3 left, so I would act fast!"). If stock is 0, say "That item is currently out of stock."
              *   If a user asks for features, list the features from the "Features" array in a clear, readable format.
              *   If a user asks for a description, provide the information from the "Description" field. You can summarize it if the user's query is general.
              *   If a user's search for a product yields no results, check the context for the most similar product based on keywords or category and suggest it. For example: "We don't have that exact model, but we do have the [Similar Product Name], which is very popular. Would you like to see it?"

          3.  **Determine a Navigation Target:**
              *   **CRITICAL:** If the user says "Yes" to a suggestion, or explicitly asks for a product you found in the context, you MUST set this to "#product/[Product ID]".
              *   If your reply suggests a similar product but the user hasn't said yes yet, you can leave this null OR set it to the product page immediately if you feel it's helpful.
              *   If the user asks to see a category page (e.g., "show me laptops"), set this to the corresponding URL from the "VALID NAVIGATION TARGETS" list.

          4.  **Determine a Highlight Product ID:**
              *   If your reply is specifically about a single product (either requested directly or confirmed via "Yes"), return its exact "Product ID" here.

          ---
          CONTEXT (Full Product Database):
          ${productContext}
          ---
          VALID NAVIGATION TARGETS:
          ${validNavigationTargets.join(', ')}
          (plus any specific product page like #product/PRODUCT_ID)
          ---
          Your final response MUST be a single valid JSON object with three keys: "reply" (a string), "navigationTarget" (a string from the list or null), and "highlightProductId" (a string Product ID from the context or null).
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        rawText = response.text();

        // Sanitize JSON markdown wrapping
        const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        let parsedResponse;
        try {
            parsedResponse = JSON.parse(cleanJson);
        } catch (e) {
            // Fallback: try to find object in text
            const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    parsedResponse = JSON.parse(jsonMatch[0]);
                } catch (_e) {
                    console.error("[SERVER] Failed to parse AI JSON fallback response:", jsonMatch[0]);
                }
            }
            if (!parsedResponse) {
                console.error("[SERVER] Failed to parse AI JSON response:", cleanJson);
                throw new Error("Invalid JSON format from AI");
            }
        }

        let navigationTarget = parsedResponse.navigationTarget || null;
        if (navigationTarget && !validNavigationTargets.includes(navigationTarget) && !navigationTarget.startsWith('#product/')) {
          navigationTarget = null; 
        }

        let highlightProductId = parsedResponse.highlightProductId || null;
        if (highlightProductId) {
          const productExists = allProducts.some(p => p.productId === highlightProductId);
          if (!productExists) {
            highlightProductId = null;
          } else {
            navigationTarget = `#product/${highlightProductId}`;
          }
        }

        return {
            reply: parsedResponse.reply || "I'm not sure how to answer that. Could you rephrase?",
            navigationTarget,
            highlightProductId
        };

      } catch (error) {
        console.error('[SERVER] Error in askChatbot resolver:', error.message);
        // If rawText exists, it might give a clue (e.g. error message from API)
        if (rawText) {
          console.error('[SERVER] Partial/Raw AI response:', rawText);
        }
        
        // Return a valid object so GraphQL doesn't throw a "Errors" array to the client
        return { 
            reply: "I'm having a little trouble connecting to my brain right now. Please try again in a moment.",
            navigationTarget: null,
            highlightProductId: null
        };
      }
    },
  },
};
// --- END OF FILE graphql/resolvers.js ---