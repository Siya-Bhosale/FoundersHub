const mongoose = require('mongoose');
const Startup = require('../models/Startup');
const InvestorProfile = require('../models/InvestorProfile');
const TeamMembership = require('../models/TeamMembership');
const DeveloperProfile = require('../models/DeveloperProfile');
const FinancialTransaction = require('../models/FinancialTransaction');
const Sprint = require('../models/Sprint');
const Task = require('../models/Task');
const { calculateExecutionScore } = require('./executionScoreService');

/**
 * 1. Industry Fit (Weight: 30%)
 * Case-insensitive match between startup industry (and compound tokens)
 * and investor preferred industries.
 */
function calculateIndustryFit(startup, investorProfile) {
  const startupIndustry = (startup.industry || '').trim().toLowerCase();
  const investorIndustries = (investorProfile?.industries || [])
    .map((i) => (i || '').trim().toLowerCase())
    .filter(Boolean);

  if (!startupIndustry || investorIndustries.length === 0) {
    return { score: 0, weight: 30, matched: false };
  }

  // Check direct equality or inclusion
  const directMatch = investorIndustries.some(
    (invInd) => startupIndustry === invInd || startupIndustry.includes(invInd) || invInd.includes(startupIndustry)
  );

  if (directMatch) {
    return { score: 30, weight: 30, matched: true, reason: `Matches preferred industry: ${startup.industry}` };
  }

  // Check tokenized match (e.g., "AI Agriculture" matches "AI" or "Agriculture")
  const startupTokens = startupIndustry.split(/[\s,/&-]+/).filter((t) => t.length > 1);
  const tokenMatch = investorIndustries.some((invInd) => {
    const invTokens = invInd.split(/[\s,/&-]+/).filter((t) => t.length > 1);
    return startupTokens.some((st) => invTokens.includes(st) || invInd.includes(st));
  });

  if (tokenMatch) {
    return { score: 30, weight: 30, matched: true, reason: `Matches industry sector: ${startup.industry}` };
  }

  return { score: 0, weight: 30, matched: false, reason: `No overlap with preferred industries` };
}

/**
 * 2. Stage Fit (Weight: 20%)
 * Checks if startup stage is in investor's preferred investment stages.
 */
function calculateStageFit(startup, investorProfile) {
  const startupStage = (startup.stage || '').trim().toUpperCase();
  const preferredStages = (investorProfile?.investmentStages || []).map((s) => s.trim().toUpperCase());

  if (!startupStage || preferredStages.length === 0) {
    return { score: 0, weight: 20, matched: false };
  }

  if (preferredStages.includes(startupStage)) {
    return { score: 20, weight: 20, matched: true, reason: `Matches preferred investment stage (${startupStage})` };
  }

  return { score: 0, weight: 20, matched: false, reason: `Stage (${startupStage}) is not in preferred stages` };
}

/**
 * 3. Investment Range Fit (Weight: 20%)
 * Checks if startup.fundingRequired falls within investor min and max.
 * Applies distance-based proportional decay if outside range.
 */
function calculateInvestmentRangeFit(startup, investorProfile) {
  const fundingRequired = Number(startup.fundingRequired) || 0;
  const min = Number(investorProfile?.minInvestment) || 0;
  const max = Number(investorProfile?.maxInvestment) || Infinity;

  // Unspecified funding requirement
  if (fundingRequired <= 0) {
    return { score: 5, weight: 20, reason: 'Funding requirement not yet specified by founder' };
  }

  // Exact in-range match
  if (fundingRequired >= min && fundingRequired <= max) {
    return { score: 20, weight: 20, reason: `Funding requirement (₹${fundingRequired.toLocaleString('en-IN')}) is within investment range` };
  }

  // Below minimum ticket size
  if (fundingRequired < min && min > 0) {
    const ratio = fundingRequired / min;
    const score = Math.max(0, Math.min(18, Math.round(20 * ratio)));
    return { score, weight: 20, reason: `Funding requirement is below minimum target of ₹${min.toLocaleString('en-IN')}` };
  }

  // Above maximum ticket size
  if (fundingRequired > max && max > 0 && max !== Infinity) {
    const ratio = max / fundingRequired;
    const score = Math.max(0, Math.min(18, Math.round(20 * ratio)));
    return { score, weight: 20, reason: `Funding requirement exceeds maximum target of ₹${max.toLocaleString('en-IN')}` };
  }

  return { score: 10, weight: 20, reason: 'Partial investment range alignment' };
}

/**
 * 4. Team Fit (Weight: 10%)
 * - Founder + active developer: 5 points.
 * - Relevant skills / capabilities: additional 5 points.
 */
async function calculateTeamFit(startup) {
  try {
    const activeMembers = await TeamMembership.find({
      startup: startup._id,
      status: 'ACTIVE',
    }).populate('user', 'name email');

    if (!activeMembers || activeMembers.length === 0) {
      // Solo founder
      return { score: 2, weight: 10, reason: 'Solo founder team without verified active developers' };
    }

    let score = 5; // Base for having active developer team
    const memberUserIds = activeMembers.map((m) => m.user?._id).filter(Boolean);

    if (memberUserIds.length > 0) {
      const devProfiles = await DeveloperProfile.find({
        user: { $in: memberUserIds },
      });

      const hasSkills = devProfiles.some((p) => Array.isArray(p.skills) && p.skills.length >= 2);
      if (hasSkills) {
        score += 5;
        return { score, weight: 10, reason: `Team has verified technical developers with aligned skills (${activeMembers.length} active member${activeMembers.length > 1 ? 's' : ''})` };
      }
    }

    return { score, weight: 10, reason: `Startup has ${activeMembers.length} active team collaborator${activeMembers.length > 1 ? 's' : ''}` };
  } catch (err) {
    console.error('Error calculating team fit:', err.message);
    return { score: 5, weight: 10, reason: 'Base team structure evaluated' };
  }
}

/**
 * 5. Investor Readiness (Weight: 20%)
 * Transparent deterministic formula across 5 signals (4 points each):
 * 1. AI Analysis exists: 4 points
 * 2. Active/approved sprint or tasks exist: 4 points
 * 3. Execution score >= 60: 4 points (if score >= 40: 2 points)
 * 4. Financial data recorded: 4 points
 * 5. Funding requirement set: 4 points
 */
async function calculateInvestorReadiness(startup) {
  let score = 0;
  const signals = [];

  // Signal 1: AI Idea Analysis exists
  if (startup.aiAnalysis && startup.aiAnalysis.overallAssessment) {
    score += 4;
    signals.push('AI Idea Analysis completed');
  }

  // Signal 2: Active sprint or tasks exist
  try {
    const taskCount = await Task.countDocuments({ startup: startup._id });
    const sprintCount = await Sprint.countDocuments({ startup: startup._id });
    if (taskCount > 0 || sprintCount > 0) {
      score += 4;
      signals.push('Active sprint and task roadmap configured');
    }
  } catch (e) {
    // Non-fatal
  }

  // Signal 3: Execution score
  try {
    const execScoreData = await calculateExecutionScore(startup._id);
    const execScore = execScoreData?.score || 0;
    if (execScore >= 60) {
      score += 4;
      signals.push(`Strong execution score (${execScore}/100)`);
    } else if (execScore >= 40) {
      score += 2;
      signals.push(`Moderate execution score (${execScore}/100)`);
    }
  } catch (e) {
    // Non-fatal
  }

  // Signal 4: Financial data exists
  try {
    const txCount = await FinancialTransaction.countDocuments({ startup: startup._id });
    const hasCapital = (Number(startup.fundingReceived) || 0) > 0 || (Number(startup.initialCapital) || 0) > 0;
    if (txCount > 0 || hasCapital) {
      score += 4;
      signals.push('Financial ledger and capital metrics recorded');
    }
  } catch (e) {
    // Non-fatal
  }

  // Signal 5: Funding requirement set
  if ((Number(startup.fundingRequired) || 0) > 0) {
    score += 4;
    signals.push('Target funding requirement declared');
  }

  return {
    score: Math.min(20, score),
    weight: 20,
    signals,
    reason: signals.length > 0 ? signals.join(' • ') : 'Initial venture setup in progress',
  };
}

/**
 * Calculates complete deterministic match breakdown for a single startup and investor.
 */
async function calculateStartupMatch(startup, investorProfile) {
  const industryFit = calculateIndustryFit(startup, investorProfile);
  const stageFit = calculateStageFit(startup, investorProfile);
  const investmentRange = calculateInvestmentRangeFit(startup, investorProfile);
  const teamFit = await calculateTeamFit(startup);
  const investorReadiness = await calculateInvestorReadiness(startup);

  const totalScore = Math.min(
    100,
    Math.max(
      0,
      industryFit.score + stageFit.score + investmentRange.score + teamFit.score + investorReadiness.score
    )
  );

  return {
    startupId: startup._id.toString(),
    startupName: startup.name,
    tagline: startup.tagline || '',
    industry: startup.industry || '',
    stage: startup.stage || '',
    matchScore: totalScore,
    components: {
      industryFit: {
        score: industryFit.score,
        weight: industryFit.weight,
        reason: industryFit.reason,
      },
      stageFit: {
        score: stageFit.score,
        weight: stageFit.weight,
        reason: stageFit.reason,
      },
      investmentRange: {
        score: investmentRange.score,
        weight: investmentRange.weight,
        reason: investmentRange.reason,
      },
      teamFit: {
        score: teamFit.score,
        weight: teamFit.weight,
        reason: teamFit.reason,
      },
      investorReadiness: {
        score: investorReadiness.score,
        weight: investorReadiness.weight,
        reason: investorReadiness.reason,
      },
    },
  };
}

/**
 * Ranks all discoverable startups for an investor by deterministic match score descending.
 */
async function rankStartupsForInvestor(investorUserId) {
  let profile = await InvestorProfile.findOne({ user: investorUserId });
  if (!profile) {
    // Default empty profile fallback for unregistered preferences
    profile = {
      industries: [],
      investmentStages: [],
      minInvestment: 0,
      maxInvestment: 10000000,
    };
  }

  const startups = await Startup.find()
    .populate('founder', 'name email')
    .sort({ createdAt: -1 });

  const matches = [];

  for (const startup of startups) {
    const match = await calculateStartupMatch(startup, profile);

    // Compute high-level team count and execution score for the card
    const teamCount = 1 + (await TeamMembership.countDocuments({ startup: startup._id, status: 'ACTIVE' }));
    let executionScore = 0;
    try {
      const exec = await calculateExecutionScore(startup._id);
      executionScore = exec?.score || 0;
    } catch (e) {
      executionScore = 0;
    }

    const fundingRequired = Number(startup.fundingRequired) || 0;
    const fundingReceived = Number(startup.fundingReceived) || 0;
    const fundingGap = Math.max(0, fundingRequired - fundingReceived);

    matches.push({
      ...match,
      problemStatement: startup.problemStatement || '',
      solution: startup.solution || '',
      teamSize: teamCount,
      executionScore,
      fundingRequired,
      fundingReceived,
      fundingGap,
    });
  }

  // Sort strictly by deterministic matchScore descending
  matches.sort((a, b) => b.matchScore - a.matchScore);

  return matches;
}

module.exports = {
  calculateIndustryFit,
  calculateStageFit,
  calculateInvestmentRangeFit,
  calculateTeamFit,
  calculateInvestorReadiness,
  calculateStartupMatch,
  rankStartupsForInvestor,
};
