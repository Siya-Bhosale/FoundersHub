const { GoogleGenAI } = require('@google/genai');

/**
 * Validates and normalizes the parsed analysis object.
 * Returns normalized object or throws an error if validation fails.
 */
function validateAndNormalizeAnalysis(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Analysis response must be a valid JSON object');
  }

  const {
    overallAssessment,
    problemStrength,
    marketPotential,
    feasibility,
    risks,
    opportunities,
    recommendations,
  } = data;

  if (!overallAssessment || typeof overallAssessment !== 'string' || !overallAssessment.trim()) {
    throw new Error('Invalid or missing overallAssessment');
  }

  const validateCriterion = (item, name) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Invalid ${name} section`);
    }
    const rawScore = Number(item.score);
    if (isNaN(rawScore) || rawScore < 1 || rawScore > 10) {
      throw new Error(`Invalid ${name} score: must be a number between 1 and 10`);
    }
    if (!item.explanation || typeof item.explanation !== 'string' || !item.explanation.trim()) {
      throw new Error(`Invalid ${name} explanation`);
    }
    return {
      score: Math.min(10, Math.max(1, Math.round(rawScore))),
      explanation: item.explanation.trim(),
    };
  };

  const validatedProblem = validateCriterion(problemStrength, 'problemStrength');
  const validatedMarket = validateCriterion(marketPotential, 'marketPotential');
  const validatedFeasibility = validateCriterion(feasibility, 'feasibility');

  const sanitizeStringArray = (arr, minItems, name) => {
    if (!Array.isArray(arr) || arr.length < minItems) {
      throw new Error(`${name} must be an array with at least ${minItems} items`);
    }
    const sanitized = arr
      .filter((item) => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim());

    if (sanitized.length < minItems) {
      throw new Error(`${name} must contain at least ${minItems} non-empty strings`);
    }
    return sanitized;
  };

  const validatedRisks = sanitizeStringArray(risks, 2, 'risks');
  const validatedOpportunities = sanitizeStringArray(opportunities, 2, 'opportunities');
  const validatedRecommendations = sanitizeStringArray(recommendations, 3, 'recommendations');

  return {
    overallAssessment: overallAssessment.trim(),
    problemStrength: validatedProblem,
    marketPotential: validatedMarket,
    feasibility: validatedFeasibility,
    risks: validatedRisks,
    opportunities: validatedOpportunities,
    recommendations: validatedRecommendations,
  };
}

/**
 * Strips markdown code blocks and parses raw JSON string.
 */
function parseJsonSafe(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty or non-string Gemini response');
  }

  let cleaned = rawText.trim();
  // Remove markdown code fences if present (```json ... ``` or ``` ...)
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  return JSON.parse(cleaned.trim());
}

/**
 * Deterministic fallback analysis tailored to startup attributes.
 * Invoked if Gemini API key is missing, quota exceeded, timed out, or returns invalid response.
 */
function getFallbackAnalysis(startup) {
  const name = startup.name || 'This startup';
  const industry = startup.industry || 'Technology';
  const stage = startup.stage || 'IDEA';
  const problem = startup.problemStatement || 'Target customers face significant friction in existing workflows.';
  const solution = startup.solution || 'A modern digital solution to streamline operations.';

  return {
    overallAssessment: `${name} addresses a tangible market need within ${industry}. At the ${stage} stage, the core proposition demonstrates solid strategic promise with clear opportunities for customer validation and product-market fit.`,
    problemStrength: {
      score: 7,
      explanation: `The problem statement highlights key user pain points: "${problem.slice(0, 140)}${problem.length > 140 ? '...' : ''}". Early feedback will be essential to establish customer willingness to pay and quantify urgency.`,
    },
    marketPotential: {
      score: 7,
      explanation: `Operating in ${industry} provides a viable addressable market with expansion avenues. Scaling will depend on defensibility and differentiation against established incumbents and emerging alternatives.`,
    },
    feasibility: {
      score: 8,
      explanation: `The proposed solution ("${solution.slice(0, 140)}${solution.length > 140 ? '...' : ''}") appears technically sound for the ${stage} stage, provided technical execution and scope are closely managed.`,
    },
    risks: [
      `Customer acquisition cost (CAC) risk in the ${industry} space if distribution channels are not established early.`,
      `Adoption friction if target users are accustomed to legacy processes or manual workflows.`,
      `Competition from existing industry vendors expanding into similar automated capabilities.`,
    ],
    opportunities: [
      `First-mover advantage in specialized niche customer segments within ${industry}.`,
      `Potential for data network effects and workflow automation as customer usage expands.`,
      `Integration partnerships with complementary software tools to accelerate go-to-market.`,
    ],
    recommendations: [
      `Conduct 15 to 20 structured discovery interviews with active practitioners in ${industry} to validate urgency.`,
      `Build a lightweight prototype or MVP focused strictly on the single highest-value feature.`,
      `Define clear success metrics (e.g., weekly active usage, retention, customer time saved) prior to broader scaling.`,
    ],
    source: 'fallback',
  };
}

/**
 * Timeout helper.
 */
function withTimeout(promise, ms = 25000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Gemini request timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/**
 * Analyzes a startup idea using Google Gemini (@google/genai) with strict JSON output.
 * Automatically falls back to deterministic analysis upon any failure.
 */
async function analyzeStartupIdea(startup) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    console.warn('[GeminiService] No GEMINI_API_KEY configured. Utilizing deterministic fallback analysis.');
    return getFallbackAnalysis(startup);
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

    const prompt = `You are a venture capital analyst and startup mentor. Analyze the following startup idea objectively and provide a comprehensive, structured evaluation.

STARTUP PROFILE:
- Name: ${startup.name || 'N/A'}
- Tagline: ${startup.tagline || 'N/A'}
- Industry: ${startup.industry || 'N/A'}
- Current Stage: ${startup.stage || 'IDEA'}
- Problem Statement: ${startup.problemStatement || 'N/A'}
- Proposed Solution: ${startup.solution || 'N/A'}
- Description: ${startup.description || 'N/A'}

EVALUATION CRITERIA:
1. overallAssessment: A concise executive summary of the startup idea's overall viability and strategic positioning.
2. problemStrength: score (1-10 integer) and explanation evaluating the clarity, urgency, pain level, and magnitude of the problem.
3. marketPotential: score (1-10 integer) and explanation evaluating market size, growth dynamics, and target audience appetite.
4. feasibility: score (1-10 integer) and explanation evaluating technical, operational, and regulatory feasibility given the current stage.
5. risks: An array of 2 to 4 major strategic, technical, or market risks.
6. opportunities: An array of 2 to 4 distinct growth opportunities or competitive advantages.
7. recommendations: An array of 3 to 5 clear, actionable next steps for the founder to de-risk and advance their startup.

IMPORTANT CONSTRAINTS:
- Do NOT include execution score or investor matching score (those are computed separately).
- Return ONLY a valid, parseable JSON object matching the exact schema below.
- Do NOT wrap in markdown formatting or explanatory text outside the JSON object.

REQUIRED JSON FORMAT:
{
  "overallAssessment": "string",
  "problemStrength": {
    "score": 1-10,
    "explanation": "string"
  },
  "marketPotential": {
    "score": 1-10,
    "explanation": "string"
  },
  "feasibility": {
    "score": 1-10,
    "explanation": "string"
  },
  "risks": [
    "string",
    "string"
  ],
  "opportunities": [
    "string",
    "string"
  ],
  "recommendations": [
    "string",
    "string",
    "string"
  ]
}`;

    const candidateModels = [
      process.env.GEMINI_MODEL || 'gemini-3.6-flash',
      'gemini-3.1-pro-preview',
    ];

    let lastError = null;

    for (const modelName of candidateModels) {
      try {
        const response = await withTimeout(
          ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          }),
          25000
        );

        const rawText = response.text;
        const parsed = parseJsonSafe(rawText);
        const validated = validateAndNormalizeAnalysis(parsed);

        return {
          ...validated,
          source: 'gemini',
        };
      } catch (err) {
        lastError = err;
        console.warn(`[GeminiService] Attempt with model ${modelName} failed (${err.message}). Trying next candidate if available.`);
      }
    }

    throw lastError || new Error('All Gemini candidate models failed');
  } catch (error) {
    // Log safe error summary without exposing secrets or keys
    console.warn(`[GeminiService] AI generation failed (${error.message}). Reverting to fallback analysis.`);
    return getFallbackAnalysis(startup);
  }
}

module.exports = {
  analyzeStartupIdea,
  getFallbackAnalysis,
  validateAndNormalizeAnalysis,
};
