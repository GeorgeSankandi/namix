/**
 * DEPRECATED: Google Image Search functionality has been removed.
 * Image retrieval is now handled by Gemini AI in utils/geminiService.js.
 * 
 * This file can be safely deleted.
 */

export const searchProductImages = async (query) => {
    console.warn('searchProductImages is deprecated. Please use generateImagesWithGemini from geminiService.js');
    return [];
};