import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getStartupById, deleteStartup } from '../../api/startups';
import { generateStartupAnalysis, getStartupAnalysis } from '../../api/ai';
import AIAnalysisCard from '../../components/ai/AIAnalysisCard';
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Calendar,
  User,
  Tag,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  HelpCircle,
  Lightbulb,
  FileText,
  Sparkles,
} from 'lucide-react';

const STAGE_CONFIG = {
  IDEA: { label: 'Idea', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  MVP: { label: 'MVP', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  EARLY_TRACTION: { label: 'Early Traction', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  GROWTH: { label: 'Growth', color: 'bg-amber-50 text-amber-700 border-amber-200' },
};

const StartupDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [startup, setStartup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(location.state?.message || '');

  // AI Analysis state
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');

  // Delete confirmation state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    const fetchStartup = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getStartupById(id);
        const s = data.startup;
        setStartup(s);

        if (s?.aiAnalysis && s.aiAnalysis.overallAssessment) {
          setAnalysis(s.aiAnalysis);
        } else {
          // If not in the startup payload, attempt to load existing analysis if user is a founder
          try {
            const aiRes = await getStartupAnalysis(id);
            if (aiRes.data && aiRes.data.overallAssessment) {
              setAnalysis(aiRes.data);
            }
          } catch (aiErr) {
            // 404 is expected if analysis hasn't been generated yet
          }
        }
      } catch (err) {
        setError(err.message || 'Startup not found');
      } finally {
        setLoading(false);
      }
    };

    fetchStartup();
  }, [id]);

  const handleAnalyze = async () => {
    if (analyzing) return;
    setAnalyzing(true);
    setAnalysisError('');
    try {
      const response = await generateStartupAnalysis(id);
      if (response.data) {
        setAnalysis(response.data);
      }
    } catch (err) {
      setAnalysisError(err.message || 'Failed to analyze startup idea. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteStartup(id);
      setIsDeleteModalOpen(false);
      navigate('/dashboard', {
        state: { message: `"${startup?.name}" was deleted successfully.` },
      });
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete startup');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm text-slate-500 font-medium">Loading startup details...</p>
      </div>
    );
  }

  if (error || !startup) {
    return (
      <div className="bg-slate-50 min-h-[calc(100vh-4rem)] py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-100">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Startup Not Found</h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            {error || 'The requested startup could not be located.'}
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  // Determine if viewer is the founder
  const founderId = typeof startup.founder === 'object' && startup.founder ? startup.founder.id : startup.founder;
  const isOwner = user && founderId && (user.id === founderId || user.userId === founderId);

  const stageInfo = STAGE_CONFIG[startup.stage] || {
    label: startup.stage,
    color: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const formattedDate = startup.createdAt
    ? new Date(startup.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-4rem)] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Actions Header */}
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>

          {isOwner && (
            <div className="flex flex-wrap items-center gap-2.5">
              {user?.role === 'FOUNDER' && (
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 shadow-sm shadow-indigo-100 transition"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyzing Startup...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{analysis ? 'Re-analyze with AI' : 'Analyze with AI'}</span>
                    </>
                  )}
                </button>
              )}

              <Link
                to={`/startups/${startup.id}/edit`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                <span>Edit Startup</span>
              </Link>
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                type="button"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-red-600 bg-white border border-red-200 hover:bg-red-50 transition shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>

        {/* Flash notification */}
        {success && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-sm text-emerald-800">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        {/* Hero Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-wrap items-center gap-2.5 mb-3">
            <span
              className={`text-xs font-bold px-3 py-0.5 rounded-full border uppercase tracking-wider ${stageInfo.color}`}
            >
              {stageInfo.label}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md">
              <Tag className="w-3 h-3 text-slate-400" />
              {startup.industry}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
            {startup.name}
          </h1>
          <p className="text-base sm:text-lg font-medium text-indigo-600 mb-6">
            {startup.tagline}
          </p>

          {/* Meta Info Bar */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-500">
            {startup.founder && typeof startup.founder === 'object' && (
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Founder: <strong className="text-slate-700 font-semibold">{startup.founder.name}</strong> ({startup.founder.email})
                </span>
              </div>
            )}
            {formattedDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Founded {formattedDate}</span>
              </div>
            )}
          </div>
        </div>

        {/* Problem & Solution Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Problem */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <HelpCircle className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Problem Statement
              </h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {startup.problemStatement}
            </p>
          </div>

          {/* Solution */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Lightbulb className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Solution
              </h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {startup.solution}
            </p>
          </div>
        </div>

        {/* Detailed Description */}
        {startup.description && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Detailed Overview
              </h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {startup.description}
            </p>
          </div>
        )}

        {/* AI Startup Analysis Section */}
        <AIAnalysisCard
          analysis={analysis}
          loading={analyzing}
          error={analysisError}
          onAnalyze={handleAnalyze}
          canAnalyze={isOwner && user?.role === 'FOUNDER'}
        />
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white max-w-md w-full rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xl text-center">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-100">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Startup?</h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-800">{startup.name}</strong>? This action cannot be undone.
            </p>

            {deleteError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 text-left">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 disabled:opacity-70 transition shadow-sm"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StartupDetails;
