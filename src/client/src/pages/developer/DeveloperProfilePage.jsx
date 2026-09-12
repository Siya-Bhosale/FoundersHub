import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getMyDeveloperProfile,
  createDeveloperProfile,
  updateDeveloperProfile,
  deleteDeveloperProfile,
  uploadDeveloperResume,
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
  GraduationCap,
  FileText,
  Upload,
  RefreshCw,
  ExternalLink,
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

const TwitterIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
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
  const resumeInputRef = useRef(null);

  // Profile data state
  const [profileExists, setProfileExists] = useState(false);
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [experience, setExperience] = useState('');
  const [education, setEducation] = useState('');
  const [github, setGithub] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [twitter, setTwitter] = useState('');
  const [otherSocial, setOtherSocial] = useState('');
  const [availability, setAvailability] = useState('AVAILABLE');

  // Resume state
  const [resumeFileName, setResumeFileName] = useState('');
  const [resumeOriginalName, setResumeOriginalName] = useState('');
  const [resumeUploadedAt, setResumeUploadedAt] = useState(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [viewingResume, setViewingResume] = useState(false);

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
          setEducation(p.education || '');
          setGithub(p.github || '');
          setLinkedin(p.linkedin || '');
          setPortfolio(p.portfolio || '');
          setTwitter(p.twitter || '');
          setOtherSocial(p.otherSocial || '');
          setAvailability(p.availability || 'AVAILABLE');
          setResumeFileName(p.resumeFileName || '');
          setResumeOriginalName(p.resumeOriginalName || '');
          setResumeUploadedAt(p.resumeUploadedAt || null);
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
    education,
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
      education: education.trim(),
      github: github.trim(),
      linkedin: linkedin.trim(),
      portfolio: portfolio.trim(),
      twitter: twitter.trim(),
      otherSocial: otherSocial.trim(),
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

  // Resume upload handler
  const handleResumeFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExts = ['.pdf', '.doc', '.docx'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExts.includes(ext)) {
      setErrorMessage('Invalid file format. Only PDF, DOC, or DOCX files are allowed.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Resume file size cannot exceed 10MB.');
      return;
    }

    setUploadingResume(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await uploadDeveloperResume(file);
      if (res?.success && res.data) {
        setProfileExists(true);
        setResumeFileName(res.data.resumeFileName);
        setResumeOriginalName(res.data.resumeOriginalName);
        setResumeUploadedAt(res.data.resumeUploadedAt);
        setSuccessMessage('Resume uploaded successfully!');
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to upload resume');
    } finally {
      setUploadingResume(false);
      if (resumeInputRef.current) resumeInputRef.current.value = '';
    }
  };

  // View own resume authenticated
  const handleViewResume = async () => {
    const userId = (user?.userId || user?.id || user?._id)?.toString();
    if (!userId) return;

    setViewingResume(true);
    try {
      const token = localStorage.getItem('sprintfounders_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiUrl}/developers/resume/${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setErrorMessage(errData.message || 'Unable to open resume.');
        return;
      }

      const blob = await res.blob();
      const fileUrl = URL.createObjectURL(blob);
      window.open(fileUrl, '_blank');
    } catch (err) {
      setErrorMessage('Error viewing resume: ' + err.message);
    } finally {
      setViewingResume(false);
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
      setEducation('');
      setGithub('');
      setLinkedin('');
      setPortfolio('');
      setTwitter('');
      setOtherSocial('');
      setResumeFileName('');
      setResumeOriginalName('');
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
              type="button"
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-xl bg-[#171A24] border border-[#2A2F42] text-slate-400 hover:text-white transition"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Developer Profile</h1>
              <p className="text-xs text-slate-400">
                Showcase your skills, department focus, experience, and resume to startup founders.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                profileExists
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                  : 'bg-amber-950/60 text-amber-400 border-amber-800/60'
              }`}
            >
              {profileExists ? 'Profile Active' : 'Draft / New Profile'}
            </span>
          </div>
        </div>

        {/* Feedback Alerts */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 flex items-start gap-3 text-sm text-red-300 shadow-md animate-fadeIn">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block mb-0.5">Submission Error</span>
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage('')}
              className="text-red-400 hover:text-red-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-start gap-3 text-sm text-emerald-300 shadow-md animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block mb-0.5">Success</span>
              <span>{successMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMessage('')}
              className="text-emerald-400 hover:text-emerald-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Profile Completion Meter */}
        <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Profile Completeness
              </span>
            </div>
            <span className="text-sm font-extrabold text-indigo-400">{completion.percentage}%</span>
          </div>

          <div className="w-full h-2 rounded-full bg-[#171A24] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 rounded-full transition-all duration-500"
              style={{ width: `${completion.percentage}%` }}
            />
          </div>

          {completion.missingFields.length > 0 && (
            <p className="text-[11px] text-slate-400">
              <span className="text-slate-300 font-semibold">Recommended to complete: </span>
              {completion.missingFields.join(', ')}
            </p>
          )}
        </div>

        {/* Main Form */}
        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* User Account Info (Read-Only) */}
          <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#232735]">
              <User className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white">Account Details</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  disabled
                  value={user?.name || ''}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#2A2F42] bg-[#171A24]/60 text-slate-300 text-sm cursor-not-allowed opacity-80"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#2A2F42] bg-[#171A24]/60 text-slate-300 text-sm cursor-not-allowed opacity-80"
                />
              </div>
            </div>
          </div>

          {/* ====================================================
              FEATURE 7 — RESUME UPLOAD SECTION
              ==================================================== */}
          <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#232735]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <div>
                  <h2 className="text-base font-bold text-white">Developer Resume</h2>
                  <p className="text-xs text-slate-400">PDF preferred, DOC/DOCX supported (up to 10MB)</p>
                </div>
              </div>

              {resumeFileName && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                  Uploaded
                </span>
              )}
            </div>

            {/* Hidden native file input */}
            <input
              type="file"
              ref={resumeInputRef}
              onChange={handleResumeFileChange}
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
            />

            {resumeFileName ? (
              <div className="p-4 rounded-xl bg-[#171A24] border border-[#2A2F42] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-950/60 text-rose-400 border border-indigo-800/60 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {resumeOriginalName || 'Resume.pdf'}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {resumeUploadedAt
                        ? `Uploaded ${new Date(resumeUploadedAt).toLocaleDateString()}`
                        : 'Uploaded to your profile'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    disabled={viewingResume}
                    onClick={handleViewResume}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition cursor-pointer"
                  >
                    {viewingResume ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ExternalLink className="w-3.5 h-3.5" />
                    )}
                    <span>View</span>
                  </button>

                  <button
                    type="button"
                    disabled={uploadingResume}
                    onClick={() => resumeInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-[#11141C] hover:bg-[#1A1E2B] border border-[#2A2F42] transition cursor-pointer"
                  >
                    {uploadingResume ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span>Replace</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-[#171A24]/60 border border-dashed border-[#2A2F42] hover:border-indigo-500/50 transition text-center space-y-3">
                <Upload className="w-8 h-8 text-indigo-400 mx-auto" />
                <div>
                  <p className="text-xs font-semibold text-white">
                    No resume uploaded yet
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Upload your resume so founders can evaluate your background when you apply.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={uploadingResume}
                  onClick={() => resumeInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition cursor-pointer"
                >
                  {uploadingResume && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Upload Resume</span>
                </button>
              </div>
            )}
          </div>

          {/* Availability Status */}
          <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#232735]">
              <Clock className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white">Availability Status</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {AVAILABILITY_OPTIONS.map((opt) => {
                const isSelected = availability === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAvailability(opt.value)}
                    className={`p-4 rounded-xl border text-left transition relative cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-950/20 shadow-md shadow-indigo-500/10'
                        : 'border-[#2A2F42] bg-[#171A24] hover:border-[#3E4560]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2.5 h-2.5 rounded-full ${opt.indicatorColor}`} />
                      <span className="text-xs font-bold text-white">{opt.label}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">{opt.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Technical Skills */}
          <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#232735]">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-indigo-400" />
                <h2 className="text-base font-bold text-white">Skills & Technologies</h2>
              </div>
              <span className="text-xs text-slate-400 font-medium">{skills.length} / 50 skills</span>
            </div>

            {/* Input field */}
            <div className="flex gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleKeyDownSkill}
                placeholder="Type a skill and press Enter (e.g. Next.js, GraphQL, PostgreSQL)..."
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

          {/* Professional Experience, Education & Bio */}
          <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-[#232735]">
              <Briefcase className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-bold text-white">Experience & Background</h2>
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
                maxLength={500}
                placeholder="e.g. 4 years in production TypeScript, distributed systems, and real-time architectures"
                className="w-full px-4 py-2.5 rounded-xl border border-[#2A2F42] bg-[#171A24] text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 placeholder:text-slate-500"
              />
              <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
                <span>Seniority, technical specialization, or past company experience</span>
                <span>{experience.length} / 500</span>
              </div>
            </div>

            {/* Education */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                <span>Education / Certifications</span>
              </label>
              <input
                type="text"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                maxLength={300}
                placeholder="e.g. B.Tech Computer Science, Self-taught engineer, AWS Certified Solutions Architect"
                className="w-full px-4 py-2.5 rounded-xl border border-[#2A2F42] bg-[#171A24] text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 placeholder:text-slate-500"
              />
              <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
                <span>Degree, institution, or self-directed learning journey</span>
                <span>{education.length} / 300</span>
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Bio & Professional Summary
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
              <h2 className="text-base font-bold text-white">Links & Online Profiles</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

              {/* Twitter / X */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Twitter / X Profile
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <TwitterIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="url"
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value)}
                    placeholder="https://x.com/username"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#2A2F42] bg-[#171A24] text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* Other Social Link */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Other Link / Blog
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Globe className="w-4 h-4" />
                  </div>
                  <input
                    type="url"
                    value={otherSocial}
                    onChange={(e) => setOtherSocial(e.target.value)}
                    placeholder="https://medium.com/@username"
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
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/30 border border-red-800/40 transition cursor-pointer"
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
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-white bg-[#171A24] border border-[#2A2F42] hover:bg-[#1E2330] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Profile</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Delete Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <div className="bg-[#11141C] rounded-2xl border border-[#232735] max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-950/60 text-red-400 border border-red-800/60 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Delete Profile?</h3>
                  <p className="text-xs text-slate-400">
                    This will remove your public developer profile and resume.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-[#171A24] border border-[#2A2F42] transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDeleteProfile}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-500 transition"
                >
                  {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Delete</span>
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
