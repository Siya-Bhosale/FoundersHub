const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

async function testModels() {
  console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? `${process.env.GEMINI_API_KEY.slice(0, 8)}... (len: ${process.env.GEMINI_API_KEY.length})` : 'MISSING');
  
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const testModels = [
    'gemini-3.5-flash-lite',
    'gemini-flash-latest',
    'gemini-flash-lite-latest',
    'gemini-3.5-flash',
    'gemini-pro-latest',
  ];

  for (const m of testModels) {
    try {
      console.log(`Testing model: ${m}...`);
      const res = await ai.models.generateContent({
        model: m,
        contents: 'Give unique advice for a developer asking: "How should I structure my unit tests?" Return JSON object with "answer", "actions", and "references".',
        config: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });
      console.log(`✓ SUCCESS with ${m}:`, res.text);
      return m;
    } catch (err) {
      console.log(`✗ FAILED with ${m}:`, err.message);
    }
  }
}

testModels();

