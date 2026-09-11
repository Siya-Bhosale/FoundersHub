import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createStartup } from '../../api/startups';
import {
  Rocket,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Building2,
  Sparkles,
  HelpCircle,
  Layers,
  FileText,
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

const CreateStartup = () => {
  const navigate = useNavigate();

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

    // Validations
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

    setLoading(true);

    try {
      const response = await createStartup({
        name: formData.name.trim(),
        tagline: formData.tagline.trim(),
        problemStatement: formData.problemStatement.trim(),
        solution: formData.solution.trim(),
        industry: formData.industry.trim(),
        stage: formData.stage,
        description: formData.description.trim(),
      });

      const startupId = response.startup?.id;
      if (startupId) {
        navigate(`/startups/${startupId}`, {
          state: { message: 'Startup created successfully!' },
        });
      } else {
        navigate('/dashboard', {
          state: { message: 'Startup created successfully!' },
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to create startup. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-4rem)] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back navigation */}
        <div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-sm">
          <div className="mb-8 pb-6 border-b border-slate-100">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
              <Rocket className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create New Startup</h1>
            <p className="text-sm text-slate-500 mt-1">
              Provide the foundational details for your venture. You can update these at any time.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-sm text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Startup Name */}
            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Startup Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                maxLength={100}
                placeholder="e.g. AgriVision AI"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Maximum 100 characters</span>
            </div>

            {/* Tagline */}
            <div>
              <label htmlFor="tagline" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Tagline <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="tagline"
                name="tagline"
                required
                maxLength={200}
                placeholder="e.g. AI-powered crop disease detection"
                value={formData.tagline}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">One-line elevator pitch (max 200 characters)</span>
            </div>

            {/* Two-column: Industry & Stage */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Industry */}
              <div>
                <label htmlFor="industry" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Industry / Sector <span className="text-red-500">*</span>
                </label>
                <select
                  id="industrySelect"
                  value={customIndustry === 'Other' ? 'Other' : formData.industry}
                  onChange={handleIndustrySelect}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition bg-white"
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
                    className="w-full mt-2 px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                  />
                )}
              </div>

              {/* Stage */}
              <div>
                <label htmlFor="stage" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Development Stage <span className="text-red-500">*</span>
                </label>
                <select
                  id="stage"
                  name="stage"
                  required
                  value={formData.stage}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition bg-white"
                >
                  {STAGE_OPTIONS.map((stg) => (
                    <option key={stg.value} value={stg.value}>
                      {stg.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Problem Statement */}
            <div>
              <label htmlFor="problemStatement" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Problem Statement <span className="text-red-500">*</span>
              </label>
              <textarea
                id="problemStatement"
                name="problemStatement"
                rows={3}
                required
                placeholder="What core problem are you solving for your target market?"
                value={formData.problemStatement}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition leading-relaxed"
              />
            </div>

            {/* Solution */}
            <div>
              <label htmlFor="solution" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Solution <span className="text-red-500">*</span>
              </label>
              <textarea
                id="solution"
                name="solution"
                rows={3}
                required
                placeholder="How does your product or technology address this problem uniquely?"
                value={formData.solution}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition leading-relaxed"
              />
            </div>

            {/* Description (Optional) */}
            <div>
              <label htmlFor="description" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Detailed Description <span className="text-xs font-normal text-slate-400 lowercase">(optional)</span>
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                placeholder="Share any additional context, traction highlights, roadmap, or technical overview..."
                value={formData.description}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition leading-relaxed"
              />
            </div>

            {/* Form actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <Link
                to="/dashboard"
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm shadow-indigo-100 transition"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    <span>Creating Startup...</span>
                  </>
                ) : (
                  'Create Startup'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateStartup;
