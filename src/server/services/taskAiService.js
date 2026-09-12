const mongoose = require('mongoose');
const { GoogleGenAI } = require('@google/genai');
const Startup = require('../models/Startup');
const Task = require('../models/Task');
const Sprint = require('../models/Sprint');
const TeamMembership = require('../models/TeamMembership');
const DeveloperProfile = require('../models/DeveloperProfile');

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
 * Deterministic contextual fallback tasks based on startup industry and problem/solution.
 */
const getFallbackTasks = (startup, teamMembers = [], existingTasks = []) => {
  const existingTitlesLower = new Set(
    existingTasks.map((t) => (t.title || '').trim().toLowerCase())
  );

  const name = startup.name || 'Core Product';
  const industry = startup.industry || 'Technology';
  const solution = startup.solution || 'Digital Solution';

  // Base contextual templates tailored to the startup
  const templates = [
    {
      title: `Set up ${name} project repository and core microservices architecture`,
      description: `Initialize modern codebase, linting standards, and Docker containerization for ${industry} workload.`,
      priority: 'HIGH',
      estimatedHours: 4,
      suggestedRole: 'BACKEND',
      suggestedSkills: ['Node.js', 'Docker', 'Git'],
      day: 1,
    },
    {
      title: `Design database schema for ${solution.slice(0, 40)} data models`,
      description: `Define MongoDB data models with indexes, validation schemas, and relationship references.`,
      priority: 'HIGH',
      estimatedHours: 5,
      suggestedRole: 'BACKEND',
      suggestedSkills: ['MongoDB', 'Mongoose', 'Database Design'],
      day: 2,
    },
    {
      title: `Implement core ingestion and validation API endpoints`,
      description: `Build REST API routes for uploading and verifying domain payload with secure error handling.`,
      priority: 'CRITICAL',
      estimatedHours: 6,
      suggestedRole: 'BACKEND',
      suggestedSkills: ['Node.js', 'Express', 'REST API'],
      day: 3,
    },
    {
      title: `Develop responsive dashboard interface for ${name}`,
      description: `Build clean, dark-themed responsive UI components matching ${industry} domain requirements.`,
      priority: 'HIGH',
      estimatedHours: 6,
      suggestedRole: 'FRONTEND',
      suggestedSkills: ['React', 'TailwindCSS', 'JavaScript'],
      day: 4,
    },
    {
      title: `Integrate domain intelligence & processing service`,
      description: `Connect business logic service to process input data and output actionable results.`,
      priority: 'CRITICAL',
      estimatedHours: 8,
      suggestedRole: 'AI_ENGINEER',
      suggestedSkills: ['Python', 'AI/ML', 'API Integration'],
      day: 5,
    },
    {
      title: `Build result visualization and reporting screen`,
      description: `Render analytics, telemetry cards, and status badges for users to review output metrics.`,
      priority: 'MEDIUM',
      estimatedHours: 5,
      suggestedRole: 'FRONTEND',
      suggestedSkills: ['React', 'Data Visualization', 'UI/UX'],
      day: 6,
    },
    {
      title: `Implement secure JWT authentication and role-based permissions`,
      description: `Enforce user login, token validation, and granular role authorization checks across endpoints.`,
      priority: 'HIGH',
      estimatedHours: 4,
      suggestedRole: 'BACKEND',
      suggestedSkills: ['Node.js', 'JWT', 'Security'],
      day: 7,
    },
    {
      title: `Configure automated unit and integration test suite`,
      description: `Write automated tests covering API endpoints, data validation, and core user journeys.`,
      priority: 'MEDIUM',
      estimatedHours: 4,
      suggestedRole: 'FULLSTACK',
      suggestedSkills: ['Jest', 'Testing', 'CI/CD'],
      day: 8,
    },
    {
      title: `Performance optimization and API latency benchmarking`,
      description: `Audit database queries, add caching where necessary, and verify response times under load.`,
      priority: 'LOW',
      estimatedHours: 3,
      suggestedRole: 'BACKEND',
      suggestedSkills: ['Performance', 'Optimization', 'Node.js'],
      day: 9,
    },
    {
      title: `Prepare staging deployment and environment configuration`,
      description: `Deploy application to staging server, set up environment variables, and verify live endpoints.`,
      priority: 'HIGH',
      estimatedHours: 4,
      suggestedRole: 'DEVOPS',
      suggestedSkills: ['Cloud', 'Deployment', 'DevOps'],
      day: 10,
    },
  ];

  // Filter out any template that duplicates existing tasks
  const filtered = templates.filter(
    (t) => !existingTitlesLower.has(t.title.trim().toLowerCase())
  );

  // Match tasks with actual team developers by skills
  const enriched = filtered.map((task) => {
    let matchedDev = null;
    if (teamMembers.length > 0) {
      const taskSkills = (task.suggestedSkills || []).map((s) => s.toLowerCase());
      matchedDev = teamMembers.find((dev) => {
        const devSkills = (dev.skills || []).map((s) => s.toLowerCase());
        return taskSkills.some((ts) => devSkills.some((ds) => ds.includes(ts) || ts.includes(ds)));
      });
      if (!matchedDev) {
        matchedDev = teamMembers[0];
      }
    }

    return {
      title: task.title,
      description: task.description,
      priority: task.priority,
      estimatedHours: task.estimatedHours,
      day: task.day,
      suggestedRole: task.suggestedRole,
      suggestedSkills: task.suggestedSkills,
      suggestedDeveloperId: matchedDev?.user?._id?.toString() || matchedDev?.user?.id || null,
      suggestedDeveloperName: matchedDev?.user?.name || null,
    };
  });

  return {
    tasks: enriched,
    source: 'fallback',
  };
};

/**
 * Generate AI-powered execution tasks for a startup using Gemini with duplicate prevention and team skill matching.
 */
const generateTasksForStartup = async (startupId, requestingUserId) => {
  if (!startupId || !mongoose.Types.ObjectId.isValid(startupId)) {
    throw new Error('Valid startup ID is required');
  }

  const startup = await Startup.findById(startupId);
  if (!startup) {
    throw new Error('Startup not found');
  }

  // Verify authorization: Founder or active team member
  const founderId = (startup.founder || startup.founderId)?.toString();
  const userIdStr = requestingUserId?.toString();
  const isFounder = founderId && founderId === userIdStr;

  let isMember = false;
  if (!isFounder) {
    const membership = await TeamMembership.findOne({
      startup: startupId,
      user: requestingUserId,
      status: 'ACTIVE',
    });
    if (membership) isMember = true;
  }

  if (!isFounder && !isMember) {
    const error = new Error("Forbidden: You don't have permission to generate tasks for this startup");
    error.status = 403;
    throw error;
  }

  // 1. Fetch active team members with developer profiles
  const memberships = await TeamMembership.find({
    startup: startupId,
    status: 'ACTIVE',
  }).populate('user', 'name email role');

  const teamMembers = [];
  for (const m of memberships) {
    if (m.user) {
      const profile = await DeveloperProfile.findOne({ user: m.user._id });
      teamMembers.push({
        user: m.user,
        role: m.role || 'DEVELOPER',
        skills: profile?.skills || [],
        experience: profile?.experience || '',
        availability: profile?.availability || 'AVAILABLE',
      });
    }
  }

  // 2. Fetch current active sprint (if any)
  const currentSprint = await Sprint.findOne({
    startup: startupId,
    status: 'ACTIVE',
  }).sort({ createdAt: -1 });

  // 3. Fetch existing tasks to prevent duplication
  const existingTasks = await Task.find({ startup: startupId })
    .populate('assignedTo', 'name')
    .sort({ day: 1, createdAt: 1 });

  const existingTitles = existingTasks.map((t) => t.title.trim());
  const existingTitlesLower = new Set(existingTitles.map((t) => t.toLowerCase()));

  // If Gemini API Key is missing, return deterministic fallback immediately
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    return getFallbackTasks(startup, teamMembers, existingTasks);
  }

  const prompt = `
You are an expert technical lead and startup engineering manager.
Generate an actionable, high-velocity execution task breakdown for this startup to build their MVP.

STARTUP CONTEXT:
- Name: ${startup.name}
- Tagline: ${startup.tagline}
- Problem Statement: ${startup.problemStatement}
- Solution: ${startup.solution}
- Industry: ${startup.industry}
- Stage: ${startup.stage}
- Description: ${startup.description || 'N/A'}

CURRENT SPRINT:
- Name: ${currentSprint?.name || 'MVP Launch Sprint'}
- Goal: ${currentSprint?.goal || 'Build and validate the core working MVP'}
- Duration: ${currentSprint?.duration || 14} days

ACTIVE TEAM MEMBERS:
${
  teamMembers.length > 0
    ? teamMembers
        .map(
          (m) =>
            `- ${m.user.name} (${m.role}): Skills = [${(m.skills || []).join(', ')}], Availability = ${m.availability}`
        )
        .join('\n')
    : '- Solo Founder (No active developers joined yet)'
}

EXISTING TASKS IN DATABASE (DO NOT GENERATE DUPLICATES OF THESE):
${
  existingTitles.length > 0
    ? existingTitles.map((t) => `- ${t}`).join('\n')
    : '- No existing tasks recorded yet'
}

RULES:
1. Generate between 8 and 14 concrete, highly relevant engineering/product tasks directly required to build the startup's specific solution.
2. DO NOT invent unrelated tasks (e.g. do not suggest e-commerce cart if this is a crop disease AI app).
3. DO NOT duplicate any of the existing tasks listed above.
4. Distribute priorities: HIGH, MEDIUM, CRITICAL, LOW.
5. Provide realistic estimatedHours (typically 2 to 8 hours per task) and suggested day (1 to 14).
6. In 'suggestedDeveloperName', suggest one of the actual active team members listed above whose skills best match the task. If no active team members exist or none match, return null.
7. Return ONLY strict JSON in the specified structure without markdown formatting or commentary.

REQUIRED JSON SCHEMA:
{
  "tasks": [
    {
      "title": "Concrete task title",
      "description": "Clear 1-2 sentence description of what needs to be implemented",
      "priority": "HIGH",
      "estimatedHours": 5,
      "day": 2,
      "suggestedRole": "BACKEND",
      "suggestedSkills": ["Skill 1", "Skill 2"],
      "suggestedDeveloperName": "Name of active team member or null"
    }
  ],
  "source": "gemini"
}
`;

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const candidateModels = [
      process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
      'gemini-flash-latest',
      'gemini-flash-lite-latest',
      'gemini-3.5-flash',
      'gemini-3.8-flash',
    ];

    let parsed = null;

    for (const model of candidateModels) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Gemini task generation timeout')), 22000)
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
        const responseText = response.text ? response.text.trim() : '';
        parsed = parseJsonSafe(responseText);
        if (parsed && Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
          break;
        }
      } catch (genErr) {
        console.warn(`Model ${model} task generation failed:`, genErr.message);
      }
    }

    if (!parsed || !Array.isArray(parsed.tasks) || parsed.tasks.length === 0) {
      return getFallbackTasks(startup, teamMembers, existingTasks);
    }

    // Filter server-side duplicates and assign verified team members
    const validTasks = [];

    for (const task of parsed.tasks) {
      if (!task.title || typeof task.title !== 'string') continue;
      const titleClean = task.title.trim();
      if (existingTitlesLower.has(titleClean.toLowerCase())) {
        continue;
      }

      // Verify suggested developer belongs to startup team
      let matchedDev = null;
      if (task.suggestedDeveloperName && teamMembers.length > 0) {
        matchedDev = teamMembers.find(
          (m) =>
            m.user?.name?.toLowerCase() === task.suggestedDeveloperName.trim().toLowerCase()
        );
      }

      if (!matchedDev && teamMembers.length > 0) {
        const taskSkills = (task.suggestedSkills || []).map((s) => s.toLowerCase());
        matchedDev = teamMembers.find((dev) => {
          const devSkills = (dev.skills || []).map((s) => s.toLowerCase());
          return taskSkills.some((ts) => devSkills.some((ds) => ds.includes(ts) || ts.includes(ds)));
        });
      }

      validTasks.push({
        title: titleClean,
        description: (task.description || '').trim(),
        priority: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(task.priority)
          ? task.priority
          : 'MEDIUM',
        estimatedHours: Number(task.estimatedHours) || 3,
        day: Number(task.day) || 1,
        suggestedRole: task.suggestedRole || 'FULLSTACK',
        suggestedSkills: Array.isArray(task.suggestedSkills) ? task.suggestedSkills : [],
        suggestedDeveloperId: matchedDev?.user?._id?.toString() || matchedDev?.user?.id || null,
        suggestedDeveloperName: matchedDev?.user?.name || null,
      });
    }

    if (validTasks.length === 0) {
      return getFallbackTasks(startup, teamMembers, existingTasks);
    }

    return {
      tasks: validTasks,
      source: 'gemini',
    };
  } catch (error) {
    console.error('Gemini Task Generation Error:', error.message);
    return getFallbackTasks(startup, teamMembers, existingTasks);
  }
};

module.exports = {
  generateTasksForStartup,
  getFallbackTasks,
};
