const Task = require('../models/Task');
const Sprint = require('../models/Sprint');
const TeamMembership = require('../models/TeamMembership');

/**
 * Calculates a deterministic execution score (0-100) and grade
 * from real startup task, sprint, and team data.
 *
 * Components:
 * 1. Task Completion      = 40%
 * 2. Deadline Adherence   = 25%
 * 3. Workload             = 15%
 * 4. Risk                 = 10%
 * 5. Velocity             = 10%
 */
async function calculateExecutionScore(startupId) {
  const now = new Date();

  // 1. Fetch all tasks for the startup
  const tasks = await Task.find({ startup: startupId });
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'DONE');
  const blockedTasks = tasks.filter((t) => t.status === 'BLOCKED');

  // 2. Fetch active sprint (if any)
  const activeSprint = await Sprint.findOne({
    startup: startupId,
    status: 'ACTIVE',
  }).sort({ createdAt: -1 });

  // 3. Fetch active team members
  const teamMembers = await TeamMembership.find({
    startup: startupId,
    status: 'ACTIVE',
  });

  // ============================================================
  // COMPONENT 1: Task Completion (40%)
  // Formula: (completedTasks / totalTasks) * 40
  // ============================================================
  let completionPercentage = 0;
  let taskCompletionScore = 0;

  if (totalTasks > 0) {
    const completionRatio = completedTasks.length / totalTasks;
    completionPercentage = Math.round(completionRatio * 100 * 10) / 10;
    taskCompletionScore = Math.round(completionRatio * 40 * 10) / 10;
  }

  // ============================================================
  // COMPONENT 2: Deadline Adherence (25%)
  // Formula: (deadlineCompliantTasks / applicableTasks) * 25
  // ============================================================
  const applicableTasks = tasks.filter((t) => t.dueDate != null);
  let compliantTasksCount = 0;
  let overdueIncompleteCount = 0;
  let overdueCriticalCount = 0;

  for (const t of tasks) {
    if (t.dueDate) {
      const due = new Date(t.dueDate);
      if (t.status === 'DONE') {
        const finished = t.completedAt ? new Date(t.completedAt) : new Date(t.updatedAt);
        if (finished <= due) {
          compliantTasksCount += 1;
        }
      } else {
        if (now <= due) {
          compliantTasksCount += 1;
        } else {
          overdueIncompleteCount += 1;
          if (t.priority === 'HIGH' || t.priority === 'CRITICAL') {
            overdueCriticalCount += 1;
          }
        }
      }
    }
  }

  let deadlinePercentage = 100; // Neutral default if no due dates exist
  let deadlineScore = 25;

  if (applicableTasks.length > 0) {
    const adherenceRatio = compliantTasksCount / applicableTasks.length;
    deadlinePercentage = Math.round(adherenceRatio * 100 * 10) / 10;
    deadlineScore = Math.round(adherenceRatio * 25 * 10) / 10;
  } else if (totalTasks === 0) {
    deadlinePercentage = 100;
    deadlineScore = 25;
  }

  // ============================================================
  // COMPONENT 3: Workload Distribution (15%)
  // Measures workload across active team members.
  // ============================================================
  const memberWorkloads = {};
  teamMembers.forEach((m) => {
    memberWorkloads[m.user.toString()] = { hours: 0, taskCount: 0 };
  });

  let unassignedTasksCount = 0;
  let totalEstimatedHours = 0;

  tasks.forEach((t) => {
    const hours = t.estimatedHours || 2;
    totalEstimatedHours += hours;
    if (t.assignedTo) {
      const id = t.assignedTo.toString();
      if (!memberWorkloads[id]) {
        memberWorkloads[id] = { hours: 0, taskCount: 0 };
      }
      memberWorkloads[id].hours += hours;
      memberWorkloads[id].taskCount += 1;
    } else {
      unassignedTasksCount += 1;
    }
  });

  const memberKeys = Object.keys(memberWorkloads);
  let workloadHealth = 1.0;

  if (memberKeys.length > 0) {
    const avgHours = totalEstimatedHours / memberKeys.length;
    let overloadedCount = 0;

    memberKeys.forEach((key) => {
      const member = memberWorkloads[key];
      // Overloaded if hours significantly exceed average or > 40h
      if (member.hours > Math.max(25, avgHours * 1.6) || member.hours > 40) {
        overloadedCount += 1;
      }
    });

    const overloadPenalty = (overloadedCount / memberKeys.length) * 0.4;
    const unassignedPenalty = totalTasks > 0 ? (unassignedTasksCount / totalTasks) * 0.15 : 0;
    workloadHealth = Math.max(0, Math.min(1, 1 - (overloadPenalty + unassignedPenalty)));
  } else {
    // If no team members registered, neutral score
    workloadHealth = totalTasks === 0 ? 1.0 : 0.8;
  }

  const workloadPercentage = Math.round(workloadHealth * 100 * 10) / 10;
  const workloadScore = Math.round(workloadHealth * 15 * 10) / 10;

  // ============================================================
  // COMPONENT 4: Risk (10%)
  // Indicators: BLOCKED tasks, overdue incomplete, high priority overdue
  // ============================================================
  const blockedCount = blockedTasks.length;
  let riskDeduction = 0;
  riskDeduction += blockedCount * 15;
  riskDeduction += overdueIncompleteCount * 10;
  riskDeduction += overdueCriticalCount * 15;

  const riskHealth = Math.max(0, Math.min(100, 100 - riskDeduction));
  const riskPercentage = Math.round(riskHealth * 10) / 10;
  const riskScore = Math.round((riskHealth / 100) * 10 * 10) / 10;

  // ============================================================
  // COMPONENT 5: Velocity (10%)
  // Compares completed tasks to sprint timeline progress.
  // ============================================================
  let velocityRatio = 1.0;

  if (activeSprint && activeSprint.startDate && activeSprint.endDate) {
    const start = new Date(activeSprint.startDate).getTime();
    const end = new Date(activeSprint.endDate).getTime();
    const current = now.getTime();
    const totalDuration = Math.max(1, end - start);
    const elapsed = Math.max(0, Math.min(totalDuration, current - start));
    const expectedProgressRatio = Math.max(0.1, elapsed / totalDuration);

    const actualProgressRatio = totalTasks > 0 ? completedTasks.length / totalTasks : 1;
    velocityRatio = Math.max(0, Math.min(1, actualProgressRatio / expectedProgressRatio));
  } else if (totalTasks > 0) {
    velocityRatio = completedTasks.length / totalTasks;
  }

  const velocityPercentage = Math.round(velocityRatio * 100 * 10) / 10;
  const velocityScore = Math.round(velocityRatio * 10 * 10) / 10;

  // ============================================================
  // FINAL SCORE & GRADE CALCULATION
  // Sum = 40 + 25 + 15 + 10 + 10 = 100
  // ============================================================
  const rawTotal =
    taskCompletionScore +
    deadlineScore +
    workloadScore +
    riskScore +
    velocityScore;

  const finalScore = Math.min(100, Math.max(0, Math.round(rawTotal)));

  let grade = 'CRITICAL';
  if (finalScore >= 90) {
    grade = 'EXCELLENT';
  } else if (finalScore >= 75) {
    grade = 'GOOD';
  } else if (finalScore >= 60) {
    grade = 'NEEDS_ATTENTION';
  } else if (finalScore >= 40) {
    grade = 'AT_RISK';
  } else {
    grade = 'CRITICAL';
  }

  // Generate deterministic summary
  let summary = '';
  if (finalScore >= 90) {
    summary = 'Execution is exceptional with rapid task velocity and minimal bottlenecks.';
  } else if (finalScore >= 75) {
    if (overdueIncompleteCount > 0) {
      summary = `Execution is progressing well (${completionPercentage}% complete), though ${overdueIncompleteCount} task(s) require attention to meet upcoming deadlines.`;
    } else if (blockedCount > 0) {
      summary = `Solid progress overall, but ${blockedCount} blocked task(s) should be resolved to sustain velocity.`;
    } else {
      summary = 'Execution is progressing well with steady velocity and balanced team workload.';
    }
  } else if (finalScore >= 60) {
    summary = 'Execution needs attention: several tasks are approaching deadlines or velocity is lagging.';
  } else if (finalScore >= 40) {
    summary = 'Execution is at risk due to overdue deliverables, blocked dependencies, or concentrated workload.';
  } else {
    summary = 'Critical execution risk: major blockers and overdue milestones require immediate intervention.';
  }

  return {
    score: finalScore,
    grade,
    components: {
      taskCompletion: {
        score: taskCompletionScore,
        weight: 40,
        percentage: completionPercentage,
      },
      deadlineAdherence: {
        score: deadlineScore,
        weight: 25,
        percentage: deadlinePercentage,
      },
      workload: {
        score: workloadScore,
        weight: 15,
        percentage: workloadPercentage,
      },
      risk: {
        score: riskScore,
        weight: 10,
        percentage: riskPercentage,
      },
      velocity: {
        score: velocityScore,
        weight: 10,
        percentage: velocityPercentage,
      },
    },
    summary,
    metadata: {
      totalTasks,
      completedTasks: completedTasks.length,
      blockedTasks: blockedCount,
      overdueTasks: overdueIncompleteCount,
      overdueCriticalTasks: overdueCriticalCount,
      activeSprint: activeSprint ? activeSprint.name : null,
      teamMembersCount: teamMembers.length,
    },
  };
}

module.exports = {
  calculateExecutionScore,
};
