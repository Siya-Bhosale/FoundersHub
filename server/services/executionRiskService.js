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
 * Validates and normalizes Gemini execution risk analysis output.
 */
function validateAndNormalizeRiskAnalysis(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Risk analysis response must be a valid JSON object');
  }

  const validRisks = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  let overallRisk = (data.overallRisk || 'MEDIUM').toString().toUpperCase().trim();
  if (!validRisks.includes(overallRisk)) {
    overallRisk = 'MEDIUM';
  }

  // Bottleneck validation
  if (!data.bottleneck || typeof data.bottleneck !== 'object') {
    throw new Error('Missing bottleneck section in analysis');
  }
  const bottleneck = {
    title: (data.bottleneck.title || 'Workflow Bottleneck').toString().trim(),
    description: (data.bottleneck.description || 'Delays in key task streams are impacting sprint progress.').toString().trim(),
  };

  // Risks validation
  if (!Array.isArray(data.risks)) {
    throw new Error('Risks section must be an array');
  }
  const risks = data.risks.map((r, idx) => {
    let impact = (r.impact || 'MEDIUM').toString().toUpperCase().trim();
    if (!validRisks.includes(impact)) impact = 'MEDIUM';
    return {
      title: (r.title || `Risk Item #${idx + 1}`).toString().trim(),
      description: (r.description || 'Identified potential blocker in current sprint trajectory.').toString().trim(),
      impact,
    };
  });

  // Recommendations validation
  if (!Array.isArray(data.recommendations)) {
    throw new Error('Recommendations section must be an array');
  }
  const recommendations = data.recommendations.map((rec) => {
    let priority = (rec.priority || 'HIGH').toString().toUpperCase().trim();
    if (!['HIGH', 'MEDIUM', 'LOW'].includes(priority)) priority = 'HIGH';
    return {
      priority,
      action: (rec.action || 'Review and reorganize pending tasks.').toString().trim(),
      reason: (rec.reason || 'To mitigate risks and align with sprint goals.').toString().trim(),
    };
  });

  // Positive signals validation
  let positiveSignals = [];
  if (Array.isArray(data.positiveSignals)) {
    positiveSignals = data.positiveSignals
      .filter((s) => typeof s === 'string' && s.trim().length > 0)
      .map((s) => s.trim());
  }

  return {
    overallRisk,
    bottleneck,
    risks,
    recommendations,
    positiveSignals,
  };
}

/**
 * Deterministic fallback analysis derived from actual task and score statistics.
 * Called if Gemini API fails, times out, or is unconfigured.
 */
function getFallbackRiskAnalysis(payload) {
  const { startup, executionScore, tasks = [], team = [] } = payload;
  const score = executionScore ? executionScore.score : 50;
  const metadata = executionScore?.metadata || {};

  const blockedCount = metadata.blockedTasks || tasks.filter((t) => t.status === 'BLOCKED').length;
  const overdueCount = metadata.overdueTasks || 0;
  const totalTasks = tasks.length;
  const completedCount = metadata.completedTasks || tasks.filter((t) => t.status === 'DONE').length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  let overallRisk = 'LOW';
  let bottleneck = {
    title: 'Pacing and Sprint Flow',
    description: 'Sprint flow is consistent with steady task transitions across milestones.',
  };
  const risks = [];
  const recommendations = [];
  const positiveSignals = [];

  // Determine risk level and bottlenecks dynamically from data
  if (blockedCount > 0 || overdueCount > 2 || score < 50) {
    overallRisk = score < 40 || blockedCount >= 2 ? 'CRITICAL' : 'HIGH';
  } else if (overdueCount > 0 || score < 75) {
    overallRisk = 'MEDIUM';
  } else {
    overallRisk = 'LOW';
  }

  // Bottleneck detection
  if (blockedCount > 0) {
    bottleneck = {
      title: 'Blocked Task Dependencies',
      description: `${blockedCount} task(s) are currently marked BLOCKED, hindering downstream engineering velocity.`,
    };
    risks.push({
      title: 'Active Task Blockers',
      description: 'Dependent deliverables cannot proceed until blocker conditions are resolved.',
      impact: 'HIGH',
    });
    recommendations.push({
      priority: 'HIGH',
      action: 'Conduct an immediate blocker triage with assigned developers to remove obstacles.',
      reason: 'Unblocking dependencies prevents compounding delivery delays across the sprint.',
    });
  }

  if (overdueCount > 0) {
    if (blockedCount === 0) {
      bottleneck = {
        title: 'Overdue Milestones',
        description: `${overdueCount} task(s) have slipped past their designated deadlines.`,
      };
    }
    risks.push({
      title: 'Overdue Sprint Deliverables',
      description: `${overdueCount} task(s) have breached their due dates, impacting sprint completion confidence.`,
      impact: overdueCount > 2 ? 'HIGH' : 'MEDIUM',
    });
    recommendations.push({
      priority: 'HIGH',
      action: 'Reprioritize overdue tasks and assign available team capacity to close them.',
      reason: 'Timely milestone delivery is critical to maintain launch cadence.',
    });
  }

  // Workload analysis
  const workloadScore = executionScore?.components?.workload?.score || 15;
  if (workloadScore < 10) {
    risks.push({
      title: 'Workload Concentration',
      description: 'Task assignments and estimated hours are unevenly distributed across team members.',
      impact: 'MEDIUM',
    });
    recommendations.push({
      priority: 'MEDIUM',
      action: 'Reassign tasks from overloaded contributors to available developers.',
      reason: 'Balanced workload prevents developer burnout and mitigates single-point bottlenecks.',
    });
  }

  // Default risk if none found
  if (risks.length === 0) {
    risks.push({
      title: 'Scope Creep Management',
      description: 'Ensure new requirements are not introduced mid-sprint without adjusting deadlines.',
      impact: 'LOW',
    });
    recommendations.push({
      priority: 'MEDIUM',
      action: 'Maintain focus on current milestone deliverables before introducing new backlog items.',
      reason: 'Sustained focus protects high velocity and consistent execution quality.',
    });
  }

  // Positive signals
  if (completionPercentage >= 50) {
    positiveSignals.push(`${completionPercentage}% of sprint tasks have been successfully completed.`);
  }
  if (blockedCount === 0) {
    positiveSignals.push('Zero blocked tasks: team workflow and dependencies are clear.');
  }
  if (score >= 75) {
    positiveSignals.push(`Strong overall execution score (${score}/100) indicates healthy delivery momentum.`);
  }
  if (team.length > 1) {
    positiveSignals.push(`Active collaborative team with ${team.length} contributing members.`);
  }
  if (positiveSignals.length === 0) {
    positiveSignals.push('Sprint tasks are defined and structured for execution tracking.');
  }

  return {
    overallRisk,
    bottleneck,
    risks,
    recommendations,
    positiveSignals,
    source: 'fallback',
  };
}

/**
 * Timeout wrapper.
 */
function withTimeout(promise, ms = 25000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Gemini execution risk analysis timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/**
 * Analyzes execution risk using Google Gemini (@google/genai) with strict JSON output.
 * Automatically falls back to deterministic data-driven analysis upon any failure.
 */
async function analyzeExecutionRisk(payload) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    console.warn('[ExecutionRiskService] No GEMINI_API_KEY configured. Utilizing deterministic fallback analysis.');
    return getFallbackRiskAnalysis(payload);
  }

  const { startup, sprint, tasks = [], team = [], executionScore } = payload;

  const tasksSummary = tasks.map((t) => ({
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate ? t.dueDate.toISOString().split('T')[0] : 'None',
    estimatedHours: t.estimatedHours || 2,
    isOverdue: t.dueDate && t.status !== 'DONE' && new Date(t.dueDate) < new Date(),
  }));

  const teamSummary = team.map((m) => ({
    role: m.role || 'DEVELOPER',
    name: m.user?.name || 'Developer',
    availability: m.profile?.availability || 'AVAILABLE',
    skills: m.profile?.skills || [],
  }));

  const prompt = `You are a startup CTO and technical execution risk advisor.
Analyze the following startup sprint execution data to identify bottlenecks, delivery risks, and actionable recommendations.

IMPORTANT:
- The execution score is ALREADY calculated deterministically: Overall Score = ${executionScore.score}/100 (${executionScore.grade}).
- Do NOT recalculate or modify the execution score.
- Your task is to diagnose real execution bottlenecks, evaluate risk impact, and recommend precise actions.

STARTUP CONTEXT:
- Name: ${startup.name || 'Startup'}
- Industry: ${startup.industry || 'Technology'}
- Stage: ${startup.stage || 'MVP'}

ACTIVE SPRINT:
- Name: ${sprint?.name || 'Current Sprint'}
- Goal: ${sprint?.goal || 'Sprint Milestone'}
- Duration: ${sprint?.duration || 14} days
- Status: ${sprint?.status || 'ACTIVE'}

DETERMINISTIC EXECUTION METRICS:
- Overall Score: ${executionScore.score} / 100 (${executionScore.grade})
- Task Completion Component: ${executionScore.components.taskCompletion.score}/40 (${executionScore.components.taskCompletion.percentage}%)
- Deadline Adherence Component: ${executionScore.components.deadlineAdherence.score}/25 (${executionScore.components.deadlineAdherence.percentage}%)
- Workload Component: ${executionScore.components.workload.score}/15 (${executionScore.components.workload.percentage}%)
- Risk Component: ${executionScore.components.risk.score}/10 (${executionScore.components.risk.percentage}%)
- Velocity Component: ${executionScore.components.velocity.score}/10 (${executionScore.components.velocity.percentage}%)
- Overdue Tasks Count: ${executionScore.metadata?.overdueTasks || 0}
- Blocked Tasks Count: ${executionScore.metadata?.blockedTasks || 0}

TASK BREAKDOWN (${tasks.length} total tasks):
${JSON.stringify(tasksSummary, null, 2)}

TEAM CAPACITY (${team.length} members):
${JSON.stringify(teamSummary, null, 2)}

REQUIRED RESPONSE SCHEMA:
Return ONLY a valid JSON object matching this exact structure:
{
  "overallRisk": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "bottleneck": {
    "title": "Concise bottleneck title",
    "description": "Specific explanation of what is currently constraining sprint throughput"
  },
  "risks": [
    {
      "title": "Risk title",
      "description": "Clear risk explanation citing specific tasks or team factors",
      "impact": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    }
  ],
  "recommendations": [
    {
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "action": "Concrete, actionable step for the founder or team",
      "reason": "Why this action mitigates the risk"
    }
  ],
  "positiveSignals": [
    "Specific positive achievement or healthy metric in current execution"
  ]
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
          25000
        );

        const rawText = response.text;
        const parsed = parseJsonSafe(rawText);
        const validated = validateAndNormalizeRiskAnalysis(parsed);

        return {
          ...validated,
          source: 'gemini',
        };
      } catch (err) {
        lastError = err;
        console.warn(`[ExecutionRiskService] Candidate model ${modelName} failed (${err.message}). Trying next candidate if available.`);
      }
    }

    throw lastError || new Error('All Gemini candidate models failed');
  } catch (error) {
    console.warn(`[ExecutionRiskService] Gemini generation failed (${error.message}). Reverting to deterministic fallback analysis.`);
    return getFallbackRiskAnalysis(payload);
  }
}

module.exports = {
  analyzeExecutionRisk,
  getFallbackRiskAnalysis,
  validateAndNormalizeRiskAnalysis,
};
