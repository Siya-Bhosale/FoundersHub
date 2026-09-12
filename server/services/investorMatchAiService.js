const { GoogleGenAI } = require('@google/genai');

/**
 * Strips markdown code fences and safely parses JSON.
 */
function parseJsonSafe(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty or non-string Gemini response');
  }

  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  return JSON.parse(cleaned.trim());
}

/**
 * Validates and normalizes Gemini match explanation structure.
 */
function validateAndNormalizeExplanation(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Explanation response must be a valid JSON object');
  }

  const summary = (data.summary || 'Strategic alignment evaluation between startup and investor criteria.').toString().trim();
  const recommendation = (data.recommendation || 'Proceed with preliminary review and founder outreach.').toString().trim();

  const strengths = Array.isArray(data.strengths)
    ? data.strengths.map((s) => s.toString().trim()).filter(Boolean)
    : ['Core market domain aligns with target investment sectors.'];

  const alignment = Array.isArray(data.alignment)
    ? data.alignment.map((a) => a.toString().trim()).filter(Boolean)
    : ['Target capital ask corresponds with typical deployment allocations.'];

  const concerns = Array.isArray(data.concerns)
    ? data.concerns.map((c) => c.toString().trim()).filter(Boolean)
    : ['Early-stage execution requires ongoing milestone verification.'];

  return {
    summary,
    strengths: strengths.length > 0 ? strengths : ['Market and team alignment demonstrated.'],
    alignment: alignment.length > 0 ? alignment : ['Funding stage fits investment mandate.'],
    concerns: concerns.length > 0 ? concerns : ['Venture remains in early development phase.'],
    recommendation,
  };
}

/**
 * Generates deterministic fallback match explanation.
 */
function getFallbackMatchExplanation(payload) {
  const { startup, investor, matchScore, components } = payload;
  const strengths = [];
  const alignment = [];
  const concerns = [];

  // Industry analysis
  if (components.industryFit?.score >= 25) {
    strengths.push(`The startup operates directly in your preferred industry sector (${startup.industry}).`);
  } else {
    concerns.push(`The startup industry (${startup.industry}) is outside your primary declared focus.`);
  }

  // Stage analysis
  if (components.stageFit?.score >= 15) {
    strengths.push(`The startup is at your designated investment stage (${startup.stage}).`);
  } else {
    concerns.push(`The venture is currently at ${startup.stage} stage, which differs from your preferred stages.`);
  }

  // Range analysis
  if (components.investmentRange?.score >= 15) {
    alignment.push(`Funding requirement (₹${(Number(startup.fundingRequired) || 0).toLocaleString('en-IN')}) aligns comfortably within your investment mandate.`);
  } else {
    concerns.push(`Funding requirement is outside your target range of ₹${(Number(investor?.minInvestment) || 0).toLocaleString('en-IN')} – ₹${(Number(investor?.maxInvestment) || 0).toLocaleString('en-IN')}.`);
  }

  // Team analysis
  if (components.teamFit?.score >= 8) {
    alignment.push('The startup features active technical collaborators with relevant delivery capabilities.');
  } else {
    concerns.push('Team expansion may be required to accelerate product engineering velocity.');
  }

  // Readiness analysis
  if (components.investorReadiness?.score >= 12) {
    strengths.push('High investor readiness demonstrated with structured sprint roadmap and execution metrics.');
  } else {
    concerns.push('Additional financial records and operational history are recommended before deep diligence.');
  }

  let summary = `This startup exhibits a ${matchScore >= 75 ? 'strong' : matchScore >= 50 ? 'moderate' : 'preliminary'} strategic fit (${matchScore}%) with your investment portfolio parameters.`;
  let recommendation = matchScore >= 75
    ? 'High conviction match: recommended to express funding interest and schedule an introductory founder dialogue.'
    : matchScore >= 50
    ? 'Promising venture: review team composition and track ongoing sprint delivery before commitment.'
    : 'Selective opportunity: keep on watch list until further traction and milestones are reported.';

  return {
    summary,
    strengths: strengths.length > 0 ? strengths : ['Market and technology problem statement are well-articulated.'],
    alignment: alignment.length > 0 ? alignment : ['Venture presents potential portfolio diversification.'],
    concerns: concerns.length > 0 ? concerns : ['Early stage risk profile applies.'],
    recommendation,
    source: 'fallback',
  };
}

/**
 * Wrapper for async timeout
 */
function withTimeout(promise, ms = 20000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Gemini request timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/**
 * Invokes Gemini AI to explain an already calculated deterministic match score.
 * Never alters the matchScore.
 */
async function explainInvestorMatch(payload) {
  const { startup, investor, matchScore, components, executionScore } = payload;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    console.warn('[InvestorMatchAiService] No GEMINI_API_KEY detected. Using deterministic fallback explanation.');
    return getFallbackMatchExplanation(payload);
  }

  const prompt = `You are a venture capital analyst explaining an investment match.
IMPORTANT: The match score has already been deterministically calculated by the backend scoring engine at ${matchScore}/100.
DO NOT recalculate or modify this score. Your task is to EXPLAIN WHY this score exists based on the startup's data and the investor's criteria.

STARTUP PROFILE:
- Name: ${startup.name}
- Industry: ${startup.industry}
- Stage: ${startup.stage}
- Tagline: ${startup.tagline || 'N/A'}
- Problem: ${startup.problemStatement || 'N/A'}
- Solution: ${startup.solution || 'N/A'}
- Funding Required: ₹${(Number(startup.fundingRequired) || 0).toLocaleString('en-IN')}
- Funding Received: ₹${(Number(startup.fundingReceived) || 0).toLocaleString('en-IN')}
- Execution Score: ${executionScore}/100

INVESTOR PREFERENCES:
- Firm Name: ${investor.firmName || 'Angel Syndicate'}
- Preferred Industries: ${(investor.industries || []).join(', ') || 'Any'}
- Preferred Stages: ${(investor.investmentStages || []).join(', ') || 'Any'}
- Ticket Size: ₹${(Number(investor.minInvestment) || 0).toLocaleString('en-IN')} – ₹${(Number(investor.maxInvestment) || 0).toLocaleString('en-IN')}

DETERMINISTIC COMPONENT SCORES:
- Industry Fit: ${components.industryFit?.score || 0}/30
- Stage Fit: ${components.stageFit?.score || 0}/20
- Investment Range: ${components.investmentRange?.score || 0}/20
- Team Fit: ${components.teamFit?.score || 0}/10
- Investor Readiness: ${components.investorReadiness?.score || 0}/20
- Overall Deterministic Match Score: ${matchScore}/100

Return ONLY a JSON object with this EXACT structure:
{
  "summary": "1-2 sentences summarizing the investment thesis and why this match score exists",
  "strengths": [
    "Specific strength #1 of this startup relative to investor criteria",
    "Specific strength #2"
  ],
  "alignment": [
    "Specific synergy #1 between founder vision and investor mandate"
  ],
  "concerns": [
    "Specific risk or due diligence area to investigate"
  ],
  "recommendation": "Concrete actionable next step for the investor",
  "source": "gemini"
}`;

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const candidateModels = [
      process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
      'gemini-flash-latest',
      'gemini-flash-lite-latest',
      'gemini-3.5-flash',
      'gemini-3.8-flash',
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
          20000
        );

        const rawText = response.text;
        const parsed = parseJsonSafe(rawText);
        const validated = validateAndNormalizeExplanation(parsed);

        return {
          ...validated,
          source: 'gemini',
        };
      } catch (err) {
        lastError = err;
        console.warn(`[InvestorMatchAiService] Candidate model ${modelName} failed (${err.message}). Trying next candidate.`);
      }
    }

    throw lastError || new Error('All Gemini models failed');
  } catch (err) {
    console.warn(`[InvestorMatchAiService] Gemini explanation failed (${err.message}). Returning deterministic fallback.`);
    return getFallbackMatchExplanation(payload);
  }
}

module.exports = {
  explainInvestorMatch,
  getFallbackMatchExplanation,
  validateAndNormalizeExplanation,
};
