import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getStartupById, updateStartup } from '../../api/startups';
import {
  ArrowLeft,
  Edit3,
  AlertCircle,
  Loader2,
  ShieldAlert,
} from 'lucide-react';

const STAGE_OPTIONS = [
  { value: 'IDEA', label: 'Idea' },
  { value: 'MVP', label: 'MVP' },
  { value: 'EARLY_TRACTION', label: 'Early Traction' },
  { value: 'GROWTH', label: 'Growth' },
];

const COMMON_INDUSTRIES = [
  'AgriTech',
  'AI / Machine Learning',
  'B2B SaaS',
  'CleanTech',
  'Consumer Tech',
  'Developer Tools',
  'EdTech',
  'FinTech',
  'HealthTech / BioTech',
  'Logistics / Supply Chain',
  'Marketplace / E-Commerce',
  'Other',
];

const EditStartup = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    problemStatement: '',
    solution: '',
    industry: '',
    stage: 'IDEA',
    description: '',
  });

  const [customIndustry, setCustomIndustry] = useState('');
  const [fetching, setFetching] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notOwner, setNotOwner] = useState(false);

  useEffect(() => {
    const loadStartup = async () => {
      setFetching(true);
      setError('');
      try {
        const data = await getStartupById(id);
        const s = data.startup;

        const founderId = (typeof s.founder === 'object' && s.founder ? (s.founder.id || s.founder._id) : (s.founder || s.founderId))?.toString();
        const currentUserId = (user?.id || user?._id || user?.userId)?.toString();

        if (user && founderId && currentUserId && currentUserId !== founderId) {
          setNotOwner(true);
          return;
        }

        setFormData({
          name: s.name || '',
          tagline: s.tagline || '',
          problemStatement: s.problemStatement || '',
          solution: s.solution || '',
          industry: s.industry || '',
          stage: s.stage || 'IDEA',
          description: s.description || '',
        });

        if (s.industry && !COMMON_INDUSTRIES.includes(s.industry)) {
          setCustomIndustry('Other');
        }
      } catch (err) {
        setError(err.message || 'Failed to load startup for editing');
      } finally {
        setFetching(false);
      }
    };

    loadStartup();
  }, [id, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleIndustrySelect = (e) => {
    const selected = e.target.value;
    if (selected === 'Other') {
      setFormData((prev) => ({ ...prev, industry: '' }));
      setCustomIndustry('Other');
    } else {
      setFormData((prev) => ({ ...prev, industry: selected }));
      setCustomIndustry('');
    }
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Startup name is required');
      return;
    }
    if (formData.name.trim().length > 100) {
      setError('Startup name cannot exceed 100 characters');
      return;
    }
    if (!formData.tagline.trim()) {
      setError('Tagline is required');
      return;
    }
    if (formData.tagline.trim().length > 200) {
      setError('Tagline cannot exceed 200 characters');
      return;
    }
    if (!formData.problemStatement.trim()) {
      setError('Problem statement is required');
      return;
    }
    if (!formData.solution.trim()) {
      setError('Solution is required');
      return;
    }
    if (!formData.industry.trim()) {
      setError('Industry is required');
      return;
    }
    if (!formData.stage) {
      setError('Stage is required');
      return;
    }

    setSubmitting(true);

    try {
      await updateStartup(id, {
        name: formData.name.trim(),
        tagline: formData.tagline.trim(),
        problemStatement: formData.problemStatement.trim(),
        solution: formData.solution.trim(),
        industry: formData.industry.trim(),
        stage: formData.stage,
        description: formData.description.trim(),
      });

      navigate(`/startups/${id}`, {
        state: { message: 'Startup updated successfully!' },
      });
    } catch (err) {
      setError(err.message || 'Failed to update startup');
    } finally {
      setSubmitting(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-[#0B0D12]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-sm text-slate-400 font-medium">Loading startup data...</p>
      </div>
    );
  }

  if (notOwner) {
    return (
      <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-[#11141C] p-8 rounded-2xl border border-[#232735] shadow-xl text-center">
          <div className="w-12 h-12 rounded-xl bg-amber-950/50 text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-800/50">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            You don't have permission to edit this startup. Only the original founder may modify its information.
          </p>
          <Link
            to={`/startups/${id}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Startup</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0B0D12] min-h-[calc(100vh-4rem)] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link
            to={`/startups/${id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Cancel and Return</span>
          </Link>
        </div>

        <div className="bg-[#11141C] rounded-2xl border border-[#232735] p-6 sm:p-10 shadow-xl">
          <div className="mb-8 pb-6 border-b border-[#232735]">
            <div className="w-12 h-12 rounded-xl bg-indigo-950/60 border border-indigo-800/40 text-indigo-400 flex items-center justify-center mb-3 shadow-lg shadow-indigo-600/20">
              <Edit3 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Edit Startup</h1>
            <p className="text-sm text-slate-400 mt-1">
              Update your startup information. All changes are saved directly to MongoDB Atlas.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-800/50 flex items-start gap-3 text-sm text-red-300">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Startup Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                maxLength={100}
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-[#2A2F42] bg-[#171A24] text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label htmlFor="tagline" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Tagline <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="tagline"
                name="tagline"
                required
                maxLength={200}
                value={formData.tagline}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-[#2A2F42] bg-[#171A24] text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="industrySelect" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Industry / Sector <span className="text-red-400">*</span>
                </label>
                <select
                  id="industrySelect"
                  value={customIndustry === 'Other' ? 'Other' : formData.industry}
                  onChange={handleIndustrySelect}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#2A2F42] text-sm text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition bg-[#171A24]"
                >
                  <option value="">Select an industry...</option>
                  {COMMON_INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
                {customIndustry === 'Other' && (
                  <input
                    type="text"
                    placeholder="Enter custom industry"
                    value={formData.industry}
                    onChange={(e) => setFormData((prev) => ({ ...prev, industry: e.target.value }))}
                    className="w-full mt-2 px-4 py-2 rounded-xl border border-[#2A2F42] bg-[#171A24] text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
                  />
                )}
              </div>

              <div>
                <label htmlFor="stage" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Development Stage <span className="text-red-400">*</span>
                </label>
                <select
                  id="stage"
                  name="stage"
                  required
                  value={formData.stage}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#2A2F42] text-sm text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition bg-[#171A24]"
                >
                  {STAGE_OPTIONS.map((stg) => (
                    <option key={stg.value} value={stg.value}>
                      {stg.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="problemStatement" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Problem Statement <span className="text-red-400">*</span>
              </label>
              <textarea
                id="problemStatement"
                name="problemStatement"
                rows={3}
                required
                value={formData.problemStatement}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-[#2A2F42] bg-[#171A24] text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition leading-relaxed"
              />
            </div>

            <div>
              <label htmlFor="solution" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Solution <span className="text-red-400">*</span>
              </label>
              <textarea
                id="solution"
                name="solution"
                rows={3}
                required
                value={formData.solution}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-[#2A2F42] bg-[#171A24] text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition leading-relaxed"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Detailed Description <span className="text-xs font-normal text-slate-500 lowercase">(optional)</span>
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-[#2A2F42] bg-[#171A24] text-sm text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition leading-relaxed"
              />
            </div>

            <div className="pt-4 border-t border-[#232735] flex items-center justify-end gap-3">
              <Link
                to={`/startups/${id}`}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-[#171A24] transition"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20 transition"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditStartup;
