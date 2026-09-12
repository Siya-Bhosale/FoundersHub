const { GoogleGenAI } = require('@google/genai');
const Startup = require('../models/Startup');
const TeamMembership = require('../models/TeamMembership');
const DeveloperProfile = require('../models/DeveloperProfile');
const Task = require('../models/Task');
const Sprint = require('../models/Sprint');
const { calculateExecutionScore } = require('./executionScoreService');
const { calculateFinancialSummary } = require('./financeService');

/**
 * Strips markdown code blocks and parses JSON safely.
 */
function parseJsonSafe(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty or invalid Gemini response');
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
 * Validates and normalizes pitch deck structure per required schema.
 */
function validateAndNormalizePitch(data, fallbackContext) {
  if (!data || typeof data !== 'object') {
    throw new Error('Pitch response must be a JSON object');
  }

  const { startup, finance, team, executionScore } = fallbackContext;
  const fundingReqFormatted = (Number(startup.fundingRequired) || 0) > 0
    ? `₹${(Number(startup.fundingRequired) || 0).toLocaleString('en-IN')}`
    : 'Funding requirement to be finalized';

  return {
    headline: (data.headline || `${startup.name}: Pioneering ${startup.industry} Innovation`).toString().trim(),
    oneLiner: (data.oneLiner || startup.tagline || 'Accelerating market transformation with scalable execution.').toString().trim(),
    problem: (data.problem || startup.problemStatement || 'Target industry workflows face structural inefficiencies.').toString().trim(),
    solution: (data.solution || startup.solution || 'A proprietary solution optimizing productivity and delivery.').toString().trim(),
    targetMarket: (data.targetMarket || `High-growth businesses and operators in the ${startup.industry} sector.`).toString().trim(),
    businessModel: (data.businessModel || 'Value-aligned subscription and transactional deployment model.').toString().trim(),
    traction: (data.traction || (finance?.totalIncome > 0
      ? `Early pilot revenue of ₹${finance.totalIncome.toLocaleString('en-IN')} with validated workflow engagement.`
      : 'Venture is in early product development and sprint execution (pre-traction).')).toString().trim(),
    competitiveAdvantage: (data.competitiveAdvantage || 'Agile sprint-driven engineering with integrated execution intelligence.').toString().trim(),
    team: (data.team || `Led by founder with an active technical squad of ${team.size} builder(s).`).toString().trim(),
    financialSnapshot: (data.financialSnapshot || `Current cash of ₹${(finance?.currentCash || 0).toLocaleString('en-IN')} providing ${finance?.runwayMonths ? `${finance.runwayMonths.toFixed(1)} months of runway` : 'stable pre-burn runway'}.`).toString().trim(),
    fundingAsk: (data.fundingAsk || `Seeking ${fundingReqFormatted} to accelerate product roadmap and initial go-to-market.`).toString().trim(),
    useOfFunds: (data.useOfFunds || 'Capital allocated across 60% core product engineering, 25% pilot deployments, and 15% operational reserve.').toString().trim(),
    closingStatement: (data.closingStatement || `Join us in transforming the future of ${startup.industry}.`).toString().trim(),
    elevatorPitch: (data.elevatorPitch || `${startup.name} is addressing ${startup.problemStatement || 'industry friction'} through ${startup.solution || 'modern automation'}. We are seeking ${fundingReqFormatted} to expand our initial traction and scale.`).toString().trim(),
    source: 'gemini',
  };
}

/**
 * Generates a deterministic fallback pitch using ground truth MongoDB data.
 * Does NOT hallucinate traction, revenue, or team numbers.
 */
function getFallbackPitch(context) {
  const { startup, team, tasks, executionScore, finance, analysis } = context;

  const fundingFormatted = (Number(startup.fundingRequired) || 0) > 0
    ? `₹${(Number(startup.fundingRequired) || 0).toLocaleString('en-IN')}`
    : '₹25,00,000';

  const hasRevenue = finance && Number(finance.totalIncome) > 0;
  const tractionText = hasRevenue
    ? `Demonstrated pilot monetization of ₹${Number(finance.totalIncome).toLocaleString('en-IN')} across initial users.`
    : 'Pre-traction: The venture is focused on active sprint delivery and rapid MVP iteration. Traction metrics are not yet available.';

  const runwayText = finance?.runwayMonths
    ? `${finance.runwayMonths.toFixed(1)} months of projected runway`
    : 'Pre-burn stage with initial capital balance';

  const teamMembersText = team.names && team.names.length > 0
    ? `Founder collaborated with active developers (${team.names.join(', ')}) possessing verified skills in ${team.skills.slice(0, 4).join(', ') || 'software engineering'}.`
    : `Venture core team: Founder plus active developer squads.`;

  return {
    headline: `${startup.name} — Modern ${startup.industry} Platform`,
    oneLiner: startup.tagline || `Building scalable technology solutions for the ${startup.industry} space.`,
    problem: startup.problemStatement || `Target operators in ${startup.industry} struggle with legacy systems and operational friction.`,
    solution: startup.solution || `Delivering an intelligent, workflow-integrated solution that automates key outcomes.`,
    targetMarket: `Enterprises, businesses, and professionals operating across the modern ${startup.industry} ecosystem.`,
    businessModel: `Direct platform subscription and tiered usage pricing with scalable margin expansion.`,
    traction: tractionText,
    competitiveAdvantage: `High execution velocity (${executionScore}/100 score) paired with verified technical team capabilities.`,
    team: teamMembersText,
    financialSnapshot: `Current cash position of ₹${(Number(finance?.currentCash) || 0).toLocaleString('en-IN')} with ${runwayText}.`,
    fundingAsk: `Seeking an initial investment check of ${fundingFormatted} to execute product milestones.`,
    useOfFunds: `60% Engineering & Feature Delivery, 25% Customer Acquisition & Pilots, 15% Operations & Infrastructure.`,
    closingStatement: `${startup.name} is positioned at the intersection of execution discipline and market demand. Let's build together.`,
    elevatorPitch: `${startup.name} is solving critical pain points in ${startup.industry}. By tackling "${startup.problemStatement || 'inefficiencies'}" with our solution "${startup.solution || 'intelligent automation'}", we have established a high-velocity build squad with an execution score of ${executionScore}/100. We are raising ${fundingFormatted} to bring this solution to market.`,
    source: 'fallback',
  };
}

/**
 * Assembles live context for a startup.
 */
async function gatherStartupPitchContext(startupId) {
  const startup = await Startup.findById(startupId);
  if (!startup) {
    throw new Error('Startup not found');
  }

  // Active Team & Skills
  const memberships = await TeamMembership.find({ startup: startupId, status: 'ACTIVE' }).populate('user', 'name email');
  const devUserIds = memberships.map((m) => m.user?._id).filter(Boolean);
  const profiles = await DeveloperProfile.find({ user: { $in: devUserIds } });

  const skillsSet = new Set();
  profiles.forEach((p) => {
    (p.skills || []).forEach((s) => skillsSet.add(s));
  });

  const team = {
    size: 1 + memberships.length,
    names: memberships.map((m) => m.user?.name).filter(Boolean),
    skills: Array.from(skillsSet),
  };

  // Execution Stats
  let executionScore = 50;
  try {
    const exec = await calculateExecutionScore(startupId);
    executionScore = exec?.score ?? 50;
  } catch (e) {
    executionScore = 50;
  }

  const tasks = await Task.find({ startup: startupId });
  const completedTasks = tasks.filter((t) => t.status === 'DONE').length;
  const totalTasks = tasks.length;

  const activeSprint = await Sprint.findOne({ startup: startupId, status: { $in: ['IN_PROGRESS', 'ACTIVE', 'APPROVED'] } });

  // Finance Summary
  let finance = {
    totalIncome: 0,
    totalExpenses: 0,
    netCashFlow: 0,
    currentCash: Number(startup.initialCapital || 0) + Number(startup.fundingReceived || 0),
    runwayMonths: null,
    fundingGap: Math.max(0, (Number(startup.fundingRequired) || 0) - (Number(startup.fundingReceived) || 0)),
  };

  try {
    finance = await calculateFinancialSummary(startupId);
  } catch (e) {
    // Keep baseline
  }

  return {
    startup,
    team,
    tasks: {
      total: totalTasks,
      completed: completedTasks,
      hasActiveSprint: Boolean(activeSprint),
    },
    executionScore,
    finance,
    analysis: startup.aiAnalysis || null,
  };
}

/**
 * Generates an investor pitch using Gemini with strict grounding and fallback.
 */
async function generatePitch(startupId) {
  const context = await gatherStartupPitchContext(startupId);
  const { startup, team, tasks, executionScore, finance, analysis } = context;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    console.warn('[PitchAiService] No GEMINI_API_KEY. Using deterministic fallback pitch.');
    return getFallbackPitch(context);
  }

  const fundingFormatted = (Number(startup.fundingRequired) || 0) > 0
    ? `₹${(Number(startup.fundingRequired) || 0).toLocaleString('en-IN')}`
    : 'Not yet declared';

  const hasRevenue = Number(finance.totalIncome) > 0;
  const tractionContext = hasRevenue
    ? `Total recorded pilot revenue: ₹${Number(finance.totalIncome).toLocaleString('en-IN')}`
    : `Pre-traction. The startup has zero recorded customers or revenue so far. State clearly that traction data is not yet available and the startup is currently pre-traction. DO NOT invent customers, revenue, or user numbers.`;

  const prompt = `You are an expert venture capital pitch deck advisor.
Transform the following verified startup data into a cohesive, highly professional, investor-ready pitch.

CRITICAL INSTRUCTIONS:
1. Ground every statement in the actual data provided below.
2. DO NOT hallucinate, invent, or assume any facts, customers, partnerships, revenue numbers, market sizes, or team members.
3. If traction data is unavailable or zero, explicitly state that the company is pre-traction.
4. Use the deterministic financial numbers provided: Funding Ask: ${fundingFormatted}, Current Cash: ₹${(Number(finance.currentCash) || 0).toLocaleString('en-IN')}, Runway: ${finance.runwayMonths ? `${finance.runwayMonths.toFixed(1)} months` : 'N/A'}.
5. Do NOT recalculate or modify financial metrics.

VERIFIED STARTUP DATA:
- Startup Name: ${startup.name}
- Industry: ${startup.industry}
- Stage: ${startup.stage}
- Tagline: ${startup.tagline || 'N/A'}
- Problem: ${startup.problemStatement}
- Solution: ${startup.solution}
- Description: ${startup.description || 'N/A'}

TEAM METRICS:
- Team Size: ${team.size} (Founder + ${team.names.length} developer(s): ${team.names.join(', ') || 'Solo'})
- Verified Technical Skills: ${team.skills.join(', ') || 'Software Development'}

EXECUTION METRICS:
- Execution Score: ${executionScore}/100
- Sprint Delivery: ${tasks.completed}/${tasks.total} tasks completed
- Active Sprint: ${tasks.hasActiveSprint ? 'Active Sprint in progress' : 'Planning next sprint'}

FINANCIAL SNAPSHOT (DO NOT ALTER):
- Funding Required: ${fundingFormatted}
- Funding Received: ₹${(Number(startup.fundingReceived) || 0).toLocaleString('en-IN')}
- Current Cash: ₹${(Number(finance.currentCash) || 0).toLocaleString('en-IN')}
- Total Revenue: ₹${(Number(finance.totalIncome) || 0).toLocaleString('en-IN')}
- Total Expenses: ₹${(Number(finance.totalExpenses) || 0).toLocaleString('en-IN')}
- Runway: ${finance.runwayMonths ? `${finance.runwayMonths.toFixed(1)} months` : 'Pre-burn stage'}
- Traction: ${tractionContext}

AI FEASIBILITY ASSESSMENT:
- Summary: ${analysis?.executiveAssessment || 'Validated early opportunity'}
- Market Potential: ${analysis?.marketPotential?.verdict || 'High potential'}

Return ONLY a JSON object with this EXACT structure:
{
  "headline": "Punchy 5-8 word investor deck title",
  "oneLiner": "Clear, compelling one-sentence description",
  "problem": "Concise paragraph detailing the exact industry friction",
  "solution": "Clear description of product and customer value proposition",
  "targetMarket": "Specific market segments and target customer profile",
  "businessModel": "How the business generates revenue and scales margins",
  "traction": "Factual traction statement (if pre-traction, say pre-traction)",
  "competitiveAdvantage": "Unique moat, execution velocity, or technical differentiation",
  "team": "Team composition, background, and delivery capacity",
  "financialSnapshot": "Summary of current cash position and runway",
  "fundingAsk": "Specific capital requirement and targeted investment round",
  "useOfFunds": "Clear allocation breakdown of how the funds will be deployed",
  "closingStatement": "Inspiring, confident closing appeal to venture partners",
  "elevatorPitch": "A high-impact 30-60 second pitch synthesizing the opportunity",
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

    for (const model of candidateModels) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Gemini pitch generation timeout')), 22000)
        );

        const apiCall = ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });

        const response = await Promise.race([apiCall, timeoutPromise]);
        const parsed = parseJsonSafe(response.text);
        return validateAndNormalizePitch(parsed, context);
      } catch (err) {
        lastError = err;
        console.warn(`[PitchAiService] Candidate ${model} failed (${err.message}). Trying next.`);
      }
    }

    throw lastError || new Error('All candidate models failed');
  } catch (err) {
    console.warn(`[PitchAiService] Gemini pitch generation failed (${err.message}). Reverting to deterministic fallback.`);
    return getFallbackPitch(context);
  }
}

module.exports = {
  generatePitch,
  getFallbackPitch,
  gatherStartupPitchContext,
  validateAndNormalizePitch,
};
