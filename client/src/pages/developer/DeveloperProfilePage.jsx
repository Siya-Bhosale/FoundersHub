import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getMyDeveloperProfile,
  createDeveloperProfile,
  updateDeveloperProfile,
  deleteDeveloperProfile,
} from '../../api/developer';
import { calculateProfileCompletion } from '../../utils/profileCompletion';
import {
  User,
  Mail,
  Code2,
  Briefcase,
  Globe,
  Save,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  X,
  Clock,
  ArrowLeft,
  Sparkles,
  Info,
} from 'lucide-react';

const GithubIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

const LinkedinIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
  </svg>
);

const SUGGESTED_SKILLS = [
  'React',
  'Node.js',
  'TypeScript',
  'JavaScript',
  'MongoDB',
  'Next.js',
  'Tailwind CSS',
  'Python',
  'Express',
  'PostgreSQL',
  'Docker',
  'AWS',
  'GraphQL',
  'REST APIs',
  'Git',
];

const AVAILABILITY_OPTIONS = [
  {
    value: 'AVAILABLE',
    label: 'Available Full-Time',
    description: 'Ready to join a startup or full-time team',
    indicatorColor: 'bg-emerald-400',
  },
  {
    value: 'PART_TIME',
    label: 'Part-Time / Contract',
    description: 'Open to part-time contribution or sprint gigs',
    indicatorColor: 'bg-amber-400',
  },
  {
    value: 'NOT_AVAILABLE',
    label: 'Not Currently Available',
    description: 'Currently busy or observing projects',
    indicatorColor: 'bg-slate-500',
  },
];

const DeveloperProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Profile data state
  const [profileExists, setProfileExists] = useState(false);
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [experience, setExperience] = useState('');
  const [github, setGithub] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [availability, setAvailability] = useState('AVAILABLE');

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch initial profile
  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      setLoading(true);
      setErrorMessage('');
      try {
        const response = await getMyDeveloperProfile();
        if (!isMounted) return;
        if (response?.data) {
          const p = response.data;
          setProfileExists(true);
          setBio(p.bio || '');
          setSkills(Array.isArray(p.skills) ? p.skills : []);
          setExperience(p.experience || '');
          setGithub(p.github || '');
          setLinkedin(p.linkedin || '');
          setPortfolio(p.portfolio || '');
          setAvailability(p.availability || 'AVAILABLE');
        }
      } catch (err) {
        if (!isMounted) return;
        if (err.status === 404) {
          setProfileExists(false);
        } else {
          setErrorMessage(err.message || 'Failed to load developer profile');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute live completion percentage
  const currentProfileData = {
    bio,
    skills,
    experience,
    github,
    linkedin,
    portfolio,
    availability,
  };
  const completion = calculateProfileCompletion(user, currentProfileData);

  // Skill chip handlers
  const handleAddSkill = (skillToAdd) => {
    const trimmed = (skillToAdd || skillInput).trim();
    if (!trimmed) return;
    if (skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setSkillInput('');
      return;
    }
    if (skills.length >= 50) {
      setErrorMessage('Maximum of 50 skills allowed');
      return;
    }
    setSkills([...skills, trimmed.slice(0, 50)]);
    setSkillInput('');
    setErrorMessage('');
  };

  const handleKeyDownSkill = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkill(skillInput);
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  // Submit profile handler (Create or Update)
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    const payload = {
      bio: bio.trim(),
      skills,
      experience: experience.trim(),
      github: github.trim(),
      linkedin: linkedin.trim(),
      portfolio: portfolio.trim(),
      availability,
    };

    try {
      if (profileExists) {
        await updateDeveloperProfile(payload);
        setSuccessMessage('Developer profile updated successfully!');
      } else {
        await createDeveloperProfile(payload);
        setProfileExists(true);
        setSuccessMessage('Developer profile created successfully!');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save profile. Please check your inputs.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  // Delete profile handler
  const handleDeleteProfile = async () => {
    setDeleting(true);
    setErrorMessage('');
    try {
      await deleteDeveloperProfile();
      setProfileExists(false);
      setBio('');
      setSkills([]);
      setExperience('');
      setGithub('');
      setLinkedin('');
      setPortfolio('');
      setAvailability('AVAILABLE');
      setShowDeleteModal(false);
      setSuccessMessage('Developer profile removed successfully.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to delete profile');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-400">Loading your developer profile...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation / Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-xl border border-[#232735] bg-[#11141C] hover:bg-[#171A24] text-slate-400 hover:text-white transition"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Developer Profile
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Manage your developer credentials, technical skills, and availability
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                profileExists
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                  : 'bg-amber-950/60 text-amber-400 border-amber-800/60'
              }`}
            >
              {profileExists ? 'Profile Active' : 'Profile Not Created'}
            </span>
          </div>
        </div>

        {/* Feedback Alerts */}
        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/50 flex items-center gap-3 text-sm text-emerald-300 shadow-xl">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/50 flex items-center gap-3 text-sm text-red-300 shadow-xl">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Live Completion Bar Card */}
        <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-5 sm:p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h2 className="text-sm font-bold text-white">Profile Completion</h2>
              <span className="text-xs font-semibold text-slate-600">•</span>
              <span className="text-xs text-slate-400 font-medium">Deterministic Score</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-indigo-400">
                {completion.percentage}%
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {completion.isComplete ? 'Complete' : 'In Progress'}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-[#0B0D12] rounded-full h-3 overflow-hidden border border-[#232735]">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                completion.percentage === 100
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : 'bg-gradient-to-r from-indigo-500 to-violet-500'
              }`}
              style={{ width: `${completion.percentage}%` }}
            />
          </div>

          {/* Missing fields breakdown if not 100% */}
          {completion.missingFields.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Pending items:</span>
              {completion.missingFields.map((field) => (
                <span
                  key={field}
                  className="px-2 py-0.5 rounded-md bg-[#171A24] text-slate-300 border border-[#2A2F42] font-medium"
                >
                  +{field === 'Skills' ? '20%' : field === 'Bio' || field === 'Experience' ? '15%' : '10%'} {field}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Main Profile Form */}
        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* Identity Info (Read-Only from User) */}
          <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#232735]">
              <User className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white">User Identity</h2>
              <span className="ml-auto text-xs text-slate-500 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" /> Read-only from account
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#171A24] border border-[#2A2F42] rounded-xl text-sm font-semibold text-slate-200">
                  <User className="w-4 h-4 text-slate-500" />
                  <span>{user?.name || 'Developer'}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#171A24] border border-[#2A2F42] rounded-xl text-sm font-semibold text-slate-200">
                  <Mail className="w-4 h-4 text-slate-500" />
                  <span className="truncate">{user?.email || 'developer@sprintfounders.com'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Availability Status */}
          <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#232735]">
              <Clock className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white">Availability</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {AVAILABILITY_OPTIONS.map((opt) => {
                const isSelected = availability === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAvailability(opt.value)}
                    className={`p-4 rounded-xl border text-left transition relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-950/40 ring-1 ring-indigo-500/50'
                        : 'border-[#2A2F42] bg-[#171A24] hover:border-[#373E54] hover:bg-[#1E2330]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-bold text-white">{opt.label}</span>
                        <span className={`w-2.5 h-2.5 rounded-full ${opt.indicatorColor}`} />
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{opt.description}</p>
                    </div>
                    {isSelected && (
                      <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-indigo-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Selected</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Skills Chip/Tag Manager */}
          <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#232735]">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-indigo-400" />
                <h2 className="text-base font-bold text-white">Technical Skills</h2>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                {skills.length} / 50 skills
              </span>
            </div>

            {/* Input to add skill */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleKeyDownSkill}
                placeholder="Type a skill (e.g. React, Node.js, GraphQL) and press Enter"
                className="flex-1 px-4 py-2.5 rounded-xl border border-[#2A2F42] bg-[#171A24] text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => handleAddSkill(skillInput)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>

            {/* Existing Skills Chips */}
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-4">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-950/60 text-indigo-300 border border-indigo-800/50 group transition hover:border-indigo-700"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-indigo-400 hover:text-white p-0.5 rounded transition"
                      title={`Remove ${skill}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#171A24] border border-dashed border-[#2A2F42] text-center mb-4">
                <p className="text-xs text-slate-400">
                  No skills added yet. Add your core languages, frameworks, and databases above.
                </p>
              </div>
            )}

            {/* Quick-add suggestions */}
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Quick Add Popular Skills:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_SKILLS.filter(
                  (s) => !skills.some((curr) => curr.toLowerCase() === s.toLowerCase())
                ).map((suggested) => (
                  <button
                    key={suggested}
                    type="button"
                    onClick={() => handleAddSkill(suggested)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#171A24] hover:bg-indigo-950/50 text-slate-300 hover:text-indigo-300 border border-[#2A2F42] hover:border-indigo-800/50 transition"
                  >
                    + {suggested}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Professional Experience & Bio */}
          <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-[#232735]">
              <Briefcase className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white">Experience & Bio</h2>
            </div>

            {/* Experience */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Experience Level / Years
              </label>
              <input
                type="text"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                maxLength={200}
                placeholder="e.g. 3-5 years building production SaaS & full-stack web applications"
                className="w-full px-4 py-2.5 rounded-xl border border-[#2A2F42] bg-[#171A24] text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 placeholder:text-slate-500"
              />
              <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
                <span>Brief summary of your seniority or track record</span>
                <span>{experience.length} / 200</span>
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Bio & Engineering Philosophy
              </label>
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={1000}
                placeholder="Tell founders and teammates about what you love building, your architectural focus, and what problems you solve..."
                className="w-full px-4 py-3 rounded-xl border border-[#2A2F42] bg-[#171A24] text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 leading-relaxed placeholder:text-slate-500"
              />
              <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
                <span>Maximum 1000 characters</span>
                <span>{bio.length} / 1000</span>
              </div>
            </div>
          </div>

          {/* Social & Portfolio Links */}
          <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#232735]">
              <Globe className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white">Links & Profiles</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* GitHub */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  GitHub URL
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <GithubIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="url"
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                    placeholder="https://github.com/username"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#2A2F42] bg-[#171A24] text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* LinkedIn */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  LinkedIn URL
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <LinkedinIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="url"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#2A2F42] bg-[#171A24] text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* Portfolio */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Portfolio / Website
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Globe className="w-4 h-4" />
                  </div>
                  <input
                    type="url"
                    value={portfolio}
                    onChange={(e) => setPortfolio(e.target.value)}
                    placeholder="https://yourportfolio.dev"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#2A2F42] bg-[#171A24] text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 placeholder:text-slate-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div>
              {profileExists && (
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/30 border border-red-800/40 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Profile</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-white bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{profileExists ? 'Save Changes' : 'Create Profile'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#11141C] rounded-2xl border border-[#232735] max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-950/50 border border-red-800/50 text-red-400 flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Delete Developer Profile?</h3>
                <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                  This will remove your developer profile information, skills, and links. Your account credentials will remain intact. You can recreate a profile at any time.
                </p>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:bg-[#171A24] border border-[#2A2F42] transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteProfile}
                  disabled={deleting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-500 transition shadow-lg shadow-red-600/20"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Confirm Delete</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeveloperProfilePage;
