/**
 * Deterministic developer profile completion calculator.
 *
 * Scoring breakdown (Total = 100%):
 * - Name: 10% (from authenticated user object)
 * - Bio: 15% (non-empty trimmed string)
 * - Skills: 20% (array with at least 1 item)
 * - Experience: 15% (non-empty trimmed string)
 * - GitHub: 10% (non-empty trimmed string)
 * - LinkedIn: 10% (non-empty trimmed string)
 * - Portfolio: 10% (non-empty trimmed string)
 * - Availability: 10% (one of AVAILABLE, PART_TIME, NOT_AVAILABLE)
 *
 * If profile does not exist or is null/undefined, returns 0%.
 */
export const calculateProfileCompletion = (user, profile) => {
  if (!profile) {
    return {
      percentage: 0,
      missingFields: [
        'Profile not created',
        'Bio',
        'Skills',
        'Experience',
        'GitHub',
        'LinkedIn',
        'Portfolio',
        'Availability',
      ],
      breakdown: {
        name: 0,
        bio: 0,
        skills: 0,
        experience: 0,
        github: 0,
        linkedin: 0,
        portfolio: 0,
        availability: 0,
      },
      isComplete: false,
    };
  }

  const missingFields = [];
  let percentage = 0;
  const breakdown = {};

  // 1. Name (10%)
  if (user?.name && typeof user.name === 'string' && user.name.trim().length > 0) {
    percentage += 10;
    breakdown.name = 10;
  } else {
    missingFields.push('Name');
    breakdown.name = 0;
  }

  // 2. Bio (15%)
  if (profile?.bio && typeof profile.bio === 'string' && profile.bio.trim().length > 0) {
    percentage += 15;
    breakdown.bio = 15;
  } else {
    missingFields.push('Bio');
    breakdown.bio = 0;
  }

  // 3. Skills (20%)
  if (Array.isArray(profile?.skills) && profile.skills.length > 0) {
    percentage += 20;
    breakdown.skills = 20;
  } else {
    missingFields.push('Skills');
    breakdown.skills = 0;
  }

  // 4. Experience (15%)
  if (profile?.experience && typeof profile.experience === 'string' && profile.experience.trim().length > 0) {
    percentage += 15;
    breakdown.experience = 15;
  } else {
    missingFields.push('Experience');
    breakdown.experience = 0;
  }

  // 5. GitHub (10%)
  if (profile?.github && typeof profile.github === 'string' && profile.github.trim().length > 0) {
    percentage += 10;
    breakdown.github = 10;
  } else {
    missingFields.push('GitHub');
    breakdown.github = 0;
  }

  // 6. LinkedIn (10%)
  if (profile?.linkedin && typeof profile.linkedin === 'string' && profile.linkedin.trim().length > 0) {
    percentage += 10;
    breakdown.linkedin = 10;
  } else {
    missingFields.push('LinkedIn');
    breakdown.linkedin = 0;
  }

  // 7. Portfolio (10%)
  if (profile?.portfolio && typeof profile.portfolio === 'string' && profile.portfolio.trim().length > 0) {
    percentage += 10;
    breakdown.portfolio = 10;
  } else {
    missingFields.push('Portfolio');
    breakdown.portfolio = 0;
  }

  // 8. Availability (10%)
  const validAvailabilities = ['AVAILABLE', 'PART_TIME', 'NOT_AVAILABLE'];
  if (profile?.availability && validAvailabilities.includes(profile.availability)) {
    percentage += 10;
    breakdown.availability = 10;
  } else {
    missingFields.push('Availability');
    breakdown.availability = 0;
  }

  return {
    percentage: Math.min(100, Math.max(0, percentage)),
    missingFields,
    breakdown,
    isComplete: percentage === 100,
  };
};
