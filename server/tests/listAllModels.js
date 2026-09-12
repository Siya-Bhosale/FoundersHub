const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

async function listAllModels() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const list = await ai.models.list();
    console.log('Available models:');
    for await (const m of list) {
      console.log(`- ${m.name} (displayName: ${m.displayName}, supportedActions: ${m.supportedGenerationMethods})`);
    }
  } catch (err) {
    console.error('List models error:', err.message);
  }
}

listAllModels();
