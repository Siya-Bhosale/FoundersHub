const { GoogleGenAI } = require('@google/genai');
const Startup = require('../models/Startup');
const TeamMembership = require('../models/TeamMembership');
const DeveloperProfile = require('../models/DeveloperProfile');
const Task = require('../models/Task');
const Sprint = require('../models/Sprint');
const FundingInterest = require('../models/FundingInterest');
const { calculateExecutionScore } = require('./executionScoreService');
const { calculateFinancialSummary } = require('./financeService');

/**
 * Strips markdown code fences and parses JSON safely.
 */
function parseJsonSafe(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty or invalid Copilot response');
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
 * Assembles full operational context for a startup.
 */
async function gatherCopilotContext(startupId) {
  const startup = await Startup.findById(startupId);
  if (!startup) {
    throw new Error('Startup not found');
  }

  // Tasks breakdown
  const tasks = await Task.find({ startup: startupId });
  const now = new Date();

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'DONE').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS');
  const blockedTasks = tasks.filter((t) => t.status === 'BLOCKED');
  const overdueTasks = tasks.filter(
    (t) => t.status !== 'DONE' && t.dueDate && new Date(t.dueDate) < now
  );

  // Active Sprint
  const activeSprint = await Sprint.findOne({
    startup: startupId,
    status: { $in: ['IN_PROGRESS', 'ACTIVE', 'APPROVED'] },
  });

  // Team
  const memberships = await TeamMembership.find({ startup: startupId, status: 'ACTIVE' }).populate('user', 'name');
  const devUserIds = memberships.map((m) => m.user?._id).filter(Boolean);
  const profiles = await DeveloperProfile.find({ user: { $in: devUserIds } });
  const allSkills = new Set();
  profiles.forEach((p) => (p.skills || []).forEach((s) => allSkills.add(s)));

  // Execution score
  let executionScore = 50;
  let executionGrade = 'NEEDS_ATTENTION';
  try {
    const exec = await calculateExecutionScore(startupId);
    executionScore = exec?.score ?? 50;
    executionGrade = exec?.grade ?? 'NEEDS_ATTENTION';
  } catch (e) {
    // Default
  }

  // Finance
  let finance = {
    totalIncome: 0,
    totalExpenses: 0,
    currentCash: (Number(startup.initialCapital) || 0) + (Number(startup.fundingReceived) || 0),
    runwayMonths: null,
    fundingGap: Math.max(0, (Number(startup.fundingRequired) || 0) - (Number(startup.fundingReceived) || 0)),
  };
  try {
    finance = await calculateFinancialSummary(startupId);
  } catch (e) {
    // Default
  }

  // Investor Interests
  const investorInterestsCount = await FundingInterest.countDocuments({
    startup: startupId,
    status: 'INTERESTED',
  });

  return {
    startup,
    team: {
      size: 1 + memberships.length,
      developers: memberships.map((m) => m.user?.name).filter(Boolean),
      skills: Array.from(allSkills),
    },
    sprint: {
      name: activeSprint?.name || 'No active sprint',
      status: activeSprint?.status || 'NONE',
      goal: activeSprint?.goal || 'Deliver core sprint deliverables',
    },
    tasks: {
      total: totalTasks,
      completed: completedTasks,
      inProgressCount: inProgressTasks.length,
      blockedCount: blockedTasks.length,
      blockedList: blockedTasks.map((t) => ({ title: t.title, priority: t.priority })),
      overdueCount: overdueTasks.length,
      overdueList: overdueTasks.map((t) => ({ title: t.title, priority: t.priority })),
    },
    execution: {
      score: executionScore,
      grade: executionGrade,
      riskAnalysis: startup.executionRiskAnalysis || null,
    },
    finance,
    investorInterestsCount,
  };
}

/**
 * Generates a deterministic contextual fallback response based on real startup metrics.
 */
function getFallbackCopilotResponse(context, userMessage) {
  const { startup, team, sprint, tasks, execution, finance, investorInterestsCount } = context;
  const lower = (userMessage || '').toLowerCase();

  let answer = '';
  let actions = [];
  let references = [];

  // 1. OVERDUE TASKS INQUIRY
  if (lower.includes('overdue') || lower.includes('past due') || lower.includes('late')) {
    if (tasks.overdueCount > 0) {
      answer = `${startup.name} currently has ${tasks.overdueCount} overdue task(s) (e.g. "${tasks.overdueList[0]?.title || 'Sprint task'}"). Overdue deliverables directly depress your deadline adherence and drag down the overall execution score (${execution.score}/100).`;
      actions = [
        `Sync with assigned team members on "${tasks.overdueList[0]?.title || 'Overdue item'}"`,
        'Re-estimate deadlines or eliminate technical roadblocks',
        'Review the sprint schedule to avoid compounding downstream delays',
      ];
      references = tasks.overdueList.map((t) => `Overdue Task: "${t.title}"`);
    } else {
      answer = `Great news: ${startup.name} has 0 overdue tasks! All active deliverables are tracking within their projected sprint schedules, keeping your execution velocity on target.`;
      actions = [
        'Maintain daily syncs to prevent milestone slippage',
        'Focus team capacity on in-progress feature implementations',
        'Review upcoming backlog items for the next sprint cycle',
      ];
      references = ['0 overdue tasks', `Execution Score: ${execution.score}/100`];
    }
  }
  // 2. FOCUS THIS WEEK / STRATEGIC SPRINT FOCUS
  else if (lower.includes('focus') || lower.includes('this week')) {
    if (tasks.blockedCount > 0 || tasks.overdueCount > 0) {
      answer = `Your strategic focus this week must be operational de-risking: resolving ${tasks.blockedCount} blocked task(s) and clearing ${tasks.overdueCount} overdue milestone(s). Unblocking your developers (${team.developers.length > 0 ? team.developers.join(', ') : 'team'}) is the fastest path to protect your execution score (${execution.score}/100) and keep sprint "${sprint.name}" on track.`;
      actions = [
        tasks.blockedCount > 0 ? `Unblock: ${tasks.blockedList[0]?.title || 'Pending blocked item'}` : 'Audit sprint dependencies',
        tasks.overdueCount > 0 ? `Ship overdue deliverable: ${tasks.overdueList[0]?.title || 'Milestone delivery'}` : 'Review sprint burn-down',
        'Hold a focused 15-minute sync with the development team to unblock bottlenecks',
      ];
      references = [
        `Sprint: "${sprint.name}"`,
        `Blocked: ${tasks.blockedCount}`,
        `Overdue: ${tasks.overdueCount}`,
        `Execution Score: ${execution.score}/100`,
      ];
    } else {
      answer = `Your task delivery pipeline is healthy with 0 blockers and 0 overdue items. Your team has completed ${tasks.completed} of ${tasks.total} tasks. Focus this week on advancing in-progress features, validating pilot user feedback, and locking in sprint "${sprint.name}" goals: "${sprint.goal}".`;
      actions = [
        'Continue active sprint feature implementations',
        'Gather feedback from early test users or design partners',
        'Prepare task specifications for the next sprint cycle',
      ];
      references = [
        `Sprint: "${sprint.name}"`,
        `Progress: ${tasks.completed}/${tasks.total} completed`,
        `Execution Score: ${execution.score}/100`,
      ];
    }
  }
  // 3. RISK ANALYSIS & BOTTLENECK INQUIRY
  else if (lower.includes('risk') || lower.includes('bottleneck')) {
    answer = `Your current Execution Score is ${execution.score}/100 (${execution.grade}). Key risk factors include ${tasks.blockedCount} blocked task(s) and ${tasks.overdueCount} overdue item(s) across a team of ${team.size}. Maintaining disciplined sprint delivery is essential to mitigate operational and investor due-diligence risks.`;
    actions = [
      'Eliminate high-priority blockers to improve execution velocity',
      'Schedule a daily 10-minute team standup to surface dependencies early',
      'Check the Execution Intelligence dashboard for detailed component breakdowns',
    ];
    references = [
      `Execution Score: ${execution.score}/100 (${execution.grade})`,
      `Blocked Tasks: ${tasks.blockedCount}`,
      `Overdue Tasks: ${tasks.overdueCount}`,
    ];
  }
  // 4. FINANCIAL POSITION & RUNWAY INQUIRY
  else if (lower.includes('finance') || lower.includes('runway') || lower.includes('cash') || lower.includes('burn')) {
    const runwayStr = finance.runwayMonths ? `${finance.runwayMonths.toFixed(1)} months` : 'stable pre-burn';
    answer = `Financially, ${startup.name} has ₹${(Number(finance.currentCash) || 0).toLocaleString('en-IN')} in available capital with an estimated ${runwayStr} of runway. Total recorded revenue is ₹${(Number(finance.totalIncome) || 0).toLocaleString('en-IN')} against ₹${(Number(finance.totalExpenses) || 0).toLocaleString('en-IN')} in operational expenses. Target funding gap is ₹${(Number(finance.fundingGap) || 0).toLocaleString('en-IN')}.`;
    actions = [
      'Log upcoming infrastructure or cloud compute expenses in the Finance module',
      'Maintain disciplined runway management prior to your next funding discussions',
      'Review the Finance dashboard to verify monthly burn trajectory',
    ];
    references = [
      `Current Cash: ₹${(Number(finance.currentCash) || 0).toLocaleString('en-IN')}`,
      `Runway: ${runwayStr}`,
      `Total Revenue: ₹${(Number(finance.totalIncome) || 0).toLocaleString('en-IN')}`,
      `Total Expenses: ₹${(Number(finance.totalExpenses) || 0).toLocaleString('en-IN')}`,
    ];
  }
  // 5. INVESTOR READINESS & FUNDING INQUIRY
  else if (lower.includes('investor') || lower.includes('funding') || lower.includes('raise') || lower.includes('match') || lower.includes('ready for investors')) {
    answer = `${startup.name} currently has ${investorInterestsCount} active investor interest proposal(s) on file with a declared funding ask of ₹${(Number(startup.fundingRequired) || 0).toLocaleString('en-IN')}. With an execution score of ${execution.score}/100 and a team of ${team.size}, you have demonstrable operational traction to anchor investor dialogues.`;
    actions = [
      'Generate an updated AI Pitch Deck from the Pitch Generator',
      'Review incoming investor interests in your Startup Details overview',
      'Ensure all sprint deliverables are up to date for due diligence',
    ];
    references = [
      `Funding Ask: ₹${(Number(startup.fundingRequired) || 0).toLocaleString('en-IN')}`,
      `Active Investor Interests: ${investorInterestsCount}`,
      `Execution Score: ${execution.score}/100`,
    ];
  }
  // 6. TASK PRIORITIZATION INQUIRY
  else if (lower.includes('prioritize') || lower.includes('priorit') || lower.includes('which tasks')) {
    if (tasks.blockedCount > 0) {
      answer = `Priority #1 is clearing your ${tasks.blockedCount} blocked task(s) (e.g. "${tasks.blockedList[0]?.title || 'Blocked item'}"). Next, tackle any overdue deliverables before assigning new backlog items to the team.`;
      actions = [
        `Investigate root cause on "${tasks.blockedList[0]?.title || 'Blocked task'}"`,
        'Reassign tasks on the Kanban board to balance developer workloads',
        'Align team assignments with sprint milestone commitments',
      ];
      references = tasks.blockedList.map((t) => `Blocked Task: "${t.title}"`);
    } else {
      answer = `With 0 blockers, prioritize tasks in IN PROGRESS status (${tasks.inProgressCount} active) to ensure they reach DONE before the sprint ends. After that, pull the highest-priority TODO items from the backlog.`;
      actions = [
        'Push in-progress items through code review to completion',
        'Review unassigned TODO tasks on the Kanban board',
        'Verify acceptance criteria with the active sprint goal',
      ];
      references = [`In-Progress Tasks: ${tasks.inProgressCount}`, `Completed Tasks: ${tasks.completed}/${tasks.total}`];
    }
  }
  // 7. EXECUTION SCORE EXPLANATION
  else if (lower.includes('execution score')) {
    answer = `${startup.name}'s Execution Score is ${execution.score}/100 (${execution.grade}). The score reflects ${tasks.completed}/${tasks.total} task completion, ${tasks.blockedCount} blockers, and ${tasks.overdueCount} overdue deliverables. Resolving impediments and maintaining consistent delivery will boost your rating toward the top tier.`;
    actions = [
      'Eliminate open blockers to recover velocity points',
      'Update completed task statuses promptly on the board',
      'Check the Execution Intelligence view for granular breakdown metrics',
    ];
    references = [
      `Execution Score: ${execution.score}/100 (${execution.grade})`,
      `Tasks Completed: ${tasks.completed}/${tasks.total}`,
      `Overdue: ${tasks.overdueCount}`,
      `Blocked: ${tasks.blockedCount}`,
    ];
  }
  // 8. DYNAMIC GENERAL / STRATEGIC INQUIRY
  else {
    const cleanMsg = (userMessage || '').trim();
    if (lower.includes('market') || lower.includes('growth') || lower.includes('customer') || lower.includes('sales') || lower.includes('acquisition')) {
      answer = `For ${startup.name} (${startup.industry}), growth at stage ${startup.stage} begins with deep customer interviews and rapid validation of your core value proposition: "${startup.solution}". With an execution score of ${execution.score}/100 and available cash of ₹${(Number(finance.currentCash) || 0).toLocaleString('en-IN')}, focus customer acquisition on high-intent niche channels before scaling broad paid spend.`;
      actions = [
        'Conduct 5 discovery interviews with target users in your industry this week',
        'Define a single North Star metric for product-market fit (e.g. weekly active retention)',
        'Align sprint deliverables directly with top customer pain points',
      ];
      references = [
        `Startup: ${startup.name}`,
        `Solution: "${startup.solution}"`,
        `Cash: ₹${(Number(finance.currentCash) || 0).toLocaleString('en-IN')}`,
      ];
    } else if (lower.includes('hire') || lower.includes('team') || lower.includes('recruit') || lower.includes('talent')) {
      answer = `Your team currently consists of ${team.size} member(s) (${team.developers.length > 0 ? `Developers: ${team.developers.join(', ')}` : 'Founder solo'}). With an execution score of ${execution.score}/100 and ${finance.runwayMonths ? `${finance.runwayMonths.toFixed(1)} months of runway` : 'stable capital'}, prioritize technical roles that directly accelerate active sprint velocity over non-core overhead.`;
      actions = [
        'Identify skill gaps hindering current sprint delivery',
        'Leverage developer join requests in FoundersHub to onboard complementary talent',
        'Structure milestone-based contributions for new incoming developers',
      ];
      references = [
        `Team Size: ${team.size}`,
        `Execution Score: ${execution.score}/100`,
        `Current Runway: ${finance.runwayMonths ? `${finance.runwayMonths.toFixed(1)} mo` : 'N/A'}`,
      ];
    } else if (lower.includes('price') || lower.includes('monetiz') || lower.includes('revenue') || lower.includes('business model')) {
      answer = `For ${startup.name}, evaluate your monetization model against recorded revenue of ₹${(Number(finance.totalIncome) || 0).toLocaleString('en-IN')} and monthly burn. At the ${startup.stage} stage, testing tiered pilot pricing with early adopters validates willingness-to-pay while extending your ₹${(Number(finance.currentCash) || 0).toLocaleString('en-IN')} runway.`;
      actions = [
        'Test a transparent value-metric pricing tier with your top 3 pilot prospects',
        'Track gross margin assumptions against server and infrastructure costs in the Finance module',
        'Iterate pricing based on actual customer ROI and usage data',
      ];
      references = [
        `Total Revenue: ₹${(Number(finance.totalIncome) || 0).toLocaleString('en-IN')}`,
        `Current Cash: ₹${(Number(finance.currentCash) || 0).toLocaleString('en-IN')}`,
        `Funding Gap: ₹${(Number(finance.fundingGap) || 0).toLocaleString('en-IN')}`,
      ];
    } else {
      const sanitized = cleanMsg.replace(/[^\w\s?]/gi, '').trim();
      answer = `Regarding "${sanitized}": As founder of ${startup.name} (${startup.stage} • ${startup.industry}), your strategic leadership directly anchors sprint "${sprint.name}" (goal: "${sprint.goal}"). With an execution score of ${execution.score}/100, ${tasks.completed}/${tasks.total} tasks completed, and ₹${(Number(finance.currentCash) || 0).toLocaleString('en-IN')} in capital, keeping operational velocity disciplined is your highest-leverage priority.`;
      actions = [
        tasks.blockedCount > 0 ? `Resolve ${tasks.blockedCount} blocked deliverable(s) with team` : 'Maintain active sprint momentum with daily check-ins',
        'Review the Execution Intelligence dashboard for detailed operational health',
        'Update financial transactions to maintain an accurate runway forecast',
      ];
      references = [
        `Startup: ${startup.name} (${startup.stage})`,
        `Sprint: "${sprint.name}"`,
        `Execution Score: ${execution.score}/100`,
        `Capital: ₹${(Number(finance.currentCash) || 0).toLocaleString('en-IN')}`,
      ];
    }
  }

  return {
    answer,
    actions,
    references,
    source: 'fallback',
  };
}

/**
 * Handles contextual founder copilot queries.
 */
async function askFounderCopilot(startupId, message, history = []) {
  if (!message || typeof message !== 'string' || !message.trim()) {
    throw new Error('Message is required');
  }

  const context = await gatherCopilotContext(startupId);
  const { startup, team, sprint, tasks, execution, finance, investorInterestsCount } = context;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    console.warn('[FounderCopilot] No GEMINI_API_KEY. Using deterministic contextual fallback.');
    return getFallbackCopilotResponse(context, message);
  }

  const recentHistory = Array.isArray(history) ? history.slice(-10) : [];
  const historyText =
    recentHistory.length > 0
      ? recentHistory
          .map((h) => `${h.role === 'user' ? 'Founder' : 'Mentor'}: ${h.content || h.text || ''}`)
          .join('\n')
      : '';

  const prompt = `You are the Founder Copilot & AI Mentor for "${startup.name}", a startup in the "${startup.industry}" industry at "${startup.stage}" stage.
The founder is asking you for strategic, operational, and execution guidance.

CRITICAL OPERATIONAL RULES:
1. Base your answer strictly on the verified operational data provided below.
2. DO NOT invent, hallucinate, or assume facts, customers, revenue, or team members.
3. You are an advisory copilot: recommend specific actions, but NEVER claim to have directly modified database records, tasks, or finance entries.
4. Distinguish clearly between verified facts and tactical recommendations.
5. Provide actionable, concise, high-value advice suitable for a fast-moving startup founder.

LIVE STARTUP CONTEXT:
- Startup: ${startup.name} (${startup.industry} • ${startup.stage})
- Problem: ${startup.problemStatement}
- Solution: ${startup.solution}
- Team Size: ${team.size} (Founder + Developers: ${team.developers.join(', ') || 'None'})
- Verified Team Skills: ${team.skills.join(', ') || 'None declared'}

EXECUTION HEALTH:
- Execution Score: ${execution.score}/100 (${execution.grade})
- Active Sprint: ${sprint.name} (${sprint.status})
- Tasks: ${tasks.completed}/${tasks.total} completed, ${tasks.inProgressCount} in progress
- Blocked Tasks: ${tasks.blockedCount} (${tasks.blockedList.map((t) => t.title).join(', ') || 'None'})
- Overdue Tasks: ${tasks.overdueCount} (${tasks.overdueList.map((t) => t.title).join(', ') || 'None'})

FINANCIAL STATUS (DO NOT ALTER VALUES):
- Current Cash: ₹${(Number(finance.currentCash) || 0).toLocaleString('en-IN')}
- Total Income: ₹${(Number(finance.totalIncome) || 0).toLocaleString('en-IN')}
- Total Expenses: ₹${(Number(finance.totalExpenses) || 0).toLocaleString('en-IN')}
- Runway: ${finance.runwayMonths ? `${finance.runwayMonths.toFixed(1)} months` : 'Stable / pre-burn'}
- Funding Required: ₹${(Number(startup.fundingRequired) || 0).toLocaleString('en-IN')}
- Funding Gap: ₹${(Number(finance.fundingGap) || 0).toLocaleString('en-IN')}
- Active Investor Interests: ${investorInterestsCount}

${historyText ? `RECENT CONVERSATION HISTORY:\n${historyText}\n` : ''}

FOUNDER'S QUESTION:
"${message.trim()}"

Return ONLY a JSON object with this EXACT structure:
{
  "answer": "A grounded, highly thoughtful, unique 2-4 sentence advisory response addressing the founder's specific question directly with their real data. NEVER use generic templates or repetitive phrasing.",
  "actions": [
    "Concrete, immediate recommended action 1",
    "Concrete, immediate recommended action 2",
    "Concrete, immediate recommended action 3"
  ],
  "references": [
    "actual metric/task/sprint data referenced"
  ],
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
          setTimeout(() => reject(new Error('Copilot request timeout')), 18000)
        );

        const apiCall = ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.7,
          },
        });

        const response = await Promise.race([apiCall, timeoutPromise]);
        let rawText = response.text || '';
        if (rawText.startsWith('```json')) {
          rawText = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (rawText.startsWith('```')) {
          rawText = rawText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const parsed = JSON.parse(rawText.trim());
        if (parsed && typeof parsed.answer === 'string' && parsed.answer.trim()) {
          return {
            answer: parsed.answer.trim(),
            actions: Array.isArray(parsed.actions) ? parsed.actions : [],
            references: Array.isArray(parsed.references) ? parsed.references : [],
            source: 'gemini',
          };
        }
      } catch (err) {
        lastError = err;
        console.warn(`[FounderCopilot] Model ${model} failed (${err.message}). Trying next candidate.`);
      }
    }

    throw lastError || new Error('All Gemini candidate models failed');
  } catch (error) {
    console.warn(`[FounderCopilot] Gemini generation failed (${error.message}). Falling back to deterministic contextual advice.`);
    return getFallbackCopilotResponse(context, message);
  }
}

module.exports = {
  askFounderCopilot,
  getFallbackCopilotResponse,
  gatherCopilotContext,
};
